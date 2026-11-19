import "server-only";
import { and, asc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "../session";
import { isStaff } from "../access";
import { formatDay } from "@/lib/format";
import { entryKinds } from "@/lib/vocabulary";
import { getAssessmentSeries, getAttendanceByTerm, getGradesByTerm } from "../queries/student";

/** Um registro que pode fundamentar uma sugestão. Toda sugestão aponta para registros como estes. */
export type SourceRecord = {
  key: string; // chave curta usada nas citações (r1, r2…)
  type: "journal" | "assessment" | "grade" | "attendance" | "feedback" | "contribution";
  id: string;
  date: string;
  label: string;
  kind?: string;
  text: string;
  delta?: number;
};

export async function collectStudentRecords(
  ctx: SessionContext,
  studentId: string,
  range: { from: string; to: string },
): Promise<SourceRecord[]> {
  const db = await getDb();
  const out: Omit<SourceRecord, "key">[] = [];

  const entries = await db
    .select({ e: schema.journalEntries })
    .from(schema.journalEntryStudents)
    .innerJoin(schema.journalEntries, eq(schema.journalEntries.id, schema.journalEntryStudents.entryId))
    .where(
      and(
        eq(schema.journalEntryStudents.studentId, studentId),
        eq(schema.journalEntries.isDraft, false),
        gte(schema.journalEntries.occurredOn, range.from),
        lte(schema.journalEntries.occurredOn, range.to),
        isStaff(ctx)
          ? inArray(schema.journalEntries.visibility, ["coordination", "family"])
          : or(eq(schema.journalEntries.authorId, ctx.user.id), inArray(schema.journalEntries.visibility, ["coordination", "family"])),
      ),
    )
    .orderBy(asc(schema.journalEntries.occurredOn));
  for (const { e } of entries)
    out.push({
      type: "journal",
      id: e.id,
      date: e.occurredOn,
      kind: e.kind,
      label: `${entryKinds[e.kind].label}${e.title ? ` — ${e.title}` : ""} (${formatDay(e.occurredOn)})`,
      text: e.body,
    });

  const series = await getAssessmentSeries(studentId);
  for (const s of series) {
    const inRange = s.points.filter((p) => p.appliedOn >= range.from && p.appliedOn <= range.to);
    // inclui o ponto imediatamente anterior para permitir comparação
    const firstIdx = s.points.findIndex((p) => p === inRange[0]);
    const pts = firstIdx > 0 ? [s.points[firstIdx - 1], ...inRange] : inRange;
    pts.forEach((p, i) => {
      const prev = pts[i - 1];
      out.push({
        type: "assessment",
        id: p.roundId,
        date: p.appliedOn,
        kind: s.kind,
        label: `Sondagem de ${s.name.toLowerCase()} (${formatDay(p.appliedOn)})`,
        text: `Nível: ${p.levelLabel}.${p.note ? ` Observação: ${p.note}` : ""}`,
        delta: prev && p.levelIndex >= 0 && prev.levelIndex >= 0 ? p.levelIndex - prev.levelIndex : undefined,
      });
    });
  }

  const [student] = await db.select({ schoolId: schema.students.schoolId }).from(schema.students).where(eq(schema.students.id, studentId));
  const grades = (await getGradesByTerm(studentId, student.schoolId)).filter((g) => g.date >= range.from && g.date <= range.to && (g.concept || g.score !== null));
  for (const g of grades)
    out.push({
      type: "grade",
      id: g.id,
      date: g.date,
      label: `${g.title} de ${g.subject} (${g.termName})`,
      text: g.concept ? `Conceito: ${g.concept}` : `Nota: ${g.score?.toLocaleString("pt-BR")} de ${g.maxScore}`,
    });

  const att = (await getAttendanceByTerm(studentId, student.schoolId)).filter((a) => a.total > 0);
  for (const a of att) {
    const term = await db.select().from(schema.terms).where(eq(schema.terms.id, a.termId));
    if (!term[0] || term[0].endsOn < range.from || term[0].startsOn > range.to) continue;
    out.push({
      type: "attendance",
      id: a.termId,
      date: term[0].endsOn,
      label: `Frequência no ${a.termName}`,
      text: `${Math.round((a.rate ?? 0) * 100)}% de presença (${a.absences} faltas, ${a.justified} justificadas, em ${a.total} dias letivos).`,
    });
  }

  // Contribuições da família não alimentam pareceres: são contexto para o professor, não registro pedagógico.

  return out.sort((a, b) => a.date.localeCompare(b.date)).map((r, i) => ({ ...r, key: `r${i + 1}` }));
}

/** Registros da turma (conteúdos e atividades) para a Nossa semana. Observações individuais nunca entram. */
export async function collectClassWeekRecords(classId: string, from: string, to: string): Promise<SourceRecord[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.journalEntries)
    .where(
      and(
        eq(schema.journalEntries.classId, classId),
        eq(schema.journalEntries.scope, "class"),
        eq(schema.journalEntries.isDraft, false),
        inArray(schema.journalEntries.kind, ["conteudo", "atividade", "conquista"]),
        gte(schema.journalEntries.occurredOn, from),
        lte(schema.journalEntries.occurredOn, to),
      ),
    )
    .orderBy(asc(schema.journalEntries.occurredOn));
  return rows.map((e, i) => ({
    key: `r${i + 1}`,
    type: "journal" as const,
    id: e.id,
    date: e.occurredOn,
    kind: e.kind,
    label: `${entryKinds[e.kind].label}${e.title ? ` — ${e.title}` : ""} (${formatDay(e.occurredOn)})`,
    text: e.body,
  }));
}
