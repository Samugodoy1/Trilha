"use client";

import { useRef, useState } from "react";
import { motion, type PanInfo } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { useContextMenu } from "./menu";

export type SwipeAction = { label: string; icon: LucideIcon; tint: string; onAction: () => void; destructive?: boolean };

const ACTION_W = 76;

/**
 * Linha com ações ao deslizar para a esquerda (como em Lembretes e Mail).
 * No computador, as mesmas ações aparecem no clique com o botão direito.
 */
export function SwipeRow({ actions, label, children }: { actions: SwipeAction[]; label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const dragged = useRef(false);
  const width = actions.length * ACTION_W;
  const { bind, menu } = useContextMenu(
    actions.map((a) => ({ label: a.label, icon: a.icon, destructive: a.destructive, onSelect: a.onAction })),
    label,
  );

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const shouldOpen = info.offset.x < -width / 2 || info.velocity.x < -500;
    setOpen(shouldOpen && info.velocity.x < 400);
    setTimeout(() => (dragged.current = false), 0);
  };

  return (
    <div className="relative overflow-hidden" onContextMenu={bind.onContextMenu}>
      <div className="absolute inset-y-0 right-0 flex" style={{ width }}>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => {
              setOpen(false);
              a.onAction();
            }}
            tabIndex={open ? 0 : -1}
            className="flex h-full flex-col items-center justify-center gap-1 text-caption font-semibold text-white"
            style={{ width: ACTION_W, background: a.tint }}
          >
            <a.icon aria-hidden className="size-5" strokeWidth={2.2} />
            {a.label}
          </button>
        ))}
      </div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -width, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        dragMomentum={false}
        animate={{ x: open ? -width : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 42 }}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={onDragEnd}
        onClickCapture={(e) => {
          if (dragged.current || open) {
            e.preventDefault();
            e.stopPropagation();
            if (open) setOpen(false);
          }
        }}
        className="relative bg-canvas"
        style={{ touchAction: "pan-y" }}
      >
        {children}
      </motion.div>
      {menu}
    </div>
  );
}
