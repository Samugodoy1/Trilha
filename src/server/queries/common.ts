import "server-only";
import { and, asc, desc, eq, inArray, isNull, lte, gte, count } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { todayISO } from "@/lib/format";
import type { SessionContext } from "../session";
import { accessibleClassIds, isTeacher } from "../access";

export async function getTerms(schoolId: string, academicYearId?: string) {
  const db = await getDb();
  return db
    .select()
    .from(schema.terms)
    .where(academicYearId ? and(eq(schema.terms.schoolId, schoolId), eq(schema.terms.academicYearId, academicYearId)) : eq(schema.terms.schoolId, schoolId))
    .orderBy(asc(schema.terms.startsOn));
}

export async function getCurrentYear(schoolId: string) {
  const db = await getDb();
  const today = todayISO();
  const [year] = await db
    .select()
    .from(schema.academicYears)
    .where(and(eq(schema.academicYears.schoolId, schoolId), lte(schema.academicYears.startsOn, today), gte(schema.academicYears.endsOn, today)))
    .limit(1);
  if (year) return year;
  const [latest] = await db
    .select()
    .from(schema.academicYears)
    .where(eq(schema.academicYears.schoolId, schoolId))
    .orderBy(desc(schema.academicYears.year))
    .limit(1);
  return latest ?? null;
}

export async function getCurrentTerm(schoolId: string) {
  const year = await getCurrentYear(schoolId);
  if (!year) return null;
  const terms = await getTerms(schoolId, year.id);
  const today = todayISO();
  return terms.find((t) => t.startsOn <= today && t.endsOn >= today) ?? terms.filter((t) => t.startsOn <= today).at(-1) ?? terms[0] ?? null;
}

export type ClassSummary = {
  id: string;
  name: string;
  stage: (typeof schema.stageEnum.enumValues)[number];
  grade: number;
  shift: (typeof schema.shiftEnum.enumValues)[number];
  room: string | null;
  year: number;
  archived: boolean;
  studentCount: number;
  subjectLabel: string;
  isHomeroom: boolean;
};

/** Turmas visíveis para a sessão, com contagem de alunos e disciplina. */
export async function getClasses(ctx: SessionContext, opts: { includeArchived?: boolean } = {}): Promise<ClassSummary[]> {
  const ids = await accessibleClassIds(ctx);
  if (ids.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select({ c: schema.classes, year: schema.academicYears.year })
    .from(schema.classes)
    .innerJoin(schema.academicYears, eq(schema.academicYears.id, schema.classes.academicYearId))
    .where(and(inArray(schema.classes.id, ids), opts.includeArchived ? undefined : isNull(schema.classes.archivedAt)))
    .orderBy(desc(schema.academicYears.year), asc(schema.classes.grade), asc(schema.classes.name));
  const counts = await db
    .select({ classId: schema.enrollments.classId, n: count() })
    .from(schema.enrollments)
    .where(inArray(schema.enrollments.classId, ids))
    .groupBy(schema.enrollments.classId);
  const assigns = await db
    .select({ classId: schema.teachingAssignments.classId, isHomeroom: schema.teachingAssignments.isHomeroom, subject: schema.subjects.name, userId: schema.teachingAssignments.userId })
    .from(schema.teachingAssignments)
    .leftJoin(schema.subjects, eq(schema.subjects.id, schema.teachingAssignments.subjectId))
    .where(inArray(schema.teachingAssignments.classId, ids));
  return rows.map(({ c, year }) => {
    const mine = assigns.filter((a) => a.classId === c.id && (!isTeacher(ctx) || a.userId === ctx.user.id));
    const homeroom = mine.some((a) => a.isHomeroom);
    return {
      id: c.id,
      name: c.name,
      stage: c.stage,
      grade: c.grade,
      shift: c.shift,
      room: c.room,
      year,
      archived: Boolean(c.archivedAt),
      studentCount: counts.find((x) => x.classId === c.id)?.n ?? 0,
      isHomeroom: homeroom,
      subjectLabel: homeroom ? "Polivalente" : mine.map((a) => a.subject).filter(Boolean).join(", ") || "—",
    };
  });
}

export async function getClassStudents(classId: string) {
  const db = await getDb();
  return db
    .select({
      id: schema.students.id,
      fullName: schema.students.fullName,
      preferredName: schema.students.preferredName,
      hue: schema.students.hue,
      imageConsent: schema.students.imageConsent,
      number: schema.enrollments.number,
      birthDate: schema.students.birthDate,
    })
    .from(schema.enrollments)
    .innerJoin(schema.students, eq(schema.students.id, schema.enrollments.studentId))
    .where(and(eq(schema.enrollments.classId, classId), isNull(schema.students.archivedAt)))
    .orderBy(asc(schema.students.fullName));
}

export function displayName(s: { fullName: string; preferredName?: string | null }) {
  return s.preferredName ? `${s.preferredName} ${s.fullName.split(" ").slice(-1)[0]}` : s.fullName;
}
