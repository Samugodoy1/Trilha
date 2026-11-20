"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { addDays, todayISO } from "@/lib/format";
import { requireSession } from "../session";

const KEY = /^[a-z]+-[0-9a-f-]{8,80}$/i;

/** Adiar (até amanhã) ou ocultar (7 dias) um item de "Para hoje". */
export async function dismissTodayItemAction(itemKey: string, mode: "snooze" | "hide") {
  const ctx = await requireSession();
  if (!KEY.test(itemKey) && !/^msg$/.test(itemKey)) return { ok: false };
  const db = await getDb();
  const until = addDays(todayISO(), mode === "snooze" ? 1 : 7);
  await db
    .insert(schema.dismissals)
    .values({ userId: ctx.user.id, itemKey, until })
    .onConflictDoUpdate({ target: [schema.dismissals.userId, schema.dismissals.itemKey], set: { until } });
  revalidatePath("/hoje");
  return { ok: true };
}

export async function undoDismissAction(itemKey: string) {
  const ctx = await requireSession();
  const db = await getDb();
  await db.delete(schema.dismissals).where(and(eq(schema.dismissals.userId, ctx.user.id), eq(schema.dismissals.itemKey, itemKey)));
  revalidatePath("/hoje");
  return { ok: true };
}
