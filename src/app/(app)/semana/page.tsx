import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { requireRole } from "@/server/session";
import { getWeeklyList } from "@/server/queries/weekly";
import { Page } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { EmptyState, Tag } from "@/components/ui/misc";
import { addDays, formatDay, isoFromTimestamp, formatRelativeDay } from "@/lib/format";

export const metadata: Metadata = { title: "Nossa semana" };

export default async function WeeklyListPage() {
  const ctx = await requireRole("teacher");
  const posts = await getWeeklyList(ctx);
  return (
    <Page
      title="Nossa semana"
      subtitle="Um resumo acolhedor para as famílias acompanharem o que acontece na escola."
      actions={<Button size="sm" variant="tinted" icon={Plus} href="/semana/nova">Nova</Button>}
      width="default"
    >
      {posts.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhuma publicação" message="Conte às famílias o que a turma aprendeu nesta semana. O Trilha pode sugerir um rascunho a partir do seu diário." action={<Button href="/semana/nova">Escrever a primeira</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((p) => (
            <Link key={p.id} href={`/semana/${p.id}`} className="press group overflow-hidden rounded-xl bg-surface shadow-e1 outline-none hover:shadow-e2">
              {p.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/media/${p.cover}`} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-[color-mix(in_oklab,var(--family)_8%,var(--surface))]">
                  <BookOpen aria-hidden className="size-8 text-family/60" strokeWidth={1.6} />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-footnote text-label-2">
                    {p.className} · {formatDay(p.weekStart)} – {formatDay(addDays(p.weekStart, 4))}
                  </span>
                  {p.status === "draft" ? <Tag tone="warning">Rascunho</Tag> : <Tag tone="positive">Publicado</Tag>}
                </div>
                <h3 className="mt-1 font-sans text-headline">{p.title}</h3>
                <p className="mt-0.5 text-footnote text-label-2">
                  {p.studentName ? `Somente para a família de ${p.studentName.split(" ")[0]}` : "Para todas as famílias da turma"}
                  {p.publishedAt ? ` · ${formatRelativeDay(isoFromTimestamp(p.publishedAt))}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
