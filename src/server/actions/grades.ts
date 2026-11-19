"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireRole } from "../session";
import { assertClass, canAccessClass, isUuid } from "../access";
import { audit } from "../audit";

const itemSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid().optional().or(z.literal("")),
  termId: z.string().uuid(),
  title: z.string().trim().min(2, "Dê um nome à avaliação.").max(100),
  kind: z.enum(schema.gradeKindEnum.enumValues),
  maxScore: z.coerce.number().positive().max(1000).optional(),
  weight: z.coerce.number().positive().max(100).default(1),
  isRecovery: z.boolean().default(false),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bnccCodes: z.array(z.string().regex(/^EF\d{2}[A-Z]{2}\d{2}$/)).max(10).default([]),
});

/** Avaliações flexíveis: nota, conceito ou descritiva, com peso e recuperação. */
export async function createGradeItemAction(input: z.input<typeof itemSchema>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireRole("teacher");
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  try {
    await assertClass(ctx, d.classId);
  } catch {
    return { ok: false, error: "Turma não encontrada." };
  }
  const db = await getDb();
  const [term] = await db.select().from(schema.terms).where(and(eq(schema.terms.id, d.termId), eq(schema.terms.schoolId, ctx.school.id)));
  if (!term) return { ok: false, error: "Bimestre inválido." };
  const [item] = await db
    .insert(schema.gradeItems)
    .values({
      schoolId: ctx.school.id,
      classId: d.classId,
      subjectId: d.subjectId || null,
      termId: d.termId,
      title: d.title,
      kind: d.kind,
      maxScore: d.kind === "numeric" ? String(d.maxScore ?? 10) : null,
      weight: String(d.weight),
      isRecovery: d.isRecovery,
      date: d.date,
      bnccCodes: d.bnccCodes,
      createdById: ctx.user.id,
    })
    .returning();
  await audit(ctx, "grade_item.create", "grade_item", item.id);
  revalidatePath(`/turmas/${d.classId}`);
  return { ok: true, id: item.id };
}

const gradeSchema = z.object({
  gradeItemId: z.string().uuid(),
  studentId: z.string().uuid(),
  score: z.number().min(0).max(1000).nullable().optional(),
  concept: z.string().max(10).nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
});

export async function saveGradeAction(input: z.input<typeof gradeSchema>): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireRole("teacher");
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Valor inválido." };
  const d = parsed.data;
  const db = await getDb();
  const [item] = await db.select().from(schema.gradeItems).where(eq(schema.gradeItems.id, d.gradeItemId));
  if (!item || !(await canAccessClass(ctx, item.classId))) return { ok: false, error: "Avaliação não encontrada." };
  if (item.kind === "numeric" && d.score != null && item.maxScore && d.score > Number(item.maxScore))
    return { ok: false, error: `A nota máxima é ${Number(item.maxScore).toLocaleString("pt-BR")}.` };
  if (item.kind === "concept" && d.concept && !ctx.school.conceptScale.some((c) => c.key === d.concept)) return { ok: false, error: "Conceito inválido." };
  const [enr] = await db
    .select({ id: schema.enrollments.id })
    .from(schema.enrollments)
    .where(and(eq(schema.enrollments.classId, item.classId), eq(schema.enrollments.studentId, d.studentId)));
  if (!enr) return { ok: false, error: "Aluno não pertence à turma." };
  const values = {
    score: item.kind === "numeric" && d.score != null ? d.score.toFixed(2) : null,
    concept: item.kind === "concept" ? d.concept ?? null : null,
    comment: d.comment?.trim() || null,
  };
  await db
    .insert(schema.grades)
    .values({ gradeItemId: item.id, studentId: d.studentId, ...values })
    .onConflictDoUpdate({ target: [schema.grades.gradeItemId, schema.grades.studentId], set: { ...values, updatedAt: new Date() } });
  return { ok: true };
}

export async function setGradeItemSharedAction(id: string, shared: boolean) {
  const ctx = await requireRole("teacher");
  if (!isUuid(id)) return;
  const db = await getDb();
  const [item] = await db.select().from(schema.gradeItems).where(eq(schema.gradeItems.id, id));
  if (!item || !(await canAccessClass(ctx, item.classId))) return;
  await db.update(schema.gradeItems).set({ sharedWithFamily: shared }).where(eq(schema.gradeItems.id, id));
  await audit(ctx, shared ? "grade_item.share" : "grade_item.unshare", "grade_item", id);
  revalidatePath(`/avaliacoes/${id}`);
}
