"use client";

import { useEffect, useState } from "react";
import { Check, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";

const SCALE = [
  { key: "PS", label: "Pré-silábico", text: "Está descobrindo que a escrita representa os sons da fala." },
  { key: "SSV", label: "Silábico sem valor sonoro", text: "Escreve partes das palavras, ainda sem relacionar letras e sons." },
  { key: "SCV", label: "Silábico com valor sonoro", text: "Usa uma letra por sílaba, já ligando letras e sons." },
  { key: "SA", label: "Silábico-alfabético", text: "Às vezes uma letra por sílaba, às vezes a sílaba completa." },
  { key: "A", label: "Alfabético", text: "Escreve as palavras representando todos os sons." },
] as const;
type Key = (typeof SCALE)[number]["key"];

const KIDS: { name: string; initials: string; before: Key; now: Key | null }[] = [
  { name: "Ana Clara Nunes", initials: "AN", before: "SSV", now: "SCV" },
  { name: "Bento Almeida", initials: "BA", before: "SCV", now: null },
  { name: "Lucas Ribeiro", initials: "LR", before: "SSV", now: null },
  { name: "Sofia Martins", initials: "SM", before: "SA", now: "A" },
];

/** Uma sondagem de hipóteses de escrita de verdade: toque nos níveis. */
export function SondagemDemo() {
  const [levels, setLevels] = useState<(Key | null)[]>(KIDS.map((k) => k.now));
  const [focus, setFocus] = useState<number>(1);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1400);
    return () => clearTimeout(t);
  }, [saved]);
  const done = levels.filter(Boolean).length;
  const idx = (k: Key) => SCALE.findIndex((s) => s.key === k);
  const dist = SCALE.map((s) => levels.filter((l) => l === s.key).length);
  const selected = levels[focus];

  return (
    <div className="overflow-hidden rounded-[28px] bg-surface shadow-e2">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <p className="flex items-baseline gap-1.5">
          <span className="font-rounded text-title-2 tabular-nums">{done}</span>
          <span className="text-subhead text-label-2">de {KIDS.length} lançados</span>
        </p>
        <span aria-live="polite" className={cn("flex items-center gap-1 text-footnote text-label-2 transition-opacity duration-300", saved ? "opacity-100" : "opacity-0")}>
          <Check className="size-3.5" strokeWidth={2.6} /> Salvo
        </span>
      </div>
      {/* Distribuição da turma, como a coordenação vê (sem nomes) */}
      <div className="mt-3 flex h-2 gap-[2px] overflow-hidden px-5" aria-hidden>
        {dist.map((n, i) =>
          n ? <span key={i} className="h-full rounded-full transition-[flex-grow] duration-500" style={{ flexGrow: n, background: "var(--writing)", opacity: 0.35 + i * 0.16 }} /> : null,
        )}
        {done < KIDS.length && <span className="h-full rounded-full bg-fill" style={{ flexGrow: KIDS.length - done }} />}
      </div>

      <ul className="mt-4">
        {KIDS.map((k, i) => {
          const cur = levels[i];
          const up = cur && idx(cur) > idx(k.before);
          return (
            <li key={k.name} className={cn("px-5 py-3.5", i > 0 && "shadow-[inset_0_0.5px_0_var(--separator)]")}>
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#a5abb8,#858994)] text-caption font-semibold text-white">{k.initials}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body">{k.name}</span>
                  <span className="flex items-center gap-1 text-footnote text-label-2">
                    Antes: {k.before}
                    {up && <TrendingUp className="size-3.5 text-positive-ink" strokeWidth={2.6} aria-label="avançou" />}
                  </span>
                </span>
              </div>
              <div role="radiogroup" aria-label={`Nível de ${k.name}`} className="mt-2.5 grid grid-cols-5 gap-1.5">
                {SCALE.map((s) => {
                  const on = cur === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={s.label}
                      onClick={() => {
                        setLevels((l) => l.map((x, j) => (j === i ? s.key : x)));
                        setFocus(i);
                        setSaved(true);
                      }}
                      className={cn(
                        "press h-10 rounded-[10px] text-subhead font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        on ? "text-white shadow-[0_4px_12px_-4px_color-mix(in_oklab,var(--writing)_70%,transparent)]" : "bg-fill text-label hover:bg-fill-2",
                      )}
                      style={on ? { background: "var(--writing)" } : undefined}
                    >
                      {s.key}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="bg-surface-2 px-5 py-4 dark:bg-surface-raised">
        <p className="text-footnote font-semibold text-writing-ink">{selected ? SCALE[idx(selected)].label : "Toque num nível"}</p>
        <p className="mt-0.5 text-subhead text-label-2">{selected ? SCALE[idx(selected)].text : "Cada nível vem com a explicação que a família recebe, em linguagem simples."}</p>
      </div>
    </div>
  );
}

/** Cartão no estilo do app Saúde: a evolução de uma criança ao longo do ano. */
export function GrowthCard() {
  const pts = [0, 1, 1, 2, 3]; // PS → SSV → SSV → SCV → SA
  const months = ["Mar", "Mai", "Jun", "Ago", "Out"];
  const W = 300, H = 92, x = (i: number) => 8 + (i * (W - 16)) / (pts.length - 1), y = (v: number) => H - 10 - (v * (H - 20)) / 4;
  let d = `M ${x(0)} ${y(pts[0])}`;
  for (let i = 1; i < pts.length; i++) d += ` H ${x(i)} V ${y(pts[i])}`;
  return (
    <div className="rounded-[20px] bg-surface p-5 shadow-e1">
      <p className="text-subhead font-semibold text-writing-ink">Escrita</p>
      <p className="mt-1 text-title-3">Avançou 3 níveis desde março</p>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="mt-4 w-full" role="img" aria-label="Gráfico em degraus: de pré-silábico em março a silábico-alfabético em outubro">
        <defs>
          <linearGradient id="lp-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--writing)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--writing)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="8" x2={W - 8} y1={y(4)} y2={y(4)} stroke="var(--separator)" strokeDasharray="2 3" />
        <path d={`${d} V ${H - 10} H ${x(0)} Z`} fill="url(#lp-g)" />
        <path d={d} fill="none" stroke="var(--writing)" strokeWidth="2.2" strokeLinejoin="round" />
        {pts.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === pts.length - 1 ? 5 : 3.2} fill={i === pts.length - 1 ? "var(--writing)" : "var(--surface)"} stroke="var(--writing)" strokeWidth="1.8" />
        ))}
        {months.map((m, i) => (
          <text key={m} x={x(i)} y={H + 12} textAnchor={i === 0 ? "start" : i === months.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--label-2)">
            {m}
          </text>
        ))}
      </svg>
      <p className="mt-2 flex justify-between text-footnote text-label-2">
        <span>
          Atual: <span className="font-semibold text-label">Silábico-alfabético</span>
        </span>
        <span>14 de outubro</span>
      </p>
    </div>
  );
}
