import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "../session";
import { AccessDenied, accessibleClassIds, canAccessClass, isUuid } from "../access";
import { displayName, getClassStudents } from "./common";

export async function getTemplates(schoolId: string) {
  const db = await getDb();
  return db
    .select()
    .from(schema.assessmentTemplates)
    .where(and(eq(schema.assessmentTemplates.schoolId, schoolId), isNull(schema.assessmentTemplates.archivedAt)))
    .orderBy(asc(schema.assessmentTemplates.createdAt));
}

export async function getRoundsOverview(ctx: SessionContext) {
  const ids = await accessibleClassIds(ctx);
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db
    .select({ r: schema.assessmentRounds, tpl: schema.assessmentTemplates, cls: schema.classes, term: schema.terms, done: count(schema.assessmentResults.id) })
    .from(schema.assessmentRounds)
    .innerJoin(schema.assessmentTemplates, eq(schema.assessmentTemplates.id, schema.assessmentRounds.templateId))
    .innerJoin(schema.classes, eq(schema.classes.id, schema.assessmentRounds.classId))
    .innerJoin(schema.terms, eq(schema.terms.id, schema.assessmentRounds.termId))
    .leftJoin(schema.assessmentResults, eq(schema.assessmentResults.roundId, schema.assessmentRounds.id))
    .where(and(inArray(schema.assessmentRounds.classId, ids), isNull(schema.classes.archivedAt)))
    .groupBy(schema.assessmentRounds.id, schema.assessmentTemplates.id, schema.classes.id, schema.terms.id)
    .orderBy(desc(schema.assessmentRounds.appliedOn))
    .limit(60);
  const counts = await db
    .select({ classId: schema.enrollments.classId, n: count() })
    .from(schema.enrollments)
    .where(inArray(schema.enrollments.classId, ids))
    .groupBy(schema.enrollments.classId);
  return rows.map(({ r, tpl, cls, term, done }) => ({
    ...r,
    templateName: tpl.name,
    kind: tpl.kind,
    className: cls.name,
    termName: term.name,
    done,
    total: counts.find((c) => c.classId === cls.id)?.n ?? 0,
  }));
}

export async function getRoundForEntry(ctx: SessionContext, roundId: string) {
  if (!isUuid(roundId)) throw new AccessDenied();
  const db = await getDb();
  const [round] = await db.select().from(schema.assessmentRounds).where(eq(schema.assessmentRounds.id, roundId));
  if (!round || !(await canAccessClass(ctx, round.classId))) throw new AccessDenied();
  const [tpl] = await db.select().from(schema.assessmentTemplates).where(eq(schema.assessmentTemplates.id, round.templateId));
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, round.classId));
  const [term] = await db.select().from(schema.terms).where(eq(schema.terms.id, round.termId));
  const students = await getClassStudents(round.classId);
  const results = await db.select().from(schema.assessmentResults).where(eq(schema.assessmentResults.roundId, roundId));
  // Rodada anterior do mesmo modelo para os mesmos alunos (inclusive de anos anteriores)
  const prevResults = students.length
    ? await db
        .select({ studentId: schema.assessmentResults.studentId, levelKey: schema.assessmentResults.levelKey, on: schema.assessmentRounds.appliedOn })
        .from(schema.assessmentResults)
        .innerJoin(schema.assessmentRounds, eq(schema.assessmentRounds.id, schema.assessmentResults.roundId))
        .where(
          and(
            eq(schema.assessmentRounds.templateId, round.templateId),
            lt(schema.assessmentRounds.appliedOn, round.appliedOn),
            inArray(schema.assessmentResults.studentId, students.map((s) => s.id)),
          ),
        )
        .orderBy(asc(schema.assessmentRounds.appliedOn))
    : [];
  const previous: Record<string, string | null> = {};
  for (const p of prevResults) previous[p.studentId] = p.levelKey;
  return {
    round,
    template: tpl,
    cls,
    term,
    students: students.map((s) => ({ id: s.id, name: displayName(s), hue: s.hue })),
    results: Object.fromEntries(results.map((r) => [r.studentId, { levelKey: r.levelKey, criteria: r.criteria, note: r.note, absent: r.absent }])),
    previous,
  };
}
