"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { generateInviteCode, hashInviteCode } from "@/lib/invite";
import { requireRole, requireSession } from "../session";
import { assertClass, isUuid } from "../access";
import { canManageTeam } from "../team";
import { audit } from "../audit";

const DAYS = 14;

/** Convite para a equipe (professor ou coordenação): código de uso único, válido por 14 dias. */
export async function createStaffInviteAction(input: { role: "teacher" | "coordinator"; recipientName?: string }) {
  const ctx = await requireSession();
  const parsed = z.object({ role: z.enum(["teacher", "coordinator"]), recipientName: z.string().trim().max(80).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Escolha a função." };
  if (!(await canManageTeam(ctx))) return { ok: false as const, error: "Só a gestão ou a coordenação podem convidar para a equipe." };
  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + DAYS * 86_400_000);
  const db = await getDb();
  const [inv] = await db
    .insert(schema.invitations)
    .values({
      schoolId: ctx.school.id,
      role: parsed.data.role,
      recipientName: parsed.data.recipientName || null,
      tokenHash: hashInviteCode(code),
      codeHint: code.slice(-4),
      expiresAt,
      createdById: ctx.user.id,
    })
    .returning();
  await audit(ctx, "invite.staff.create", "invitation", inv.id, { role: parsed.data.role });
  revalidatePath("/ajustes");
  return { ok: true as const, code, expiresAt: expiresAt.toISOString(), school: ctx.school.name };
}

export async function revokeStaffInviteAction(id: string) {
  const ctx = await requireSession();
  if (!isUuid(id) || !(await canManageTeam(ctx))) return { ok: false as const };
  const db = await getDb();
  await db
    .update(schema.invitations)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.invitations.id, id), eq(schema.invitations.schoolId, ctx.school.id), isNull(schema.invitations.studentId)));
  await audit(ctx, "invite.staff.revoke", "invitation", id);
  revalidatePath("/ajustes");
  return { ok: true as const };
}

/**
 * Convites para várias famílias de uma vez (um por aluno). Os códigos voltam só agora,
 * para imprimir os bilhetes ou compartilhar; no banco fica apenas o hash.
 */
export async function createClassInvitesAction(classId: string, studentIds: string[]) {
  const ctx = await requireRole("teacher", "coordinator", "admin");
  if (!isUuid(classId) || !studentIds.length || studentIds.length > 80 || !studentIds.every(isUuid)) return { ok: false as const, error: "Escolha os alunos." };
  try {
    await assertClass(ctx, classId);
  } catch {
    return { ok: false as const, error: "Turma não encontrada." };
  }
  const db = await getDb();
  const enrolled = await db
    .select({ id: schema.students.id, fullName: schema.students.fullName, preferredName: schema.students.preferredName, birthDate: schema.students.birthDate })
    .from(schema.enrollments)
    .innerJoin(schema.students, eq(schema.students.id, schema.enrollments.studentId))
    .where(and(eq(schema.enrollments.classId, classId), inArray(schema.enrollments.studentId, studentIds), isNull(schema.enrollments.endedOn)));
  if (!enrolled.length) return { ok: false as const, error: "Nenhum aluno desta turma." };
  const expiresAt = new Date(Date.now() + DAYS * 86_400_000);
  // Um convite novo substitui o anterior ainda aberto do mesmo aluno: só o último bilhete vale.
  await db
    .update(schema.invitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        inArray(schema.invitations.studentId, enrolled.map((s) => s.id)),
        isNull(schema.invitations.acceptedAt),
        isNull(schema.invitations.revokedAt),
        gt(schema.invitations.expiresAt, new Date()),
        eq(schema.invitations.createdById, ctx.user.id),
      ),
    );
  const out = enrolled.map((s) => ({ studentId: s.id, name: s.preferredName ?? s.fullName, firstName: (s.preferredName ?? s.fullName).split(" ")[0], code: generateInviteCode(), hasBirthDate: Boolean(s.birthDate) }));
  await db.insert(schema.invitations).values(
    out.map((o) => ({
      schoolId: ctx.school.id,
      role: "guardian" as const,
      studentId: o.studentId,
      relationship: "Responsável",
      tokenHash: hashInviteCode(o.code),
      codeHint: o.code.slice(-4),
      expiresAt,
      createdById: ctx.user.id,
    })),
  );
  await audit(ctx, "invite.batch", "class", classId, { count: out.length });
  revalidatePath(`/turmas/${classId}`);
  return { ok: true as const, expiresAt: expiresAt.toISOString(), school: ctx.school.name, invites: out.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) };
}
