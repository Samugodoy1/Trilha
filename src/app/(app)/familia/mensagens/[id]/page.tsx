import type { Metadata } from "next";
import { pageGuard } from "@/server/access";
import { getConversation, listConversations, teachersForStudent } from "@/server/queries/messages";
import { MessagesLayout } from "@/components/messages/messages-layout";
import { ConversationList, Thread } from "@/components/messages/messages-ui";
import { officeHoursText } from "@/lib/office-hours";
import { NewConversationButton } from "@/components/family/family-ui";
import { loadFamily, NoChild } from "../../shared";

export const metadata: Metadata = { title: "Conversa" };

export default async function FamilyConversation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, child } = await loadFamily();
  if (!child) return <NoChild title="Mensagens" />;
  const d = await pageGuard(() => getConversation(ctx, id));
  const [items, teachers] = await Promise.all([listConversations(ctx, { studentId: d.student.id }), teachersForStudent(d.student.id)]);
  return (
    <MessagesLayout
      title="Mensagens"
      hasSelection
      toolbar={<NewConversationButton studentId={child.id} teachers={teachers.map((t) => ({ id: t.id, name: t.name, label: t.label, officeText: officeHoursText(t.officeHours, t.name.split(" ")[0]) }))} />}
      list={<ConversationList items={items} base="/familia/mensagens" selectedId={id} family />}
      thread={
        <Thread
          key={id}
          backHref="/familia/mensagens"
          conversationId={id}
          messages={d.messages}
          title={d.conversation.subject}
          subtitle={`${d.teacher.title} de ${d.student.name.split(" ")[0]}`}
          otherName={d.teacher.name}
          otherHue={d.teacher.hue}
          category={d.conversation.category}
          officeHours={officeHoursText(d.teacher.officeHours, d.teacher.name.split(" ")[0])}
        />
      }
    />
  );
}
