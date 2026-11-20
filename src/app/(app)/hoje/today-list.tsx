"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, ChevronRight, ClipboardList, Clock, EyeOff, HeartHandshake, ListChecks, MessageCircle, PencilLine, type LucideIcon } from "lucide-react";
import { SwipeRow } from "@/components/ui/swipe-row";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { dismissTodayItemAction, undoDismissAction } from "@/server/actions/today";
import type { TodayItem } from "@/server/queries/today";

const icons: Record<TodayItem["kind"], LucideIcon> = {
  messages: MessageCircle,
  assessment: ClipboardList,
  weekly: BookOpen,
  draft: PencilLine,
  contribution: HeartHandshake,
  feedback: MessageCircle,
  authorization: ListChecks,
};

/** "Para hoje": deslize para adiar até amanhã ou ocultar por uma semana — com Desfazer. */
export function TodayList({ items }: { items: TodayItem[] }) {
  const [gone, setGone] = useState<string[]>([]);
  const toast = useToast();
  const router = useRouter();
  const visible = items.filter((i) => !gone.includes(i.id));

  const dismiss = async (item: TodayItem, mode: "snooze" | "hide") => {
    setGone((g) => [...g, item.id]);
    await dismissTodayItemAction(item.id, mode);
    toast({
      title: mode === "snooze" ? "Adiado para amanhã" : "Oculto por 7 dias",
      tone: "info",
      action: {
        label: "Desfazer",
        onClick: async () => {
          await undoDismissAction(item.id);
          setGone((g) => g.filter((x) => x !== item.id));
          router.refresh();
        },
      },
    });
  };

  if (visible.length === 0) return <p className="py-6 text-callout text-label-2">Tudo em dia. Que tal registrar algo bom que aconteceu hoje?</p>;

  return (
    <ul className="-mx-5 md:mx-0">
      <AnimatePresence initial={false}>
        {visible.map((item, i) => {
          const Icon = icons[item.kind];
          return (
            <motion.li key={item.id} layout exit={{ opacity: 0, height: 0, transition: { duration: 0.22 } }}>
              <SwipeRow
                label={item.title}
                actions={[
                  { label: "Adiar", icon: Clock, tint: "var(--warning)", onAction: () => void dismiss(item, "snooze") },
                  { label: "Ocultar", icon: EyeOff, tint: "#8e8e93", onAction: () => void dismiss(item, "hide") },
                ]}
              >
                <Link href={item.href} className="group flex items-start gap-3.5 pl-5 outline-none hover:bg-fill/40 focus-visible:bg-fill md:pl-0 md:hover:bg-transparent">
                  <span aria-hidden className="mt-[11px] flex size-[30px] shrink-0 items-center justify-center rounded-full text-white" style={{ background: item.tint }}>
                    <Icon className="size-[16px]" strokeWidth={2.4} />
                  </span>
                  <span className={cn("flex min-w-0 flex-1 items-center gap-2 py-[11px] pr-4", i < visible.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body">{item.title}</span>
                      <span className="mt-0.5 block text-subhead text-label-2">
                        {item.detail}
                        {item.status && <span className="text-critical-ink"> – {item.status}</span>}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="size-[15px] shrink-0 text-label-3/70" strokeWidth={2.6} />
                  </span>
                </Link>
              </SwipeRow>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
