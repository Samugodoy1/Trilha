import { cn } from "@/lib/cn";

/**
 * Marca do Trilha: um caminho que sobe em três passos.
 * Facilmente substituível — toda a identidade visual deriva desta peça e do token --accent.
 */
export function BrandMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={!title}>
      <defs>
        <linearGradient id="trilha-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4BA3FF" />
          <stop offset="1" stopColor="#0062E0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#trilha-g)" />
      <path
        d="M15 46c8 0 10-7 17-11s12-3 17-12"
        fill="none"
        stroke="#fff"
        strokeOpacity=".92"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <circle cx="15" cy="46" r="4.6" fill="#fff" />
      <circle cx="32" cy="35" r="4.6" fill="#fff" />
      <circle cx="49" cy="23" r="5.4" fill="#FFD60A" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark className="size-7" />
      <span className="font-display text-[1.1875rem] font-semibold tracking-[-0.02em]">Trilha</span>
    </span>
  );
}
