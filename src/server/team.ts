import "server-only";
import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "./session";

type StaffRole = "teacher" | "coordinator" | "admin";

/**
 * Quem administra a equipe (desativa, reativa, transfere turmas, convida coordenação):
 * gestão e coordenação — e também a professora que cadastrou a própria escola
 * (ela recebe um vínculo de gestão).
 */
export async function canManageTeam(ctx: SessionContext): Promise<boolean> {
  return (await managerRoles(ctx)).length > 0;
}

/** Vínculos de gestão/coordenação ativos da pessoa logada nesta escola. */
export async function managerRoles(ctx: SessionContext): Promise<StaffRole[]> {
  if (ctx.membership.role === "admin" || ctx.membership.role === "coordinator") {
    const db = await getDb();
    const rows = await db
      .select({ role: schema.memberships.role })
      .from(schema.memberships)
      .where(and(eq(schema.memberships.userId, ctx.user.id), eq(schema.memberships.schoolId, ctx.school.id), isNull(schema.memberships.revokedAt)));
    return rows.map((r) => r.role).filter((r): r is StaffRole => r === "admin" || r === "coordinator");
  }
  const db = await getDb();
  const rows = await db
    .select({ role: schema.memberships.role })
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.userId, ctx.user.id),
        eq(schema.memberships.schoolId, ctx.school.id),
        inArray(schema.memberships.role, ["admin", "coordinator"]),
        isNull(schema.memberships.revokedAt),
      ),
    );
  return rows.map((r) => r.role as StaffRole);
}

/** Qualquer pessoa da equipe (professor incluído) pode chamar colegas professores. */
export function canInviteTeachers(ctx: SessionContext) {
  return ctx.membership.role === "teacher" || ctx.membership.role === "coordinator" || ctx.membership.role === "admin";
}

export type TeamPerson = {
  userId: string;
  name: string;
  hue: number;
  email: string;
  roles: StaffRole[];
  classes: { id: string; name: string }[];
  since: string;
  deactivatedAt: string | null;
};

/** Equipe da escola: ativos, desativados (com as turmas que ficaram com eles) e convites abertos. */
export async function getTeam(ctx: SessionContext) {
  const db = await getDb();
  const rows = await db
    .select({
      role: schema.memberships.role,
      revokedAt: schema.memberships.revokedAt,
      createdAt: schema.memberships.createdAt,
      name: schema.users.name,
      hue: schema.users.hue,
      email: schema.users.email,
      userId: schema.users.id,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(and(eq(schema.memberships.schoolId, ctx.school.id), inArray(schema.memberships.role, ["teacher", "coordinator", "admin"])))
    .orderBy(schema.users.name);

  const assignments = await db
    .select({ userId: schema.teachingAssignments.userId, classId: schema.classes.id, className: schema.classes.name, grade: schema.classes.grade })
    .from(schema.teachingAssignments)
    .innerJoin(schema.classes, eq(schema.classes.id, schema.teachingAssignments.classId))
    .where(and(eq(schema.classes.schoolId, ctx.school.id), isNull(schema.classes.archivedAt)))
    .orderBy(schema.classes.grade, schema.classes.name);

  // Uma pessoa pode ter mais de um vínculo (ex.: professora que também é gestora): uma linha por pessoa.
  const people = new Map<string, TeamPerson & { active: boolean }>();
  for (const r of rows) {
    const cur = people.get(r.userId) ?? { userId: r.userId, name: r.name, hue: r.hue, email: r.email, roles: [], classes: [], since: r.createdAt.toISOString(), deactivatedAt: null, active: false };
    if (!r.revokedAt) {
      cur.active = true;
      cur.roles.push(r.role as StaffRole);
    } else if (!cur.active) {
      cur.roles.push(r.role as StaffRole);
      cur.deactivatedAt = r.revokedAt.toISOString();
    }
    people.set(r.userId, cur);
  }
  for (const p of people.values()) {
    if (p.active) {
      p.deactivatedAt = null;
      p.roles = [...new Set(p.roles)];
    }
    const seen = new Set<string>();
    p.classes = assignments.filter((a) => a.userId === p.userId && !seen.has(a.classId) && seen.add(a.classId)).map((a) => ({ id: a.classId, name: a.className }));
  }
  const all = [...people.values()];

  const pending = await db
    .select({
      id: schema.invitations.id,
      role: schema.invitations.role,
      recipientName: schema.invitations.recipientName,
      codeHint: schema.invitations.codeHint,
      expiresAt: schema.invitations.expiresAt,
      createdById: schema.invitations.createdById,
      createdBy: schema.users.name,
    })
    .from(schema.invitations)
    .innerJoin(schema.users, eq(schema.users.id, schema.invitations.createdById))
    .where(
      and(
        eq(schema.invitations.schoolId, ctx.school.id),
        isNull(schema.invitations.studentId),
        isNull(schema.invitations.acceptedAt),
        isNull(schema.invitations.revokedAt),
        gt(schema.invitations.expiresAt, new Date()),
        inArray(schema.invitations.role, ["teacher", "coordinator"]),
      ),
    )
    .orderBy(desc(schema.invitations.createdAt));

  return {
    active: all.filter((p) => p.active),
    deactivated: all.filter((p) => !p.active).sort((a, b) => (b.deactivatedAt ?? "").localeCompare(a.deactivatedAt ?? "")),
    pending,
  };
}

/** Pessoas ativas que podem receber turmas (professores). */
export async function activeTeacherIds(schoolId: string) {
  const db = await getDb();
  const rows = await db
    .select({ userId: schema.memberships.userId })
    .from(schema.memberships)
    .where(and(eq(schema.memberships.schoolId, schoolId), eq(schema.memberships.role, "teacher"), isNull(schema.memberships.revokedAt)));
  return new Set(rows.map((r) => r.userId));
}

