import Link from "next/link";
import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

type Variant = "filled" | "tinted" | "gray" | "plain" | "destructive" | "glass";
type Size = "sm" | "md" | "lg";

const base =
  "press relative inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap font-semibold outline-none disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  filled: "bg-accent text-on-accent hover:bg-accent-strong",
  tinted: "bg-accent-soft text-accent hover:bg-[color-mix(in_oklab,var(--accent)_18%,transparent)]",
  gray: "bg-fill text-label hover:bg-fill-2",
  plain: "text-accent hover:bg-accent-soft",
  destructive: "bg-[color-mix(in_oklab,var(--critical)_12%,transparent)] text-critical-ink hover:bg-[color-mix(in_oklab,var(--critical)_18%,transparent)]",
  glass: "glass text-label",
};

const sizes: Record<Size, string> = {
  sm: "h-8 rounded-full px-3 text-subhead",
  md: "h-10 rounded-full px-4 text-callout",
  lg: "h-[50px] rounded-full px-6 text-headline w-full",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
  href?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "filled", size = "md", icon: Icon, loading, href, className, children, disabled, ...rest },
  ref,
) {
  const content = (
    <>
      {loading ? (
        <Spinner className="size-4" />
      ) : Icon ? (
        <Icon aria-hidden className={size === "sm" ? "size-4" : "size-[18px]"} strokeWidth={2.1} />
      ) : null}
      {children}
    </>
  );
  const cls = cn(base, variants[variant], sizes[size], className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: LucideIcon;
    label: string;
    variant?: "plain" | "gray" | "glass" | "tinted";
    size?: "sm" | "md";
    href?: string;
  }
>(function IconButton({ icon: Icon, label, variant = "gray", size = "md", className, href, ...rest }, ref) {
  const cls = cn(
    "press inline-flex shrink-0 items-center justify-center rounded-full outline-none disabled:opacity-40",
    size === "sm" ? "size-8" : "size-9",
    variant === "gray" && "bg-fill text-label hover:bg-fill-2",
    variant === "plain" && "text-accent hover:bg-accent-soft",
    variant === "tinted" && "bg-accent-soft text-accent",
    variant === "glass" && "glass text-label",
    className,
  );
  const icon = <Icon aria-hidden className={size === "sm" ? "size-[17px]" : "size-[19px]"} strokeWidth={2} />;
  if (href)
    return (
      <Link href={href} aria-label={label} title={label} className={cls}>
        {icon}
      </Link>
    );
  return (
    <button ref={ref} type="button" aria-label={label} title={label} className={cls} {...rest}>
      {icon}
    </button>
  );
});
