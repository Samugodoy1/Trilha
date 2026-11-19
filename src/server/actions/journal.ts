"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { todayISO } from "@/lib/format";
import { requireRole } from "../session";
import { AccessDenied, accessibleClassIds, isUuid } from "../access";
import { audit } from "../audit";
import { displayName } from "../queries/common";

export type ComposeContext = {
  classes: { id: string; name: string; students: { id: string; name: string; hue: number }[] }[];
  templates: { id: string; name: string; kind: string; body: string }[];
};

export async function getComposeContextAction(): Promise<ComposeContext> {
  const ctx = await requireRole("teacher");
  const db = await getDb();
  const ids = await accessibleClassIds(ctx);
  if (!ids.length) return { classes: [], templates: [] };
  const classes = await db
    .select()
    .from(schema.classes)
    .where(and(inArray(schema.classes.id, ids), isNull(schema.classes.archivedAt)))
    .orderBy(asc(schema.classes.grade), asc(schema.classes.name));
  const studs = await db
    .select({ classId: schema.enrollments.classId, id: schema.students.id, fullName: schema.students.fullName, preferredName: schema.students.preferredName, hue: schema.students.hue })
    .from(schema.enrollments)
    .innerJoin(schema.students, eq(schema.students.id, schema.enrollments.studentId))
    .where(inArray(schema.enrollments.classId, classes.map((c) => c.id)))
    .orderBy(asc(schema.students.fullName));
  const templates = await db.select().from(schema.entryTemplates).where(eq(schema.entryTemplates.userId, ctx.user.id));
  return {
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      students: studs.filter((s) => s.classId === c.id).map((s) => ({ id: s.id, name: displayName(s), hue: s.hue })),
    })),
    templates: templates.map((t) => ({ id: t.id, name: t.name, kind: t.kind, body: t.body })),
  };
}

const entrySchema = z.object({
  id: z.string().uuid().optional(),
  classId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).max(60),
  kind: z.enum(schema.entryKindEnum.enumValues),
  title: z.string().trim().max(140).optional().default(""),
  body: z.string().max(20_000),
  visibility: z.enum(schema.visibilityEnum.enumValues),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isDraft: z.boolean(),
});

export type SaveEntryResult = { ok: true; id: string; savedAt: string } | { ok: false; error: string };

export async function saveEntryAction(input: z.input<typeof entrySchema>): Promise<SaveEntryResult> {
  const ctx = await requireRole("teacher");
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Confira os campos do registro." };
  const data = parsed.data;
  if (!data.isDraft && !data.body.trim()) return { ok: false, error: "Escreva o registro antes de salvar." };
  if (data.occurredOn > todayISO()) return { ok: false, error: "A data do registro não pode estar no futuro." };

  const db = await getDb();
  const classIds = await accessibleClassIds(ctx);
  if (!classIds.includes(data.classId)) return { ok: false, error: "Turma não encontrada." };
  if (data.studentIds.length) {
    const enrolled = await db
      .select({ id: schema.enrollments.studentId })
      .from(schema.enrollments)
      .where(and(eq(schema.enrollments.classId, data.classId), inArray(schema.enrollments.studentId, data.studentIds)));
    if (enrolled.length !== new Set(data.studentIds).size) return { ok: false, error: "Algum aluno não pertence a esta turma." };
  }
  const scope = data.studentIds.length === 0 ? "class" : data.studentIds.length === 1 ? "student" : "students";
  const values = {
    schoolId: ctx.school.id,
    classId: data.classId,
    authorId: ctx.user.id,
    kind: data.kind,
    scope,
    title: data.title || null,
    body: data.body,
    visibility: data.visibility,
    occurredOn: data.occurredOn,
    isDraft: data.isDraft,
    updatedAt: new Date(),
  } as const;

  let id = data.id;
  try {
    await db.transaction(async (tx) => {
      if (id) {
        const [existing] = await tx.select().from(schema.journalEntries).where(eq(schema.journalEntries.id, id));
        if (!existing || existing.authorId !== ctx.user.id) throw new AccessDenied();
        await tx.update(schema.journalEntries).set(values).where(eq(schema.journalEntries.id, id));
        await tx.delete(schema.journalEntryStudents).where(eq(schema.journalEntryStudents.entryId, id));
      } else {
        const [row] = await tx.insert(schema.journalEntries).values(values).returning({ id: schema.journalEntries.id });
        id = row.id;
      }
      if (data.studentIds.length)
        await tx.insert(schema.journalEntryStudents).values([...new Set(data.studentIds)].map((studentId) => ({ entryId: id!, studentId })));
    });
  } catch (e) {
    if (e instanceof AccessDenied) return { ok: false, error: "Você só pode editar seus próprios registros." };
    throw e;
  }
  if (!data.isDraft) {
    await audit(ctx, data.id ? "journal.update" : "journal.create", "journal_entry", id, { visibility: data.visibility, students: data.studentIds.length });
    revalidatePath("/", "layout");
  }
  return { ok: true, id: id!, savedAt: new Date().toISOString() };
}

export async function deleteEntryAction(id: string) {
  const ctx = await requireRole("teacher");
  if (!isUuid(id)) return { ok: false };
  const db = await getDb();
  const res = await db
    .delete(schema.journalEntries)
    .where(and(eq(schema.journalEntries.id, id), eq(schema.journalEntries.authorId, ctx.user.id)))
    .returning({ id: schema.journalEntries.id });
  if (res.length) {
    await audit(ctx, "journal.delete", "journal_entry", id);
    revalidatePath("/", "layout");
  }
  return { ok: res.length > 0 };
}

export async function saveEntryTemplateAction(input: { name: string; kind: string; body: string }) {
  const ctx = await requireRole("teacher");
  const parsed = z
    .object({ name: z.string().trim().min(2).max(60), kind: z.enum(schema.entryKindEnum.enumValues), body: z.string().min(1).max(4000) })
    .safeParse(input);
  if (!parsed.success) return { ok: false };
  const db = await getDb();
  await db.insert(schema.entryTemplates).values({ userId: ctx.user.id, ...parsed.data });
  return { ok: true };
}
