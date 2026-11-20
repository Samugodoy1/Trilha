"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowUp, ChevronLeft, Clock, Ellipsis, Inbox } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Menu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatMessageStamp, formatTime, isoFromTimestamp, formatRelativeDay } from "@/lib/format";
import { conversationCategories, type ConversationCategory } from "@/lib/vocabulary";
import { archiveConversationAction, markReadAction, sendMessageAction } from "@/server/actions/messages";

export type ConversationItem = {
  id: string;
  subject: string;
  category: ConversationCategory;
  archived: boolean;
  lastAt: string;
  otherName: string;
  otherHue: number;
  studentName: string;
  preview: string;
  unread: number;
};

export function ConversationList({ items, base, selectedId, family }: { items: ConversationItem[]; base: string; selectedId?: string; family?: boolean }) {
  if (!items.length)
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center text-label-2">
        <Inbox aria-hidden className="mb-3 size-10 text-label-3" strokeWidth={1.5} />
        <p className="text-callout">Nenhuma conversa ainda.</p>
      </div>
    );
  return (
    <ul className="-mx-5 md:mx-0">
      {items.map((c, i) => {
        const active = c.id === selectedId;
        return (
          <li key={c.id}>
            <Link
              href={`${base}/${c.id}`}
              aria-current={active ? "page" : undefined}
              className={cn("flex items-start gap-3 rounded-none py-0 pl-5 outline-none md:rounded-[12px] md:pl-2", active ? "bg-accent text-white md:bg-accent" : "hover:bg-fill/50")}
            >
              <span className="relative mt-2.5">
                {c.unread > 0 && !active && <span aria-label="Não lida" className="absolute top-1/2 -left-3 size-2.5 -translate-y-1/2 rounded-full bg-accent md:-left-2" />}
                <Avatar name={c.otherName} hue={c.otherHue} size="md" />
              </span>
              <span className={cn("min-w-0 flex-1 py-2.5 pr-5 md:pr-2", i < items.length - 1 && !active && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate text-callout font-semibold")}>{family ? c.otherName : `${c.otherName.split(" ")[0]} · ${c.studentName.split(" ")[0]}`}</span>
                  <span className={cn("shrink-0 text-footnote", active ? "text-white/80" : "text-label-2")}>{formatMessageStamp(c.lastAt)}</span>
                </span>
                <span className={cn("block truncate text-subhead", active ? "text-white" : "text-label")}>{c.subject}</span>
                <span className={cn("line-clamp-2 text-subhead", active ? "text-white/80" : "text-label-2")}>{c.preview}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type Msg = { id: string; body: string; mine: boolean; at: string; readAt: string | null };

export function Thread({
  conversationId,
  messages,
  title,
  subtitle,
  otherName,
  otherHue,
  category,
  officeHours,
  canArchive,
  archived,
  backHref,
}: {
  backHref: string;
  conversationId: string;
  messages: Msg[];
  title: string;
  subtitle: string;
  otherName: string;
  otherHue: number;
  category: ConversationCategory;
  officeHours: string;
  canArchive?: boolean;
  archived?: boolean;
}) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [extra, setExtra] = useState<Msg[]>([]);
  const optimistic = [...messages, ...extra.filter((e) => !messages.some((m) => m.mine && m.body === e.body && m.at >= e.at.slice(0, 16)))];
  const end = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    void markReadAction(conversationId);
  }, [conversationId]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [optimistic.length]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    const tmp: Msg = { id: `tmp-${Date.now()}`, body, mine: true, at: new Date(Date.now() - 60_000).toISOString(), readAt: null };
    setExtra((x) => [...x, tmp]);
    start(async () => {
      const res = await sendMessageAction(conversationId, body);
      if (!res.ok) {
        setExtra((x) => x.filter((m) => m.id !== tmp.id));
        toast({ title: res.error ?? "Não enviada", tone: "error" });
        setText(body);
        return;
      }
      setExtra((x) => x.map((m) => (m.id === tmp.id ? { ...m, id: `sent-${tmp.id}` } : m)));
    });
    router.refresh();
  };

  // Agrupa por dia
  let lastDay = "";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="material-chrome sticky top-0 z-10 flex flex-col items-center gap-1 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2.5 hairline-b">
        <Link href={backHref} aria-label="Voltar para as conversas" className="absolute top-[max(env(safe-area-inset-top),12px)] left-3 flex size-9 items-center justify-center rounded-full text-accent hover:bg-fill md:hidden">
          <ChevronLeft className="size-6" strokeWidth={2.4} />
        </Link>
        <Avatar name={otherName} hue={otherHue} size="sm" />
        <p className="text-footnote font-semibold">{otherName}</p>
        <p className="text-caption text-label-2">{subtitle}</p>
        {canArchive && (
          <div className="absolute top-3 right-3">
            <Menu
              label="Opções"
              items={[
                {
                  label: archived ? "Mover para a caixa de entrada" : "Arquivar conversa",
                  icon: Archive,
                  onSelect: async () => {
                    await archiveConversationAction(conversationId, !archived);
                    toast({ title: archived ? "Conversa restaurada" : "Conversa arquivada" });
                    router.refresh();
                  },
                },
              ]}
            >
              {(p) => (
                <button type="button" {...p} aria-label="Opções da conversa" className="flex size-8 items-center justify-center rounded-full bg-fill text-accent hover:bg-fill-2">
                  <Ellipsis className="size-[18px]" strokeWidth={2.4} />
                </button>
              )}
            </Menu>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto mb-5 max-w-md text-center">
          <p className="text-footnote font-semibold text-label-2">
            {conversationCategories[category].label} · {title}
          </p>
          <p className="mt-1 flex items-start justify-center gap-1.5 text-footnote text-label-2">
            <Clock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {officeHours}
          </p>
        </div>
        <ol className="space-y-1">
          {optimistic.map((m, i) => {
            const day = isoFromTimestamp(m.at);
            const showDay = day !== lastDay;
            lastDay = day;
            const next = optimistic[i + 1];
            const tail = !next || next.mine !== m.mine;
            return (
              <li key={m.id}>
                {showDay && (
                  <p className="py-3 text-center text-caption font-semibold text-label-2">
                    {formatRelativeDay(day)} {formatTime(m.at)}
                  </p>
                )}
                <div className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                  <p
                    className={cn(
                      "max-w-[78%] rounded-[18px] px-3.5 py-2 text-body leading-snug whitespace-pre-line",
                      m.mine ? "bg-accent text-white" : "bg-[#e9e9eb] text-black dark:bg-[#262628] dark:text-white",
                      tail && (m.mine ? "rounded-br-[6px]" : "rounded-bl-[6px]"),
                      m.id.startsWith("tmp-") && "opacity-70",
                    )}
                  >
                    {m.body}
                  </p>
                </div>
                {m.mine && tail && i === optimistic.length - 1 && (
                  <p className="mt-1 pr-1 text-right text-caption text-label-2">{m.id.startsWith("tmp-") ? "Enviando…" : m.readAt ? "Lida" : "Entregue"}</p>
                )}
              </li>
            );
          })}
        </ol>
        <div ref={end} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] md:pb-3"
      >
        <label className="sr-only" htmlFor="msg">
          Mensagem
        </label>
        <textarea
          id="msg"
          value={text}
          rows={1}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(140, e.target.scrollHeight)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 64rem)").matches) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Mensagem"
          className="max-h-36 min-h-9 flex-1 resize-none rounded-[18px] bg-surface px-4 py-[7px] text-body shadow-[0_0_0_0.5px_var(--separator-strong)] outline-none"
        />
        <button type="submit" disabled={!text.trim() || pending} aria-label="Enviar" className="press mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-30">
          <ArrowUp className="size-[18px]" strokeWidth={2.8} />
        </button>
      </form>
    </div>
  );
}
