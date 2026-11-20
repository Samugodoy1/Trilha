import Link from "next/link";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { categoryColor, categoryInk, VisibilityBadge } from "@/components/ui/misc";
import { formatDay, formatMonth, parseISODate } from "@/lib/format";
import type { TimelineEvent } from "@/server/queries/student";

function groupByMonth(events: TimelineEvent[]) {
  const groups: { key: string; label: string; events: TimelineEvent[] }[] = [];
  for (const e of events) {
    const key = e.date.slice(0, 7);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: `${formatMonth(e.date)} de ${parseISODate(e.date).getUTCFullYear()}`, events: [] };
      groups.push(g);
    }
    g.events.push(e);
  }
  return groups;
}

/** Linha do tempo cronológica: a trajetória de aprendizagem contada pelos registros. */
export function Timeline({ events, showVisibility = true }: { events: TimelineEvent[]; showVisibility?: boolean }) {
  const groups = groupByMonth(events);
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label}>
          <h3 className="sticky top-[calc(env(safe-area-inset-top)+50px)] z-10 -mx-1 mb-3 px-1 py-1 font-sans text-headline md:top-14">
            <span className="rounded-full bg-canvas/85 py-1 pr-3 backdrop-blur">{g.label}</span>
          </h3>
          <ol className="relative space-y-3 pl-6 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-[2px] before:rounded-full before:bg-separator">
            {g.events.map((e) => {
              const color = categoryColor[e.category];
              const content = (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-footnote font-semibold" style={{ color: categoryInk[e.category] }}>
                      {e.label}
                    </span>
                    <time dateTime={e.date} className="shrink-0 text-footnote text-label-2">
                      {formatDay(e.date)}
                    </time>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-headline">
                    {e.delta !== undefined && e.delta > 0 && <TrendingUp aria-label="Avanço" className="size-4 shrink-0 text-positive-ink" strokeWidth={2.4} />}
                    {e.title}
                  </p>
                  {e.body && <p className="mt-1 text-callout leading-snug whitespace-pre-line">{e.body}</p>}
                  {e.mediaId && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/media/${e.mediaId}`} alt={e.title} loading="lazy" className="mt-3 aspect-[4/3] w-full max-w-sm rounded-[12px] object-cover" />
                  )}
                  {(e.author || (showVisibility && e.visibility)) && (
                    <div className="mt-2 flex items-center gap-3 text-footnote text-label-2">
                      {showVisibility && e.visibility && <VisibilityBadge visibility={e.visibility} />}
                      {e.author && <span>{e.author}</span>}
                      {e.href && <ArrowUpRight aria-hidden className="ml-auto size-4 text-label-3" />}
                    </div>
                  )}
                </>
              );
              return (
                <li key={`${e.type}-${e.id}`} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-4 -left-6 size-4 rounded-full ring-4 ring-canvas"
                    style={{ background: `color-mix(in oklab, ${color} 22%, var(--surface))`, boxShadow: `inset 0 0 0 2px ${color}` }}
                  />
                  {e.href ? (
                    <Link href={e.href} className="press block rounded-xl bg-surface p-4 shadow-e1 outline-none hover:shadow-e2">
                      {content}
                    </Link>
                  ) : (
                    <div className="rounded-xl bg-surface p-4 shadow-e1">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
