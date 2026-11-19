import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { requireRole } from "@/server/session";
import { getClasses } from "@/server/queries/common";
import { Page } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionTitle } from "@/components/ui/misc";
import { shiftLabels, stageLabels } from "@/lib/vocabulary";

export const metadata: Metadata = { title: "Turmas" };

export default async function ClassesPage() {
  const ctx = await requireRole("teacher", "coordinator", "admin");
  const all = await getClasses(ctx, { includeArchived: true });
  const current = all.filter((c) => !c.archived);
  const past = all.filter((c) => c.archived);
  const byYear = new Map<number, typeof past>();
  for (const c of past) byYear.set(c.year, [...(byYear.get(c.year) ?? []), c]);

  return (
    <Page
      title="Turmas"
      subtitle={current.length ? `${current.length} ${current.length === 1 ? "turma" : "turmas"} em ${current[0].year}` : undefined}
      actions={<Button size="sm" variant="tinted" icon={Plus} href="/turmas/nova">Nova turma</Button>}
      width="wide"
    >
      {current.length === 0 ? (
        <EmptyState icon={Users} title="Nenhuma turma ainda" message="Crie sua primeira turma ou aguarde a escola atribuí-las a você." action={<Button href="/turmas/nova">Criar turma</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {current.map((c) => (
            <ClassCard key={c.id} c={c} />
          ))}
        </div>
      )}
      {[...byYear.entries()].map(([year, list]) => (
        <section key={year} className="mt-12">
          <SectionTitle>Anos anteriores · {year}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((c) => (
              <ClassCard key={c.id} c={c} muted />
            ))}
          </div>
        </section>
      ))}
    </Page>
  );
}

function ClassCard({ c, muted }: { c: Awaited<ReturnType<typeof getClasses>>[number]; muted?: boolean }) {
  return (
    <Link href={`/turmas/${c.id}`} className={`press group block rounded-xl bg-surface p-5 shadow-e1 outline-none hover:shadow-e2 ${muted ? "opacity-80" : ""}`}>
      <div className="flex items-start justify-between">
        <span className="flex size-12 items-center justify-center rounded-[14px] bg-accent-soft font-rounded text-title-3 font-bold text-accent">{c.grade}º</span>
        <span className="text-footnote text-label-2">{c.year}</span>
      </div>
      <h3 className="mt-4 font-sans text-title-3">{c.name}</h3>
      <p className="mt-0.5 text-subhead text-label-2">
        {stageLabels[c.stage]} · {shiftLabels[c.shift]}
        {c.room ? ` · ${c.room}` : ""}
      </p>
      <div className="mt-4 flex items-center gap-4 text-footnote text-label-2">
        <span>
          <span className="font-semibold text-label tabular">{c.studentCount}</span> alunos
        </span>
        <span>{c.subjectLabel}</span>
      </div>
    </Link>
  );
}
