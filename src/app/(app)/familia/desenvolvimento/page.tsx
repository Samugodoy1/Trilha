import type { Metadata } from "next";
import { getFamilyGrowth } from "@/server/queries/family";
import { trendSentence } from "@/server/queries/student";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { Page } from "@/components/ui/page";
import { SectionTitle, CategoryLabel, EmptyState } from "@/components/ui/misc";
import { HighlightCard, AttendanceCard, seriesMeta } from "@/components/student/highlights";
import { loadFamily, NoChild } from "../shared";
import { formatDay, isoFromTimestamp } from "@/lib/format";
import { entryKinds, familyGlossary } from "@/lib/vocabulary";
import { ChartNoAxesColumn } from "lucide-react";

export const metadata: Metadata = { title: "Evolução" };

export default async function GrowthPage() {
  const { child } = await loadFamily();
  if (!child) return <NoChild title="Evolução" />;
  const g = await getFamilyGrowth(child);
  const db = await getDb();
  const [school] = await db.select({ conceptScale: schema.schools.conceptScale }).from(schema.schools).where(eq(schema.schools.id, child.schoolId));
  const graded = g.grades.filter((x) => x.concept || x.score !== null);
  const terms = [...new Map(graded.map((x) => [x.termId, x.termName])).entries()];
  const subjects = [...new Set(graded.map((x) => x.subject))];
  const conceptLabel = (k: string) => school?.conceptScale.find((c) => c.key === k);
  const empty = !g.series.length && !graded.length && !g.reports.length && !g.highlights.length;

  return (
    <Page title="Evolução" subtitle={`Como ${child.firstName} vem aprendendo ao longo do ano — com explicações simples.`} width="default">
      {empty && <EmptyState icon={ChartNoAxesColumn} title="Em breve" message="Quando a escola compartilhar sondagens, avaliações e pareceres, eles aparecem aqui." />}

      {g.series.length > 0 && (
        <section aria-labelledby="aprendizagem" className="mb-10">
          <SectionTitle id="aprendizagem">Leitura, escrita e matemática</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {g.series.map((s) => {
              const last = s.points.filter((p) => p.levelIndex >= 0).at(-1);
              const level = last ? s.scale[last.levelIndex] : null;
              const next = last && last.levelIndex < s.scale.length - 1 ? s.scale[last.levelIndex + 1] : null;
              return (
                <div key={s.templateId} className="space-y-2">
                  <HighlightCard series={s} sentence={trendSentence(s)} />
                  {level && (
                    <div className="rounded-[16px] bg-surface-2 p-4 text-subhead dark:bg-surface">
                      <p>
                        <span className="font-semibold">O que isso significa: </span>
                        {child.firstName} {level.familyDescription.charAt(0).toLowerCase() + level.familyDescription.slice(1)}
                      </p>
                      {next && (
                        <p className="mt-1.5 text-label-2">
                          <span className="font-semibold text-label">Próximo passo: </span>
                          {next.familyDescription}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {graded.length > 0 && (
        <section aria-labelledby="avaliacoes" className="mb-10">
          <SectionTitle id="avaliacoes">Avaliações</SectionTitle>
          <div className="-mx-4 md:mx-0">
            {subjects.map((s, i) => (
              <div key={s} className={`flex items-center gap-4 px-4 py-3 md:px-0 ${i < subjects.length - 1 ? "shadow-[inset_0_-0.5px_0_var(--separator)]" : ""}`}>
                <p className="flex-1 text-body">{s}</p>
                <div className="flex gap-2">
                  {terms.map(([tid, tname]) => {
                    const list = graded.filter((x) => x.subject === s && x.termId === tid);
                    const c = list.find((x) => x.concept)?.concept;
                    const nums = list.filter((x) => x.score !== null && !x.isRecovery);
                    const avg = nums.length ? nums.reduce((a, x) => a + (x.score! / (x.maxScore ?? 10)) * 10 * x.weight, 0) / nums.reduce((a, x) => a + x.weight, 0) : null;
                    return (
                      <span key={tid} className="flex w-14 flex-col items-center" title={c ? conceptLabel(c)?.label : undefined}>
                        <span className="text-caption-2 text-label-2">{tname.replace(" bimestre", "")}</span>
                        <span className="text-headline tabular">{c ?? (avg !== null ? avg.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—")}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {graded.some((x) => x.concept) && (
            <dl className="mt-3 grid gap-1.5 text-footnote text-label-2 sm:grid-cols-2">
              {school?.conceptScale.map((c) => (
                <div key={c.key}>
                  <dt className="inline font-semibold text-label">{c.key}</dt> <dd className="inline">— {c.label}: {c.description.charAt(0).toLowerCase() + c.description.slice(1)}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      {g.attendance.length > 0 && (
        <section className="mb-10" aria-label="Frequência">
          <AttendanceCard attendance={g.attendance} />
        </section>
      )}

      {g.reports.length > 0 && (
        <section aria-labelledby="pareceres" className="mb-10">
          <SectionTitle id="pareceres">Pareceres da professora</SectionTitle>
          <div className="space-y-3">
            {g.reports.map((r) => (
              <details key={r.id} className="group rounded-[20px] bg-surface p-4 shadow-e1">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <p className="text-headline">{r.title}</p>
                  <p className="text-footnote text-label-2">{r.approvedAt ? formatDay(isoFromTimestamp(r.approvedAt)) : ""} · <span className="text-accent group-open:hidden">Ler</span></p>
                </summary>
                <p className="mt-3 text-body leading-relaxed whitespace-pre-line">{r.content}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {g.highlights.length > 0 && (
        <section aria-labelledby="registros" className="mb-10">
          <SectionTitle id="registros">Registros compartilhados</SectionTitle>
          <div className="space-y-3">
            {g.highlights.map(({ e, author }) => (
              <article key={e.id} className="rounded-[20px] bg-surface p-4 shadow-e1">
                <CategoryLabel icon={seriesMeta.habilidades.icon} category={e.kind === "conquista" ? "achievement" : "notes"}>
                  {entryKinds[e.kind].label}
                </CategoryLabel>
                <h3 className="mt-1 text-headline">{e.title}</h3>
                <p className="mt-1 text-body text-label-2">{e.body}</p>
                <p className="mt-2 text-footnote text-label-2">
                  {author} · {formatDay(e.occurredOn)}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <details className="rounded-[16px] bg-surface-2 p-4 text-subhead dark:bg-surface">
        <summary className="cursor-pointer font-semibold">Palavras da escola, explicadas</summary>
        <dl className="mt-3 space-y-2">
          {Object.entries(familyGlossary).map(([t, m]) => (
            <div key={t}>
              <dt className="inline font-semibold capitalize">{t}:</dt> <dd className="inline text-label-2">{m}.</dd>
            </div>
          ))}
        </dl>
      </details>
    </Page>
  );
}
