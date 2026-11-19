import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Cor de avatar derivada de um matiz, com contraste garantido em ambos os temas. */
export function hueStyle(hue: number) {
  return {
    "--avatar-bg": `oklch(0.9 0.06 ${hue})`,
    "--avatar-fg": `oklch(0.42 0.1 ${hue})`,
    "--avatar-bg-dark": `oklch(0.38 0.08 ${hue})`,
    "--avatar-fg-dark": `oklch(0.9 0.06 ${hue})`,
  } as React.CSSProperties;
}
