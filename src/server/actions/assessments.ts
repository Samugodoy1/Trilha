"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { todayISO } from "@/lib/format";
import { requireRole } from "../session";
import { assertClass, canAccessClass, isUuid } from "../access";
import { audit } from "../audit";

const roundSchema = z.object({
  classId: z.string().uuid(),
  templateId: z.string().uuid(),
  termId: z.string().uuid(),
  title: z.string().trim().min(2).max(100),
  appliedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createRoundAction(input: z.input<typeof roundSchema>): Promise<{ ok: false; error: string } | { ok: true; id: string }> {
  const ctx = await requireRole("teacher");
  const parsed = roundSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Preencha turma, modelo, bimestre e data." };
  const d = parsed.data;
  if (d.appliedOn > todayISO()) return { ok: false, error: "A data da sondagem não pode estar no futuro." };
  try {
    await assertClass(ctx, d.classId);
  } catch {
    return { ok: false, error: "Turma não encontrada." };
  }
  const db = await getDb();
  const [tpl] = await db.select().from(schema.assessmentTemplates).where(and(eq(schema.assessmentTemplates.id, d.templateId), eq(schema.assessmentTemplates.schoolId, ctx.school.id)));
  const [term] = await db.select().from(schema.terms).where(and(eq(schema.terms.id, d.termId), eq(schema.terms.schoolId, ctx.school.id)));
  if (!tpl || !term) return { ok: false, error: "Modelo ou bimestre inválido." };
  const [round] = await db
    .insert(schema.assessmentRounds)
    .values({ schoolId: ctx.school.id, classId: d.classId, templateId: d.templateId, termId: d.termId, title: d.title, appliedOn: d.appliedOn, createdById: ctx.user.id })
    .returning();
  await audit(ctx, "assessment.round.create", "assessment_round", round.id);
  revalidatePath("/hoje");
  // A navegação fica com o cliente (router.push): o redirect de uma ação às vezes
  // se perde no roteador do Next quando há uma pré-busca em andamento.
  return { ok: true as const, id: round.id };
}

async function assertRound(roundId: string) {
  const ctx = await requireRole("teacher");
  if (!isUuid(roundId)) return null;
  const db = await getDb();
  const [round] = await db.select().from(schema.assessmentRounds).where(eq(schema.assessmentRounds.id, roundId));
  if (!round || !(await canAccessClass(ctx, round.classId))) return null;
  return { ctx, round, db };
}

const resultSchema = z.object({
  roundId: z.string().uuid(),
  studentId: z.string().uuid(),
  levelKey: z.string().max(20).nullable(),
  criteria: z.record(z.enum(["sim", "parcial", "nao"])).default({}),
  note: z.string().max(2000).nullable().default(null),
  absent: z.boolean().default(false),
});

/** Lançamento coletivo: cada célula é salva assim que alterada e alimenta o histórico do aluno. */
export async function saveResultAction(input: z.input<typeof resultSchema>): Promise<{ ok: boolean; error?: string }> {
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Valor inválido." };
  const d = parsed.data;
  const g = await assertRound(d.roundId);
  if (!g) return { ok: false, error: "Sondagem não encontrada." };
  const { ctx, round, db } = g;
  const [enr] = await db
    .select({ id: schema.enrollments.id })
    .from(schema.enrollments)
    .where(and(eq(schema.enrollments.classId, round.classId), eq(schema.enrollments.studentId, d.studentId)));
  if (!enr) return { ok: false, error: "Aluno não pertence à turma." };
  const [tpl] = await db.select().from(schema.assessmentTemplates).where(eq(schema.assessmentTemplates.id, round.templateId));
  if (d.levelKey && !tpl.scale.some((l) => l.key === d.levelKey)) return { ok: false, error: "Nível inválido." };
  const validCriteria = Object.fromEntries(Object.entries(d.criteria).filter(([k]) => tpl.criteria.some((c) => c.key === k)));
  await db
    .insert(schema.assessmentResults)
    .values({ roundId: d.roundId, studentId: d.studentId, levelKey: d.absent ? null : d.levelKey, criteria: validCriteria, note: d.note?.trim() || null, absent: d.absent, updatedById: ctx.user.id })
    .onConflictDoUpdate({
      target: [schema.assessmentResults.roundId, schema.assessmentResults.studentId],
      set: { levelKey: d.absent ? null : d.levelKey, criteria: validCriteria, note: d.note?.trim() || null, absent: d.absent, updatedById: ctx.user.id, updatedAt: new Date() },
    });
  return { ok: true };
}

export async function finishRoundAction(roundId: string) {
  const g = await assertRound(roundId);
  if (!g) return;
  await audit(g.ctx, "assessment.round.save", "assessment_round", roundId);
  revalidatePath("/", "layout");
}

export async function setRoundSharedAction(roundId: string, shared: boolean) {
  const g = await assertRound(roundId);
  if (!g) return { ok: false };
  await g.db.update(schema.assessmentRounds).set({ sharedWithFamily: shared }).where(eq(schema.assessmentRounds.id, roundId));
  await audit(g.ctx, shared ? "assessment.share" : "assessment.unshare", "assessment_round", roundId);
  revalidatePath(`/sondagens/${roundId}`);
  return { ok: true };
}

const templateSchema = z.object({
  name: z.string().trim().min(3, "Dê um nome ao modelo.").max(80),
  kind: z.enum(schema.templateKindEnum.enumValues),
  description: z.string().trim().max(300).optional(),
  levels: z
    .array(z.object({ label: z.string().trim().min(1).max(60), description: z.string().trim().max(200).default(""), familyDescription: z.string().trim().max(200).default("") }))
    .min(2, "Defina pelo menos dois níveis.")
    .max(10),
  criteria: z.array(z.string().trim().min(2).max(80)).max(12).default([]),
});

/** Modelos próprios: a escola ou o professor define sua metodologia — nenhuma é imposta. */
export async function createTemplateAction(input: z.input<typeof templateSchema>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireRole("teacher", "coordinator", "admin");
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const slug = (s: string, i: number) =>
    (s.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 4) || `N${i + 1}`) + (i + 1);
  const db = await getDb();
  const [tpl] = await db
    .insert(schema.assessmentTemplates)
    .values({
      schoolId: ctx.school.id,
      kind: d.kind,
      name: d.name,
      description: d.description || null,
      scale: d.levels.map((l, i) => ({ key: slug(l.label, i), short: slug(l.label, i).replace(/\d+$/, "") || String(i + 1), label: l.label, description: l.description, familyDescription: l.familyDescription || l.description })),
      criteria: d.criteria.map((c, i) => ({ key: `c${i + 1}`, label: c })),
      createdById: ctx.user.id,
    })
    .returning();
  await audit(ctx, "assessment.template.create", "assessment_template", tpl.id);
  revalidatePath("/sondagens");
  return { ok: true, id: tpl.id };
}

export async function archiveTemplateAction(id: string) {
  const ctx = await requireRole("coordinator", "admin", "teacher");
  if (!isUuid(id)) return;
  const db = await getDb();
  await db
    .update(schema.assessmentTemplates)
    .set({ archivedAt: new Date() })
    .where(and(eq(schema.assessmentTemplates.id, id), eq(schema.assessmentTemplates.schoolId, ctx.school.id), isNull(schema.assessmentTemplates.archivedAt)));
  revalidatePath("/sondagens");
}
