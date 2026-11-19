"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { addDays, todayISO } from "@/lib/format";
import { generateInviteCode, hashInviteCode } from "@/lib/invite";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, putObject, sniffMime } from "@/lib/storage";
import { requireRole, requireSession } from "../session";
import { AccessDenied, assertStudent, isStaff, isUuid } from "../access";
import { audit } from "../audit";
import { draftFeedback, type GroundedDraft } from "../ai";

export async function suggestFeedbackAction(studentId: string, tone: string): Promise<GroundedDraft | { error: string }> {
  const ctx = await requireRole("teacher");
  try {
    const db = await getDb();
    const [g] = await db
      .select({ name: schema.users.name })
      .from(schema.guardianLinks)
      .innerJoin(schema.users, eq(schema.users.id, schema.guardianLinks.userId))
      .where(and(eq(schema.guardianLinks.studentId, studentId), isNull(schema.guardianLinks.revokedAt)))
      .limit(1);
    const today = todayISO();
    return await draftFeedback(ctx, studentId, tone, g?.name.split(" ")[0] ?? null, { from: addDays(today, -60), to: today });
  } catch (e) {
    if (e instanceof AccessDenied) return { error: "Aluno não encontrado." };
    throw e;
  }
}

const feedbackSchema = z.object({
  id: z.string().uuid().optional(),
  studentId: z.string().uuid(),
  tone: z.enum(schema.feedbackToneEnum.enumValues),
  title: z.string().trim().min(2, "Dê um título curto.").max(120),
  body: z.string().trim().min(10, "Escreva a mensagem.").max(5000),
  publish: z.boolean(),
  aiAssisted: z.boolean().default(false),
});

export async function saveFeedbackAction(input: z.input<typeof feedbackSchema>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireRole("teacher");
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  try {
    await assertStudent(ctx, d.studentId);
  } catch {
    return { ok: false, error: "Aluno não encontrado." };
  }
  // Conteúdo com marcadores de rascunho não pode ser enviado
  if (d.publish && /\[[^\]]{3,}\]/.test(d.body)) return { ok: false, error: "Complete ou remova os trechos entre colchetes antes de enviar." };
  const db = await getDb();
  const values = {
    schoolId: ctx.school.id,
    studentId: d.studentId,
    authorId: ctx.user.id,
    tone: d.tone,
    title: d.title,
    body: d.body,
    aiAssisted: d.aiAssisted,
    status: d.publish ? ("published" as const) : ("draft" as const),
    publishedAt: d.publish ? new Date() : null,
  };
  let id = d.id;
  if (id) {
    const [ex] = await db.select().from(schema.feedbacks).where(eq(schema.feedbacks.id, id));
    if (!ex || ex.authorId !== ctx.user.id || ex.status === "published") return { ok: false, error: "Este feedback não pode ser alterado." };
    await db.update(schema.feedbacks).set(values).where(eq(schema.feedbacks.id, id));
  } else {
    const [row] = await db.insert(schema.feedbacks).values(values).returning({ id: schema.feedbacks.id });
    id = row.id;
  }
  await audit(ctx, d.publish ? "feedback.publish" : "feedback.draft", "feedback", id, { studentId: d.studentId, aiAssisted: d.aiAssisted });
  revalidatePath(`/alunos/${d.studentId}`);
  return { ok: true, id: id! };
}

