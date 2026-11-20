import "server-only";
import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "./session";

/**
 * Quem pode chamar pessoas para a equipe da escola: gestão e coordenação — e também a
 * professora que cadastrou a própria escola (ela recebe um vínculo de gestão).
 */
export async function canManageTeam(ctx: SessionContext): Promise<boolean> {
  if (ctx.membership.role === "admin" || ctx.membership.role === "coordinator") return true;
  const db = await getDb();
  const [m] = await db
    .select({ id: schema.memberships.id })
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.userId, ctx.user.id),
        eq(schema.memberships.schoolId, ctx.school.id),
        inArray(schema.memberships.role, ["admin", "coordinator"]),
        isNull(schema.memberships.revokedAt),
      ),
    );
  return Boolean(m);
}

/** Equipe da escola (professores, coordenação e gestão) e convites de equipe ainda abertos. */
export async function getTeam(ctx: SessionContext) {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.memberships.id, role: schema.memberships.role, title: schema.memberships.title, name: schema.users.name, hue: schema.users.hue, userId: schema.users.id })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(and(eq(schema.memberships.schoolId, ctx.school.id), isNull(schema.memberships.revokedAt), inArray(schema.memberships.role, ["teacher", "coordinator", "admin"])))
    .orderBy(schema.users.name);
  // Uma pessoa pode ter mais de um vínculo (ex.: professora que também é gestora): mostra uma linha por pessoa.
  const byUser = new Map<string, { userId: string; name: string; hue: number; roles: (typeof rows)[number]["role"][]; membershipIds: string[] }>();
  for (const r of rows) {
    const cur = byUser.get(r.userId) ?? { userId: r.userId, name: r.name, hue: r.hue, roles: [], membershipIds: [] };
    cur.roles.push(r.role);
    cur.membershipIds.push(r.id);
    byUser.set(r.userId, cur);
  }
  const pending = await db
    .select({ id: schema.invitations.id, role: schema.invitations.role, recipientName: schema.invitations.recipientName, codeHint: schema.invitations.codeHint, expiresAt: schema.invitations.expiresAt })
    .from(schema.invitations)
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
  return { people: [...byUser.values()], pending };
}
