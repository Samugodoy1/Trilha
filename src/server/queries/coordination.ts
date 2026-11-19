import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNull, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "../session";
import { displayName, getClasses, getCurrentTerm } from "./common";
import { addDays, todayISO } from "@/lib/format";

export async function getCoordinationOverview(ctx: SessionContext) {
  const db = await getDb();
  const classes = (await getClasses(ctx)).filter((c) => !c.archived);
  const ids = classes.map((c) => c.id);
  const term = await getCurrentTerm(ctx.school.id);
  if (!ids.length) return { classes, term, distributions: [], support: [], shared: [], stats: { students: 0, connected: 0, rounds: 0 } };

  // Última rodada de cada modelo, por turma: distribuição anônima por nível
  const rounds = await db
    .select({ r: schema.assessmentRounds, tpl: schema.assessmentTemplates })
    .from(schema.assessmentRounds)
    .innerJoin(schema.assessmentTemplates, eq(schema.assessmentTemplates.id, schema.assessmentRounds.templateId))
    .where(inArray(schema.assessmentRounds.classId, ids))
    .orderBy(desc(schema.assessmentRounds.appliedOn));
  const latest = new Map<string, (typeof rounds)[number]>();
  for (const x of rounds) {
    const k = `${x.r.classId}:${x.tpl.id}`;
    if (!latest.has(k)) latest.set(k, x);
  }
  const results = latest.size
    ? await db
        .select({ roundId: schema.assessmentResults.roundId, level: schema.assessmentResults.levelKey, n: count() })
        .from(schema.assessmentResults)
        .where(inArray(schema.assessmentResults.roundId, [...latest.values()].map((x) => x.r.id)))
        .groupBy(schema.assessmentResults.roundId, schema.assessmentResults.levelKey)
    : [];
  const distributions = classes.map((c) => ({
    classId: c.id,
    className: c.name,
    items: [...latest.values()]
      .filter((x) => x.r.classId === c.id && x.tpl.kind !== "diagnostica" ? true : x.r.classId === c.id)
      .map((x) => ({
        roundId: x.r.id,
        title: x.r.title,
        kind: x.tpl.kind,
        templateName: x.tpl.name,
        appliedOn: x.r.appliedOn,
        levels: x.tpl.scale.map((l) => ({ key: l.key, label: l.label, short: l.short, count: results.find((r) => r.roundId === x.r.id && r.level === l.key)?.n ?? 0 })),
      })),
  }));

  // Alunos que podem precisar de apoio: faltas recentes
  const since = addDays(todayISO(), -14);
  const abs = await db
    .select({ studentId: schema.attendance.studentId, classId: schema.attendance.classId, n: count() })
    .from(schema.attendance)
    .where(and(inArray(schema.attendance.classId, ids), gte(schema.attendance.date, since), eq(schema.attendance.status, "falta")))
    .groupBy(schema.attendance.studentId, schema.attendance.classId);
  const flagged = abs.filter((a) => a.n >= 3);
  const studs = flagged.length ? await db.select().from(schema.students).where(inArray(schema.students.id, flagged.map((f) => f.studentId))) : [];
  const support = flagged.map((f) => {
    const s = studs.find((x) => x.id === f.studentId)!;
    return { id: s.id, name: displayName(s), hue: s.hue, className: classes.find((c) => c.id === f.classId)?.name ?? "", reason: `${f.n} faltas nas últimas duas semanas` };
  });

  const shared = await db
    .select({ e: schema.journalEntries, author: schema.users.name, className: schema.classes.name })
    .from(schema.journalEntries)
    .innerJoin(schema.users, eq(schema.users.id, schema.journalEntries.authorId))
    .leftJoin(schema.classes, eq(schema.classes.id, schema.journalEntries.classId))
    .where(and(eq(schema.journalEntries.schoolId, ctx.school.id), eq(schema.journalEntries.visibility, "coordination"), eq(schema.journalEntries.isDraft, false)))
    .orderBy(desc(schema.journalEntries.occurredOn))
    .limit(6);

  const [{ n: students }] = await db.select({ n: count() }).from(schema.enrollments).where(and(inArray(schema.enrollments.classId, ids), isNull(schema.enrollments.endedOn)));
  const connectedRows = await db
    .selectDistinct({ id: schema.guardianLinks.studentId })
    .from(schema.guardianLinks)
    .innerJoin(schema.enrollments, eq(schema.enrollments.studentId, schema.guardianLinks.studentId))
    .where(and(inArray(schema.enrollments.classId, ids), isNull(schema.guardianLinks.revokedAt), isNotNull(schema.guardianLinks.verifiedAt)));
  const [{ n: roundsInTerm }] = term
    ? await db.select({ n: count() }).from(schema.assessmentRounds).where(and(inArray(schema.assessmentRounds.classId, ids), eq(schema.assessmentRounds.termId, term.id)))
    : [{ n: 0 }];

  return { classes, term, distributions, support, shared, stats: { students, connected: connectedRows.length, rounds: roundsInTerm } };
}

export async function getCoordinationNotes(ctx: SessionContext) {
  const db = await getDb();
  return db
    .select({ n: schema.coordinationNotes, className: schema.classes.name, teacher: schema.users.name })
    .from(schema.coordinationNotes)
    .leftJoin(schema.classes, eq(schema.classes.id, schema.coordinationNotes.classId))
    .leftJoin(schema.users, eq(schema.users.id, schema.coordinationNotes.teacherId))
    .where(eq(schema.coordinationNotes.schoolId, ctx.school.id))
    .orderBy(desc(schema.coordinationNotes.date));
}

export async function getSchoolTeachers(schoolId: string) {
  const db = await getDb();
  return db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(and(eq(schema.memberships.schoolId, schoolId), eq(schema.memberships.role, "teacher"), isNull(schema.memberships.revokedAt)))
    .orderBy(asc(schema.users.name));
}
