import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Listas no estilo de sistema.
 * - "plain" (padrão): sobre o fundo branco, sem caixa, separadores alinhados ao texto (Lembretes).
 * - "inset": células brancas agrupadas sobre fundo cinza (Ajustes), para formulários e preferências.
 */
export function ListSection({
  header,
  footer,
  action,
  children,
  className,
  id,
  href,
  variant = "plain",
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
  href?: string;
  variant?: "plain" | "inset";
}) {
  return (
    <section className={cn("space-y-1", className)} aria-labelledby={id && header ? `${id}-h` : undefined}>
      {(header || action) && (
        <div className="flex items-center justify-between gap-3">
          {header ? (
            <h2 id={id ? `${id}-h` : undefined} className="font-sans text-[1.375rem] leading-7 font-bold tracking-[-0.02em]">
              {href ? (
                <Link href={href} className="inline-flex items-center gap-0.5 outline-none hover:opacity-70">
                  {header}
                  <ChevronRight aria-hidden className="size-5 text-label-3" strokeWidth={2.6} />
                </Link>
              ) : (
                header
              )}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <List variant={variant}>{children}</List>
      {footer && <p className={cn("pt-1 text-footnote text-label-2", variant === "inset" && "px-4")}>{footer}</p>}
    </section>
  );
}

export function List({ children, className, variant = "plain" }: { children: React.ReactNode; className?: string; variant?: "plain" | "inset" }) {
  return (
    <div role="list" data-variant={variant} className={cn("group/list", variant === "inset" ? "overflow-hidden rounded-[12px] bg-surface" : "-mx-4 md:mx-0", className)}>
      {children}
    </div>
  );
}

type RowProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  detail?: React.ReactNode;
  leading?: React.ReactNode;
  icon?: LucideIcon;
  iconTint?: string;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  trailing?: React.ReactNode;
  destructive?: boolean;
  className?: string;
  multiline?: boolean;
  ariaLabel?: string;
  onContextMenu?: React.MouseEventHandler;
};

export function ListRow({
  title,
  subtitle,
  detail,
  leading,
  icon: Icon,
  iconTint = "var(--accent)",
  href,
  onClick,
  chevron,
  trailing,
  destructive,
  className,
  multiline,
  ariaLabel,
  onContextMenu,
}: RowProps) {
  const interactive = Boolean(href || onClick);
  const inner = (
    <>
      {Icon ? (
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full text-white" style={{ background: iconTint }}>
          <Icon aria-hidden className="size-[16px]" strokeWidth={2.4} />
        </span>
      ) : (
        leading
      )}
      <span
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 self-stretch py-[11px] pr-4",
          "[[role=listitem]:not(:last-child)>*>&]:shadow-[inset_0_-0.5px_0_var(--separator)] [[role=listitem]:not(:last-child)>&]:shadow-[inset_0_-0.5px_0_var(--separator)]",
        )}
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-body",
              !multiline && "truncate",
              destructive ? "text-critical" : interactive && !href && !chevron ? "text-accent" : "text-label",
            )}
          >
            {title}
          </span>
          {subtitle && <span className={cn("mt-0.5 block text-subhead text-label-2", !multiline && "truncate")}>{subtitle}</span>}
        </span>
        {detail && <span className="shrink-0 text-body text-label-2 tabular">{detail}</span>}
        {trailing}
        {(chevron ?? Boolean(href)) && <ChevronRight aria-hidden className="size-[15px] shrink-0 text-label-3/70" strokeWidth={2.6} />}
      </span>
    </>
  );
  const cls = cn(
    "flex w-full items-center gap-3.5 pl-4 text-left outline-none transition-colors duration-150",
    interactive && "hover:bg-fill/50 active:bg-fill focus-visible:bg-fill",
    className,
  );
  if (href)
    return (
      <div role="listitem" onContextMenu={onContextMenu}>
        <Link href={href} className={cls} aria-label={ariaLabel}>
          {inner}
        </Link>
      </div>
    );
  if (onClick)
    return (
      <div role="listitem" onContextMenu={onContextMenu}>
        <button type="button" onClick={onClick} className={cls} aria-label={ariaLabel}>
          {inner}
        </button>
      </div>
    );
  return (
    <div role="listitem" className={cls} onContextMenu={onContextMenu}>
      {inner}
    </div>
  );
}
