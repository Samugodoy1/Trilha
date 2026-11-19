import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { requireRole } from "@/server/session";
import { getDb, schema } from "@/db";
import { Page } from "@/components/ui/page";
import { NewClassForm } from "./form";

export const metadata: Metadata = { title: "Nova turma" };

export default async function NewClassPage() {
  const ctx = await requireRole("teacher", "coordinator", "admin");
  const db = await getDb();
  const subjects = await db.select({ id: schema.subjects.id, name: schema.subjects.name }).from(schema.subjects).where(eq(schema.subjects.schoolId, ctx.school.id)).orderBy(asc(schema.subjects.name));
  return (
    <Page title="Nova turma" back={{ href: "/turmas", label: "Turmas" }} width="narrow">
      <NewClassForm subjects={subjects} />
    </Page>
  );
}
