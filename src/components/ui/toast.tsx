"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

type Tone = "success" | "error" | "info";
type Toast = { id: number; title: string; description?: string; tone: Tone; action?: { label: string; onClick: () => void } };
type ToastInput = Omit<Toast, "id" | "tone"> & { tone?: Tone };

const Ctx = createContext<(t: ToastInput) => void>(() => undefined);

export function useToast() {
  return useContext(Ctx);
}

/** Notificações discretas em formato de cápsula, como os avisos de sistema. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((t: ToastInput) => {
    const id = ++seq.current;
    setToasts((prev) => [...prev.slice(-2), { ...t, tone: t.tone ?? "success", id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.action ? 6000 : 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),12px)] z-[80] flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = t.tone === "error" ? CircleAlert : t.tone === "info" ? Info : CircleCheck;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.18 } }}
                transition={{ type: "spring", stiffness: 520, damping: 34 }}
                role={t.tone === "error" ? "alert" : "status"}
                className="glass pointer-events-auto flex max-w-md items-center gap-3 rounded-full py-2.5 pr-3 pl-3.5 [--glass-bg:color-mix(in_oklab,var(--surface-raised)_84%,transparent)]"
              >
                <Icon
                  aria-hidden
                  className="size-5 shrink-0"
                  style={{ color: t.tone === "error" ? "var(--critical)" : t.tone === "info" ? "var(--info)" : "var(--positive)" }}
                  strokeWidth={2.2}
                />
                <div className="min-w-0 pr-1">
                  <p className="text-subhead font-semibold">{t.title}</p>
                  {t.description && <p className="text-footnote text-label-2">{t.description}</p>}
                </div>
                {t.action && (
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="rounded-full bg-fill px-3 py-1 text-footnote font-semibold text-accent hover:bg-fill-2"
                  >
                    {t.action.label}
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
