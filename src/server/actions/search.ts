"use server";

import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSession } from "../session";
import { accessibleClassIds, isFamily, isStaff } from "../access";
import { displayName } from "../queries/common";

export type SearchResult = { students: { id: string; name: string; hue: number; detail: string }[] };

export async function searchAction(query: string): Promise<SearchResult> {
  const ctx = await getSession();
  if (!ctx || isFamily(ctx)) return { students: [] };
  const q = query.trim().slice(0, 60);
  if (q.length < 2) return { students: [] };
  const db = await getDb();
  const classIds = await accessibleClassIds(ctx);
  if (!classIds.length) return { students: [] };
  const pattern = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
  const rows = await db
    .selectDistinctOn([schema.students.id], {
      id: schema.students.id,
      fullName: schema.students.fullName,
      preferredName: schema.students.preferredName,
      hue: schema.students.hue,
      className: schema.classes.name,
    })
    .from(schema.students)
    .innerJoin(schema.enrollments, eq(schema.enrollments.studentId, schema.students.id))
    .innerJoin(schema.classes, eq(schema.classes.id, schema.enrollments.classId))
    .where(
      and(
        eq(schema.students.schoolId, ctx.school.id),
        isStaff(ctx) ? undefined : inArray(schema.enrollments.classId, classIds),
        or(
          sql`unaccent_lower(${schema.students.fullName}) like unaccent_lower(${pattern})`,
          ilike(schema.students.preferredName, pattern),
        ),
      ),
    )
    .orderBy(schema.students.id, asc(schema.classes.archivedAt))
    .limit(8);
  return { students: rows.map((r) => ({ id: r.id, name: displayName(r), hue: r.hue, detail: r.className })) };
}
