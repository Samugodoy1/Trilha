import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "../session";
import { AccessDenied, accessibleClassIds, isUuid } from "../access";
import { displayName } from "./common";

export async function getComposeClasses(ctx: SessionContext) {
  const ids = await accessibleClassIds(ctx);
  if (!ids.length) return [];
  const db = await getDb();
  const classes = await db
    .select()
    .from(schema.classes)
    .where(and(inArray(schema.classes.id, ids), isNull(schema.classes.archivedAt)))
    .orderBy(asc(schema.classes.grade), asc(schema.classes.name));
  const studs = await db
    .select({ classId: schema.enrollments.classId, id: schema.students.id, fullName: schema.students.fullName, preferredName: schema.students.preferredName, hue: schema.students.hue, imageConsent: schema.students.imageConsent })
    .from(schema.enrollments)
    .innerJoin(schema.students, eq(schema.students.id, schema.enrollments.studentId))
    .where(inArray(schema.enrollments.classId, classes.map((c) => c.id)))
    .orderBy(asc(schema.students.fullName));
  return classes.map((c) => ({
    id: c.id,
    name: c.name,
    students: studs.filter((s) => s.classId === c.id).map((s) => ({ id: s.id, name: displayName(s), hue: s.hue, imageConsent: s.imageConsent })),
  }));
}

export async function getWeeklyList(ctx: SessionContext) {
  const ids = await accessibleClassIds(ctx);
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db
    .select({ p: schema.weeklyPosts, className: schema.classes.name, studentName: schema.students.fullName })
    .from(schema.weeklyPosts)
    .innerJoin(schema.classes, eq(schema.classes.id, schema.weeklyPosts.classId))
    .leftJoin(schema.students, eq(schema.students.id, schema.weeklyPosts.studentId))
    .where(and(inArray(schema.weeklyPosts.classId, ids), eq(schema.weeklyPosts.authorId, ctx.user.id)))
    .orderBy(desc(schema.weeklyPosts.weekStart), desc(schema.weeklyPosts.updatedAt));
  const media = rows.length
    ? await db
        .select({ id: schema.media.id, ownerId: schema.media.ownerId })
        .from(schema.media)
        .where(and(eq(schema.media.ownerType, "weekly"), inArray(schema.media.ownerId, rows.map((r) => r.p.id))))
    : [];
  return rows.map(({ p, className, studentName }) => ({ ...p, className, studentName, cover: media.find((m) => m.ownerId === p.id)?.id ?? null }));
}

export async function getWeeklyPost(ctx: SessionContext, id: string) {
  if (!isUuid(id)) throw new AccessDenied();
  const db = await getDb();
  const [p] = await db.select().from(schema.weeklyPosts).where(eq(schema.weeklyPosts.id, id));
  if (!p || p.authorId !== ctx.user.id) throw new AccessDenied();
  const photos = await db
    .select({ id: schema.media.id, caption: schema.media.caption })
    .from(schema.media)
    .where(and(eq(schema.media.ownerType, "weekly"), eq(schema.media.ownerId, id)));
  return { post: p, photos };
}
