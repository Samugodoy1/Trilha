import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight, ClipboardList, Ellipsis, HeartHandshake, ListChecks, MessageCircle, PencilLine, UserRound, type LucideIcon } from "lucide-react";
import { requireRole } from "@/server/session";
import { getTeacherToday, type TodayItem } from "@/server/queries/today";
import { Page } from "@/components/ui/page";
import { Avatar } from "@/components/ui/avatar";
import { SectionTitle, VisibilityBadge } from "@/components/ui/misc";
import { formatFullDay, formatRelativeDay, firstName, greeting, todayISO, addDays } from "@/lib/format";
import { entryKinds } from "@/lib/vocabulary";
import { cn } from "@/lib/cn";
import { HojeCompose } from "./quick-actions";

export const metadata: Metadata = { title: "Hoje" };

const itemIcon: Record<TodayItem["kind"], LucideIcon> = {
  messages: MessageCircle,
  assessment: ClipboardList,
  weekly: BookOpen,
  draft: PencilLine,
  contribution: HeartHandshake,
  feedback: MessageCircle,
  authorization: ListChecks,
};

const typeLabel: Record<TodayItem["kind"], string> = {
  messages: "Mensagens",
  assessment: "Sondagens",
  weekly: "Nossa semana",
  draft: "Diário",
  contribution: "Família",
  feedback: "Feedback",
  authorization: "Agenda",
};

function Tile({ icon: Icon, label, count, tint, href }: { icon: LucideIcon; label: string; count: number; tint: string; href: string }) {
  return (
    <Link href={href} className="press flex flex-col justify-between gap-2 rounded-[14px] bg-surface-2 p-3 outline-none hover:brightness-[0.98] dark:bg-surface">
      <div className="flex items-start justify-between">
        <span className="flex size-8 items-center justify-center rounded-full text-white" style={{ background: tint }}>
          <Icon aria-hidden className="size-[17px]" strokeWidth={2.4} />
        </span>
        <span className="font-sans text-[1.75rem] leading-none font-bold tabular">{count}</span>
      </div>
      <span className="text-subhead font-semibold text-label-2">{label}</span>
    </Link>
  );
}

const CLASS_GRADIENTS = [
  "linear-gradient(160deg, #5ac8fa 0%, #007aff 100%)",
  "linear-gradient(160deg, #7d7aff 0%, #5856d6 100%)",
  "linear-gradient(160deg, #ffb340 0%, #ff9500 100%)",
  "linear-gradient(160deg, #63e6a5 0%, #34c759 100%)",
];

