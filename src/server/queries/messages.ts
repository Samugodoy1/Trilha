import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, schema } from "@/db";
import type { SessionContext } from "../session";
import { AccessDenied, familyStudentIds, isFamily, isUuid } from "../access";
import { displayName } from "./common";

export async function listConversations(ctx: SessionContext, opts: { archived?: boolean; studentId?: string | null } = {}) {
  const db = await getDb();
  const other = alias(schema.users, "other");
  const fam = isFamily(ctx);
  const famIds = fam ? await familyStudentIds(ctx) : [];
  if (fam && !famIds.length) return [];
  const rows = await db
    .select({ c: schema.conversations, other: other, student: schema.students })
    .from(schema.conversations)
    .innerJoin(other, eq(other.id, fam ? schema.conversations.teacherId : schema.conversations.guardianId))
    .innerJoin(schema.students, eq(schema.students.id, schema.conversations.studentId))
    .where(
      and(
        fam ? eq(schema.conversations.guardianId, ctx.user.id) : eq(schema.conversations.teacherId, ctx.user.id),
        fam ? inArray(schema.conversations.studentId, opts.studentId ? [opts.studentId] : famIds) : undefined,
        !fam ? (opts.archived ? undefined : isNull(schema.conversations.archivedByTeacherAt)) : undefined,
      ),
    )
    .orderBy(desc(schema.conversations.lastMessageAt));
  const ids = rows.map((r) => r.c.id);
  const lastMsgs = ids.length
    ? await db.select().from(schema.messages).where(inArray(schema.messages.conversationId, ids)).orderBy(desc(schema.messages.createdAt))
    : [];
  const unread = ids.length
    ? await db
        .select({ id: schema.messages.conversationId, n: count() })
        .from(schema.messages)
        .where(and(inArray(schema.messages.conversationId, ids), ne(schema.messages.senderId, ctx.user.id), isNull(schema.messages.readAt)))
        .groupBy(schema.messages.conversationId)
    : [];
  return rows
    .filter((r) => (opts.archived ? Boolean(r.c.archivedByTeacherAt) || fam : true))
    .map(({ c, other, student }) => {
      const last = lastMsgs.find((m) => m.conversationId === c.id);
      return {
        id: c.id,
        subject: c.subject,
        category: c.category,
        archived: Boolean(c.archivedByTeacherAt),
        lastAt: c.lastMessageAt.toISOString(),
        otherName: other.name,
        otherHue: other.hue,
        studentName: displayName(student),
        preview: last ? `${last.senderId === ctx.user.id ? "Você: " : ""}${last.body}` : "",
        unread: unread.find((u) => u.id === c.id)?.n ?? 0,
      };
    });
}

export async function getConversation(ctx: SessionContext, id: string) {
  if (!isUuid(id)) throw new AccessDenied();
  const db = await getDb();
  const [c] = await db.select().from(schema.conversations).where(eq(schema.conversations.id, id));
  if (!c || (c.teacherId !== ctx.user.id && c.guardianId !== ctx.user.id)) throw new AccessDenied();
  if (c.guardianId === ctx.user.id && !(await familyStudentIds(ctx)).includes(c.studentId)) throw new AccessDenied();
  const msgs = await db.select().from(schema.messages).where(eq(schema.messages.conversationId, id)).orderBy(asc(schema.messages.createdAt));
  const [teacher] = await db.select().from(schema.users).where(eq(schema.users.id, c.teacherId));
  const [guardian] = await db.select().from(schema.users).where(eq(schema.users.id, c.guardianId));
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, c.studentId));
  const [mem] = await db
    .select({ officeHours: schema.memberships.officeHours, title: schema.memberships.title })
    .from(schema.memberships)
    .where(and(eq(schema.memberships.userId, c.teacherId), eq(schema.memberships.schoolId, c.schoolId), eq(schema.memberships.role, "teacher")));
  const [link] = await db
    .select({ relationship: schema.guardianLinks.relationship })
    .from(schema.guardianLinks)
    .where(and(eq(schema.guardianLinks.userId, c.guardianId), eq(schema.guardianLinks.studentId, c.studentId)));
  return {
    conversation: c,
    messages: msgs.map((m) => ({ id: m.id, body: m.body, mine: m.senderId === ctx.user.id, at: m.createdAt.toISOString(), readAt: m.readAt?.toISOString() ?? null })),
    teacher: { id: teacher.id, name: teacher.name, hue: teacher.hue, title: mem?.title ?? "Professor(a)", officeHours: mem?.officeHours ?? null },
    guardian: { id: guardian.id, name: guardian.name, hue: guardian.hue, relationship: link?.relationship ?? "Responsável" },
    student: { id: student.id, name: displayName(student) },
  };
}

/** Professores do aluno com quem a família pode conversar. */
export async function teachersForStudent(studentId: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.users.id, name: schema.users.name, hue: schema.users.hue, isHomeroom: schema.teachingAssignments.isHomeroom, subject: schema.subjects.name, officeHours: schema.memberships.officeHours })
    .from(schema.enrollments)
    .innerJoin(schema.classes, eq(schema.classes.id, schema.enrollments.classId))
    .innerJoin(schema.teachingAssignments, eq(schema.teachingAssignments.classId, schema.classes.id))
    .innerJoin(schema.users, eq(schema.users.id, schema.teachingAssignments.userId))
    .leftJoin(schema.subjects, eq(schema.subjects.id, schema.teachingAssignments.subjectId))
    .leftJoin(schema.memberships, and(eq(schema.memberships.userId, schema.users.id), eq(schema.memberships.schoolId, schema.classes.schoolId), eq(schema.memberships.role, "teacher")))
    .where(and(eq(schema.enrollments.studentId, studentId), isNull(schema.classes.archivedAt)));
  return rows.map((r) => ({ id: r.id, name: r.name, hue: r.hue, label: r.isHomeroom ? "Professora da turma" : r.subject ?? "Professor(a)", officeHours: r.officeHours }));
}
