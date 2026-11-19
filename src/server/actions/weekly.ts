"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { addDays, formatDay, formatWeekday, isoFromTimestamp } from "@/lib/format";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, putObject, sniffMime } from "@/lib/storage";
import { requireRole } from "../session";
import { assertClass, isUuid } from "../access";
import { audit } from "../audit";
import { collectClassWeekRecords } from "../ai/records";
import { localWeekly, type WeeklyDraft } from "../ai/local";

export type WeeklySuggestion = WeeklyDraft & { sources: { key: string; id: string; label: string; text: string }[] };

/** Sugere a Nossa semana a partir dos registros da turma (conteúdos e atividades). Sempre exige revisão. */
export async function suggestWeeklyAction(classId: string, weekStart: string): Promise<WeeklySuggestion | { error: string }> {
  const ctx = await requireRole("teacher");
  try {
    await assertClass(ctx, classId);
  } catch {
    return { error: "Turma não encontrada." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return { error: "Semana inválida." };
  const records = await collectClassWeekRecords(classId, weekStart, addDays(weekStart, 6));
  const db = await getDb();
  const nextFrom = addDays(weekStart, 7);
  const nextTo = addDays(weekStart, 13);
  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.classId, classId), gte(schema.tasks.dueOn, addDays(weekStart, 4)), lte(schema.tasks.dueOn, nextTo)))
    .orderBy(asc(schema.tasks.dueOn));
  const anns = await db
    .select()
    .from(schema.announcements)
    .where(
      and(
        eq(schema.announcements.schoolId, ctx.school.id),
        or(isNull(schema.announcements.classId), eq(schema.announcements.classId, classId)),
        gte(schema.announcements.startsAt, new Date(`${addDays(weekStart, 4)}T00:00:00-03:00`)),
        lte(schema.announcements.startsAt, new Date(`${nextTo}T23:59:00-03:00`)),
      ),
    )
    .orderBy(asc(schema.announcements.startsAt));
  const upcoming = tasks.map((t) => `${formatWeekday(t.dueOn!)} (${formatDay(t.dueOn!)}): ${t.title}`);
  const notices = anns.map((a) => `${a.title} — ${formatDay(isoFromTimestamp(a.startsAt!))}`);
  void nextFrom;
  const draft = localWeekly(records, upcoming, notices);
  await audit(ctx, "ai.suggest_weekly", "class", classId, { sources: records.length });
  return { ...draft, sources: records.map((r) => ({ key: r.key, id: r.id, label: r.label, text: r.text })) };
}

const postSchema = z.object({
  id: z.string().uuid().optional(),
  classId: z.string().uuid(),
  studentId: z.string().uuid().nullable().optional(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(2, "Dê um título à publicação.").max(120),
  sections: z.array(z.object({ key: z.string().max(30), title: z.string().trim().min(1).max(80), body: z.string().max(4000) })).max(10),
  publish: z.boolean(),
  aiAssisted: z.boolean().default(false),
  sourceEntryIds: z.array(z.string().uuid()).max(50).default([]),
  mediaIds: z.array(z.string().uuid()).max(12).default([]),
});

export async function saveWeeklyAction(input: z.input<typeof postSchema>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireRole("teacher");
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  try {
    await assertClass(ctx, d.classId);
  } catch {
    return { ok: false, error: "Turma não encontrada." };
  }
  const sections = d.sections.filter((s) => s.body.trim());
  if (d.publish && sections.length === 0) return { ok: false, error: "Escreva pelo menos uma seção antes de publicar." };
  if (d.publish && sections.some((s) => /\[[^\]]{3,}\]/.test(s.body))) return { ok: false, error: "Complete os trechos entre colchetes antes de publicar." };
  const db = await getDb();
  if (d.studentId) {
    const [enr] = await db.select().from(schema.enrollments).where(and(eq(schema.enrollments.classId, d.classId), eq(schema.enrollments.studentId, d.studentId)));
    if (!enr) return { ok: false, error: "Aluno não pertence à turma." };
  }
  const values = {
    schoolId: ctx.school.id,
    classId: d.classId,
    studentId: d.studentId ?? null,
    authorId: ctx.user.id,
    title: d.title,
    weekStart: d.weekStart,
    sections,
    aiAssisted: d.aiAssisted,
    sourceEntryIds: d.sourceEntryIds,
    status: d.publish ? ("published" as const) : ("draft" as const),
    publishedAt: d.publish ? new Date() : null,
    updatedAt: new Date(),
  };
  let id = d.id;
  if (id) {
    const [ex] = await db.select().from(schema.weeklyPosts).where(eq(schema.weeklyPosts.id, id));
    if (!ex || ex.authorId !== ctx.user.id) return { ok: false, error: "Publicação não encontrada." };
    await db.update(schema.weeklyPosts).set({ ...values, publishedAt: ex.publishedAt ?? values.publishedAt }).where(eq(schema.weeklyPosts.id, id));
  } else {
    const [row] = await db.insert(schema.weeklyPosts).values(values).returning({ id: schema.weeklyPosts.id });
    id = row.id;
  }
  if (d.mediaIds.length) {
    await db
      .update(schema.media)
      .set({ ownerType: "weekly", ownerId: id })
      .where(and(inArray(schema.media.id, d.mediaIds), eq(schema.media.uploaderId, ctx.user.id), or(isNull(schema.media.ownerId), eq(schema.media.ownerId, id!))));
  }
  await audit(ctx, d.publish ? "weekly.publish" : "weekly.draft", "weekly_post", id, { aiAssisted: d.aiAssisted, audience: d.studentId ? "student" : "class" });
  revalidatePath("/semana");
  revalidatePath("/hoje");
  return { ok: true, id: id! };
}

/** Upload de foto ainda sem dono (vinculada ao salvar a publicação). */
export async function uploadPhotoAction(form: FormData): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireRole("teacher");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Escolha uma imagem." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "A imagem passa de 10 MB." };
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !mime.startsWith("image/")) return { ok: false, error: "Envie uma imagem JPG, PNG, WEBP ou HEIC." };
  const key = await putObject(ctx.school.id, buf, ALLOWED_UPLOAD_TYPES[mime]);
  const db = await getDb();
  const [m] = await db
    .insert(schema.media)
    .values({ schoolId: ctx.school.id, uploaderId: ctx.user.id, storageKey: key, mime, size: buf.length, originalName: file.name.slice(0, 120), caption: String(form.get("caption") ?? "") || null })
    .returning();
  return { ok: true, id: m.id };
}

export async function deleteWeeklyAction(id: string) {
  const ctx = await requireRole("teacher");
  if (!isUuid(id)) return { ok: false };
  const db = await getDb();
  const res = await db
    .delete(schema.weeklyPosts)
    .where(and(eq(schema.weeklyPosts.id, id), eq(schema.weeklyPosts.authorId, ctx.user.id), eq(schema.weeklyPosts.status, "draft")))
    .returning({ id: schema.weeklyPosts.id });
  revalidatePath("/semana");
  return { ok: res.length > 0 };
}
