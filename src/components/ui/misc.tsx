import type { LucideIcon } from "lucide-react";
import { Eye, Lock, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { visibilityInfo, type Visibility } from "@/lib/vocabulary";

/** Superfície de conteúdo. Usada com parcimônia: o espaço em branco também organiza. */
export function Surface({
  children,
  className,
  as: As = "div",
  ...rest
}: { children: React.ReactNode; className?: string; as?: "div" | "section" | "article" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn("rounded-xl bg-surface shadow-e1", className)} {...rest}>
      {children}
    </As>
  );
}

export const categoryColor = {
  reading: "var(--reading)",
  writing: "var(--writing)",
  math: "var(--math)",
  notes: "var(--notes)",
  attendance: "var(--attendance)",
  achievement: "var(--achievement-ink)",
  family: "var(--family)",
  messages: "var(--messages)",
  accent: "var(--accent)",
  diagnostic: "var(--info)",
  skills: "var(--notes)",
  custom: "var(--label-2)",
  warning: "var(--warning)",
  critical: "var(--critical)",
} as const;
export type Category = keyof typeof categoryColor;

/** Rótulo de categoria (ícone + nome na cor da categoria). */
export function CategoryLabel({
  icon: Icon,
  category,
  children,
  className,
}: {
  icon: LucideIcon;
  category: Category;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-subhead font-semibold", className)} style={{ color: categoryColor[category] }}>
      <Icon aria-hidden className="size-[15px]" strokeWidth={2.4} />
      {children}
    </span>
  );
}

export function Tag({
  children,
  tone = "neutral",
  className,
  icon: Icon,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "positive" | "warning" | "critical" | "info";
  className?: string;
  icon?: LucideIcon;
}) {
  const color =
    tone === "neutral" ? "var(--label-2)" : tone === "accent" ? "var(--accent)" : tone === "positive" || tone === "warning" ? `var(--${tone}-ink)` : `var(--${tone})`;
  return (
    <span
      className={cn("inline-flex h-[22px] items-center gap-1 rounded-full px-2.5 text-caption font-semibold whitespace-nowrap", className)}
      style={{ color, background: `color-mix(in oklab, ${color} 13%, transparent)` }}
    >
      {Icon && <Icon aria-hidden className="size-3" strokeWidth={2.6} />}
      {children}
    </span>
  );
}

export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-critical px-1.5 text-caption-2 font-bold text-white tabular",
        className,
      )}
    >
      <span className="sr-only">{count} não lidas</span>
      <span aria-hidden>{count > 99 ? "99+" : count}</span>
    </span>
  );
}

const visIcon: Record<Visibility, LucideIcon> = { private: Lock, coordination: Users, family: Eye };

/** Mostra claramente quem pode ver um registro. A privacidade também é interface. */
export function VisibilityBadge({ visibility, className }: { visibility: Visibility; className?: string }) {
  const Icon = visIcon[visibility];
  const info = visibilityInfo[visibility];
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-footnote text-label-2", visibility === "family" && "text-family", className)}
      title={info.description}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2.3} />
      {info.short}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  className,
  tint = "var(--accent)",
}: {
  icon: LucideIcon;
  title: string;
  message?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  tint?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <span
        className="mb-4 flex size-16 items-center justify-center rounded-full"
        style={{ background: `color-mix(in oklab, ${tint} 12%, transparent)`, color: tint }}
      >
        <Icon aria-hidden className="size-7" strokeWidth={1.9} />
      </span>
      <h3 className="font-sans text-title-3">{title}</h3>
      {message && <p className="mt-1.5 max-w-sm text-callout text-label-2">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  className,
  id,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-baseline justify-between gap-4", className)}>
      <h2 id={id} className="font-sans text-[1.375rem] leading-7 font-bold tracking-[-0.02em]">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-[68px] md:px-8" role="status" aria-label="Carregando">
      <Skeleton className="mb-2 h-4 w-32" />
      <Skeleton className="mb-8 h-9 w-56" />
      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="overflow-hidden rounded-xl bg-surface shadow-e1">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Divulgação progressiva: detalhes que aparecem quando o usuário precisa. */
export function Disclosure({ summary, children, className }: { summary: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <details className={cn("group", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-subhead font-medium text-accent outline-none [&::-webkit-details-marker]:hidden">
        <svg aria-hidden viewBox="0 0 12 12" className="size-3 transition-transform duration-200 group-open:rotate-90">
          <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {summary}
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}
