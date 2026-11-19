"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireRole } from "../session";
import { audit } from "../audit";

const noteSchema = z.object({
  kind: z.enum(schema.coordinationNoteKindEnum.enumValues),
  title: z.string().trim().min(2, "Dê um título.").max(140),
  body: z.string().trim().min(2, "Escreva a orientação.").max(6000),
  classId: z.string().uuid().optional().or(z.literal("")),
  teacherId: z.string().uuid().optional().or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createCoordinationNoteAction(input: z.input<typeof noteSchema>) {
  const ctx = await requireRole("coordinator", "admin");
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const db = await getDb();
  if (d.classId) {
    const [c] = await db.select().from(schema.classes).where(and(eq(schema.classes.id, d.classId), eq(schema.classes.schoolId, ctx.school.id)));
    if (!c) return { ok: false, error: "Turma inválida." };
  }
  if (d.teacherId) {
    const [m] = await db.select().from(schema.memberships).where(and(eq(schema.memberships.userId, d.teacherId), eq(schema.memberships.schoolId, ctx.school.id)));
    if (!m) return { ok: false, error: "Professor inválido." };
  }
  const [n] = await db
    .insert(schema.coordinationNotes)
    .values({ schoolId: ctx.school.id, authorId: ctx.user.id, kind: d.kind, title: d.title, body: d.body, classId: d.classId || null, teacherId: d.teacherId || null, date: d.date })
    .returning();
  await audit(ctx, "coordination.note", "coordination_note", n.id);
  revalidatePath("/coordenacao/orientacoes");
  return { ok: true };
}