export default async function TodayPage() {
  const ctx = await requireRole("teacher");
  const d = await getTeacherToday(ctx);
  const today = todayISO();
  const count = (k: TodayItem["kind"]) => d.items.filter((i) => i.kind === k).length;
  const unreadCount = d.unreadCount;
  const weekTasks = d.upcoming.filter((u) => u.type === "Entrega" && u.date <= addDays(today, 7)).length;

  const byDay = new Map<string, typeof d.upcoming>();
  for (const u of d.upcoming) byDay.set(u.date, [...(byDay.get(u.date) ?? []), u]);

  return (
    <Page title="Hoje" titleTint eyebrow={formatFullDay(today)} subtitle={`${greeting()}, ${firstName(ctx.user.name)}.${d.term ? ` ${d.term.name}.` : ""}`} width="wide">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Tile icon={MessageCircle} label="Recados" count={unreadCount} tint="var(--accent)" href="/mensagens" />
        <Tile icon={ClipboardList} label="Sondagens" count={count("assessment")} tint="var(--writing)" href="/sondagens" />
        <Tile icon={UserRound} label="Acompanhar" count={d.attention.length} tint="var(--family)" href="#acompanhar" />
        <Tile icon={ListChecks} label="Entregas" count={weekTasks} tint="var(--reading)" href="/tarefas" />
      </div>

      <div className="mt-9 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="para-hoje">
            <SectionTitle id="para-hoje">Para hoje</SectionTitle>
            {d.items.length === 0 ? (
              <p className="py-6 text-callout text-label-2">Tudo em dia. Que tal registrar algo bom que aconteceu hoje?</p>
            ) : (
              <ul className="-mx-5 md:mx-0">
                {d.items.map((item, i) => (
                  <li key={item.id}>
                    <Link href={item.href} className="group flex items-start gap-3.5 pl-4 outline-none hover:bg-fill/40 focus-visible:bg-fill md:pl-0 md:hover:bg-transparent">
                      {(() => {
                        const Icon = itemIcon[item.kind];
                        return (
                          <span aria-hidden className="mt-[11px] flex size-[30px] shrink-0 items-center justify-center rounded-full text-white" style={{ background: item.tint }}>
                            <Icon className="size-[16px]" strokeWidth={2.4} />
                          </span>
                        );
                      })()}
                      <span className={cn("flex min-w-0 flex-1 items-center gap-2 py-[11px] pr-4", i < d.items.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
                        <span className="min-w-0 flex-1">
                        <span className="block text-body">{item.title}</span>
                        <span className="mt-0.5 block text-subhead text-label-2">
                          {item.detail}
                          {item.status && <span className="text-critical-ink"> – {item.status}</span>}
                        </span>
                        </span>
                        <ChevronRight aria-hidden className="size-[15px] shrink-0 text-label-3/70" strokeWidth={2.6} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <HojeCompose />
          </section>

          {(d.attention.length > 0 || d.noRecords.count > 0) && (
            <section id="acompanhar" aria-labelledby="acompanhar-h" className="scroll-mt-20">
              <SectionTitle id="acompanhar-h">Para acompanhar</SectionTitle>
              <ul className="-mx-5 md:mx-0">
                {d.attention.map((a, i) => (
                  <li key={a.studentId}>
                    <Link href={`/alunos/${a.studentId}`} className="flex items-center gap-3.5 pl-4 outline-none hover:bg-fill/40 md:pl-0">
                      <Avatar name={a.name} hue={a.hue} size="md" />
                      <span className={cn("flex min-w-0 flex-1 items-center gap-2 py-3 pr-4", (i < d.attention.length - 1 || d.noRecords.count > 0) && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body">{a.name}</span>
                          <span className="block text-subhead text-label-2">{a.reasons.slice(0, 2).join(" · ")}</span>
                        </span>
                        <ChevronRight aria-hidden className="size-[15px] text-label-3/70" strokeWidth={2.6} />
                      </span>
                    </Link>
                  </li>
                ))}
                {d.noRecords.count > 0 && (
                  <li>
                    <Link href={`/turmas/${d.noRecords.classId}?filtro=sem-registros`} className="flex items-center gap-3.5 pl-4 outline-none hover:bg-fill/40 md:pl-0">
                      <span className="flex size-10 items-center justify-center rounded-full bg-fill text-label-2">
                        <Ellipsis aria-hidden className="size-5" />
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-2 py-3 pr-4">
                        <span className="min-w-0 flex-1">
                          <span className="block text-body">{d.noRecords.count} alunos sem registro neste bimestre</span>
                          <span className="block text-subhead text-label-2">Um registro curto já ajuda a contar a história de cada um</span>
                        </span>
                        <ChevronRight aria-hidden className="size-[15px] text-label-3/70" strokeWidth={2.6} />
                      </span>
                    </Link>
                  </li>
                )}
              </ul>
              <p className="mt-2 text-footnote text-label-2">Sinais tirados dos seus registros, da frequência e das sondagens. Não são diagnósticos.</p>
            </section>
          )}

          {d.recent.length > 0 && (
            <section aria-labelledby="recentes">
              <SectionTitle
                id="recentes"
                action={
                  <Link href="/diario" className="text-callout text-accent">
                    Ver tudo
                  </Link>
                }
              >
                Registros recentes
              </SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                {d.recent.map((e) => (
                  <Link key={e.id} href={`/diario/${e.id}`} className="press flex flex-col rounded-[20px] bg-surface shadow-e1 outline-none hover:shadow-e2">
                    <div className="flex-1 px-4 pt-4 pb-3">
                      <p className="text-headline">{e.title || entryKinds[e.kind].label}</p>
                      <p className="mt-1 line-clamp-4 text-body leading-snug">{e.body}</p>
                    </div>
                    <div className="mx-4 flex items-center justify-between py-2.5 text-footnote text-label-2 shadow-[inset_0_0.5px_0_var(--separator)]">
                      <span>
                        {formatRelativeDay(e.occurredOn)} · {entryKinds[e.kind].label}
                      </span>
                      <VisibilityBadge visibility={e.visibility} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-10">
          <section aria-labelledby="proximos">
            <SectionTitle id="proximos">Próximos dias</SectionTitle>
            {d.upcoming.length === 0 ? (
              <p className="text-callout text-label-2">Nada marcado para as próximas duas semanas.</p>
            ) : (
              <div className="-mx-5 md:mx-0">
                {[...byDay.entries()].map(([day, list]) => (
                  <div key={day}>
                    <p className="px-5 pt-3 pb-1 text-subhead font-semibold text-label-2 shadow-[inset_0_0.5px_0_var(--separator)] md:px-0">{formatRelativeDay(day)}</p>
                    <ul>
                      {list.map((u) => (
                        <li key={`${u.type}-${u.id}`} className="py-2 pl-5 md:pl-0">
                          <p className="text-body">{u.title}</p>
                          <p className="text-subhead text-label-2">
                            {u.detail} – <span className="text-critical-ink">{u.type}</span>
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="turmas">
            <SectionTitle id="turmas">
              <Link href="/turmas" className="inline-flex items-center gap-0.5 hover:opacity-70">
                Turmas
                <ChevronRight aria-hidden className="size-5 text-label-3" strokeWidth={2.6} />
              </Link>
            </SectionTitle>
            <div className="scrollbar-none -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0">
              {d.classes.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/turmas/${c.id}`}
                  className="press relative flex aspect-square w-36 shrink-0 flex-col justify-end overflow-hidden rounded-[18px] p-3 text-white shadow-e1 outline-none md:w-auto"
                  style={{ background: CLASS_GRADIENTS[i % CLASS_GRADIENTS.length] }}
                >
                  <span aria-hidden className="absolute top-2 right-3 font-sans text-[3.25rem] leading-none font-bold opacity-25">
                    {c.grade}º
                  </span>
                  <span className="text-headline">{c.name}</span>
                  <span className="text-footnote opacity-90">{c.studentCount} alunos</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </Page>
  );
}
