"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { searchAction, type SearchResult } from "@/server/actions/search";
import { navIcons, type NavItem } from "./icons";

type Row = { key: string; label: string; detail?: string; href: string; kind: "student" | "nav"; hue?: number; icon?: NavItem["icon"] };

/** Busca universal (⌘K): alunos e áreas do app, navegável pelo teclado. */
export function CommandPalette({ open, onClose, nav }: { open: boolean; onClose: () => void; nav: NavItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResult>({ students: [] });
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIdx(0);
    setTimeout(() => input.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRes({ students: [] });
      return;
    }
    const t = setTimeout(() => void searchAction(q).then(setRes), 140);
    return () => clearTimeout(t);
  }, [q]);

  const rows = useMemo<Row[]>(() => {
    const n = q.trim().toLowerCase();
    const navRows: Row[] = nav
      .filter((i) => !n || i.label.toLowerCase().includes(n))
      .map((i) => ({ key: i.href, label: i.label, href: i.href, kind: "nav", icon: i.icon }));
    const studentRows: Row[] = res.students.map((s) => ({ key: s.id, label: s.name, detail: s.detail, href: `/alunos/${s.id}`, kind: "student", hue: s.hue }));
    return [...studentRows, ...navRows].slice(0, 12);
  }, [nav, q, res]);

  const go = (r: Row) => {
    onClose();
    router.push(r.href);
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[65] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Buscar"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="glass relative w-full max-w-xl overflow-hidden rounded-[20px] [--glass-bg:color-mix(in_oklab,var(--surface-raised)_86%,transparent)]"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                setIdx((i) => Math.min(rows.length - 1, i + 1));
                e.preventDefault();
              }
              if (e.key === "ArrowUp") {
                setIdx((i) => Math.max(0, i - 1));
                e.preventDefault();
              }
              if (e.key === "Enter" && rows[idx]) go(rows[idx]);
            }}
          >
            <div className="flex items-center gap-3 px-4 hairline-b">
              <Search aria-hidden className="size-5 text-label-2" strokeWidth={2.2} />
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setIdx(0);
                }}
                placeholder="Buscar alunos ou ir para…"
                aria-label="Buscar"
                role="combobox"
                aria-expanded
                aria-controls="cmd-list"
                aria-activedescendant={rows[idx] ? `cmd-${rows[idx].key}` : undefined}
                className="h-14 flex-1 bg-transparent text-title-3 font-normal outline-none placeholder:text-label-3"
              />
            </div>
            <ul id="cmd-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {rows.length === 0 && <li className="px-3 py-8 text-center text-callout text-label-2">Nenhum resultado para “{q}”.</li>}
              {rows.map((r, i) => {
                const Icon = r.icon ? navIcons[r.icon] : null;
                return (
                  <li
                    key={r.key}
                    id={`cmd-${r.key}`}
                    role="option"
                    aria-selected={i === idx}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => go(r)}
                    className={cn("flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2", i === idx ? "bg-accent text-on-accent" : "")}
                  >
                    {r.kind === "student" ? (
                      <Avatar name={r.label} hue={r.hue} size="sm" />
                    ) : (
                      Icon && (
                        <span className={cn("flex size-8 items-center justify-center rounded-[8px]", i === idx ? "bg-white/20" : "bg-fill")}>
                          <Icon aria-hidden className="size-[17px]" strokeWidth={2.1} />
                        </span>
                      )
                    )}
                    <span className="flex-1 truncate text-callout">{r.label}</span>
                    {r.detail && <span className={cn("text-footnote", i === idx ? "text-on-accent/80" : "text-label-2")}>{r.detail}</span>}
                    {i === idx && <CornerDownLeft aria-hidden className="size-4 opacity-80" />}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
