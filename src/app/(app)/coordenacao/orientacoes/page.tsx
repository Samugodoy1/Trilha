import type { Metadata } from "next";
import { requireRole } from "@/server/session";
import { getCoordinationNotes, getSchoolTeachers } from "@/server/queries/coordination";
import { getClasses } from "@/server/queries/common";
import { Page } from "@/components/ui/page";
import { NewNoteButton } from "./new-note";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "Orientações" };

const kindLabel = { orientacao: "Orientação", pauta: "Pauta", conselho: "Conselho de classe", acompanhamento: "Acompanhamento" } as const;

export default async function NotesPage() {
  const ctx = await requireRole("coordinator", "admin");
  const [notes, teachers, classes] = await Promise.all([getCoordinationNotes(ctx), getSchoolTeachers(ctx.school.id), getClasses(ctx)]);
  return (
    <Page
      title="Orientações"
      subtitle="Combinados com professores, pautas de reunião e acompanhamento de intervenções."
      actions={<NewNoteButton teachers={teachers} classes={classes.filter((c) => !c.archived).map((c) => ({ id: c.id, name: c.name }))} />}
      width="narrow"
    >
      <div className="space-y-3">
        {notes.map(({ n, className, teacher }) => (
          <article key={n.id} className="rounded-[20px] bg-surface p-4 shadow-e1">
            <p className="text-footnote font-semibold text-accent">
              {kindLabel[n.kind]} · {formatDay(n.date)}
            </p>
            <h2 className="mt-0.5 font-sans text-headline">{n.title}</h2>
            <p className="mt-1 text-body whitespace-pre-line text-label-2">{n.body}</p>
            {(className || teacher) && <p className="mt-2 text-footnote text-label-2">{[teacher, className].filter(Boolean).join(" · ")}</p>}
          </article>
        ))}
      </div>
    </Page>
  );
}
