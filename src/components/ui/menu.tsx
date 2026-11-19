"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type MenuEntry =
  | {
      label: string;
      icon?: LucideIcon;
      onSelect?: () => void;
      href?: string;
      destructive?: boolean;
      disabled?: boolean;
      checked?: boolean;
      hint?: string;
    }
  | { separator: true }
  | { section: string };

type Pos = { x: number; y: number; originX: "left" | "right"; originY: "top" | "bottom" };

function MenuPanel({ items, pos, onClose, label }: { items: MenuEntry[]; pos: Pos; onClose: () => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [p, setP] = useState(pos);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let { x, y } = pos;
    if (pos.originX === "right") x = x - r.width;
    if (pos.originY === "bottom") y = y - r.height;
    x = Math.max(8, Math.min(x, window.innerWidth - r.width - 8));
    if (y + r.height > window.innerHeight - 8) y = Math.max(8, window.innerHeight - r.height - 8);
    setP({ ...pos, x, y });
    el.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
  }, [pos]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
    };
  }, [onClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    const idx = nodes.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      nodes[(idx + 1) % nodes.length]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      nodes[(idx - 1 + nodes.length) % nodes.length]?.focus();
      e.preventDefault();
    } else if (e.key === "Tab") {
      onClose();
    }
  };

  return (
    <motion.div
      ref={ref}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 600, damping: 36 }}
      style={{ left: p.x, top: p.y, transformOrigin: `${p.originY} ${p.originX}` }}
      className="glass fixed z-[70] min-w-56 max-w-72 overflow-hidden rounded-[14px] py-1.5 [--glass-bg:color-mix(in_oklab,var(--surface-raised)_82%,transparent)]"
    >
      {items.map((item, i) => {
        if ("separator" in item) return <div key={i} role="separator" className="my-1.5 h-[6px] bg-fill/60" />;
        if ("section" in item)
          return (
            <div key={i} className="px-4 pt-1.5 pb-1 text-footnote text-label-2">
              {item.section}
            </div>
          );
        const Icon = item.icon;
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            aria-disabled={item.disabled || undefined}
            onClick={() => {
              if (item.disabled) return;
              onClose();
              if (item.href) router.push(item.href);
              item.onSelect?.();
            }}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-[9px] text-left text-body outline-none",
              "hover:bg-fill focus-visible:bg-fill",
              item.destructive ? "text-critical-ink" : "text-label",
              item.disabled && "opacity-40",
            )}
          >
            <span className="w-4 shrink-0">{item.checked && <Check className="size-4" strokeWidth={2.6} />}</span>
            <span className="flex-1">
              {item.label}
              {item.hint && <span className="block text-footnote text-label-2">{item.hint}</span>}
            </span>
            {Icon && <Icon aria-hidden className="size-[18px] shrink-0" strokeWidth={2} />}
          </button>
        );
      })}
    </motion.div>
  );
}

/** Menu suspenso aberto por um botão. */
export function Menu({
  items,
  label,
  align = "end",
  children,
}: {
  items: MenuEntry[];
  label: string;
  align?: "start" | "end";
  children: (props: { onClick: (e: React.MouseEvent<HTMLElement>) => void; "aria-haspopup": "menu"; "aria-expanded": boolean }) => React.ReactNode;
}) {
  const [pos, setPos] = useState<Pos | null>(null);
  const close = useCallback(() => setPos(null), []);
  return (
    <>
      {children({
        "aria-haspopup": "menu",
        "aria-expanded": Boolean(pos),
        onClick: (e) => {
          e.stopPropagation();
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          setPos(
            align === "end"
              ? { x: r.right, y: r.bottom + 6, originX: "right", originY: "top" }
              : { x: r.left, y: r.bottom + 6, originX: "left", originY: "top" },
          );
        },
      })}
      {typeof document !== "undefined" &&
        createPortal(<AnimatePresence>{pos && <MenuPanel items={items} pos={pos} onClose={close} label={label} />}</AnimatePresence>, document.body)}
    </>
  );
}

/** Menu de contexto: clique direito (computador) ou toque longo (telefone). */
export function useContextMenu(items: MenuEntry[], label: string) {
  const [pos, setPos] = useState<Pos | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close = useCallback(() => setPos(null), []);
  const bind = {
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY, originX: "left", originY: "top" });
    },
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      timer.current = setTimeout(() => {
        navigator.vibrate?.(8);
        setPos({ x: t.clientX, y: t.clientY, originX: "left", originY: "top" });
      }, 480);
    },
    onTouchEnd: () => timer.current && clearTimeout(timer.current),
    onTouchMove: () => timer.current && clearTimeout(timer.current),
  };
  const menu =
    typeof document !== "undefined"
      ? createPortal(<AnimatePresence>{pos && <MenuPanel items={items} pos={pos} onClose={close} label={label} />}</AnimatePresence>, document.body)
      : null;
  return { bind, menu };
}
