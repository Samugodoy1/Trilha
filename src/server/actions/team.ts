"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { generateInviteCode, hashInviteCode } from "@/lib/invite";
import { requireRole, requireSession } from "../session";
import { assertClass, isUuid } from "../access";
import { activeTeacherIds, canManageTeam, managerRoles } from "../team";
import { audit } from "../audit";

const DAYS = 14;

/** Convite para a equipe (professor ou coordenação): código de uso único, válido por 14 dias. */
export async function createStaffInviteAction(input: { role: "teacher" | "coordinator"; recipientName?: string }) {
  const ctx = await requireSession();
  const parsed = z.object({ role: z.enum(["teacher", "coordinator"]), recipientName: z.string().trim().max(80).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Escolha a função." };
  // Qualquer professor pode chamar colegas professores (é assim que o Trilha se espalha
  // numa escola). Convidar para a coordenação — que vê o que todos compartilham — fica
  // com quem administra a equipe.
  const manager = await canManageTeam(ctx);
  if (!manager && !(ctx.membership.role === "teacher" && parsed.data.role === "teacher"))
    return { ok: false as const, error: "Só a gestão ou a coordenação podem convidar para a coordenação." };
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
  revalidatePath("/equipe");
  return { ok: true as const, code, expiresAt: expiresAt.toISOString(), school: ctx.school.name };
}

export async function revokeStaffInviteAction(id: string) {
  const ctx = await requireSession();
  if (!isUuid(id)) return { ok: false as const };
  const db = await getDb();
  const [inv] = await db
    .select()
    .from(schema.invitations)
    .where(and(eq(schema.invitations.id, id), eq(schema.invitations.schoolId, ctx.school.id), isNull(schema.invitations.studentId)));
  // Quem enviou pode cancelar o próprio convite; quem administra a equipe, qualquer um.
  if (!inv || (inv.createdById !== ctx.user.id && !(await canManageTeam(ctx)))) return { ok: false as const };
  await db.update(schema.invitations).set({ revokedAt: new Date() }).where(eq(schema.invitations.id, id));
  await audit(ctx, "invite.staff.revoke", "invitation", id);
  revalidatePath("/ajustes");
  revalidatePath("/equipe");
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

/* ───────────────────────── Desativar, reativar, transferir ───────────────────────── */

/** Confere se quem está logado pode mexer no acesso de `userId` nesta escola. */
async function guardTarget(userId: string) {
  const ctx = await requireSession();
  if (!isUuid(userId)) return { error: "Pessoa não encontrada." } as const;
  if (userId === ctx.user.id) return { error: "Você não pode desativar o próprio acesso." } as const;
  const mine = await managerRoles(ctx);
  if (!mine.length) return { error: "Só a gestão ou a coordenação podem fazer isso." } as const;
  const db = await getDb();
  const theirs = await db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.schoolId, ctx.school.id), inArray(schema.memberships.role, ["teacher", "coordinator", "admin"])));
  if (!theirs.length) return { error: "Pessoa não encontrada." } as const;
  // Coordenação cuida de professores e de outras coordenadoras; só a gestão mexe na gestão.
  if (theirs.some((m) => m.role === "admin") && !mine.includes("admin")) return { error: "Só a gestão pode alterar o acesso de outra pessoa da gestão." } as const;
  return { ctx, db, theirs } as const;
}

/**
 * Move as turmas (e as conversas com as famílias dessas turmas) de uma pessoa para outra.
 * Os registros continuam com quem escreveu: privados seguem privados.
 */
async function moveClasses(db: Awaited<ReturnType<typeof getDb>>, schoolId: string, fromUserId: string, toUserId: string) {
  const rows = await db
    .select({ id: schema.teachingAssignments.id, classId: schema.teachingAssignments.classId, subjectId: schema.teachingAssignments.subjectId, isHomeroom: schema.teachingAssignments.isHomeroom })
    .from(schema.teachingAssignments)
    .innerJoin(schema.classes, eq(schema.classes.id, schema.teachingAssignments.classId))
    .where(and(eq(schema.teachingAssignments.userId, fromUserId), eq(schema.classes.schoolId, schoolId)));
  if (!rows.length) return 0;
  const existing = await db
    .select({ classId: schema.teachingAssignments.classId })
    .from(schema.teachingAssignments)
    .where(and(eq(schema.teachingAssignments.userId, toUserId), inArray(schema.teachingAssignments.classId, rows.map((r) => r.classId))));
  const already = new Set(existing.map((e) => e.classId));
  for (const r of rows) {
    if (already.has(r.classId)) {
      if (r.isHomeroom) await db.update(schema.teachingAssignments).set({ isHomeroom: true }).where(and(eq(schema.teachingAssignments.userId, toUserId), eq(schema.teachingAssignments.classId, r.classId)));
      await db.delete(schema.teachingAssignments).where(eq(schema.teachingAssignments.id, r.id));
    } else {
      await db.update(schema.teachingAssignments).set({ userId: toUserId }).where(eq(schema.teachingAssignments.id, r.id));
    }
  }
  const classIds = [...new Set(rows.map((r) => r.classId))];
  const studentIds = (await db.select({ id: schema.enrollments.studentId }).from(schema.enrollments).where(inArray(schema.enrollments.classId, classIds))).map((e) => e.id);
  if (studentIds.length)
    await db
      .update(schema.conversations)
      .set({ teacherId: toUserId })
      .where(and(eq(schema.conversations.schoolId, schoolId), eq(schema.conversations.teacherId, fromUserId), inArray(schema.conversations.studentId, studentIds)));
  return classIds.length;
}

