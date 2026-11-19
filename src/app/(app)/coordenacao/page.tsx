import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ClipboardList, HeartHandshake, Users } from "lucide-react";
import { requireRole } from "@/server/session";
import { getCoordinationOverview } from "@/server/queries/coordination";
import { Page } from "@/components/ui/page";
import { Avatar } from "@/components/ui/avatar";
import { SectionTitle, CategoryLabel, categoryColor } from "@/components/ui/misc";
import { DistributionBar } from "@/components/charts/level-chart";
import { levelRamp } from "@/lib/levels";
import { seriesMeta } from "@/components/student/highlights";
import { formatDay } from "@/lib/format";
import { entryKinds } from "@/lib/vocabulary";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Visão geral" };

export default async function CoordinationPage() {
  const ctx = await requireRole("coordinator", "admin");
  const d = await getCoordinationOverview(ctx);
  const pct = d.stats.students ? Math.round((d.stats.connected / d.stats.students) * 100) : 0;
  const tiles = [
    { icon: Users, label: "Alunos", value: d.stats.students, tint: "var(--accent)" },
    { icon: ClipboardList, label: `Sondagens no ${d.term?.name ?? "bimestre"}`, value: d.stats.rounds, tint: "var(--writing)" },
    { icon: HeartHandshake, label: "Famílias conectadas", value: `${pct}%`, tint: "var(--family)" },
  ];
  return (
    <Page title="Visão geral" titleTint eyebrow={ctx.school.name} subtitle="Para apoiar professores e alunos — não para comparar pessoas." width="wide">
      <div className="grid grid-cols-3 gap-2.5">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col justify-between gap-2 rounded-[14px] bg-surface-2 p-3 dark:bg-surface">
            <div className="flex items-start justify-between">
              <span className="flex size-8 items-center justify-center rounded-full text-white" style={{ background: t.tint }}>
                <t.icon aria-hidden className="size-[17px]" strokeWidth={2.4} />
              </span>
              <span className="text-[1.75rem] leading-none font-bold tabular">{t.value}</span>
            </div>
            <span className="text-subhead font-semibold text-label-2">{t.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="sond">
            <SectionTitle id="sond">Sondagens por turma</SectionTitle>
            <p className="-mt-2 mb-4 text-subhead text-label-2">Distribuição anônima da última sondagem de cada modelo. Turmas em ordem de ano, sem ranking.</p>
            <div className="space-y-4">
              {d.distributions
                .filter((c) => c.items.length)
                .map((c) => (
                  <Link key={c.classId} href={`/turmas/${c.classId}?aba=sondagens`} className="press block rounded-[20px] bg-surface p-4 shadow-e1 outline-none hover:shadow-e2">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-headline">{c.className}</h3>
                      <ChevronRight aria-hidden className="size-4 text-label-3" />
                    </div>
                    <div className="space-y-4">
                      {c.items.map((it) => {
                        const meta = seriesMeta[it.kind];
                        const ramp = levelRamp(categoryColor[meta.category], it.levels.length);
                        return (
                          <div key={it.roundId}>
                            <CategoryLabel icon={meta.icon} category={meta.category} className="mb-2 text-footnote">
                              {it.templateName} · {formatDay(it.appliedOn)}
                            </CategoryLabel>
                            <DistributionBar segments={it.levels.map((l, i) => ({ key: l.key, label: l.short, count: l.count, color: ramp[i] }))} />
                          </div>
                        );
                      })}
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-10">
          <section aria-labelledby="apoio">
            <SectionTitle id="apoio">Podem precisar de apoio</SectionTitle>
            {d.support.length === 0 ? (
              <p className="text-callout text-label-2">Nenhum sinal de alerta nas últimas duas semanas.</p>
            ) : (
              <ul className="-mx-4 md:mx-0">
                {d.support.map((s, i) => (
                  <li key={s.id}>
                    <Link href={`/alunos/${s.id}`} className="flex items-center gap-3 pl-4 hover:bg-fill/40 md:pl-0">
                      <Avatar name={s.name} hue={s.hue} size="sm" />
                      <span className={cn("flex-1 py-2.5 pr-4", i < d.support.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
                        <span className="block text-body">{s.name}</span>
                        <span className="block text-subhead text-label-2">
                          {s.className} – <span className="text-critical">{s.reason}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="compart">
            <SectionTitle id="compart">Compartilhados com você</SectionTitle>
            <ul className="space-y-3">
              {d.shared.map(({ e, author, className }) => (
                <li key={e.id}>
                  <Link href={`/diario/${e.id}`} className="block rounded-[20px] bg-surface p-4 shadow-e1 hover:shadow-e2">
                    <p className="text-footnote font-semibold text-notes">
                      {entryKinds[e.kind].label} · {className}
                    </p>
                    <p className="mt-0.5 text-headline">{e.title}</p>
                    <p className="mt-1 line-clamp-3 text-subhead text-label-2">{e.body}</p>
                    <p className="mt-2 text-footnote text-label-2">
                      {author} · {formatDay(e.occurredOn)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </Page>
  );
}
