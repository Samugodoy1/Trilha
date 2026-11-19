import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Role } from "@/lib/vocabulary";

const COOKIE = "trilha_session";
const TTL_DAYS = 30;

export type SessionContext = {
  sessionId: string;
  user: { id: string; name: string; email: string; hue: number };
  membership: { id: string; role: Role; title: string | null; onboardedAt: Date | null; officeHours: schema.OfficeHours | null };
  school: {
    id: string;
    name: string;
    shortName: string;
    evaluationModel: "numeric" | "concept" | "descriptive";
    conceptScale: schema.ConceptLevel[];
    aiEnabled: boolean;
  };
  activeStudentId: string | null;
};

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function createSession(userId: string, membershipId: string | null) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);
  await db.insert(schema.sessions).values({ id: sha256(token), userId, membershipId, expiresAt });
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, userId));
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  }
  jar.delete(COOKIE);
}

/** Sessão atual (memoizada por requisição). Retorna null se não houver sessão válida. */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db
    .select({
      session: schema.sessions,
      user: schema.users,
      membership: schema.memberships,
      school: schema.schools,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .innerJoin(schema.memberships, eq(schema.memberships.id, schema.sessions.membershipId))
    .innerJoin(schema.schools, eq(schema.schools.id, schema.memberships.schoolId))
    .where(
      and(
        eq(schema.sessions.id, sha256(token)),
        gt(schema.sessions.expiresAt, new Date()),
        isNull(schema.memberships.revokedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    sessionId: row.session.id,
    user: { id: row.user.id, name: row.user.name, email: row.user.email, hue: row.user.hue },
    membership: {
      id: row.membership.id,
      role: row.membership.role,
      title: row.membership.title,
      onboardedAt: row.membership.onboardedAt,
      officeHours: row.membership.officeHours ?? null,
    },
    school: {
      id: row.school.id,
      name: row.school.name,
      shortName: row.school.shortName,
      evaluationModel: row.school.evaluationModel,
      conceptScale: row.school.conceptScale,
      aiEnabled: row.school.aiEnabled,
    },
    activeStudentId: row.session.activeStudentId,
  };
});

export async function requireSession(): Promise<SessionContext> {
  const s = await getSession();
  if (!s) redirect("/entrar");
  return s;
}

export async function requireRole(...roles: Role[]): Promise<SessionContext> {
  const s = await requireSession();
  if (!roles.includes(s.membership.role)) redirect(homeFor(s.membership.role));
  return s;
}

export function homeFor(role: Role): string {
  switch (role) {
    case "guardian":
    case "student":
      return "/familia";
    case "coordinator":
    case "admin":
      return "/coordenacao";
    default:
      return "/hoje";
  }
}

export async function setActiveStudent(sessionId: string, studentId: string) {
  const db = await getDb();
  await db.update(schema.sessions).set({ activeStudentId: studentId }).where(eq(schema.sessions.id, sessionId));
}

export async function switchMembership(sessionId: string, membershipId: string) {
  const db = await getDb();
  await db
    .update(schema.sessions)
    .set({ membershipId, activeStudentId: null })
    .where(eq(schema.sessions.id, sessionId));
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
}

/** Usuário autenticado, mesmo sem vínculo escolar ainda (usado no onboarding). */
export const getAuthUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  return { sessionId: row.session.id, membershipId: row.session.membershipId, user: row.user };
});
