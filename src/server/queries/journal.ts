import "server-only";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "../session";
import { AccessDenied, canAccessClass, isUuid } from "../access";
import { displayName } from "./common";

export async function getJournal(ctx: SessionContext, opts: { classId?: string; kind?: string; q?: string; limit?: number }) {
  const db = await getDb();
  const kind = schema.entryKindEnum.enumValues.find((k) => k === opts.kind);
  const q = opts.q?.trim().slice(0, 60);
  const rows = await db
    .select({ e: schema.journalEntries, className: schema.classes.name })
    .from(schema.journalEntries)
    .leftJoin(schema.classes, eq(schema.classes.id, schema.journalEntries.classId))
    .where(
      and(
        eq(schema.journalEntries.authorId, ctx.user.id),
        opts.classId && isUuid(opts.classId) ? eq(schema.journalEntries.classId, opts.classId) : undefined,
        kind ? eq(schema.journalEntries.kind, kind) : undefined,
        q ? or(ilike(schema.journalEntries.body, `%${q}%`), ilike(schema.journalEntries.title, `%${q}%`)) : undefined,
      ),
    )
    .orderBy(desc(schema.journalEntries.isDraft), desc(schema.journalEntries.occurredOn), desc(schema.journalEntries.createdAt))
    .limit(opts.limit ?? 120);
  const ids = rows.map((r) => r.e.id);
  const links = ids.length
    ? await db
        .select({ entryId: schema.journalEntryStudents.entryId, id: schema.students.id, fullName: schema.students.fullName, preferredName: schema.students.preferredName, hue: schema.students.hue })
        .from(schema.journalEntryStudents)
        .innerJoin(schema.students, eq(schema.students.id, schema.journalEntryStudents.studentId))
        .where(inArray(schema.journalEntryStudents.entryId, ids))
    : [];
  return rows.map(({ e, className }) => ({
    ...e,
    className,
    students: links.filter((l) => l.entryId === e.id).map((l) => ({ id: l.id, name: displayName(l), hue: l.hue })),
  }));
}

export async function getEntry(ctx: SessionContext, id: string) {
  if (!isUuid(id)) throw new AccessDenied();
  const db = await getDb();
  const [e] = await db.select().from(schema.journalEntries).where(eq(schema.journalEntries.id, id));
  if (!e) throw new AccessDenied();
  const mine = e.authorId === ctx.user.id;
  // Registros de outros autores: apenas os compartilhados com a coordenação, e somente para quem acessa a turma.
  if (!mine && (e.visibility === "private" || e.isDraft || !e.classId || !(await canAccessClass(ctx, e.classId)))) throw new AccessDenied();
  const studs = await db
    .select({ id: schema.students.id, fullName: schema.students.fullName, preferredName: schema.students.preferredName, hue: schema.students.hue })
    .from(schema.journalEntryStudents)
    .innerJoin(schema.students, eq(schema.students.id, schema.journalEntryStudents.studentId))
    .where(eq(schema.journalEntryStudents.entryId, id));
  const [author] = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, e.authorId));
  return { entry: e, mine, author: author?.name ?? "", students: studs.map((s) => ({ id: s.id, name: displayName(s), hue: s.hue })) };
}
