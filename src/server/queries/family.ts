import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "../session";
import { familyStudents } from "./shell";
import { getAssessmentSeries, getAttendanceByTerm, getGradesByTerm } from "./student";
import { addDays, todayISO } from "@/lib/format";

export type FamilyStudent = Awaited<ReturnType<typeof familyStudents>>[number];

/** Aluno ativo da família (o escolhido na sessão, ou o primeiro). Somente vínculos verificados. */
export async function getActiveChild(ctx: SessionContext) {
  const list = await familyStudents(ctx);
  const active = list.find((s) => s.id === ctx.activeStudentId) ?? list[0] ?? null;
  return { list, active };
}

async function teacherOf(classId: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.users.id, name: schema.users.name, hue: schema.users.hue, isHomeroom: schema.teachingAssignments.isHomeroom, subject: schema.subjects.name })
    .from(schema.teachingAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.teachingAssignments.userId))
    .leftJoin(schema.subjects, eq(schema.subjects.id, schema.teachingAssignments.subjectId))
    .where(eq(schema.teachingAssignments.classId, classId));
  return rows;
}

export async function getFamilyPosts(child: FamilyStudent, limit = 20) {
  const db = await getDb();
  const rows = await db
    .select({ p: schema.weeklyPosts, author: schema.users, className: schema.classes.name })
    .from(schema.weeklyPosts)
    .innerJoin(schema.users, eq(schema.users.id, schema.weeklyPosts.authorId))
    .innerJoin(schema.classes, eq(schema.classes.id, schema.weeklyPosts.classId))
    .where(
      and(
        eq(schema.weeklyPosts.classId, child.classId),
        eq(schema.weeklyPosts.status, "published"),
        or(isNull(schema.weeklyPosts.studentId), eq(schema.weeklyPosts.studentId, child.id)),
      ),
    )
    .orderBy(desc(schema.weeklyPosts.weekStart), desc(schema.weeklyPosts.publishedAt))
    .limit(limit);
  const media = rows.length
    ? await db
        .select({ id: schema.media.id, ownerId: schema.media.ownerId, caption: schema.media.caption })
        .from(schema.media)
        .where(and(eq(schema.media.ownerType, "weekly"), inArray(schema.media.ownerId, rows.map((r) => r.p.id))))
    : [];
  return rows.map(({ p, author, className }) => ({
    ...p,
    authorName: author.name,
    authorHue: author.hue,
    className,
    photos: media.filter((m) => m.ownerId === p.id).map((m) => ({ id: m.id, src: `/api/media/${m.id}`, caption: m.caption })),
  }));
}

export async function getFamilyAgenda(ctx: SessionContext, child: FamilyStudent) {
  const db = await getDb();
  const since = addDays(todayISO(), -21);
  const anns = await db
    .select({ a: schema.announcements, author: schema.users.name })
    .from(schema.announcements)
    .innerJoin(schema.users, eq(schema.users.id, schema.announcements.authorId))
    .where(
      and(
        eq(schema.announcements.schoolId, child.schoolId),
        or(isNull(schema.announcements.classId), eq(schema.announcements.classId, child.classId)),
        or(gte(schema.announcements.startsAt, new Date(`${since}T00:00:00-03:00`)), and(isNull(schema.announcements.startsAt), gte(schema.announcements.publishedAt, new Date(`${since}T00:00:00-03:00`)))),
      ),
    )
    .orderBy(desc(schema.announcements.publishedAt));
  const responses = anns.length
    ? await db
        .select()
        .from(schema.announcementResponses)
        .where(and(inArray(schema.announcementResponses.announcementId, anns.map((a) => a.a.id)), eq(schema.announcementResponses.studentId, child.id), eq(schema.announcementResponses.userId, ctx.user.id)))
    : [];
  const tasks = await db
    .select({ t: schema.tasks, subject: schema.subjects.name, author: schema.users.name })
    .from(schema.tasks)
    .innerJoin(schema.users, eq(schema.users.id, schema.tasks.authorId))
    .leftJoin(schema.subjects, eq(schema.subjects.id, schema.tasks.subjectId))
    .where(and(eq(schema.tasks.classId, child.classId), or(isNull(schema.tasks.dueOn), gte(schema.tasks.dueOn, since))))
    .orderBy(asc(schema.tasks.dueOn));
  const completions = tasks.length
    ? await db.select().from(schema.taskCompletions).where(and(inArray(schema.taskCompletions.taskId, tasks.map((t) => t.t.id)), eq(schema.taskCompletions.studentId, child.id)))
    : [];
  const taskMedia = tasks.length
    ? await db
        .select({ id: schema.media.id, ownerId: schema.media.ownerId, mime: schema.media.mime, name: schema.media.originalName, caption: schema.media.caption })
        .from(schema.media)
        .where(and(eq(schema.media.ownerType, "task"), inArray(schema.media.ownerId, tasks.map((t) => t.t.id))))
    : [];
  return {
    announcements: anns.map(({ a, author }) => ({ ...a, author, response: responses.find((r) => r.announcementId === a.id) ?? null })),
    tasks: tasks.map(({ t, subject, author }) => ({
      ...t,
      subject,
      author,
      completion: completions.find((c) => c.taskId === t.id) ?? null,
      files: taskMedia.filter((m) => m.ownerId === t.id),
    })),
  };
}

