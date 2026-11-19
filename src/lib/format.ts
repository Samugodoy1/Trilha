export const TZ = "America/Sao_Paulo";

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo. Pode ser fixada via TRILHA_TODAY para demonstrações. */
export function todayISO(): string {
  const fixed = typeof process !== "undefined" ? process.env.TRILHA_TODAY : undefined;
  if (fixed) return fixed;
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86_400_000);
}

/** Segunda-feira da semana da data. */
export function weekStart(iso: string): string {
  const d = parseISODate(iso);
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(iso, -dow);
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...opts });
const dayMonth = fmt({ day: "numeric", month: "long" });
const dayMonthShort = fmt({ day: "numeric", month: "short" });
const weekdayLong = fmt({ weekday: "long" });
const monthLong = fmt({ month: "long" });
const monthShort = fmt({ month: "short" });
const full = fmt({ weekday: "long", day: "numeric", month: "long" });

const clean = (s: string) => s.replace(/\./g, "").replace(" de ", " de ");

export function formatDay(iso: string): string {
  return dayMonth.format(parseISODate(iso));
}
export function formatDayShort(iso: string): string {
  return clean(dayMonthShort.format(parseISODate(iso)));
}
export function formatWeekday(iso: string): string {
  return capitalize(weekdayLong.format(parseISODate(iso)));
}
export function formatFullDay(iso: string): string {
  return capitalize(full.format(parseISODate(iso)));
}
export function formatMonth(iso: string): string {
  return capitalize(monthLong.format(parseISODate(iso)));
}
export function formatMonthShort(iso: string): string {
  return capitalize(clean(monthShort.format(parseISODate(iso))));
}

/** "Hoje", "Ontem", "Amanhã", "Sexta-feira" (na mesma semana) ou "12 de março". */
export function formatRelativeDay(iso: string, today = todayISO()): string {
  const diff = diffDays(iso, today);
  if (diff === 0) return "Hoje";
  if (diff === -1) return "Ontem";
  if (diff === 1) return "Amanhã";
  if (diff > 1 && diff < 7) return formatWeekday(iso);
  return formatDay(iso);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
}

export function isoFromTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Horário de mensagens: "14:32", "Ontem", "seg.", "12/03". */
export function formatMessageStamp(date: Date | string, today = todayISO()): string {
  const iso = isoFromTimestamp(date);
  const diff = diffDays(iso, today);
  if (diff === 0) return formatTime(date);
  if (diff === -1) return "Ontem";
  if (diff > -7) return capitalize(fmt({ weekday: "short" }).format(parseISODate(iso)).replace(".", ""));
  return fmt({ day: "2-digit", month: "2-digit" }).format(parseISODate(iso));
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(p));
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function ageFrom(birthISO: string, today = todayISO()): number {
  const b = parseISODate(birthISO);
  const t = parseISODate(today);
  let age = t.getUTCFullYear() - b.getUTCFullYear();
  if (t.getUTCMonth() < b.getUTCMonth() || (t.getUTCMonth() === b.getUTCMonth() && t.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date()));
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function formatScore(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: n % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 });
}
