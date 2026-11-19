"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * Sheet adaptativo.
 * - Telefone: painel inferior com alça, arraste para fechar e respeito à área segura.
 * - Tablet e computador: painel centralizado (formSheet), com foco preso e Esc.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  leading,
  trailing,
  hideHeader,
  initialFocus = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  hideHeader?: boolean;
  initialFocus?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 48rem)");
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const drag = useDragControls();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      if (!initialFocus) return;
      const el = panel.current?.querySelector<HTMLElement>("[data-autofocus], input, textarea, select") ?? panel.current;
      el?.focus({ preventScroll: true });
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && panel.current) {
        const nodes = panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey, true);
      prev?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, initialFocus]);

  if (!mounted) return null;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface-2 shadow-e3 outline-none dark:bg-surface",
              "rounded-t-[22px] md:rounded-[22px]",
              size === "sm" && "md:max-w-md",
              size === "md" && "md:max-w-xl",
              size === "lg" && "md:max-w-3xl",
            )}
            initial={isDesktop ? { opacity: 0, scale: 0.96, y: 12 } : { y: "100%" }}
            animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.16 } } : { y: "100%", transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.9 }}
            drag={isDesktop ? false : "y"}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {!isDesktop && (
              <div
                className="flex touch-none justify-center pt-2 pb-1"
                onPointerDown={(e) => drag.start(e)}
                aria-hidden
              >
                <span className="h-[5px] w-9 rounded-full bg-fill-2" />
              </div>
            )}
            {!hideHeader && (
              <header
                className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-1 pb-3 md:pt-4"
                onPointerDown={(e) => !isDesktop && drag.start(e)}
              >
                <div className="justify-self-start">{leading}</div>
                <div className="min-w-0 text-center">
                  <h2 id={titleId} className="truncate font-sans text-headline">
                    {title}
                  </h2>
                  {description && <p className="truncate text-footnote text-label-2">{description}</p>}
                </div>
                <div className="justify-self-end">
                  {trailing ?? (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Fechar"
                      className="press flex size-[30px] items-center justify-center rounded-full bg-fill text-label-2 hover:bg-fill-2"
                    >
                      <X className="size-4" strokeWidth={2.6} />
                    </button>
                  )}
                </div>
              </header>
            )}
            {hideHeader && (
              <h2 id={titleId} className="sr-only">
                {title}
              </h2>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
            {footer && <div className="shrink-0 border-t-[0.5px] border-separator bg-surface-2 px-4 dark:bg-surface pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">{footer}</div>}
            {!footer && <div className="pb-safe" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