const deactivateSchema = z.object({ userId: z.string().uuid(), transferTo: z.string().uuid().nullable().optional() });

/**
 * Desativa o acesso de alguém à escola (saiu, mudou de escola, foi desligado).
 * A conta da pessoa continua existindo; ela perde o acesso a esta escola na hora.
 */
export async function deactivateMemberAction(input: z.input<typeof deactivateSchema>) {
  const parsed = deactivateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Pessoa não encontrada." };
  const g = await guardTarget(parsed.data.userId);
  if ("error" in g) return { ok: false as const, error: g.error };
  const { ctx, db, theirs } = g;
  const transferTo = parsed.data.transferTo ?? null;
  if (transferTo) {
    if (transferTo === parsed.data.userId || !(await activeTeacherIds(ctx.school.id)).has(transferTo)) return { ok: false as const, error: "Escolha um professor ativo para receber as turmas." };
  }
  const active = theirs.filter((m) => !m.revokedAt);
  await db.transaction(async (tx) => {
    for (const m of active) {
      await tx.update(schema.memberships).set({ revokedAt: new Date() }).where(eq(schema.memberships.id, m.id));
      await tx.delete(schema.sessions).where(eq(schema.sessions.membershipId, m.id));
    }
    await tx
      .update(schema.invitations)
      .set({ revokedAt: new Date() })
      .where(and(eq(schema.invitations.createdById, parsed.data.userId), eq(schema.invitations.schoolId, ctx.school.id), isNull(schema.invitations.acceptedAt), isNull(schema.invitations.revokedAt)));
  });
  const moved = transferTo ? await moveClasses(db, ctx.school.id, parsed.data.userId, transferTo) : 0;
  await audit(ctx, "membership.deactivate", "user", parsed.data.userId, { transferTo, moved });
  revalidatePath("/equipe");
  return { ok: true as const, moved };
}

export async function reactivateMemberAction(userId: string) {
  const g = await guardTarget(userId);
  if ("error" in g) return { ok: false as const, error: g.error };
  const { ctx, db, theirs } = g;
  const revoked = theirs.filter((m) => m.revokedAt);
  if (!revoked.length) return { ok: false as const, error: "Essa pessoa já tem acesso." };
  // Volta com o vínculo mais recente que tinha (normalmente o de professor ou coordenação).
  const latest = revoked.sort((a, b) => b.revokedAt!.getTime() - a.revokedAt!.getTime());
  const cutoff = latest[0].revokedAt!.getTime() - 60_000;
  for (const m of latest.filter((m) => m.revokedAt!.getTime() >= cutoff)) await db.update(schema.memberships).set({ revokedAt: null }).where(eq(schema.memberships.id, m.id));
  await audit(ctx, "membership.reactivate", "user", userId);
  revalidatePath("/equipe");
  return { ok: true as const };
}

/** Transfere as turmas de alguém (ativo ou desativado) para um professor ativo. */
export async function transferClassesAction(fromUserId: string, toUserId: string) {
  const ctx = await requireSession();
  if (!isUuid(fromUserId) || !isUuid(toUserId) || fromUserId === toUserId) return { ok: false as const, error: "Escolha quem vai receber as turmas." };
  if (!(await canManageTeam(ctx))) return { ok: false as const, error: "Só a gestão ou a coordenação podem transferir turmas." };
  if (!(await activeTeacherIds(ctx.school.id)).has(toUserId)) return { ok: false as const, error: "Escolha um professor ativo." };
  const db = await getDb();
  const moved = await moveClasses(db, ctx.school.id, fromUserId, toUserId);
  await audit(ctx, "classes.transfer", "user", fromUserId, { toUserId, moved });
  revalidatePath("/equipe");
  return { ok: true as const, moved };
}
