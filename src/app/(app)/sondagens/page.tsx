import type { Metadata } from "next";
import { ClipboardList, Lock, Plus } from "lucide-react";
import { requireRole } from "@/server/session";
import { isTeacher } from "@/server/access";
import { getRoundsOverview, getTemplates } from "@/server/queries/assessments";
import { Page } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { ListRow, ListSection } from "@/components/ui/list";
import { EmptyState, Tag, categoryColor } from "@/components/ui/misc";
import { seriesMeta } from "@/components/student/highlights";
import { NewTemplateButton } from "@/components/assessments/template-form";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "Sondagens" };

export default async function AssessmentsPage() {
  const ctx = await requireRole("teacher", "coordinator", "admin");
  const [rounds, templates] = await Promise.all([getRoundsOverview(ctx), getTemplates(ctx.school.id)]);
  const byClass = new Map<string, typeof rounds>();
  for (const r of rounds) byClass.set(r.className, [...(byClass.get(r.className) ?? []), r]);

  return (
    <Page
      title="Sondagens"
      actions={isTeacher(ctx) ? <Button size="sm" variant="tinted" icon={Plus} href="/sondagens/nova">Nova</Button> : undefined}
      width="wide"
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          {rounds.length === 0 && (
            <EmptyState icon={ClipboardList} title="Nenhuma sondagem ainda" message="Lance os resultados da turma toda em uma única tela — cada aluno ganha seu histórico automaticamente." action={isTeacher(ctx) ? <Button href="/sondagens/nova">Lançar a primeira</Button> : undefined} />
          )}
          {[...byClass.entries()].map(([className, list]) => (
            <ListSection key={className} header={className}>
              {list.map((r) => {
                const meta = seriesMeta[r.kind];
                return (
                  <ListRow
                    key={r.id}
                    href={`/sondagens/${r.id}`}
                    icon={meta.icon}
                    iconTint={categoryColor[meta.category]}
                    title={r.title}
                    subtitle={`${r.templateName} · ${formatDay(r.appliedOn)}`}
                    trailing={
                      <span className="flex items-center gap-2">
                        {!r.sharedWithFamily && <Lock aria-label="Não compartilhada" className="size-3.5 text-label-3" />}
                        <Tag tone={r.done >= r.total ? "positive" : "warning"}>
                          {r.done}/{r.total}
                        </Tag>
                      </span>
                    }
                  />
                );
              })}
            </ListSection>
          ))}
        </div>
        <aside className="min-w-0">
          <ListSection
            header="Modelos da escola"
            action={<NewTemplateButton />}
            footer="Cada escola define seus próprios modelos e níveis. Nenhuma metodologia é imposta."
          >
            {templates.map((t) => {
              const meta = seriesMeta[t.kind];
              return (
                <ListRow
                  key={t.id}
                  icon={meta.icon}
                  iconTint={categoryColor[meta.category]}
                  title={t.name}
                  subtitle={`${t.scale.length} níveis${t.criteria.length ? ` · ${t.criteria.length} critérios` : ""}`}
                />
              );
            })}
          </ListSection>
        </aside>
      </div>
    </Page>
  );
}
