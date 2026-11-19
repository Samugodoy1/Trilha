import { cn } from "@/lib/cn";

/** Indicador de atividade em 8 traços, no estilo de sistema. */
export function Spinner({ className, label = "Carregando" }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5 animate-spin [animation-duration:900ms]", className)} role="status" aria-label={label}>
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x="11"
          y="2"
          width="2"
          height="6"
          rx="1"
          fill="currentColor"
          opacity={0.25 + (i / 8) * 0.75}
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
    </svg>
  );
}
