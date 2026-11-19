import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireRole } from "@/server/session";
import { canAccessStudent, isUuid } from "@/server/access";
import { displayName } from "@/server/queries/common";
import { Page } from "@/components/ui/page";
import { ReportEditor } from "./editor";
import { reportKinds } from "@/lib/vocabulary";

export const metadata: Metadata = { title: "Relatório" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ctx = await requireRole("teacher", "coordinator", "admin");
  const db = await getDb();
  const [r] = await db.select().from(schema.reports).where(eq(schema.reports.id, id));
  if (!r || r.schoolId !== ctx.school.id) notFound();
  const mine = r.authorId === ctx.user.id;
  if (!mine && (r.status !== "approved" || !r.studentId || !(await canAccessStudent(ctx, r.studentId)))) notFound();
  const [student] = r.studentId ? await db.select().from(schema.students).where(eq(schema.students.id, r.studentId)) : [];
  const [cls] = r.classId ? await db.select().from(schema.classes).where(eq(schema.classes.id, r.classId)) : [];
  const [term] = r.termId ? await db.select().from(schema.terms).where(eq(schema.terms.id, r.termId)) : [];
  const [author] = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, r.authorId));
  return (
    <Page title={reportKinds[r.kind].label} back={{ href: mine ? "/relatorios" : student ? `/alunos/${student.id}` : "/coordenacao", label: mine ? "Relatórios" : "Voltar" }} hideLargeTitle width="wide">
      <ReportEditor
        report={{ id: r.id, title: r.title, content: r.content, status: r.status, visibility: r.visibility, aiAssisted: r.aiAssisted, sources: r.sources }}
        readOnly={!mine}
        header={{
          school: ctx.school.name,
          student: student ? displayName(student) : "",
          className: cls?.name ?? "",
          period: term ? `${term.name} de ${term.startsOn.slice(0, 4)}` : "",
          author: author?.name ?? "",
        }}
      />
    </Page>
  );
}
