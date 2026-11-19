import type { Metadata } from "next";
import { FileText, Link2, MapPin } from "lucide-react";
import { getFamilyAgenda } from "@/server/queries/family";
import { Page } from "@/components/ui/page";
import { Tag } from "@/components/ui/misc";
import { AnnouncementActions, MarkAnnouncementsRead, TaskCheck } from "@/components/family/family-ui";
import { loadFamily, NoChild } from "../shared";
import { formatFullDay, formatRelativeDay, formatTime, isoFromTimestamp, todayISO } from "@/lib/format";
import { announcementKinds, taskKinds } from "@/lib/vocabulary";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Agenda" };

type Item =
  | { type: "task"; date: string; id: string; data: Awaited<ReturnType<typeof getFamilyAgenda>>["tasks"][number] }
  | { type: "ann"; date: string; id: string; data: Awaited<ReturnType<typeof getFamilyAgenda>>["announcements"][number] };

export default async function AgendaPage() {
  const { ctx, child } = await loadFamily();
  if (!child) return <NoChild title="Agenda" />;
  const a = await getFamilyAgenda(ctx, child);
  const today = todayISO();
  const items: Item[] = [
    ...a.tasks.map((t) => ({ type: "task" as const, date: t.dueOn ?? isoFromTimestamp(t.publishedAt), id: t.id, data: t })),
    ...a.announcements.map((x) => ({ type: "ann" as const, date: isoFromTimestamp(x.startsAt ?? x.publishedAt), id: x.id, data: x })),
  ];
  const upcoming = items.filter((i) => i.date >= today).sort((x, y) => x.date.localeCompare(y.date));
  const past = items.filter((i) => i.date < today).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 12);
  const unreadIds = a.announcements.filter((x) => !x.response).map((x) => x.id);

  const group = (list: Item[]) => {
    const m = new Map<string, Item[]>();
    for (const i of list) m.set(i.date, [...(m.get(i.date) ?? []), i]);
    return [...m.entries()];
  };

  const renderItem = (i: Item, last: boolean) => {
    if (i.type === "task") {
      const t = i.data;
      return (
        <li key={`t-${t.id}`} className="flex items-start gap-3.5 pl-5 md:pl-0">
          <span className="mt-[12px]">
            <TaskCheck taskId={t.id} studentId={child.id} done={Boolean(t.completion)} title={t.title} acceptsSubmissions={t.acceptsSubmissions} />
          </span>
          <div className={cn("min-w-0 flex-1 py-[10px] pr-4", !last && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
            <p className={cn("text-body", t.completion && "text-label-2 line-through decoration-label-3")}>{t.title}</p>
            <p className="text-subhead text-label-2">
              {taskKinds[t.kind]} · {t.author.split(" ")[0]}
              {t.completion && " · feita"}
            </p>
            {t.instructions && <p className="mt-1 text-subhead text-label-2">{t.instructions}</p>}
            {(t.links.length > 0 || t.files.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {t.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-footnote font-semibold text-accent">
                    <Link2 aria-hidden className="size-3.5" /> {l.title}
                  </a>
                ))}
                {t.files.map((f) => (
                  <a key={f.id} href={`/api/media/${f.id}`} target="_blank" className="flex items-center gap-1.5 rounded-full bg-fill px-3 py-1 text-footnote font-semibold">
                    <FileText aria-hidden className="size-3.5" /> {f.name ?? f.caption ?? "Arquivo"}
                  </a>
                ))}
              </div>
            )}
          </div>
        </li>
      );
    }
    const x = i.data;
    return (
      <li key={`a-${x.id}`} className={cn("mx-5 my-2 md:mx-0", x.important ? "rounded-[18px] bg-[color-mix(in_oklab,var(--critical)_7%,var(--surface))] p-4" : "py-1")}>
        <div className="flex items-center gap-2">
          <span className={cn("text-footnote font-semibold", x.important ? "text-critical-ink" : "text-label-2")}>{announcementKinds[x.kind]}</span>
          {x.important && <Tag tone="critical">Importante</Tag>}
          {!x.response && <span aria-label="Novo" className="size-2 rounded-full bg-accent" />}
        </div>
        <p className="mt-0.5 text-body font-semibold">{x.title}</p>
        {x.body && <p className="mt-0.5 text-subhead text-label-2">{x.body}</p>}
        {(x.startsAt || x.location) && (
          <p className="mt-1 flex items-center gap-1 text-footnote text-label-2">
            {x.startsAt && `${formatTime(x.startsAt)}`}
            {x.location && (
              <>
                <MapPin aria-hidden className="ml-1 size-3" /> {x.location}
              </>
            )}
          </p>
        )}
        {(x.isAuthorization || x.requiresConfirmation) && (
          <div className="mt-3">
            <AnnouncementActions
              announcementId={x.id}
              studentId={child.id}
              isAuthorization={x.isAuthorization}
              requiresConfirmation={x.requiresConfirmation}
              response={x.response ? { confirmedAt: x.response.confirmedAt?.toISOString() ?? null, authorization: x.response.authorization } : null}
            />
          </div>
        )}
        {!last && !x.important && <div className="mt-3 h-px bg-separator" />}
      </li>
    );
  };

  return (
    <Page title="Agenda" titleTint subtitle={`Tarefas, recados e eventos de ${child.firstName}.`} width="narrow">
      <MarkAnnouncementsRead studentId={child.id} ids={unreadIds} />
      {upcoming.length === 0 && <p className="text-callout text-label-2">Nada programado por enquanto.</p>}
      <div className="-mx-5 md:mx-0">
        {group(upcoming).map(([date, list]) => (
          <section key={date} aria-label={formatFullDay(date)} className="pb-2">
            <h2 className="px-5 pt-4 pb-1 font-sans text-subhead font-semibold text-label-2 shadow-[inset_0_0.5px_0_var(--separator)] md:px-0">
              {["Hoje", "Amanhã"].includes(formatRelativeDay(date)) ? (
                <>
                  <span className={date === today ? "text-critical-ink" : ""}>{formatRelativeDay(date)}</span>
                  <span className="font-normal"> · {formatFullDay(date)}</span>
                </>
              ) : (
                formatFullDay(date)
              )}
            </h2>
            <ul>{list.map((i, k) => renderItem(i, k === list.length - 1))}</ul>
          </section>
        ))}
      </div>
      {past.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-callout font-medium text-accent">Ver anteriores</summary>
          <ul className="-mx-5 mt-2 md:mx-0">{past.map((i, k) => renderItem(i, k === past.length - 1))}</ul>
        </details>
      )}
    </Page>
  );
}
