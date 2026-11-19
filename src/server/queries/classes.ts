import "server-only";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "../session";
import { assertClass, isTeacher } from "../access";
import { displayName, getClassStudents, getTerms } from "./common";
import { todayISO } from "@/lib/format";

export async function getClassDetail(ctx: SessionContext, classId: string) {
  const cls = await assertClass(ctx, classId);
  const db = await getDb();
  const students = await getClassStudents(classId);
  const ids = students.map((s) => s.id);
  const terms = await getTerms(ctx.school.id, cls.academicYearId);
  const [year] = await db.select().from(schema.academicYears).where(eq(schema.academicYears.id, cls.academicYearId));

  const lastEntries = ids.length
    ? await db
        .select({ studentId: schema.journalEntryStudents.studentId, last: sql<string>`max(${schema.journalEntries.occurredOn})`, n: count() })
        .from(schema.journalEntryStudents)
        .innerJoin(schema.journalEntries, eq(schema.journalEntries.id, schema.journalEntryStudents.entryId))
        .where(
          and(
            inArray(schema.journalEntryStudents.studentId, ids),
            eq(schema.journalEntries.isDraft, false),
            isTeacher(ctx) ? eq(schema.journalEntries.authorId, ctx.user.id) : inArray(schema.journalEntries.visibility, ["coordination", "family"]),
          ),
        )
        .groupBy(schema.journalEntryStudents.studentId)
    : [];

  const rounds = await db
    .select({ r: schema.assessmentRounds, tpl: schema.assessmentTemplates, term: schema.terms, done: count(schema.assessmentResults.id) })
    .from(schema.assessmentRounds)
    .innerJoin(schema.assessmentTemplates, eq(schema.assessmentTemplates.id, schema.assessmentRounds.templateId))
    .innerJoin(schema.terms, eq(schema.terms.id, schema.assessmentRounds.termId))
    .leftJoin(schema.assessmentResults, eq(schema.assessmentResults.roundId, schema.assessmentRounds.id))
    .where(eq(schema.assessmentRounds.classId, classId))
    .groupBy(schema.assessmentRounds.id, schema.assessmentTemplates.id, schema.terms.id)
    .orderBy(desc(schema.assessmentRounds.appliedOn));

  // Nível mais recente por aluno em cada área (para a lista)
  const latest = ids.length
    ? await db
        .select({ studentId: schema.assessmentResults.studentId, level: schema.assessmentResults.levelKey, kind: schema.assessmentTemplates.kind, scale: schema.assessmentTemplates.scale, on: schema.assessmentRounds.appliedOn })
        .from(schema.assessmentResults)
        .innerJoin(schema.assessmentRounds, eq(schema.assessmentRounds.id, schema.assessmentResults.roundId))
        .innerJoin(schema.assessmentTemplates, eq(schema.assessmentTemplates.id, schema.assessmentRounds.templateId))
        .where(and(inArray(schema.assessmentResults.studentId, ids), eq(schema.assessmentRounds.classId, classId)))
        .orderBy(asc(schema.assessmentRounds.appliedOn))
    : [];

  const gradeItems = await db
    .select({ g: schema.gradeItems, subject: schema.subjects.name, term: schema.terms, done: count(schema.grades.id) })
    .from(schema.gradeItems)
    .innerJoin(schema.terms, eq(schema.terms.id, schema.gradeItems.termId))
    .leftJoin(schema.subjects, eq(schema.subjects.id, schema.gradeItems.subjectId))
    .leftJoin(schema.grades, eq(schema.grades.gradeItemId, schema.gradeItems.id))
    .where(eq(schema.gradeItems.classId, classId))
    .groupBy(schema.gradeItems.id, schema.subjects.name, schema.terms.id)
    .orderBy(desc(schema.gradeItems.date));

  const assignments = await db
    .select({ subjectId: schema.teachingAssignments.subjectId, isHomeroom: schema.teachingAssignments.isHomeroom, userId: schema.teachingAssignments.userId, name: schema.users.name })
    .from(schema.teachingAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.teachingAssignments.userId))
    .where(eq(schema.teachingAssignments.classId, classId));
  const subjects = await db.select().from(schema.subjects).where(eq(schema.subjects.schoolId, ctx.school.id)).orderBy(asc(schema.subjects.name));
  const myAssignment = assignments.find((a) => a.userId === ctx.user.id);
  const today = todayISO();
  const todayAttendance = await db
    .select({ studentId: schema.attendance.studentId, status: schema.attendance.status })
    .from(schema.attendance)
    .where(and(eq(schema.attendance.classId, classId), eq(schema.attendance.date, today)));

  return {
    cls,
    year: year?.year,
    terms,
    teachers: assignments,
    myAssignment,
    subjects,
    todayAttendance,
    students: students.map((s) => {
      const le = lastEntries.find((x) => x.studentId === s.id);
      const lv = (kind: string) => {
        const r = latest.filter((l) => l.studentId === s.id && l.kind === kind).at(-1);
        return r ? r.scale.find((x) => x.key === r.level)?.label ?? null : null;
      };
      return { ...s, name: displayName(s), lastEntry: le?.last ?? null, entryCount: le?.n ?? 0, writing: lv("escrita"), reading: lv("leitura") };
    }),
    rounds: rounds.map(({ r, tpl, term, done }) => ({ ...r, templateName: tpl.name, kind: tpl.kind, termName: term.name, termId: term.id, done })),
    gradeItems: gradeItems.map(({ g, subject, term, done }) => ({ ...g, subject, termName: term.name, done })),
  };
}
