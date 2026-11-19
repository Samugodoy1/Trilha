import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { getFamilyHome } from "@/server/queries/family";
import { Page } from "@/components/ui/page";
import { Avatar } from "@/components/ui/avatar";
import { SectionTitle, Tag } from "@/components/ui/misc";
import { PostCard } from "@/components/family/post-card";
import { AnnouncementActions, MarkFeedbackRead, TaskCheck } from "@/components/family/family-ui";
import { loadFamily, NoChild } from "./shared";
import { formatDay, formatRelativeDay, formatTime, greeting, firstName, isoFromTimestamp, todayISO, formatFullDay } from "@/lib/format";
import { feedbackTones, taskKinds } from "@/lib/vocabulary";
import { ChildAvatarSwitcher } from "@/components/family/child-switcher";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Início" };

export default async function FamilyHome() {
  const { ctx, child, list } = await loadFamily();
  if (!child) return <NoChild title="Início" />;
  const d = await getFamilyHome(ctx, child);
  const homeroom = d.teachers.find((t) => t.isHomeroom) ?? d.teachers[0];
  const today = todayISO();
  const wins = d.growth.highlights.filter(({ e }) => e.kind === "conquista" || e.kind === "participacao").slice(0, 3);

  return (
    <Page
      title={child.firstName}
      eyebrow={`${child.className} · ${child.schoolShort}`}
      subtitle={`${greeting()}, ${firstName(ctx.user.name)}.`}
      width="default"
      actions={<ChildAvatarSwitcher students={list.map((s) => ({ id: s.id, name: s.name, hue: s.hue, detail: `${s.className} · ${s.schoolShort}` }))} activeId={child.id} />}
    >
      {/* Respostas pendentes: autorizações e confirmações */}
      {d.toAnswer.length > 0 && (
        <section aria-labelledby="responder" className="mb-9">
          <SectionTitle id="responder">Precisa da sua resposta</SectionTitle>
          <div className="space-y-3">
            {d.toAnswer.map((a) => (
              <div key={a.id} className="rounded-[20px] bg-surface p-4 shadow-e1">
                <div className="flex items-center gap-2">
                  {a.important && <Tag tone="critical">Importante</Tag>}
                  <span className="text-footnote text-label-2">{a.startsAt ? `${formatFullDay(isoFromTimestamp(a.startsAt))}, ${formatTime(a.startsAt)}` : ""}</span>
                </div>
                <h3 className="mt-1.5 text-headline">{a.title}</h3>
                {a.body && <p className="mt-1 text-callout leading-snug">{a.body}</p>}
                <div className="mt-3">
                  <AnnouncementActions
                    announcementId={a.id}
                    studentId={child.id}
                    isAuthorization={a.isAuthorization}
                    requiresConfirmation={a.requiresConfirmation}
                    response={a.response ? { confirmedAt: a.response.confirmedAt?.toISOString() ?? null, authorization: a.response.authorization } : null}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recados da professora (feedback individual) */}
      {d.unreadFeedback.length > 0 && (
        <section aria-labelledby="da-professora" className="mb-9">
          <SectionTitle id="da-professora">Da professora</SectionTitle>
          <MarkFeedbackRead studentId={child.id} />
          <div className="space-y-3">
            {d.unreadFeedback.map(({ f, author, hue }) => (
              <article key={f.id} className="rounded-[20px] bg-surface p-4 shadow-e1">
                <div className="flex items-center gap-2.5">
                  <Avatar name={author} hue={hue} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-subhead font-semibold">{author}</p>
                    <p className="text-footnote text-label-2">{formatRelativeDay(isoFromTimestamp(f.publishedAt!))}</p>
                  </div>
                  <span className="flex items-center gap-1 text-footnote font-semibold text-family-ink">
                    <Star aria-hidden className="size-3.5 fill-current" />
                    {feedbackTones[f.tone].label}
                  </span>
                </div>
                <h3 className="mt-3 text-headline">{f.title}</h3>
                <p className="mt-1 text-body whitespace-pre-line">{f.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Tarefas */}
      <section aria-labelledby="tarefas" className="mb-9">
        <SectionTitle
          id="tarefas"
          action={
            <Link href="/familia/agenda" className="text-callout text-accent">
              Agenda
            </Link>
          }
        >
          Próximas tarefas
        </SectionTitle>
        {d.pendingTasks.length === 0 ? (
          <p className="text-callout text-label-2">Nenhuma tarefa pendente.</p>
        ) : (
          <ul className="-mx-5 md:mx-0">
            {d.pendingTasks.map((t, i) => (
              <li key={t.id} className="flex items-start gap-3.5 pl-5 md:pl-0">
                <span className="mt-[12px]">
                  <TaskCheck taskId={t.id} studentId={child.id} done={Boolean(t.completion)} title={t.title} acceptsSubmissions={t.acceptsSubmissions} />
                </span>
                <div className={cn("min-w-0 flex-1 py-[10px] pr-4", i < d.pendingTasks.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
                  <p className="text-body">{t.title}</p>
                  <p className="text-subhead text-label-2">
                    {t.subject ?? taskKinds[t.kind]} – <span className={t.dueOn! <= today ? "text-critical-ink" : ""}>{formatRelativeDay(t.dueOn!)}</span>
                  </p>
                  {t.instructions && <p className="mt-0.5 line-clamp-2 text-subhead text-label-2">{t.instructions}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Nossa semana */}
      {d.post && (
        <section aria-labelledby="semana" className="mb-9">
          <SectionTitle id="semana">
            <Link href="/familia/semana" className="inline-flex items-center gap-0.5 hover:opacity-70">
              Nossa semana
              <ChevronRight aria-hidden className="size-5 text-label-3" strokeWidth={2.6} />
            </Link>
          </SectionTitle>
          <PostCard
            post={{
              id: d.post.id,
              title: d.post.title,
              authorName: d.post.authorName,
              authorHue: d.post.authorHue,
              className: d.post.className,
              dateLabel: `Semana de ${formatDay(d.post.weekStart)}`,
              sections: d.post.sections.slice(0, 2).concat(d.post.sections.filter((s) => s.key === "casa")).filter((s, i, a) => a.findIndex((x) => x.key === s.key) === i),
              photos: d.post.photos.slice(0, 1),
              personal: Boolean(d.post.studentId),
            }}
          />
        </section>
      )}

      {/* Eventos */}
      {d.upcoming.length > 0 && (
        <section aria-labelledby="eventos" className="mb-9">
          <SectionTitle id="eventos">Na escola</SectionTitle>
          <ul className="-mx-5 md:mx-0">
            {d.upcoming.map((a, i) => (
              <li key={a.id} className={cn("flex items-center gap-4 px-5 py-2.5 md:px-0", i < d.upcoming.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
                <div className="w-11 shrink-0 text-center leading-none">
                  <p className="text-caption-2 font-semibold text-critical-ink uppercase">{new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "America/Sao_Paulo" }).format(a.startsAt!).replace(".", "")}</p>
                  <p className="mt-0.5 text-title-2 font-normal tabular">{new Intl.DateTimeFormat("pt-BR", { day: "numeric", timeZone: "America/Sao_Paulo" }).format(a.startsAt!)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body">{a.title}</p>
                  <p className="text-subhead text-label-2">
                    {formatTime(a.startsAt!)}
                    {a.location ? ` · ${a.location}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Conquistas */}
      {wins.length > 0 && (
        <section aria-labelledby="conquistas" className="mb-9">
          <SectionTitle id="conquistas">
            <Link href="/familia/desenvolvimento" className="inline-flex items-center gap-0.5 hover:opacity-70">
              Conquistas
              <ChevronRight aria-hidden className="size-5 text-label-3" strokeWidth={2.6} />
            </Link>
          </SectionTitle>
          <div className="scrollbar-none -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:px-0">
            {wins.map(({ e }) => (
              <article key={e.id} className="w-64 shrink-0 rounded-[20px] bg-surface p-4 shadow-e1 md:w-auto">
                <p className="text-footnote font-semibold text-achievement-ink">{formatDay(e.occurredOn)}</p>
                <h3 className="mt-1 text-headline">{e.title}</h3>
                <p className="mt-1 line-clamp-4 text-callout leading-snug">{e.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {homeroom && (
        <Link href="/familia/mensagens" className="flex items-center gap-3 rounded-[20px] bg-surface-2 p-4 outline-none hover:brightness-[0.98] dark:bg-surface">
          <Avatar name={homeroom.name} hue={homeroom.hue} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block text-callout font-semibold">Falar com {homeroom.name.split(" ")[0]}</span>
            <span className="block text-footnote text-label-2">Recados, perguntas e justificativas de falta</span>
          </span>
          <ChevronRight aria-hidden className="size-4 text-label-3" />
        </Link>
      )}
    </Page>
  );
}
