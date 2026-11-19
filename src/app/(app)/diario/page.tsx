import type { Metadata } from "next";
import Link from "next/link";
import { NotebookPen, Plus, Users } from "lucide-react";
import { requireRole } from "@/server/session";
import { getJournal } from "@/server/queries/journal";
import { getClasses } from "@/server/queries/common";
import { Page } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, Tag, VisibilityBadge } from "@/components/ui/misc";
import { JournalFilters } from "./filters";
import { formatFullDay, formatRelativeDay, todayISO, diffDays } from "@/lib/format";
import { entryKinds } from "@/lib/vocabulary";

export const metadata: Metadata = { title: "Diário" };

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ turma?: string; tipo?: string; q?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireRole("teacher");
  const [entries, classes] = await Promise.all([getJournal(ctx, { classId: sp.turma, kind: sp.tipo, q: sp.q }), getClasses(ctx)]);
  const drafts = entries.filter((e) => e.isDraft);
  const published = entries.filter((e) => !e.isDraft);
  const days = new Map<string, typeof published>();
  for (const e of published) days.set(e.occurredOn, [...(days.get(e.occurredOn) ?? []), e]);
  const today = todayISO();

  return (
    <Page title="Diário" subtitle="Registre uma vez. O Trilha organiza no histórico de cada aluno." actions={<Button size="sm" variant="tinted" icon={Plus} href="/diario/novo">Novo</Button>} width="default">
      <JournalFilters classes={classes.filter((c) => !c.archived).map((c) => ({ id: c.id, name: c.name }))} />

      {drafts.length > 0 && (
        <section className="mt-8" aria-label="Rascunhos">
          <h2 className="mb-2 px-1 font-sans text-footnote font-medium uppercase tracking-[0.04em] text-label-2">Rascunhos</h2>
          <div className="space-y-2">
            {drafts.map((e) => (
              <Link key={e.id} href={`/diario/${e.id}`} className="press flex items-center gap-3 rounded-xl border border-dashed border-separator-strong bg-surface/60 p-4 outline-none hover:bg-surface">
                <NotebookPen aria-hidden className="size-5 text-label-2" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-callout font-medium">{e.title || e.body.slice(0, 60) || "Rascunho sem texto"}</span>
                  <span className="block text-footnote text-label-2">Salvo automaticamente · {formatRelativeDay(e.occurredOn)}</span>
                </span>
                <Tag>Rascunho</Tag>
              </Link>
            ))}
          </div>
        </section>
      )}

      {published.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={NotebookPen}
          title={sp.q || sp.tipo || sp.turma ? "Nada encontrado" : "Seu diário está vazio"}
          message={sp.q || sp.tipo || sp.turma ? "Tente outro filtro ou termo de busca." : "Toque em + para registrar o que aconteceu hoje. Leva menos de um minuto."}
        />
      ) : (
        <div className="mt-8 space-y-8">
          {[...days.entries()].map(([day, list]) => (
            <section key={day} aria-label={formatFullDay(day)}>
              <h2 className="mb-3 font-sans text-headline">
                {diffDays(day, today) > -7 ? formatRelativeDay(day) : formatFullDay(day)}
                {diffDays(day, today) > -2 && <span className="ml-2 text-subhead font-normal text-label-2">{formatFullDay(day)}</span>}
              </h2>
              <div className="space-y-3">
                {list.map((e) => (
                  <Link key={e.id} href={`/diario/${e.id}`} className="press block rounded-xl bg-surface p-4 shadow-e1 outline-none hover:shadow-e2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-footnote font-semibold text-notes">{entryKinds[e.kind].label}</span>
                      <VisibilityBadge visibility={e.visibility} />
                    </div>
                    {e.title && <h3 className="mt-1 font-sans text-headline">{e.title}</h3>}
                    <p className="mt-1 line-clamp-4 text-subhead whitespace-pre-line text-label-2">{e.body}</p>
                    <div className="mt-3 flex items-center gap-2">
                      {e.students.length === 0 ? (
                        <span className="flex items-center gap-1.5 text-footnote text-label-2">
                          <Users aria-hidden className="size-3.5" /> {e.className ?? "Turma"} · turma toda
                        </span>
                      ) : (
                        <>
                          <span className="flex -space-x-2">
                            {e.students.slice(0, 4).map((s) => (
                              <Avatar key={s.id} name={s.name} hue={s.hue} size="xs" className="ring-2 ring-surface" />
                            ))}
                          </span>
                          <span className="truncate text-footnote text-label-2">
                            {e.students.length === 1 ? e.students[0].name : `${e.students[0].name.split(" ")[0]} e mais ${e.students.length - 1}`}
                          </span>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
