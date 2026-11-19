import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/server/session";
import { pageGuard } from "@/server/access";
import { getEntry } from "@/server/queries/journal";
import { getComposeContextAction } from "@/server/actions/journal";
import { Page } from "@/components/ui/page";
import { Avatar } from "@/components/ui/avatar";
import { VisibilityBadge } from "@/components/ui/misc";
import { EntryPageEditor } from "../novo/editor";
import { DeleteEntryButton } from "./delete-button";
import { formatFullDay } from "@/lib/format";
import { entryKinds } from "@/lib/vocabulary";

export const metadata: Metadata = { title: "Registro" };

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRole("teacher", "coordinator", "admin");
  const d = await pageGuard(() => getEntry(ctx, id));
  const e = d.entry;

  if (!d.mine) {
    return (
      <Page title={e.title ?? entryKinds[e.kind].label} back={{ href: "/turmas", label: "Voltar" }} eyebrow={`${entryKinds[e.kind].label} · ${formatFullDay(e.occurredOn)}`} width="narrow">
        <article className="rounded-xl bg-surface p-5 shadow-e1">
          <p className="text-body whitespace-pre-line">{e.body}</p>
          <div className="mt-4 flex items-center gap-3 text-footnote text-label-2">
            <VisibilityBadge visibility={e.visibility} />
            <span>Por {d.author}</span>
          </div>
        </article>
        <div className="mt-4 flex flex-wrap gap-2">
          {d.students.map((s) => (
            <Link key={s.id} href={`/alunos/${s.id}`} className="flex items-center gap-2 rounded-full bg-surface py-1 pr-3 pl-1 text-subhead shadow-e1">
              <Avatar name={s.name} hue={s.hue} size="xs" /> {s.name}
            </Link>
          ))}
        </div>
      </Page>
    );
  }

  const context = await getComposeContextAction();
  return (
    <Page title={e.isDraft ? "Rascunho" : "Editar registro"} back={{ href: "/diario", label: "Diário" }} actions={<DeleteEntryButton id={e.id} />} width="narrow">
      <EntryPageEditor
        context={context}
        initial={{
          id: e.id,
          classId: e.classId ?? undefined,
          studentIds: d.students.map((s) => s.id),
          kind: e.kind,
          title: e.title ?? "",
          body: e.body,
          visibility: e.visibility,
          occurredOn: e.occurredOn,
        }}
      />
    </Page>
  );
}
