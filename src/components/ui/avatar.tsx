import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const sizes = {
  xs: "size-6 text-[0.625rem]",
  sm: "size-8 text-caption",
  md: "size-10 text-subhead",
  lg: "size-14 text-title-3",
  xl: "size-20 text-title-1",
} as const;

/** Avatar com iniciais. A cor deriva de um matiz e se adapta ao tema via light-dark(). */
export function Avatar({
  name,
  hue = 200,
  size = "md",
  className,
}: {
  name: string;
  hue?: number;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-sans font-semibold tracking-[0.01em]",
        sizes[size],
        className,
      )}
      // Monograma em gradiente cinza, como nos contatos do sistema. O matiz é mantido para uso futuro (fotos).
      data-hue={hue}
      style={{ background: "linear-gradient(180deg, #a5abb8 0%, #858994 100%)", color: "#fff" }}
    >
      {initials(name)}
    </span>
  );
}
