"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, putObject, sniffMime } from "@/lib/storage";
import { requireRole } from "../session";
import { assertClass, familyStudentIds, isUuid } from "../access";
import { audit } from "../audit";

const taskSchema = z.object({
  classId: z.string().uuid(),
  kind: z.enum(schema.taskKindEnum.enumValues),
  title: z.string().trim().min(2, "Dê um título à tarefa.").max(140),
  instructions: z.string().trim().max(4000).optional(),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  links: z.array(z.object({ url: z.string().url().refine((u) => /^https?:\/\//.test(u), "Use um link http(s)."), title: z.string().trim().max(80) })).max(5).default([]),
  acceptsSubmissions: z.boolean().default(false),
  mediaIds: z.array(z.string().uuid()).max(6).default([]),
});

/** Publicar uma tarefa: aparece automaticamente na agenda das famílias da turma. */
export async function createTaskAction(input: z.input<typeof taskSchema>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireRole("teacher");
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  try {
    await assertClass(ctx, d.classId);
  } catch {
    return { ok: false, error: "Turma não encontrada." };
  }
  const db = await getDb();
  const [t] = await db
    .insert(schema.tasks)
    .values({ schoolId: ctx.school.id, classId: d.classId, authorId: ctx.user.id, kind: d.kind, title: d.title, instructions: d.instructions || null, dueOn: d.dueOn || null, links: d.links.map((l) => ({ url: l.url, title: l.title || l.url })), acceptsSubmissions: d.acceptsSubmissions })
    .returning();
  if (d.mediaIds.length)
    await db
      .update(schema.media)
      .set({ ownerType: "task", ownerId: t.id })
      .where(and(inArray(schema.media.id, d.mediaIds), eq(schema.media.uploaderId, ctx.user.id), isNull(schema.media.ownerId)));
  await audit(ctx, "task.create", "task", t.id);
  revalidatePath("/tarefas");
  revalidatePath("/hoje");
  return { ok: true, id: t.id };
}

export async function deleteTaskAction(id: string) {
  const ctx = await requireRole("teacher");
  if (!isUuid(id)) return;
  const db = await getDb();
  await db.delete(schema.tasks).where(and(eq(schema.tasks.id, id), eq(schema.tasks.authorId, ctx.user.id)));
  await audit(ctx, "task.delete", "task", id);
  revalidatePath("/tarefas");
}

/** Upload genérico (imagem ou PDF), ainda sem dono — vinculado ao salvar. */
export async function uploadFileAction(form: FormData): Promise<{ ok: true; id: string; mime: string; name: string } | { ok: false; error: string }> {
  const ctx = await requireRole("teacher", "guardian");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Escolha um arquivo." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "O arquivo passa de 10 MB." };
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !ALLOWED_UPLOAD_TYPES[mime]) return { ok: false, error: "Envie uma imagem ou um PDF." };
  const key = await putObject(ctx.school.id, buf, ALLOWED_UPLOAD_TYPES[mime]);
  const db = await getDb();
  const [m] = await db.insert(schema.media).values({ schoolId: ctx.school.id, uploaderId: ctx.user.id, storageKey: key, mime, size: buf.length, originalName: file.name.slice(0, 120) }).returning();
  return { ok: true, id: m.id, mime, name: file.name };
}

/** Família marca a tarefa como feita, com observação e foto opcionais. */
export async function completeTaskAction(input: { taskId: string; studentId: string; done: boolean; note?: string; mediaId?: string }) {
  const ctx = await requireRole("guardian", "student");
  if (!isUuid(input.taskId) || !isUuid(input.studentId)) return { ok: false };
  const allowed = await familyStudentIds(ctx);
  if (!allowed.includes(input.studentId)) return { ok: false };
  const db = await getDb();
  const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, input.taskId));
  if (!task) return { ok: false };
  const [enr] = await db.select().from(schema.enrollments).where(and(eq(schema.enrollments.classId, task.classId), eq(schema.enrollments.studentId, input.studentId)));
  if (!enr) return { ok: false };
  if (!input.done) {
    await db.delete(schema.taskCompletions).where(and(eq(schema.taskCompletions.taskId, task.id), eq(schema.taskCompletions.studentId, input.studentId)));
  } else {
    const [c] = await db
      .insert(schema.taskCompletions)
      .values({ taskId: task.id, studentId: input.studentId, completedById: ctx.user.id, note: input.note?.slice(0, 1000) || null })
      .onConflictDoUpdate({ target: [schema.taskCompletions.taskId, schema.taskCompletions.studentId], set: { note: input.note?.slice(0, 1000) || null, completedAt: new Date(), completedById: ctx.user.id } })
      .returning();
    if (input.mediaId && isUuid(input.mediaId) && task.acceptsSubmissions)
      await db
        .update(schema.media)
        .set({ ownerType: "submission", ownerId: c.id })
        .where(and(eq(schema.media.id, input.mediaId), eq(schema.media.uploaderId, ctx.user.id), isNull(schema.media.ownerId)));
  }
  await audit(ctx, input.done ? "task.complete" : "task.uncomplete", "task", task.id, { studentId: input.studentId });
  revalidatePath("/familia");
  revalidatePath("/familia/agenda");
  return { ok: true };
}
