"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Peças do onboarding, no ritmo do Assistente de Configuração do iPhone:
 * um ícone grande, um título curto, uma frase que explica, uma decisão por tela,
 * e o botão principal sempre no mesmo lugar, junto ao polegar.
 */

export type Step = {
  key: string;
  /** Ícone grande no topo; omita para telas com ilustração própria (ex.: boas-vindas). */
  icon?: LucideIcon;
  /** Gradiente do ícone, como os ícones de Ajustes. */
  tint?: [string, string];
  hero?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  body?: React.ReactNode;
  primary: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean };
  secondary?: { label: string; onClick: () => void };
  /** Nota de privacidade discreta acima do botão, como em "Dados e Privacidade". */
  note?: React.ReactNode;
  /** Sem "Voltar" nesta tela (início e conclusão). */
  noBack?: boolean;
};

export function StepIcon({ icon: Icon, tint = ["#4BA3FF", "#0062E0"] }: { icon: LucideIcon; tint?: [string, string] }) {
  return (
    <span
      className="mx-auto mb-6 flex size-[76px] items-center justify-center rounded-[22px] text-white shadow-[0_12px_28px_-10px_rgb(0_0_0/0.35)]"
      style={{ background: `linear-gradient(160deg, ${tint[0]}, ${tint[1]})` }}
    >
      <Icon aria-hidden className="size-[40px]" strokeWidth={1.9} />
    </span>
  );
}

export function FeatureRow({ icon: Icon, color, title, children }: { icon: LucideIcon; color: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-4">
      <Icon aria-hidden className="mt-0.5 size-[30px] shrink-0" style={{ color }} strokeWidth={1.9} />
      <span className="min-w-0">
        <span className="block text-headline">{title}</span>
        <span className="block text-subhead text-label-2">{children}</span>
      </span>
    </li>
  );
}

/** Lista agrupada (inset grouped) para escolhas e resumos. */
export function Group({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-xl bg-surface-2 dark:bg-surface", className)}>{children}</div>;
}

export function GroupRow({ children, last, className }: { children: React.ReactNode; last?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-h-11 items-center gap-3 pl-4", className)}>
      <div className={cn("flex min-w-0 flex-1 items-center gap-3 py-3 pr-4", !last && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>{children}</div>
    </div>
  );
}

export function OnboardingFlow({ steps, index, onBack }: { steps: Step[]; index: number; onBack: () => void }) {
  const [dir, setDir] = useState(1);
  const [prev, setPrev] = useState(index);
  if (prev !== index) {
    setDir(index > prev ? 1 : -1);
    setPrev(index);
  }
  const step = steps[Math.min(index, steps.length - 1)];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index]);

  return (
    <main className="flex min-h-dvh flex-col bg-canvas md:items-center md:justify-center md:bg-surface-2 md:py-10">
      <div className="flex w-full flex-1 flex-col md:max-w-[520px] md:flex-none md:overflow-hidden md:rounded-[28px] md:bg-canvas md:shadow-e3">
        <div className="sticky top-0 z-10 bg-canvas/85 pt-[calc(env(safe-area-inset-top)+6px)] backdrop-blur-xl md:static md:bg-transparent md:pt-0">
          <div className="flex h-11 items-center px-2 md:h-14 md:px-4">
            {index > 0 && !step.noBack && (
              <button type="button" onClick={onBack} className="press flex h-11 items-center gap-0.5 rounded-full px-2 text-body text-accent outline-none focus-visible:bg-fill">
                <ChevronLeft aria-hidden className="size-[24px]" strokeWidth={2.4} />
                Voltar
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 px-6 pb-6 md:px-12">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.section
              key={step.key}
              custom={dir}
              initial={{ opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -28 }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
              aria-labelledby={`step-${step.key}`}
              className="pt-4 md:pt-6"
            >
              {step.hero ?? (step.icon && <StepIcon icon={step.icon} tint={step.tint} />)}
              <h1 id={`step-${step.key}`} className="text-center text-title-1 font-bold text-balance">
                {step.title}
              </h1>
              {step.description && <p className="mx-auto mt-3 max-w-[34ch] text-center text-body text-label-2 text-pretty">{step.description}</p>}
              {step.body && <div className="mt-8">{step.body}</div>}
            </motion.section>
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 z-10 bg-canvas/85 px-6 pt-3 pb-[max(env(safe-area-inset-bottom),20px)] backdrop-blur-xl md:static md:px-12 md:pb-10">
          {step.note && <div className="mb-4 flex items-start justify-center gap-2 text-center text-footnote text-label-2">{step.note}</div>}
          <Button size="lg" onClick={step.primary.onClick} disabled={step.primary.disabled} loading={step.primary.loading}>
            {step.primary.label}
          </Button>
          {step.secondary ? (
            <button type="button" onClick={step.secondary.onClick} className="mt-2 flex h-11 w-full items-center justify-center rounded-full text-body font-medium text-accent outline-none focus-visible:bg-fill">
              {step.secondary.label}
            </button>
          ) : (
            <div className="h-1" />
          )}
        </div>
      </div>
    </main>
  );
}

/** true quando o Trilha está aberto no navegador de um celular (e ainda não foi instalado na Tela de Início). */
export function useCanInstall() {
  const [can, setCan] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const touch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    setCan(touch && !standalone);
  }, []);
  return can;
}
