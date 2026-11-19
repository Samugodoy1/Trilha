"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireSession } from "../session";
import { familyStudentIds, isFamily, isUuid } from "../access";
import { audit } from "../audit";

async function loadConversation(id: string) {
  const ctx = await requireSession();
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [c] = await db.select().from(schema.conversations).where(eq(schema.conversations.id, id));
  if (!c) return null;
  const isMember = c.teacherId === ctx.user.id || c.guardianId === ctx.user.id;
  if (!isMember) return null;
  // Família: o vínculo precisa continuar ativo
  if (c.guardianId === ctx.user.id && !(await familyStudentIds(ctx)).includes(c.studentId)) return null;
  return { ctx, c, db };
}

export async function sendMessageAction(conversationId: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const g = await loadConversation(conversationId);
  if (!g) return { ok: false, error: "Conversa não encontrada." };
  const text = body.trim();
  if (!text) return { ok: false, error: "Escreva uma mensagem." };
  if (text.length > 4000) return { ok: false, error: "Mensagem muito longa." };
  await g.db.insert(schema.messages).values({ conversationId, senderId: g.ctx.user.id, body: text });
  await g.db.update(schema.conversations).set({ lastMessageAt: new Date(), archivedByTeacherAt: null }).where(eq(schema.conversations.id, conversationId));
  await audit(g.ctx, "message.send", "conversation", conversationId);
  revalidatePath("/mensagens", "layout");
  revalidatePath("/familia/mensagens", "layout");
  return { ok: true };
}

export async function markReadAction(conversationId: string) {
  const g = await loadConversation(conversationId);
  if (!g) return;
  await g.db
    .update(schema.messages)
    .set({ readAt: new Date() })
    .where(and(eq(schema.messages.conversationId, conversationId), ne(schema.messages.senderId, g.ctx.user.id), isNull(schema.messages.readAt)));
  revalidatePath("/", "layout");
}

export async function archiveConversationAction(conversationId: string, archived: boolean) {
  const g = await loadConversation(conversationId);
  if (!g || g.c.teacherId !== g.ctx.user.id) return;
  await g.db.update(schema.conversations).set({ archivedByTeacherAt: archived ? new Date() : null }).where(eq(schema.conversations.id, conversationId));
  revalidatePath("/mensagens");
}

const startSchema = z.object({
  studentId: z.string().uuid(),
  teacherId: z.string().uuid(),
  category: z.enum(schema.conversationCategoryEnum.enumValues),
  subject: z.string().trim().min(2, "Escreva um assunto curto.").max(120),
  body: z.string().trim().min(2, "Escreva sua mensagem.").max(4000),
});

/** A família inicia uma conversa com um professor do filho. */
export async function startConversationAction(input: z.input<typeof startSchema>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireSession();
  if (!isFamily(ctx)) return { ok: false, error: "Somente famílias iniciam conversas por aqui." };
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!(await familyStudentIds(ctx)).includes(d.studentId)) return { ok: false, error: "Aluno não encontrado." };
  const db = await getDb();
  // O professor precisa lecionar para o aluno (turma atual)
  const [ok] = await db
    .select({ id: schema.teachingAssignments.id, schoolId: schema.classes.schoolId })
    .from(schema.teachingAssignments)
    .innerJoin(schema.enrollments, eq(schema.enrollments.classId, schema.teachingAssignments.classId))
    .innerJoin(schema.classes, eq(schema.classes.id, schema.teachingAssignments.classId))
    .where(and(eq(schema.teachingAssignments.userId, d.teacherId), eq(schema.enrollments.studentId, d.studentId), isNull(schema.classes.archivedAt)))
    .limit(1);
  if (!ok) return { ok: false, error: "Professor não encontrado." };
  const [c] = await db
    .insert(schema.conversations)
    .values({ schoolId: ok.schoolId, studentId: d.studentId, teacherId: d.teacherId, guardianId: ctx.user.id, category: d.category, subject: d.subject })
    .returning();
  await db.insert(schema.messages).values({ conversationId: c.id, senderId: ctx.user.id, body: d.body });
  await audit(ctx, "conversation.start", "conversation", c.id, { category: d.category });
  revalidatePath("/familia/mensagens");
  return { ok: true, id: c.id };
}
