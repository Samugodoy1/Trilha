"use client";

import { AnimatePresence, motion } from "motion/react";
import { CloudAlert, Check } from "lucide-react";
import { Spinner } from "./spinner";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Indicação discreta de salvamento automático. */
export function SaveIndicator({ state, savedLabel = "Rascunho salvo" }: { state: SaveState; savedLabel?: string }) {
  return (
    <span aria-live="polite" className="inline-flex h-6 min-w-24 items-center justify-end text-footnote text-label-2">
      <AnimatePresence mode="wait" initial={false}>
        {state === "saving" && (
          <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5">
            <Spinner className="size-3.5" label="Salvando" />
            Salvando…
          </motion.span>
        )}
        {state === "saved" && (
          <motion.span key="ok" initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1">
            <Check aria-hidden className="size-3.5" strokeWidth={2.6} />
            {savedLabel}
          </motion.span>
        )}
        {state === "error" && (
          <motion.span key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1 text-critical-ink">
            <CloudAlert aria-hidden className="size-3.5" strokeWidth={2.4} />
            Não salvo
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