/** Convite seguro para responsável: código de uso único, com validade, vinculado a um aluno. */
export async function createGuardianInviteAction(input: { studentId: string; relationship: string; recipientName?: string }) {
  const ctx = await requireRole("teacher", "coordinator", "admin");
  const parsed = z
    .object({ studentId: z.string().uuid(), relationship: z.string().trim().min(2).max(40), recipientName: z.string().trim().max(80).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Informe o parentesco." };
  try {
    await assertStudent(ctx, parsed.data.studentId);
  } catch {
    return { ok: false as const, error: "Aluno não encontrado." };
  }
  const code = generateInviteCode();
  const db = await getDb();
  const expiresAt = new Date(Date.now() + 14 * 86_400_000);
  const [inv] = await db
    .insert(schema.invitations)
    .values({
      schoolId: ctx.school.id,
      role: "guardian",
      studentId: parsed.data.studentId,
      recipientName: parsed.data.recipientName || null,
      relationship: parsed.data.relationship,
      tokenHash: hashInviteCode(code),
      codeHint: code.slice(-4),
      expiresAt,
      createdById: ctx.user.id,
    })
    .returning();
  await audit(ctx, "invite.create", "invitation", inv.id, { studentId: parsed.data.studentId });
  revalidatePath(`/alunos/${parsed.data.studentId}`);
  return { ok: true as const, code, expiresAt: expiresAt.toISOString() };
}

export async function revokeInviteAction(inviteId: string) {
  const ctx = await requireRole("teacher", "coordinator", "admin");
  if (!isUuid(inviteId)) return;
  const db = await getDb();
  const [inv] = await db.select().from(schema.invitations).where(eq(schema.invitations.id, inviteId));
  if (!inv || inv.schoolId !== ctx.school.id || !inv.studentId) return;
  await assertStudent(ctx, inv.studentId);
  await db.update(schema.invitations).set({ revokedAt: new Date() }).where(eq(schema.invitations.id, inviteId));
  await audit(ctx, "invite.revoke", "invitation", inviteId);
  revalidatePath(`/alunos/${inv.studentId}`);
}

/** Revogar acesso de um responsável: somente gestão/coordenação. */
export async function revokeGuardianAction(linkId: string) {
  const ctx = await requireSession();
  if (!isStaff(ctx) || !isUuid(linkId)) return { ok: false };
  const db = await getDb();
  const [link] = await db.select().from(schema.guardianLinks).where(eq(schema.guardianLinks.id, linkId));
  if (!link) return { ok: false };
  await assertStudent(ctx, link.studentId);
  await db.update(schema.guardianLinks).set({ revokedAt: new Date() }).where(eq(schema.guardianLinks.id, linkId));
  await audit(ctx, "guardian.revoke", "guardian_link", linkId, { studentId: link.studentId });
  revalidatePath(`/alunos/${link.studentId}`);
  return { ok: true };
}

export async function addPortfolioItemAction(form: FormData): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireRole("teacher");
  const parsed = z
    .object({
      studentId: z.string().uuid(),
      title: z.string().trim().min(2, "Dê um título.").max(120),
      description: z.string().trim().max(1000).optional(),
      kind: z.enum(schema.portfolioKindEnum.enumValues),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      visibility: z.enum(["private", "family"]),
    })
    .safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  let student;
  try {
    student = await assertStudent(ctx, d.studentId);
  } catch {
    return { ok: false, error: "Aluno não encontrado." };
  }
  if (d.visibility === "family" && d.kind === "foto" && !student.imageConsent)
    return { ok: false, error: "A família ainda não autorizou o uso de imagem deste aluno. Guarde como privado." };

  const file = form.get("file");
  let upload: { key: string; mime: string; size: number; name: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "O arquivo passa de 10 MB." };
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = sniffMime(buf);
    if (!mime || !ALLOWED_UPLOAD_TYPES[mime]) return { ok: false, error: "Envie uma imagem (JPG, PNG, WEBP, HEIC) ou PDF." };
    upload = { key: await putObject(ctx.school.id, buf, ALLOWED_UPLOAD_TYPES[mime]), mime, size: buf.length, name: file.name.slice(0, 120) };
  }
  const db = await getDb();
  const [item] = await db
    .insert(schema.portfolioItems)
    .values({ schoolId: ctx.school.id, studentId: d.studentId, createdById: ctx.user.id, kind: d.kind, title: d.title, description: d.description || null, date: d.date, visibility: d.visibility })
    .returning();
  if (upload)
    await db.insert(schema.media).values({ schoolId: ctx.school.id, uploaderId: ctx.user.id, ownerType: "portfolio", ownerId: item.id, storageKey: upload.key, mime: upload.mime, size: upload.size, originalName: upload.name, caption: d.title });
  await audit(ctx, "portfolio.add", "portfolio_item", item.id, { visibility: d.visibility });
  revalidatePath(`/alunos/${d.studentId}`);
  return { ok: true };
}

export async function markContributionsSeenAction(studentId: string) {
  const ctx = await requireRole("teacher");
  try {
    await assertStudent(ctx, studentId);
  } catch {
    return;
  }
  const db = await getDb();
  await db
    .update(schema.familyContributions)
    .set({ seenAt: new Date() })
    .where(and(eq(schema.familyContributions.studentId, studentId), isNull(schema.familyContributions.seenAt)));
  revalidatePath("/hoje");
}
