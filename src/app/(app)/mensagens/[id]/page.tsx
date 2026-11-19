import type { Metadata } from "next";
import { requireRole } from "@/server/session";
import { pageGuard } from "@/server/access";
import { getConversation, listConversations } from "@/server/queries/messages";
import { MessagesLayout } from "@/components/messages/messages-layout";
import { ConversationList, Thread } from "@/components/messages/messages-ui";
import { officeHoursText } from "@/lib/office-hours";
import { ArchiveToggle } from "../archive-toggle";

export const metadata: Metadata = { title: "Conversa" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRole("teacher");
  const d = await pageGuard(() => getConversation(ctx, id));
  const items = await listConversations(ctx, { archived: d.conversation.archivedByTeacherAt !== null });
  return (
    <MessagesLayout
      title="Mensagens"
      hasSelection
      toolbar={<ArchiveToggle archived={false} />}
      list={<ConversationList items={items} base="/mensagens" selectedId={id} />}
      thread={
        <Thread
          key={id}
          backHref="/mensagens"
          conversationId={id}
          messages={d.messages}
          title={d.conversation.subject}
          subtitle={`${d.guardian.relationship} de ${d.student.name}`}
          otherName={d.guardian.name}
          otherHue={d.guardian.hue}
          category={d.conversation.category}
          officeHours={`A família vê o seu horário: ${officeHoursText(d.teacher.officeHours, "você").replace(" Este canal não exige respostas imediatas.", "")}`}
          canArchive
          archived={d.conversation.archivedByTeacherAt !== null}
        />
      }
    />
  );
}
