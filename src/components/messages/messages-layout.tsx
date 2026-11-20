import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Duas colunas no tablet e no computador (lista + conversa), uma coluna no telefone.
 */
export function MessagesLayout({ list, thread, hasSelection, title, toolbar }: { list: React.ReactNode; thread?: React.ReactNode; hasSelection: boolean; title: string; toolbar?: React.ReactNode }) {
  return (
    <div className="md:flex md:h-[calc(100dvh-56px)] lg:h-dvh">
      <aside className={cn("min-w-0 md:w-[340px] md:shrink-0 md:overflow-y-auto md:shadow-[inset_-0.5px_0_0_var(--separator)]", hasSelection && "hidden md:block")}>
        <div className="px-5 pt-[calc(env(safe-area-inset-top)+26px)] pb-3 md:px-4 md:pt-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-large-title">{title}</h1>
            {toolbar}
          </div>
        </div>
        <div className="px-5 pb-36 md:px-2">{list}</div>
      </aside>
      <section className={cn("min-w-0 flex-1", hasSelection ? "fixed inset-0 z-[45] bg-canvas md:static md:z-auto" : "hidden md:flex")}>
        {thread ?? (
          <div className="flex h-full w-full flex-col items-center justify-center text-label-2">
            <MessageCircle aria-hidden className="mb-3 size-12 text-label-3" strokeWidth={1.4} />
            <p className="text-callout">Selecione uma conversa</p>
          </div>
        )}
      </section>
    </div>
  );
}
