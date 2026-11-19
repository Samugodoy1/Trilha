import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "./session";
import { canAccessClass, canAccessStudent, familyStudentIds, isFamily, isStaff } from "./access";

type MediaRow = typeof schema.media.$inferSelect;

/** Decide se a sessão pode ver um arquivo, a partir do registro dono do arquivo. */
export async function canViewMedia(ctx: SessionContext, m: MediaRow): Promise<boolean> {
  const db = await getDb();
  if (m.uploaderId === ctx.user.id) return true;
  if (!m.ownerType || !m.ownerId) return false;

  if (!isFamily(ctx)) {
    if (m.schoolId !== ctx.school.id) return false;
    if (isStaff(ctx)) return true;
  }
  const famIds = isFamily(ctx) ? await familyStudentIds(ctx) : [];
  const familyInClass = async (classId: string) => {
    if (!famIds.length) return false;
    const r = await db
      .select({ id: schema.enrollments.id })
      .from(schema.enrollments)
      .where(and(eq(schema.enrollments.classId, classId), inArray(schema.enrollments.studentId, famIds), isNull(schema.enrollments.endedOn)))
      .limit(1);
    return r.length > 0;
  };

  switch (m.ownerType) {
    case "weekly": {
      const [p] = await db.select().from(schema.weeklyPosts).where(eq(schema.weeklyPosts.id, m.ownerId));
      if (!p) return false;
      if (isFamily(ctx)) return p.status === "published" && (p.studentId ? famIds.includes(p.studentId) : await familyInClass(p.classId));
      return canAccessClass(ctx, p.classId);
    }
    case "task": {
      const [t] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, m.ownerId));
      if (!t) return false;
      return isFamily(ctx) ? familyInClass(t.classId) : canAccessClass(ctx, t.classId);
    }
    case "portfolio": {
      const [p] = await db.select().from(schema.portfolioItems).where(eq(schema.portfolioItems.id, m.ownerId));
      if (!p) return false;
      if (isFamily(ctx)) return p.visibility === "family" && famIds.includes(p.studentId);
      return canAccessStudent(ctx, p.studentId);
    }
    case "submission": {
      const [s] = await db.select().from(schema.taskCompletions).where(eq(schema.taskCompletions.id, m.ownerId));
      if (!s) return false;
      return isFamily(ctx) ? famIds.includes(s.studentId) : canAccessStudent(ctx, s.studentId);
    }
    case "contribution": {
      const [c] = await db.select().from(schema.familyContributions).where(eq(schema.familyContributions.id, m.ownerId));
      if (!c) return false;
      return isFamily(ctx) ? famIds.includes(c.studentId) : canAccessStudent(ctx, c.studentId);
    }
    default:
      return false;
  }
}
