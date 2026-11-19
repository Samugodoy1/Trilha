import "server-only";
import { notFound } from "next/navigation";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "./session";

/**
 * Regras de acesso. Toda leitura ou escrita de dados pedagógicos passa por aqui.
 * - Professor: somente turmas em que leciona (na escola da sessão) e seus alunos.
 * - Coordenação / gestão: toda a escola da sessão, exceto registros privados de professores.
 * - Família: somente alunos com vínculo verificado e não revogado — em qualquer escola.
 * Falhas resultam em 404 para não revelar a existência do recurso.
 */

export class AccessDenied extends Error {
  constructor() {
    super("Acesso não autorizado");
  }
}

export function isStaff(ctx: SessionContext) {
  return ctx.membership.role === "coordinator" || ctx.membership.role === "admin";
}
export function isTeacher(ctx: SessionContext) {
  return ctx.membership.role === "teacher";
}
export function isFamily(ctx: SessionContext) {
  return ctx.membership.role === "guardian" || ctx.membership.role === "student";
}

/** IDs das turmas que o usuário da sessão pode ver. */
export async function accessibleClassIds(ctx: SessionContext): Promise<string[]> {
  const db = await getDb();
  if (isStaff(ctx)) {
    const rows = await db
      .select({ id: schema.classes.id })
      .from(schema.classes)
      .where(eq(schema.classes.schoolId, ctx.school.id));
    return rows.map((r) => r.id);
  }
  if (isTeacher(ctx)) {
    const rows = await db
      .selectDistinct({ id: schema.classes.id })
      .from(schema.teachingAssignments)
      .innerJoin(schema.classes, eq(schema.classes.id, schema.teachingAssignments.classId))
      .where(and(eq(schema.teachingAssignments.userId, ctx.user.id), eq(schema.classes.schoolId, ctx.school.id)));
    return rows.map((r) => r.id);
  }
  return [];
}

export async function canAccessClass(ctx: SessionContext, classId: string): Promise<boolean> {
  if (!isUuid(classId)) return false;
  const ids = await accessibleClassIds(ctx);
  return ids.includes(classId);
}

export async function assertClass(ctx: SessionContext, classId: string) {
  if (!(await canAccessClass(ctx, classId))) throw new AccessDenied();
  const db = await getDb();
  const [row] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
  if (!row) throw new AccessDenied();
  return row;
}

/** IDs dos alunos que a família da sessão pode ver (vínculo verificado e ativo). */
export async function familyStudentIds(ctx: SessionContext): Promise<string[]> {
  if (!isFamily(ctx)) return [];
  const db = await getDb();
  // Somente vínculos verificados pela instituição e não revogados
  const rows = await db
    .select({ id: schema.guardianLinks.studentId })
    .from(schema.guardianLinks)
    .where(
      and(
        eq(schema.guardianLinks.userId, ctx.user.id),
        isNull(schema.guardianLinks.revokedAt),
        isNotNull(schema.guardianLinks.verifiedAt),
      ),
    );
  return rows.map((r) => r.id);
}

export async function canAccessStudent(ctx: SessionContext, studentId: string): Promise<boolean> {
  if (!isUuid(studentId)) return false;
  const db = await getDb();
  if (isFamily(ctx)) {
    return (await familyStudentIds(ctx)).includes(studentId);
  }
  const [student] = await db
    .select({ schoolId: schema.students.schoolId })
    .from(schema.students)
    .where(eq(schema.students.id, studentId));
  if (!student || student.schoolId !== ctx.school.id) return false;
  if (isStaff(ctx)) return true;
  const classIds = await accessibleClassIds(ctx);
  if (classIds.length === 0) return false;
  const rows = await db
    .select({ id: schema.enrollments.id })
    .from(schema.enrollments)
    .where(and(eq(schema.enrollments.studentId, studentId), inArray(schema.enrollments.classId, classIds)))
    .limit(1);
  return rows.length > 0;
}

export async function assertStudent(ctx: SessionContext, studentId: string) {
  if (!(await canAccessStudent(ctx, studentId))) throw new AccessDenied();
  const db = await getDb();
  const [row] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  if (!row) throw new AccessDenied();
  return row;
}

/** Para páginas: converte AccessDenied em 404. */
export async function pageGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AccessDenied) notFound();
    throw e;
  }
}

/** Quais visibilidades o papel atual pode ler, para registros de outros autores. */
export function readableVisibilities(ctx: SessionContext): ("private" | "coordination" | "family")[] {
  if (isFamily(ctx)) return ["family"];
  if (isStaff(ctx)) return ["coordination", "family"];
  return ["coordination", "family"];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
