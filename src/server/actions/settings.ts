"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireRole, requireSession } from "../session";
import { audit } from "../audit";

export async function setThemeAction(theme: "system" | "light" | "dark") {
  const jar = await cookies();
  if (theme === "system") jar.delete("trilha_theme");
  else jar.set("trilha_theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

const ohSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).max(7),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().trim().max(160).optional(),
});

export async function saveOfficeHoursAction(input: z.input<typeof ohSchema>) {
  const ctx = await requireRole("teacher");
  const parsed = ohSchema.safeParse(input);
  if (!parsed.success || parsed.data.start >= parsed.data.end) return { ok: false, error: "Confira os horários." };
  const db = await getDb();
  await db.update(schema.memberships).set({ officeHours: parsed.data }).where(eq(schema.memberships.id, ctx.membership.id));
  await audit(ctx, "settings.office_hours", "membership", ctx.membership.id);
  revalidatePath("/ajustes");
  return { ok: true };
}

const schoolSchema = z.object({
  aiEnabled: z.boolean(),
  retentionYears: z.number().int().min(1).max(20),
  evaluationModel: z.enum(schema.evaluationModelEnum.enumValues),
});

/** Políticas da escola: somente a gestão. A IA externa começa desligada. */
export async function updateSchoolAction(input: z.input<typeof schoolSchema>) {
  const ctx = await requireRole("admin");
  const parsed = schoolSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const db = await getDb();
  await db.update(schema.schools).set(parsed.data).where(eq(schema.schools.id, ctx.school.id));
  await audit(ctx, "school.update", "school", ctx.school.id, parsed.data);
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function revokeMembershipAction(membershipId: string) {
  const ctx = await requireRole("admin");
  const db = await getDb();
  const [m] = await db.select().from(schema.memberships).where(and(eq(schema.memberships.id, membershipId), eq(schema.memberships.schoolId, ctx.school.id)));
  if (!m || m.userId === ctx.user.id) return { ok: false };
  await db.update(schema.memberships).set({ revokedAt: new Date() }).where(eq(schema.memberships.id, membershipId));
  await db.delete(schema.sessions).where(eq(schema.sessions.membershipId, membershipId));
  await audit(ctx, "membership.revoke", "membership", membershipId);
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function touchAction() {
  await requireSession();
}
