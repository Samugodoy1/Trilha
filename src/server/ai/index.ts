import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "../session";
import { assertStudent } from "../access";
import { audit } from "../audit";
import { collectStudentRecords, type SourceRecord } from "./records";
import { localFeedback, localParecer, type Draft } from "./local";
import { claudeAvailable, claudeDraft } from "./claude";
import { reportKinds, type ReportKind } from "@/lib/vocabulary";

export type GroundedDraft = Draft & {
  engine: "local" | "claude";
  sources: { key: string; type: string; id: string; date: string; label: string; text: string }[];
};

async function namesFor(studentId: string) {
  const db = await getDb();
  const [s] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  const classmates = await db
    .select({ fullName: schema.students.fullName, preferredName: schema.students.preferredName })
    .from(schema.students)
    .where(and(eq(schema.students.schoolId, s.schoolId), ne(schema.students.id, studentId)));
  const studentNames = [s.fullName, s.preferredName ?? "", s.fullName.split(" ")[0]];
  const otherNames = classmates.flatMap((c) => [c.fullName, c.preferredName ?? "", c.fullName.split(" ")[0]]);
  return { student: s, studentNames, otherNames, first: s.preferredName ?? s.fullName.split(" ")[0] };
}

function withSources(d: Draft, records: SourceRecord[], engine: "local" | "claude"): GroundedDraft {
  const used = new Set(d.paragraphs.flatMap((p) => p.sources));
  return { ...d, engine, sources: records.filter((r) => used.has(r.key)) };
}

export async function draftReport(ctx: SessionContext, studentId: string, kind: ReportKind, range: { from: string; to: string; label: string }): Promise<GroundedDraft> {
  await assertStudent(ctx, studentId);
  const { studentNames, otherNames, first, student } = await namesFor(studentId);
  const records = await collectStudentRecords(ctx, studentId, range);
  let draft: GroundedDraft | null = null;
  if (claudeAvailable(ctx.school.aiEnabled) && records.length) {
    const task = `Redija um rascunho de "${reportKinds[kind].label}" (${reportKinds[kind].description}) sobre [ESTUDANTE], referente ao ${range.label}. Entre 3 e 5 parágrafos curtos. Termine com um marcador entre colchetes para o professor escrever os próximos passos.`;
    const d = await claudeDraft({ task, records, studentNames, otherNames, displayFirstName: first });
    if (d) draft = withSources(d, records, "claude");
  }
  draft ??= withSources(localParecer(student.preferredName ?? student.fullName, range.label, records), records, "local");
  await audit(ctx, "ai.draft_report", "student", studentId, { engine: draft.engine, sources: draft.sources.length });
  return draft;
}

export async function draftFeedback(ctx: SessionContext, studentId: string, tone: string, guardianFirst: string | null, range: { from: string; to: string }): Promise<GroundedDraft> {
  await assertStudent(ctx, studentId);
  const { studentNames, otherNames, first } = await namesFor(studentId);
  const records = await collectStudentRecords(ctx, studentId, range);
  let draft: GroundedDraft | null = null;
  if (claudeAvailable(ctx.school.aiEnabled) && records.length) {
    const task = `Redija um rascunho curto (2 a 3 parágrafos) de mensagem da professora para a família de [ESTUDANTE], no tom "${tone}". Comece com uma saudação calorosa${guardianFirst ? ` a ${guardianFirst}` : ""}. Valorize conquistas reais. Se houver sugestão para casa, que seja simples, gratuita e caiba em qualquer rotina.`;
    const d = await claudeDraft({ task, records, studentNames, otherNames, displayFirstName: first });
    if (d) draft = withSources(d, records, "claude");
  }
  draft ??= withSources(localFeedback(first, guardianFirst, tone, records), records, "local");
  await audit(ctx, "ai.draft_feedback", "student", studentId, { engine: draft.engine });
  return draft;
}
