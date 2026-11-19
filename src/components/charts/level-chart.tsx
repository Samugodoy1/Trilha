"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type LevelDatum = { x: string; xLabel: string; value: number; label: string; detail?: string };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * Evolução de nível ao longo das sondagens (linha em degraus).
 * Uma única série: a cor identifica a área; o último ponto é destacado.
 * Acessível: cada ponto é focável e há uma tabela equivalente para leitores de tela.
 */
export function LevelChart({
  data,
  levels,
  color,
  height = 120,
  compact,
  title,
}: {
  data: LevelDatum[];
  levels: { short: string; label: string }[];
  color: string;
  height?: number;
  compact?: boolean;
  title: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const uid = useId();
  const padL = compact ? 4 : 40;
  const padR = compact ? 10 : 16;
  const padT = 12;
  const padB = compact ? 22 : 26;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padT - padB;
  const n = levels.length;
  const y = (v: number) => padT + innerH - (n <= 1 ? 0 : (v / (n - 1)) * innerH);
  const x = (i: number) => padL + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const valid = data.map((d, i) => ({ ...d, i })).filter((d) => d.value >= 0);

  let path = "";
  valid.forEach((d, k) => {
    const px = x(d.i);
    const py = y(d.value);
    if (k === 0) path += `M${px},${py}`;
    else {
      const prev = valid[k - 1];
      const mid = (x(prev.i) + px) / 2;
      path += ` H${mid} V${py} H${px}`;
    }
  });
  const last = valid[valid.length - 1];
  const area = valid.length > 1 && last ? `${path} V${padT + innerH} H${x(valid[0].i)} Z` : "";

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-labelledby={`${uid}-t`} className="overflow-visible">
          <title id={`${uid}-t`}>{title}</title>
          <defs>
            <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.16" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* grade recessiva */}
          {levels.map((l, i) =>
            compact && i !== 0 && i !== n - 1 ? null : (
              <g key={l.short}>
                <line x1={padL} x2={width - padR} y1={y(i)} y2={y(i)} stroke="var(--separator)" strokeDasharray={i === 0 ? undefined : "2 4"} />
                {!compact && (
                  <text x={padL - 10} y={y(i)} dy="0.32em" textAnchor="end" className="fill-label-2 text-[10px] font-medium">
                    {l.short}
                  </text>
                )}
              </g>
            ),
          )}
          {area && <path d={area} fill={`url(#${uid}-g)`} />}
          <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {valid.map((d) => {
            const isLast = d.i === last?.i;
            return (
              <g key={d.x}>
                <circle cx={x(d.i)} cy={y(d.value)} r={isLast ? 5 : 3.5} fill={isLast ? color : "var(--surface)"} stroke={color} strokeWidth={2} />
                {isLast && <circle cx={x(d.i)} cy={y(d.value)} r={9} fill={color} opacity={0.14} />}
              </g>
            );
          })}
          {data.map((d, i) => (
            <text key={d.x} x={x(i)} y={height - 6} textAnchor={data.length > 1 && i === 0 && compact ? "start" : data.length > 1 && i === data.length - 1 && compact ? "end" : "middle"} className="fill-label-2 text-[10px] font-medium">
              {d.xLabel}
            </text>
          ))}
          {active !== null && data[active] && data[active].value >= 0 && (
            <line x1={x(active)} x2={x(active)} y1={padT} y2={padT + innerH} stroke="var(--label-3)" strokeWidth={1} />
          )}
          {/* alvos de interação maiores que as marcas */}
          {data.map((d, i) => (
            <rect
              key={`hit-${d.x}`}
              x={x(i) - Math.max(14, innerW / Math.max(1, data.length) / 2)}
              y={0}
              width={Math.max(28, innerW / Math.max(1, data.length))}
              height={height}
              fill="transparent"
              tabIndex={compact ? -1 : 0}
              aria-label={`${d.xLabel}: ${d.label}`}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="outline-none"
            />
          ))}
        </svg>
      )}
      {active !== null && data[active] && width > 0 && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-max max-w-56 -translate-x-1/2 -translate-y-full rounded-[10px] bg-surface-raised px-2.5 py-1.5 text-footnote shadow-e2"
          style={{ left: Math.min(Math.max(x(active), 80), width - 80), top: Math.max(0, data[active].value >= 0 ? y(data[active].value) - 12 : 0) }}
        >
          <p className="font-semibold">{data[active].label}</p>
          <p className="text-label-2">{data[active].detail ?? data[active].xLabel}</p>
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Sondagem</th>
            <th>Nível</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.x}>
              <td>{d.detail ?? d.xLabel}</td>
              <td>{d.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Barras verticais simples (ex.: presença por bimestre). Marcas finas, cantos de 4px na extremidade. */
export function BarChart({
  data,
  color,
  height = 96,
  max = 1,
  format = (v: number) => `${Math.round(v * 100)}%`,
  title,
  className,
}: {
  data: { key: string; label: string; value: number | null; detail?: string }[];
  color: string;
  height?: number;
  max?: number;
  format?: (v: number) => string;
  title: string;
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <figure className={cn("w-full", className)} aria-label={title}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => {
          const h = d.value === null ? 0 : Math.max(4, (d.value / max) * (height - 18));
          return (
            <div
              key={d.key}
              className="relative flex flex-1 flex-col items-center justify-end"
              style={{ height }}
              onPointerEnter={() => setActive(d.key)}
              onPointerLeave={() => setActive(null)}
            >
              {active === d.key && d.value !== null && (
                <span className="absolute -top-1 z-10 -translate-y-full rounded-[8px] bg-surface-raised px-2 py-1 text-caption whitespace-nowrap shadow-e2">
                  {d.detail ?? format(d.value)}
                </span>
              )}
              <span className="mb-1 text-caption-2 font-semibold text-label-2 tabular">{d.value === null ? "" : format(d.value)}</span>
              <span
                className="w-full max-w-9 rounded-t-[4px] transition-[height] duration-500"
                style={{ height: h, background: d.value === null ? "var(--fill)" : color, opacity: active && active !== d.key ? 0.45 : 1 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-2">
        {data.map((d) => (
          <span key={d.key} className="flex-1 text-center text-caption-2 font-medium text-label-2">
            {d.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{d.value === null ? "sem dados" : format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Distribuição por nível (barra empilhada horizontal), para visões de turma. Sem nomes de alunos. */
export function DistributionBar({
  segments,
  className,
}: {
  segments: { key: string; label: string; count: number; color: string }[];
  className?: string;
}) {
  const total = segments.reduce((a, s) => a + s.count, 0) || 1;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={segments.map((s) => `${s.label}: ${s.count}`).join(", ")}>
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <span key={s.key} title={`${s.label}: ${s.count}`} style={{ width: `${(s.count / total) * 100}%`, background: s.color }} />
          ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-footnote text-label-2">
            <span aria-hidden className="size-2 rounded-full" style={{ background: s.color }} />
            {s.label}
            <span className="font-semibold text-label tabular">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

