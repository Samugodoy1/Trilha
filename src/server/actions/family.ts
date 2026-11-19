"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireRole } from "../session";
import { familyStudentIds, isUuid } from "../access";
import { audit } from "../audit";

async function guard(studentId: string) {
  const ctx = await requireRole("guardian", "student");
  if (!isUuid(studentId)) return null;
  const ids = await familyStudentIds(ctx);
  if (!ids.includes(studentId)) return null;
  return ctx;
}

/** Garante que o comunicado é visível para o aluno (escola e turma corretas). */
async function visibleAnnouncement(announcementId: string, studentId: string) {
  const db = await getDb();
  const [a] = await db.select().from(schema.announcements).where(eq(schema.announcements.id, announcementId));
  if (!a) return null;
  const [s] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  if (!s || s.schoolId !== a.schoolId) return null;
  if (a.classId) {
    const [e] = await db.select().from(schema.enrollments).where(and(eq(schema.enrollments.classId, a.classId), eq(schema.enrollments.studentId, studentId)));
    if (!e) return null;
  }
  return a;
}

export async function markAnnouncementsReadAction(studentId: string, ids: string[]) {
  const ctx = await guard(studentId);
  if (!ctx) return;
  const db = await getDb();
  const valid: string[] = [];
  for (const id of ids.filter(isUuid).slice(0, 50)) if (await visibleAnnouncement(id, studentId)) valid.push(id);
  if (!valid.length) return;
  await db
    .insert(schema.announcementResponses)
    .values(valid.map((announcementId) => ({ announcementId, studentId, userId: ctx.user.id })))
    .onConflictDoNothing();
}

export async function respondAnnouncementAction(input: { announcementId: string; studentId: string; answer: "confirm" | "granted" | "denied" }) {
  const ctx = await guard(input.studentId);
  if (!ctx || !isUuid(input.announcementId)) return { ok: false };
  const a = await visibleAnnouncement(input.announcementId, input.studentId);
  if (!a) return { ok: false };
  if (input.answer !== "confirm" && !a.isAuthorization) return { ok: false };
  const db = await getDb();
  const now = new Date();
  const set = input.answer === "confirm" ? { confirmedAt: now } : { authorization: input.answer, confirmedAt: now };
  await db
    .insert(schema.announcementResponses)
    .values({ announcementId: a.id, studentId: input.studentId, userId: ctx.user.id, ...set })
    .onConflictDoUpdate({ target: [schema.announcementResponses.announcementId, schema.announcementResponses.studentId, schema.announcementResponses.userId], set });
  await audit({ user: ctx.user, school: { id: a.schoolId } }, `announcement.${input.answer}`, "announcement", a.id, { studentId: input.studentId });
  revalidatePath("/familia", "layout");
  return { ok: true };
}

export async function markFeedbackReadAction(studentId: string) {
  const ctx = await guard(studentId);
  if (!ctx) return;
  const db = await getDb();
  await db
    .update(schema.feedbacks)
    .set({ readAt: new Date() })
    .where(and(eq(schema.feedbacks.studentId, studentId), eq(schema.feedbacks.status, "published"), isNull(schema.feedbacks.readAt)));
}

const contribSchema = z.object({
  studentId: z.string().uuid(),
  kind: z.enum(schema.contributionKindEnum.enumValues),
  body: z.string().trim().min(3, "Conte um pouco mais.").max(2000),
});

/** A família compartilha algo feito em casa — vira contexto para a professora, não avaliação. */
export async function addContributionAction(input: z.input<typeof contribSchema>) {
  const parsed = contribSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const ctx = await guard(parsed.data.studentId);
  if (!ctx) return { ok: false, error: "Aluno não encontrado." };
  const db = await getDb();
  const [s] = await db.select().from(schema.students).where(eq(schema.students.id, parsed.data.studentId));
  await db.insert(schema.familyContributions).values({ schoolId: s.schoolId, studentId: s.id, authorId: ctx.user.id, kind: parsed.data.kind, body: parsed.data.body });
  await audit({ user: ctx.user, school: { id: s.schoolId } }, "contribution.add", "student", s.id);
  revalidatePath("/familia/participar");
  return { ok: true };
}

