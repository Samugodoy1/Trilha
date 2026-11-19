import type { Metadata } from "next";
import { requireRole } from "@/server/session";
import { getComposeClasses } from "@/server/queries/weekly";
import { getCurrentTerm, getCurrentYear, getTerms } from "@/server/queries/common";
import { claudeAvailable } from "@/server/ai/claude";
import { Page } from "@/components/ui/page";
import { NewReportForm } from "./form";

export const metadata: Metadata = { title: "Novo relatório" };

export default async function NewReportPage({ searchParams }: { searchParams: Promise<{ aluno?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireRole("teacher");
  const [classes, year, term] = await Promise.all([getComposeClasses(ctx), getCurrentYear(ctx.school.id), getCurrentTerm(ctx.school.id)]);
  const terms = year ? await getTerms(ctx.school.id, year.id) : [];
  return (
    <Page title="Novo relatório" back={{ href: "/relatorios", label: "Relatórios" }} width="narrow">
      <NewReportForm
        students={classes.flatMap((c) => c.students.map((s) => ({ id: s.id, name: s.name, className: c.name })))}
        terms={terms.map((t) => ({ id: t.id, name: t.name }))}
        defaults={{ studentId: sp.aluno, termId: term?.id }}
        engine={claudeAvailable(ctx.school.aiEnabled) ? "claude" : "local"}
      />
    </Page>
  );
}
