"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireRole } from "../session";
import { AccessDenied, assertStudent, isUuid } from "../access";
import { audit } from "../audit";
import { draftReport } from "../ai";
import { reportKinds, type ReportKind } from "@/lib/vocabulary";

/** Gera um rascunho fundamentado nos registros e abre para revisão. Nunca é enviado sozinho. */
export async function generateReportAction(input: { studentId: string; kind: ReportKind; termId: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireRole("teacher");
  if (!isUuid(input.studentId) || !isUuid(input.termId) || !(input.kind in reportKinds)) return { ok: false, error: "Dados inválidos." };
  const db = await getDb();
  const [term] = await db.select().from(schema.terms).where(and(eq(schema.terms.id, input.termId), eq(schema.terms.schoolId, ctx.school.id)));
  if (!term) return { ok: false, error: "Período inválido." };
  let student;
  try {
    student = await assertStudent(ctx, input.studentId);
  } catch (e) {
    if (e instanceof AccessDenied) return { ok: false, error: "Aluno não encontrado." };
    throw e;
  }
  const from = input.kind === "evolucao" ? `${term.startsOn.slice(0, 4)}-01-01` : term.startsOn;
  const draft = await draftReport(ctx, input.studentId, input.kind, { from, to: term.endsOn, label: input.kind === "evolucao" ? `ano de ${term.startsOn.slice(0, 4)}, até o ${term.name}` : term.name });
  const [enr] = await db.select().from(schema.enrollments).where(eq(schema.enrollments.studentId, student.id));
  const [r] = await db
    .insert(schema.reports)
    .values({
      schoolId: ctx.school.id,
      studentId: student.id,
      classId: enr?.classId ?? null,
      termId: term.id,
      authorId: ctx.user.id,
      kind: input.kind,
      title: `${reportKinds[input.kind].label} — ${term.name}`,
      content: draft.paragraphs.map((p) => p.text).join("\n\n"),
      sources: draft.sources.map((s) => ({ type: s.type, id: s.id, label: s.label, date: s.date })),
      aiAssisted: true,
    })
    .returning();
  await audit(ctx, "report.draft", "report", r.id, { engine: draft.engine, sources: draft.sources.length, gaps: draft.gaps.length });
  revalidatePath("/relatorios");
  return { ok: true, id: r.id };
}

const saveSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(2).max(140),
  content: z.string().max(30_000),
  approve: z.boolean().optional(),
  shareWithFamily: z.boolean().optional(),
});

export async function saveReportAction(input: z.input<typeof saveSchema>): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireRole("teacher");
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Confira o título e o texto." };
  const d = parsed.data;
  const db = await getDb();
  const [r] = await db.select().from(schema.reports).where(eq(schema.reports.id, d.id));
  if (!r || r.authorId !== ctx.user.id) return { ok: false, error: "Relatório não encontrado." };
  if (d.approve && /\[[^\]]{3,}\]/.test(d.content)) return { ok: false, error: "Complete os trechos entre colchetes antes de aprovar." };
  const approving = d.approve ?? r.status === "approved";
  if (d.shareWithFamily && !approving) return { ok: false, error: "Aprove o relatório antes de compartilhar com a família." };
  await db
    .update(schema.reports)
    .set({
      title: d.title,
      content: d.content,
      status: approving ? "approved" : "draft",
      approvedAt: approving ? r.approvedAt ?? new Date() : null,
      visibility: d.shareWithFamily === undefined ? r.visibility : d.shareWithFamily ? "family" : "private",
      updatedAt: new Date(),
    })
    .where(eq(schema.reports.id, d.id));
  if (d.approve) await audit(ctx, "report.approve", "report", d.id);
  if (d.shareWithFamily !== undefined) await audit(ctx, d.shareWithFamily ? "report.share" : "report.unshare", "report", d.id);
  revalidatePath(`/relatorios/${d.id}`);
  return { ok: true };
}

export async function deleteReportAction(id: string) {
  const ctx = await requireRole("teacher");
  if (!isUuid(id)) return;
  const db = await getDb();
  await db.delete(schema.reports).where(and(eq(schema.reports.id, id), eq(schema.reports.authorId, ctx.user.id)));
  revalidatePath("/relatorios");
}
