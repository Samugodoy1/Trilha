"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Estrutura de página com título grande que se recolhe na barra de navegação
 * ao rolar — o comportamento de navegação padrão de sistema.
 */
export function Page({
  title,
  subtitle,
  back,
  actions,
  children,
  width = "default",
  eyebrow,
  hideLargeTitle,
  className,
  titleTint,
}: {
  title: string;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: "narrow" | "default" | "wide" | "full";
  eyebrow?: React.ReactNode;
  hideLargeTitle?: boolean;
  className?: string;
  titleTint?: boolean;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCollapsed(!e.isIntersecting), { rootMargin: "-44px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Telas principais (sem "voltar"): no telefone, os botões ficam na linha do título
  // grande, como em Fotos, Música e Diário; a barra só aparece ao rolar.
  const root = !back;
  const maxW =
    width === "narrow" ? "max-w-2xl" : width === "wide" ? "max-w-6xl" : width === "full" ? "max-w-none" : "max-w-4xl";

  return (
    <div className={cn("min-h-dvh", className)}>
      <div
        className={cn(
          "no-print sticky top-0 z-30 pt-safe transition-[background-color,box-shadow,backdrop-filter] duration-200",
          collapsed || hideLargeTitle ? "material-chrome hairline-b" : "bg-transparent",
          root && !hideLargeTitle && "max-md:-mb-11",
          root && !hideLargeTitle && !collapsed && "max-md:pointer-events-none",
        )}
      >
        <div className={cn("mx-auto grid h-11 grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 md:h-14 md:px-8", maxW)}>
          <div className="flex min-w-0 items-center">
            {back && (
              <Link
                href={back.href}
                aria-label={`Voltar para ${back.label}`}
                title={back.label}
                className={cn(
                  "press flex h-9 min-w-9 items-center justify-center gap-0.5 rounded-full text-label outline-none md:h-10 md:min-w-10",
                  collapsed || hideLargeTitle ? "hover:bg-fill" : "glass",
                  "md:px-3 md:pl-2",
                )}
              >
                <ChevronLeft aria-hidden className="size-[22px] shrink-0" strokeWidth={2.4} />
                <span className="hidden max-w-40 truncate text-callout font-medium md:inline">{back.label}</span>
              </Link>
            )}
          </div>
          <div
            className={cn(
              "max-w-[46vw] truncate text-center text-headline transition-all duration-200 md:max-w-md",
              collapsed || hideLargeTitle ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
            )}
            aria-hidden={!collapsed && !hideLargeTitle}
          >
            {title}
          </div>
          <div
            className={cn(
              "flex items-center justify-end gap-2",
              root && !hideLargeTitle && "max-md:transition-opacity max-md:duration-200",
              root && !hideLargeTitle && !collapsed && "max-md:invisible max-md:opacity-0",
            )}
          >
            {actions}
          </div>
        </div>
      </div>

      <main id="conteudo" className={cn("mx-auto px-5 pb-36 md:px-8 lg:pb-16", maxW)}>
        {!hideLargeTitle && (
          <header className={cn("pt-1 pb-5 md:pt-2", root && "max-md:pt-3")}>
            {eyebrow && <div className="mb-0.5 text-footnote font-semibold text-label-2 uppercase tracking-[0.03em]">{eyebrow}</div>}
            <div className="flex items-center justify-between gap-3">
              <h1 className={cn("min-w-0 text-large-title text-balance break-words hyphens-auto", titleTint && "text-accent")}>{title}</h1>
              {root && actions && <div className="flex shrink-0 items-center gap-2 md:hidden">{actions}</div>}
            </div>
            {subtitle && <div className="mt-1 text-callout text-label-2">{subtitle}</div>}
          </header>
        )}
        {hideLargeTitle && <h1 className="sr-only">{title}</h1>}
        <div ref={sentinel} aria-hidden className="h-0" />
        {children}
      </main>
    </div>
  );
}
