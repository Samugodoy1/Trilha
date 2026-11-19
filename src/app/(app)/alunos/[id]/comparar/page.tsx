import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { requireSession } from "@/server/session";
import { isFamily, isUuid, pageGuard } from "@/server/access";
import { getStudentProfile } from "@/server/queries/student";
import { getTerms } from "@/server/queries/common";
import { Page } from "@/components/ui/page";
import { CategoryLabel, SectionTitle, categoryColor, EmptyState } from "@/components/ui/misc";
import { seriesMeta } from "@/components/student/highlights";
import { TermPicker } from "./term-picker";
import { formatDay, todayISO } from "@/lib/format";
import { entryKinds } from "@/lib/vocabulary";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Comparar bimestres" };

export default async function ComparePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ a?: string; b?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireSession();
  if (isFamily(ctx) || !isUuid(id)) notFound();
  const p = await pageGuard(() => getStudentProfile(ctx, id));
  const allTerms = (await getTerms(p.student.schoolId)).filter((t) => t.startsOn <= todayISO());
  if (allTerms.length < 2)
    return (
      <Page title="Comparar bimestres" back={{ href: `/alunos/${id}`, label: p.student.name }}>
        <EmptyState icon={ArrowRight} title="Ainda não há dois períodos" message="A comparação fica disponível a partir do segundo bimestre." />
      </Page>
    );
  const termA = allTerms.find((t) => t.id === sp.a) ?? allTerms[allTerms.length - 2];
  const termB = allTerms.find((t) => t.id === sp.b) ?? allTerms[allTerms.length - 1];
  const inTerm = (date: string, t: typeof termA) => date >= t.startsOn && date <= t.endsOn;
  const label = (t: typeof termA) => `${t.name}${t.startsOn.slice(0, 4) !== termB.startsOn.slice(0, 4) || t.startsOn.slice(0, 4) !== termA.startsOn.slice(0, 4) ? ` ${t.startsOn.slice(0, 4)}` : ""}`;

  // Sondagens: último ponto em cada período
  const rows = p.series
    .map((s) => {
      const a = s.points.filter((x) => inTerm(x.appliedOn, termA)).at(-1);
      const b = s.points.filter((x) => inTerm(x.appliedOn, termB)).at(-1);
      return { s, a, b, delta: a && b && a.levelIndex >= 0 && b.levelIndex >= 0 ? b.levelIndex - a.levelIndex : null };
    })
    .filter((r) => r.a || r.b);

  const subjects = [...new Set(p.grades.map((g) => g.subject))];
  const gradeFor = (subject: string, t: typeof termA) => {
    const list = p.grades.filter((g) => g.subject === subject && g.termId === t.id && (g.concept || g.score !== null));
    const num = list.filter((g) => g.score !== null && !g.isRecovery);
    if (num.length) {
      const w = num.reduce((a, g) => a + g.weight, 0);
      return { text: (num.reduce((a, g) => a + (g.score! / (g.maxScore ?? 10)) * 10 * g.weight, 0) / w).toLocaleString("pt-BR", { maximumFractionDigits: 1 }), n: num.reduce((a, g) => a + (g.score! / (g.maxScore ?? 10)) * 10 * g.weight, 0) / w };
    }
    const c = list.at(-1)?.concept;
    return c ? { text: c, n: ["ND", "ED", "D", "PD"].indexOf(c) } : null;
  };
  const attA = p.attendance.find((x) => x.termId === termA.id);
  const attB = p.attendance.find((x) => x.termId === termB.id);

  const entriesIn = (t: typeof termA) => p.entries.filter(({ e }) => inTerm(e.occurredOn, t));
  const count = (t: typeof termA, k: string) => entriesIn(t).filter(({ e }) => e.kind === k).length;
  const between = p.entries.filter(({ e }) => (e.kind === "intervencao" || e.kind === "estrategia") && e.occurredOn >= termA.startsOn && e.occurredOn <= termB.endsOn);

  // Síntese factual
  const advanced = rows.filter((r) => (r.delta ?? 0) > 0);
  const stable = rows.filter((r) => r.delta === 0);
  const summary: string[] = [];
  if (advanced.length) summary.push(`Avançou em ${advanced.map((r) => seriesMeta[r.s.kind].area.toLowerCase()).join(" e ")}.`);
  if (stable.length) summary.push(`Manteve o nível em ${stable.map((r) => seriesMeta[r.s.kind].area.toLowerCase()).join(" e ")}.`);
  if (attA?.rate != null && attB?.rate != null) {
    const d = Math.round((attB.rate - attA.rate) * 100);
    summary.push(d === 0 ? "Frequência estável." : `Frequência ${d > 0 ? "subiu" : "caiu"} ${Math.abs(d)} pontos percentuais.`);
  }
  if (between.length) summary.push(`${between.length} ${between.length === 1 ? "estratégia ou intervenção registrada" : "estratégias ou intervenções registradas"} no período.`);

  const Arrow = ({ d }: { d: number | null }) =>
    d === null ? <span className="text-label-3">—</span> : d > 0 ? <TrendingUp aria-label="Avanço" className="size-5 text-positive-ink" strokeWidth={2.4} /> : d < 0 ? <TrendingDown aria-label="Recuo" className="size-5 text-warning-ink" strokeWidth={2.4} /> : <Minus aria-label="Estável" className="size-5 text-label-2" strokeWidth={2.4} />;

  return (
    <Page title="Comparar bimestres" back={{ href: `/alunos/${id}`, label: p.student.preferredName ?? p.student.fullName.split(" ")[0] }} eyebrow={p.student.name} width="default">
      <TermPicker terms={allTerms.map((t) => ({ id: t.id, label: label(t) }))} a={termA.id} b={termB.id} />

      {summary.length > 0 && (
        <div className="mt-6 rounded-xl bg-surface p-5 shadow-e1">
          <p className="text-footnote font-semibold text-label-2">
            {label(termA)} → {label(termB)}
          </p>
          <p className="mt-1 text-title-3 leading-snug">{summary.join(" ")}</p>
          <p className="mt-2 text-footnote text-label-2">Síntese calculada a partir dos registros. Não substitui o olhar pedagógico.</p>
        </div>
      )}

      <section className="mt-10" aria-labelledby="cmp-sond">
        <SectionTitle id="cmp-sond">Sondagens</SectionTitle>
        {rows.length === 0 ? (
          <p className="text-callout text-label-2">Sem sondagens nesses períodos.</p>
        ) : (
          <div className="space-y-3">
            {rows.map(({ s, a, b, delta }) => {
              const meta = seriesMeta[s.kind];
              const color = categoryColor[meta.category];
              const n = s.scale.length;
              return (
                <div key={s.templateId} className="rounded-xl bg-surface p-4 shadow-e1">
                  <div className="flex items-center justify-between">
                    <CategoryLabel icon={meta.icon} category={meta.category}>
                      {s.name}
                    </CategoryLabel>
                    <Arrow d={delta} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    {[a, b].map((pt, i) => (
                      <div key={i}>
                        <p className="text-footnote text-label-2">{label(i === 0 ? termA : termB)}</p>
                        <p className="text-headline">{pt ? pt.levelLabel : "Sem sondagem"}</p>
                        {pt && <p className="text-footnote text-label-2">{formatDay(pt.appliedOn)}</p>}
                      </div>
                    ))}
                  </div>
                  {/* Escala com os dois pontos (dumbbell) */}
                  <div className="relative mt-4 h-6" aria-hidden>
                    <div className="absolute top-1/2 right-0 left-0 h-[2px] -translate-y-1/2 rounded-full bg-fill-2" />
                    {a && b && a.levelIndex >= 0 && b.levelIndex >= 0 && (
                      <div
                        className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
                        style={{ left: `${(Math.min(a.levelIndex, b.levelIndex) / (n - 1)) * 100}%`, width: `${(Math.abs(b.levelIndex - a.levelIndex) / (n - 1)) * 100}%`, background: color }}
                      />
                    )}
                    {[a, b].map((pt, i) =>
                      pt && pt.levelIndex >= 0 ? (
                        <span
                          key={i}
                          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                          style={{ left: `${(pt.levelIndex / (n - 1)) * 100}%`, background: i === 1 ? color : "var(--surface)", boxShadow: `inset 0 0 0 2px ${color}` }}
                        />
                      ) : null,
                    )}
                  </div>
                  <div className="mt-1 flex justify-between text-caption-2 text-label-2">
                    <span>{s.scale[0].short}</span>
                    <span>{s.scale[n - 1].short}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {subjects.length > 0 && (
        <section className="mt-10" aria-labelledby="cmp-notas">
          <SectionTitle id="cmp-notas">Notas e conceitos</SectionTitle>
          <div className="overflow-hidden rounded-xl bg-surface shadow-e1">
            <table className="w-full text-left">
              <thead>
                <tr className="text-footnote text-label-2">
                  <th className="px-4 py-3 font-medium">Componente</th>
                  <th className="px-3 py-3 text-center font-medium">{label(termA)}</th>
                  <th className="px-3 py-3 text-center font-medium">{label(termB)}</th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => {
                  const ga = gradeFor(s, termA);
                  const gb = gradeFor(s, termB);
                  return (
                    <tr key={s} className="shadow-[inset_0_0.5px_0_var(--separator)]">
                      <th scope="row" className="px-4 py-3 text-callout font-medium">{s}</th>
                      <td className="px-3 py-3 text-center font-rounded text-headline tabular">{ga?.text ?? "—"}</td>
                      <td className="px-3 py-3 text-center font-rounded text-headline tabular">{gb?.text ?? "—"}</td>
                      <td className="px-3 py-3">
                        <Arrow d={ga && gb ? Math.sign(Math.round((gb.n - ga.n) * 10)) : null} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-10" aria-labelledby="cmp-reg">
        <SectionTitle id="cmp-reg">Registros pedagógicos</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["conquista", "dificuldade", "intervencao", "observacao"] as const).map((k) => (
            <div key={k} className="rounded-xl bg-surface p-4 shadow-e1">
              <p className="text-footnote text-label-2">{entryKinds[k].plural}</p>
              <p className="mt-1 font-rounded text-title-2 tabular">
                {count(termA, k)} <span className="text-label-3">→</span> {count(termB, k)}
              </p>
            </div>
          ))}
        </div>
        {attA && attB && (
          <p className="mt-3 px-1 text-footnote text-label-2">
            Frequência: {Math.round((attA.rate ?? 0) * 100)}% → {Math.round((attB.rate ?? 0) * 100)}%
          </p>
        )}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {[termA, termB].map((t) => (
            <div key={t.id} className="min-w-0">
              <h3 className="mb-2 font-sans text-headline">{label(t)}</h3>
              {entriesIn(t).length === 0 && <p className="text-subhead text-label-2">Nenhum registro.</p>}
              <ul className="space-y-2">
                {entriesIn(t).map(({ e }) => (
                  <li key={e.id} className={cn("rounded-[14px] bg-surface p-3 shadow-e1")}>
                    <p className="text-footnote font-semibold text-notes">
                      {entryKinds[e.kind].label} · {formatDay(e.occurredOn)}
                    </p>
                    <p className="text-subhead">{e.title}</p>
                    <p className="line-clamp-3 text-footnote text-label-2">{e.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </Page>
  );
}
