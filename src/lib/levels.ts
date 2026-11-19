/** Rampa sequencial de um único matiz para níveis ordenados (claro → escuro). */
export function levelRamp(color: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => `color-mix(in oklab, ${color} ${Math.round(28 + (i / Math.max(1, n - 1)) * 72)}%, var(--surface))`);
}
