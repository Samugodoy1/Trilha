import type { Metadata } from "next";
import { requireRole } from "@/server/session";
import { getComposeContextAction } from "@/server/actions/journal";
import { Page } from "@/components/ui/page";
import { EntryPageEditor } from "./editor";

export const metadata: Metadata = { title: "Novo registro" };

export default async function NewEntryPage({ searchParams }: { searchParams: Promise<{ turma?: string; aluno?: string }> }) {
  await requireRole("teacher");
  const sp = await searchParams;
  const context = await getComposeContextAction();
  const classId = sp.turma ?? context.classes.find((c) => c.students.some((s) => s.id === sp.aluno))?.id;
  return (
    <Page title="Novo registro" back={{ href: "/diario", label: "Diário" }} width="narrow">
      <EntryPageEditor context={context} initial={{ classId, studentIds: sp.aluno ? [sp.aluno] : [] }} />
    </Page>
  );
}
