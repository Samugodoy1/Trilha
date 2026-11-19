import type { Metadata } from "next";
import { requireRole } from "@/server/session";
import { getComposeClasses } from "@/server/queries/weekly";
import { Page } from "@/components/ui/page";
import { WeeklyComposer } from "@/components/teacher/weekly-composer";

export const metadata: Metadata = { title: "Nova publicação" };

export default async function NewWeeklyPage({ searchParams }: { searchParams: Promise<{ turma?: string }> }) {
  const ctx = await requireRole("teacher");
  const sp = await searchParams;
  const classes = await getComposeClasses(ctx);
  return (
    <Page title="Nossa semana" back={{ href: "/semana", label: "Publicações" }} width="narrow">
      <WeeklyComposer classes={classes} author={{ name: ctx.user.name, hue: ctx.user.hue }} initial={{ classId: classes.some((c) => c.id === sp.turma) ? sp.turma : undefined }} />
    </Page>
  );
}
