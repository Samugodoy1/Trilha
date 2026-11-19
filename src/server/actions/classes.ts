"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, max } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { todayISO } from "@/lib/format";
import { requireRole } from "../session";
import { assertClass } from "../access";
import { audit } from "../audit";
import { getCurrentYear } from "../queries/common";

const classSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome à turma, como “4º ano B”.").max(60),
  stage: z.enum(schema.stageEnum.enumValues),
  grade: z.coerce.number().int().min(0).max(12),
  shift: z.enum(schema.shiftEnum.enumValues),
  room: z.string().trim().max(30).optional(),
  subjectId: z.string().uuid().optional().or(z.literal("")),
});

export async function createClassAction(input: z.input<typeof classSchema>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireRole("teacher", "admin", "coordinator");
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const db = await getDb();
  const year = await getCurrentYear(ctx.school.id);
  if (!year) return { ok: false, error: "Configure o ano letivo antes de criar turmas." };
  if (d.subjectId) {
    const [subj] = await db.select().from(schema.subjects).where(and(eq(schema.subjects.id, d.subjectId), eq(schema.subjects.schoolId, ctx.school.id)));
    if (!subj) return { ok: false, error: "Componente curricular inválido." };
  }
  const id = await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(schema.classes)
      .values({ schoolId: ctx.school.id, academicYearId: year.id, name: d.name, stage: d.stage, grade: d.grade, shift: d.shift, room: d.room || null })
      .returning();
    if (ctx.membership.role === "teacher")
      await tx.insert(schema.teachingAssignments).values({ classId: c.id, userId: ctx.user.id, subjectId: d.subjectId || null, isHomeroom: !d.subjectId });
    return c.id;
  });
  await audit(ctx, "class.create", "class", id);
  revalidatePath("/", "layout");
  return { ok: true, id };
}

const studentRow = z.object({
  fullName: z.string().trim().min(3).max(120),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  enrollmentCode: z.string().trim().max(30).optional(),
});

/** Adiciona alunos à turma (um a um ou importados de planilha). Reaproveita cadastros pela matrícula. */
export async function addStudentsAction(classId: string, rows: z.input<typeof studentRow>[]) {
  const ctx = await requireRole("teacher", "admin", "coordinator");
  try {
    await assertClass(ctx, classId);
  } catch {
    return { ok: false as const, error: "Turma não encontrada." };
  }
  const parsed = z.array(studentRow).min(1).max(80).safeParse(rows);
  if (!parsed.success) return { ok: false as const, error: "Confira os nomes: cada aluno precisa de nome e sobrenome." };
  const db = await getDb();
  const added = await db.transaction(async (tx) => {
    const [{ n }] = await tx.select({ n: max(schema.enrollments.number) }).from(schema.enrollments).where(eq(schema.enrollments.classId, classId));
    let number = n ?? 0;
    let count = 0;
    for (const r of parsed.data) {
      let studentId: string | null = null;
      if (r.enrollmentCode) {
        const [ex] = await tx
          .select({ id: schema.students.id })
          .from(schema.students)
          .where(and(eq(schema.students.schoolId, ctx.school.id), eq(schema.students.enrollmentCode, r.enrollmentCode)));
        studentId = ex?.id ?? null;
      }
      if (!studentId) {
        const [s] = await tx
          .insert(schema.students)
          .values({
            schoolId: ctx.school.id,
            fullName: r.fullName.replace(/\s+/g, " "),
            birthDate: r.birthDate || null,
            enrollmentCode: r.enrollmentCode || null,
            hue: Math.floor(Math.random() * 360),
          })
          .returning({ id: schema.students.id });
        studentId = s.id;
      }
      const [already] = await tx
        .select({ id: schema.enrollments.id })
        .from(schema.enrollments)
        .where(and(eq(schema.enrollments.classId, classId), eq(schema.enrollments.studentId, studentId)));
      if (already) continue;
      await tx.insert(schema.enrollments).values({ classId, studentId, number: ++number, startedOn: todayISO() });
      count++;
    }
    return count;
  });
  await audit(ctx, "students.add", "class", classId, { count: added });
  revalidatePath(`/turmas/${classId}`);
  revalidatePath("/", "layout");
  return { ok: true as const, added };
}

export async function saveAttendanceAction(classId: string, date: string, records: { studentId: string; status: (typeof schema.attendanceStatusEnum.enumValues)[number] }[]) {
  const ctx = await requireRole("teacher");
  try {
    await assertClass(ctx, classId);
  } catch {
    return { ok: false };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayISO()) return { ok: false };
  const db = await getDb();
  const enrolled = await db.select({ id: schema.enrollments.studentId }).from(schema.enrollments).where(and(eq(schema.enrollments.classId, classId), isNull(schema.enrollments.endedOn)));
  const ok = new Set(enrolled.map((e) => e.id));
  const valid = records.filter((r) => ok.has(r.studentId) && schema.attendanceStatusEnum.enumValues.includes(r.status));
  if (!valid.length) return { ok: false };
  await db.transaction(async (tx) => {
    await tx.delete(schema.attendance).where(and(eq(schema.attendance.classId, classId), eq(schema.attendance.date, date), inArray(schema.attendance.studentId, valid.map((v) => v.studentId))));
    await tx.insert(schema.attendance).values(valid.map((v) => ({ classId, studentId: v.studentId, date, status: v.status, recordedById: ctx.user.id })));
  });
  await audit(ctx, "attendance.save", "class", classId, { date, count: valid.length });
  revalidatePath(`/turmas/${classId}`);
  return { ok: true };
}
