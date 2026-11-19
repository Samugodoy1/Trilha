import type { Metadata } from "next";
import { listConversations, teachersForStudent } from "@/server/queries/messages";
import { MessagesLayout } from "@/components/messages/messages-layout";
import { ConversationList } from "@/components/messages/messages-ui";
import { officeHoursText } from "@/lib/office-hours";
import { NewConversationButton } from "@/components/family/family-ui";
import { loadFamily, NoChild } from "../shared";

export const metadata: Metadata = { title: "Mensagens" };

export default async function FamilyMessages() {
  const { ctx, child } = await loadFamily();
  if (!child) return <NoChild title="Mensagens" />;
  const [items, teachers] = await Promise.all([listConversations(ctx, { studentId: child.id }), teachersForStudent(child.id)]);
  return (
    <MessagesLayout
      title="Mensagens"
      hasSelection={false}
      toolbar={<NewConversationButton studentId={child.id} teachers={teachers.map((t) => ({ id: t.id, name: t.name, label: t.label, officeText: officeHoursText(t.officeHours, t.name.split(" ")[0]) }))} />}
      list={
        <>
          <p className="mb-3 text-footnote text-label-2">Conversas privadas com quem ensina {child.firstName}. As respostas chegam no horário de atendimento de cada professor.</p>
          <ConversationList items={items} base="/familia/mensagens" family />
        </>
      }
    />
  );
}
