import Link from "next/link";
import { BookOpenText, ChevronRight, PenLine, Calculator, ClipboardCheck, Sparkle, CalendarCheck, type LucideIcon } from "lucide-react";
import { CategoryLabel, categoryColor, type Category } from "@/components/ui/misc";
import { LevelChart, BarChart } from "@/components/charts/level-chart";
import { formatMonthShort, formatDay } from "@/lib/format";
import type { AssessmentSeries } from "@/server/queries/student";

export const seriesMeta: Record<AssessmentSeries["kind"], { icon: LucideIcon; category: Category; area: string }> = {
  leitura: { icon: BookOpenText, category: "reading", area: "Leitura" },
  escrita: { icon: PenLine, category: "writing", area: "Escrita" },
  matematica: { icon: Calculator, category: "math", area: "Matemática" },
  diagnostica: { icon: ClipboardCheck, category: "diagnostic", area: "Diagnóstica" },
  habilidades: { icon: Sparkle, category: "skills", area: "Habilidades" },
  personalizada: { icon: ClipboardCheck, category: "custom", area: "Sondagem" },
};

export function seriesChartData(s: AssessmentSeries) {
  return s.points.map((p) => ({
    x: p.roundId,
    xLabel: formatMonthShort(p.appliedOn),
    value: p.levelIndex,
    label: p.levelLabel,
    detail: `${p.title} · ${formatDay(p.appliedOn)}`,
  }));
}

/** Cartão de destaque: categoria, frase de tendência e gráfico compacto. */
export function HighlightCard({ series, sentence, href, familyLabel }: { series: AssessmentSeries; sentence: string; href?: string; familyLabel?: string }) {
  const meta = seriesMeta[series.kind];
  const last = series.points.filter((p) => p.levelIndex >= 0).at(-1);
  const color = categoryColor[meta.category];
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <CategoryLabel icon={meta.icon} category={meta.category}>
          {series.kind === "personalizada" || series.kind === "diagnostica" ? series.name : meta.area}
        </CategoryLabel>
        {href && <ChevronRight aria-hidden className="size-4 text-label-3" strokeWidth={2.4} />}
      </div>
      <p className="mt-1.5 text-title-3 leading-snug">{sentence}</p>
      <div className="mt-3">
        <LevelChart
          compact
          height={92}
          data={seriesChartData(series)}
          levels={series.scale.map((l) => ({ short: l.short, label: l.label }))}
          color={color}
          title={`Evolução em ${series.name}`}
        />
      </div>
      {last && (
        <p className="mt-2 flex items-baseline justify-between gap-2 text-footnote text-label-2">
          <span>
            Atual: <span className="font-semibold text-label">{last.levelLabel}</span>
          </span>
          <span className="shrink-0">{formatDay(last.appliedOn)}</span>
        </p>
      )}
      {familyLabel && <p className="mt-2 text-footnote text-label-2">{familyLabel}</p>}
    </>
  );
  const cls = "block rounded-xl bg-surface p-4 shadow-e1 outline-none";
  return href ? (
    <Link href={href} className={`${cls} press hover:shadow-e2`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function AttendanceCard({
  attendance,
  href,
}: {
  attendance: { termId: string; termName: string; year: string; rate: number | null; absences: number; justified: number; total: number }[];
  href?: string;
}) {
  const year = attendance.at(-1)?.year;
  const current = attendance.filter((a) => a.year === year);
  const last = current.at(-1);
  const pct = last?.rate !== null && last?.rate !== undefined ? Math.round(last.rate * 100) : null;
  return (
    <div className="rounded-xl bg-surface p-4 shadow-e1">
      <CategoryLabel icon={CalendarCheck} category="attendance">
        Frequência
      </CategoryLabel>
      <p className="mt-1.5 text-title-3 leading-snug">
        {pct === null ? "Sem registros de frequência" : `${pct}% de presença no ${last!.termName}`}
      </p>
      {last && (
        <p className="text-footnote text-label-2">
          {last.absences} {last.absences === 1 ? "falta" : "faltas"}
          {last.justified ? ` e ${last.justified} justificada${last.justified > 1 ? "s" : ""}` : ""} em {last.total} dias letivos
        </p>
      )}
      <BarChart
        className="mt-4"
        height={84}
        color={categoryColor.attendance}
        title="Presença por bimestre"
        data={current.map((a) => ({ key: a.termId, label: a.termName.replace(" bimestre", ""), value: a.rate }))}
      />
      {href && (
        <Link href={href} className="mt-3 inline-block text-footnote font-medium text-accent">
          Ver detalhes
        </Link>
      )}
    </div>
  );
}