export async function getFamilyGrowth(child: FamilyStudent) {
  const db = await getDb();
  const series = await getAssessmentSeries(child.id, { familyOnly: true });
  const grades = await getGradesByTerm(child.id, child.schoolId, { familyOnly: true });
  const attendance = await getAttendanceByTerm(child.id, child.schoolId);
  const reports = await db
    .select()
    .from(schema.reports)
    .where(and(eq(schema.reports.studentId, child.id), eq(schema.reports.status, "approved"), eq(schema.reports.visibility, "family")))
    .orderBy(desc(schema.reports.approvedAt));
  const highlights = await db
    .select({ e: schema.journalEntries, author: schema.users.name })
    .from(schema.journalEntryStudents)
    .innerJoin(schema.journalEntries, eq(schema.journalEntries.id, schema.journalEntryStudents.entryId))
    .innerJoin(schema.users, eq(schema.users.id, schema.journalEntries.authorId))
    .where(and(eq(schema.journalEntryStudents.studentId, child.id), eq(schema.journalEntries.visibility, "family"), eq(schema.journalEntries.isDraft, false)))
    .orderBy(desc(schema.journalEntries.occurredOn));
  const feedbacks = await db
    .select({ f: schema.feedbacks, author: schema.users.name, hue: schema.users.hue })
    .from(schema.feedbacks)
    .innerJoin(schema.users, eq(schema.users.id, schema.feedbacks.authorId))
    .where(and(eq(schema.feedbacks.studentId, child.id), eq(schema.feedbacks.status, "published")))
    .orderBy(desc(schema.feedbacks.publishedAt));
  return { series, grades, attendance, reports, highlights, feedbacks };
}

export async function getFamilyPortfolio(child: FamilyStudent) {
  const db = await getDb();
  return db
    .select({ p: schema.portfolioItems, mediaId: schema.media.id, mime: schema.media.mime })
    .from(schema.portfolioItems)
    .leftJoin(schema.media, and(eq(schema.media.ownerType, "portfolio"), eq(schema.media.ownerId, schema.portfolioItems.id)))
    .where(and(eq(schema.portfolioItems.studentId, child.id), eq(schema.portfolioItems.visibility, "family")))
    .orderBy(desc(schema.portfolioItems.date));
}

export async function getFamilyHome(ctx: SessionContext, child: FamilyStudent) {
  const today = todayISO();
  const [posts, agenda, growth, teachers] = await Promise.all([getFamilyPosts(child, 1), getFamilyAgenda(ctx, child), getFamilyGrowth(child), teacherOf(child.classId)]);
  const pendingTasks = agenda.tasks.filter((t) => !t.completion && t.dueOn && t.dueOn >= today).slice(0, 4);
  const toAnswer = agenda.announcements.filter((a) => (a.isAuthorization && !a.response?.authorization) || (a.requiresConfirmation && !a.response?.confirmedAt));
  const upcoming = agenda.announcements
    .filter((a) => a.startsAt && a.startsAt >= new Date(`${today}T00:00:00-03:00`))
    .sort((a, b) => a.startsAt!.getTime() - b.startsAt!.getTime())
    .slice(0, 3);
  const unreadFeedback = growth.feedbacks.filter(({ f }) => !f.readAt);
  return { post: posts[0] ?? null, pendingTasks, toAnswer, upcoming, unreadFeedback, growth, teachers };
}

export async function getContributions(child: FamilyStudent) {
  const db = await getDb();
  const own = await db.select().from(schema.familyContributions).where(eq(schema.familyContributions.studentId, child.id)).orderBy(desc(schema.familyContributions.createdAt));
  // Sugestões para casa: seções "Para continuar em casa" e feedbacks do tipo "em casa"
  const posts = await getFamilyPosts(child, 6);
  const ideas = posts.flatMap((p) => p.sections.filter((s) => s.key === "casa" && s.body.trim()).map((s) => ({ id: `${p.id}-casa`, from: p.title, body: s.body, author: p.authorName, date: p.weekStart })));
  return { own, ideas };
}

