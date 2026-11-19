import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireRole } from "@/server/session";
import { canAccessClass, isTeacher, isUuid } from "@/server/access";
import { displayName, getClassStudents } from "@/server/queries/common";
import { Page } from "@/components/ui/page";
import { Tag } from "@/components/ui/misc";
import { GradeEntry } from "@/components/assessments/grade-entry";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "Avaliação" };

export default async function GradeItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ctx = await requireRole("teacher", "coordinator", "admin");
  const db = await getDb();
  const [item] = await db.select().from(schema.gradeItems).where(eq(schema.gradeItems.id, id));
  if (!item || !(await canAccessClass(ctx, item.classId))) notFound();
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, item.classId));
  const [term] = await db.select().from(schema.terms).where(eq(schema.terms.id, item.termId));
  const subject = item.subjectId ? (await db.select().from(schema.subjects).where(eq(schema.subjects.id, item.subjectId)))[0] : null;
  const students = await getClassStudents(item.classId);
  const grades = await db.select().from(schema.grades).where(eq(schema.grades.gradeItemId, id));
  const skills = item.bnccCodes.length ? await db.select().from(schema.bnccSkills).where(inArray(schema.bnccSkills.code, item.bnccCodes)) : [];

  return (
    <Page
      title={item.title}
      back={{ href: `/turmas/${cls.id}?aba=avaliacoes`, label: cls.name }}
      subtitle={`${cls.name} · ${subject?.name ?? "Geral"} · ${term.name} · ${formatDay(item.date)}`}
      width="default"
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Tag tone="accent">{item.kind === "numeric" ? `Nota até ${Number(item.maxScore)}` : item.kind === "concept" ? "Conceito" : "Descritiva"}</Tag>
        {item.kind === "numeric" && <Tag>Peso {Number(item.weight)}</Tag>}
        {item.isRecovery && <Tag tone="warning">Recuperação</Tag>}
        {skills.map((s) => (
          <span key={s.code} title={s.description}>
            <Tag tone="info">{s.code}</Tag>
          </span>
        ))}
      </div>
      {skills.length > 0 && (
        <ul className="mb-6 space-y-1 text-footnote text-label-2">
          {skills.map((s) => (
            <li key={s.code}>
              <span className="font-semibold text-label">{s.code}</span> — {s.description}
            </li>
          ))}
        </ul>
      )}
      <GradeEntry
        itemId={item.id}
        kind={item.kind}
        maxScore={item.maxScore ? Number(item.maxScore) : null}
        concepts={ctx.school.conceptScale}
        shared={item.sharedWithFamily}
        readOnly={!isTeacher(ctx) || Boolean(cls.archivedAt)}
        students={students.map((s) => ({ id: s.id, name: displayName(s), hue: s.hue }))}
        initial={Object.fromEntries(grades.map((g) => [g.studentId, { score: g.score ? Number(g.score) : null, concept: g.concept, comment: g.comment }]))}
      />
    </Page>
  );
}
