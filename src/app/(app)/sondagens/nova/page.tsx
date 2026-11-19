import type { Metadata } from "next";
import { requireRole } from "@/server/session";
import { getClasses, getCurrentTerm, getCurrentYear, getTerms } from "@/server/queries/common";
import { getTemplates } from "@/server/queries/assessments";
import { Page } from "@/components/ui/page";
import { NewRoundForm } from "./form";

export const metadata: Metadata = { title: "Nova sondagem" };

export default async function NewRoundPage({ searchParams }: { searchParams: Promise<{ turma?: string; modelo?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireRole("teacher");
  const [classes, templates, term, year] = await Promise.all([getClasses(ctx), getTemplates(ctx.school.id), getCurrentTerm(ctx.school.id), getCurrentYear(ctx.school.id)]);
  const terms = year ? await getTerms(ctx.school.id, year.id) : [];
  return (
    <Page title="Nova sondagem" back={{ href: "/sondagens", label: "Sondagens" }} width="narrow">
      <NewRoundForm
        classes={classes.filter((c) => !c.archived).map((c) => ({ id: c.id, name: c.name }))}
        templates={templates.map((t) => ({ id: t.id, name: t.name, kind: t.kind, levels: t.scale.length, description: t.description }))}
        terms={terms.map((t) => ({ id: t.id, name: t.name }))}
        defaults={{ classId: sp.turma, templateId: sp.modelo, termId: term?.id }}
      />
    </Page>
  );
}
