import type { Metadata } from "next";
import { requireRole } from "@/server/session";
import { listConversations } from "@/server/queries/messages";
import { MessagesLayout } from "@/components/messages/messages-layout";
import { ConversationList } from "@/components/messages/messages-ui";
import { ArchiveToggle } from "./archive-toggle";

export const metadata: Metadata = { title: "Mensagens" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ arquivadas?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireRole("teacher");
  const archived = sp.arquivadas === "1";
  const items = await listConversations(ctx, { archived });
  return (
    <MessagesLayout
      title={archived ? "Arquivadas" : "Mensagens"}
      hasSelection={false}
      toolbar={<ArchiveToggle archived={archived} />}
      list={<ConversationList items={items.filter((i) => i.archived === archived)} base="/mensagens" />}
    />
  );
}
