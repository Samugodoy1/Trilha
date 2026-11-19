import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { addDays, todayISO, weekStart, diffDays, isoFromTimestamp } from "@/lib/format";
import type { SessionContext } from "../session";
import { displayName, getClasses, getCurrentTerm } from "./common";

export type TodayItem = {
  id: string;
  kind: "messages" | "assessment" | "weekly" | "draft" | "contribution" | "feedback" | "authorization";
  title: string;
  detail?: string;
  href: string;
  tint: string;
  status?: string;
};

export type AttentionItem = { studentId: string; name: string; hue: number; className: string; reasons: string[] };

export async function getTeacherToday(ctx: SessionContext) {
  const db = await getDb();
  const today = todayISO();
  const classes = (await getClasses(ctx)).filter((c) => !c.archived);
  const classIds = classes.map((c) => c.id);
  const term = await getCurrentTerm(ctx.school.id);
  const items: TodayItem[] = [];

  // Recados das famílias não lidos
  const unread = await db
    .select({ convId: schema.conversations.id, guardian: schema.users.name, subject: schema.conversations.subject, n: count() })
    .from(schema.messages)
    .innerJoin(schema.conversations, eq(schema.conversations.id, schema.messages.conversationId))
    .innerJoin(schema.users, eq(schema.users.id, schema.conversations.guardianId))
    .where(and(eq(schema.conversations.teacherId, ctx.user.id), ne(schema.messages.senderId, ctx.user.id), isNull(schema.messages.readAt)))
    .groupBy(schema.conversations.id, schema.users.name, schema.conversations.subject);
  if (unread.length === 1)
    items.push({ id: "msg", kind: "messages", title: `Responder ${unread[0].guardian.split(" ")[0]}`, detail: unread[0].subject, href: `/mensagens/${unread[0].convId}`, tint: "var(--messages)" });
  else if (unread.length > 1)
    items.push({ id: "msg", kind: "messages", title: `${unread.length} famílias aguardam resposta`, detail: unread.map((u) => u.guardian.split(" ")[0]).join(", "), href: "/mensagens", tint: "var(--messages)" });

  // Sondagens pendentes no bimestre atual
  if (term && classIds.length) {
    const rounds = await db
      .select({ classId: schema.assessmentRounds.classId, templateId: schema.assessmentRounds.templateId, termId: schema.assessmentRounds.termId, id: schema.assessmentRounds.id, title: schema.assessmentRounds.title, tplName: schema.assessmentTemplates.name, kind: schema.assessmentTemplates.kind })
      .from(schema.assessmentRounds)
      .innerJoin(schema.assessmentTemplates, eq(schema.assessmentTemplates.id, schema.assessmentRounds.templateId))
      .where(and(inArray(schema.assessmentRounds.classId, classIds), eq(schema.assessmentRounds.createdById, ctx.user.id)));
    for (const c of classes) {
      const cr = rounds.filter((r) => r.classId === c.id);
      const tplsUsed = [...new Map(cr.filter((r) => r.termId !== term.id).map((r) => [r.templateId, r])).values()];
      for (const t of tplsUsed) {
        if (!cr.some((r) => r.templateId === t.templateId && r.termId === term.id) && (t.kind === "escrita" || t.kind === "leitura" || t.kind === "matematica")) {
          items.push({
            id: `sond-${c.id}-${t.templateId}`,
            kind: "assessment",
            title: `Lançar sondagem de ${t.kind === "escrita" ? "escrita" : t.kind === "leitura" ? "leitura" : "matemática"}`,
            detail: `${c.name} · ${term.name}`,
            status: "não registrada",
            href: `/sondagens/nova?turma=${c.id}&modelo=${t.templateId}`,
            tint: t.kind === "escrita" ? "var(--writing)" : t.kind === "leitura" ? "var(--reading)" : "var(--math)",
          });
        }
      }
      // Rodadas do bimestre com alunos sem resultado
      for (const r of cr.filter((r) => r.termId === term.id)) {
        const [{ n }] = await db.select({ n: count() }).from(schema.assessmentResults).where(eq(schema.assessmentResults.roundId, r.id));
        const missing = c.studentCount - n;
        if (missing > 0)
          items.push({ id: `round-${r.id}`, kind: "assessment", title: `Completar: ${r.title}`, detail: c.name, status: `faltam ${missing}`, href: `/sondagens/${r.id}`, tint: "var(--reading)" });
      }
    }
  }

  // Nossa semana ainda não publicada (a partir de quarta-feira)
  const ws = weekStart(today);
  const dow = diffDays(today, ws);
  if (dow >= 2 && classIds.length) {
    const posts = await db
      .select({ classId: schema.weeklyPosts.classId, status: schema.weeklyPosts.status, id: schema.weeklyPosts.id })
      .from(schema.weeklyPosts)
      .where(and(inArray(schema.weeklyPosts.classId, classIds), eq(schema.weeklyPosts.weekStart, ws), isNull(schema.weeklyPosts.studentId)));
    for (const c of classes.filter((c) => c.isHomeroom || classes.length <= 2)) {
      const p = posts.find((x) => x.classId === c.id);
      if (!p || p.status === "draft")
        items.push({
          id: `week-${c.id}`,
          kind: "weekly",
          title: p ? "Revisar e publicar a Nossa semana" : "Publicar a Nossa semana",
          detail: `${c.name}`,
          status: p ? "rascunho" : "ainda não publicada",
          href: p ? `/semana/${p.id}` : `/semana/nova?turma=${c.id}`,
          tint: "var(--family)",
        });
    }
  }

  // Rascunhos
  const drafts = await db
    .select({ id: schema.journalEntries.id, title: schema.journalEntries.title, body: schema.journalEntries.body, kind: schema.journalEntries.kind })
    .from(schema.journalEntries)
    .where(and(eq(schema.journalEntries.authorId, ctx.user.id), eq(schema.journalEntries.isDraft, true)))
    .orderBy(desc(schema.journalEntries.updatedAt))
    .limit(3);
  for (const d of drafts)
    items.push({ id: `draft-${d.id}`, kind: "draft", title: "Continuar rascunho", detail: d.title || d.body.slice(0, 60) || "Sem texto", href: `/diario/${d.id}`, tint: "var(--label-2)" });

  // Contribuições das famílias ainda não vistas
  if (classIds.length) {
    const contrib = await db
      .select({ id: schema.familyContributions.id, studentId: schema.familyContributions.studentId, author: schema.users.name, fullName: schema.students.fullName, preferredName: schema.students.preferredName })
      .from(schema.familyContributions)
      .innerJoin(schema.users, eq(schema.users.id, schema.familyContributions.authorId))
      .innerJoin(schema.students, eq(schema.students.id, schema.familyContributions.studentId))
      .innerJoin(schema.enrollments, eq(schema.enrollments.studentId, schema.students.id))
      .where(and(inArray(schema.enrollments.classId, classIds), isNull(schema.familyContributions.seenAt)))
      .limit(3);
    for (const c of contrib)
      items.push({ id: `contrib-${c.id}`, kind: "contribution", title: `Ver o que ${c.author.split(" ")[0]} compartilhou`, detail: displayName(c), href: `/alunos/${c.studentId}#em-casa`, tint: "var(--attendance)" });
  }

  // Alunos para acompanhar (sinais nos registros, nunca rótulos)
  const attention: AttentionItem[] = [];
  const noRecords = { count: 0, classId: "" };
  const homerooms = classes.filter((c) => c.isHomeroom);
  if (homerooms.length) {
    const hrIds = homerooms.map((c) => c.id);
    const studs = await db
      .select({ id: schema.students.id, fullName: schema.students.fullName, preferredName: schema.students.preferredName, hue: schema.students.hue, classId: schema.enrollments.classId })
      .from(schema.enrollments)
      .innerJoin(schema.students, eq(schema.students.id, schema.enrollments.studentId))
      .where(inArray(schema.enrollments.classId, hrIds));
    const since = addDays(today, -14);
    const absences = await db
      .select({ studentId: schema.attendance.studentId, n: count() })
      .from(schema.attendance)
      .where(and(inArray(schema.attendance.classId, hrIds), gte(schema.attendance.date, since), eq(schema.attendance.status, "falta")))
      .groupBy(schema.attendance.studentId);
    const lastEntry = await db
      .select({ studentId: schema.journalEntryStudents.studentId, last: sql<string>`max(${schema.journalEntries.occurredOn})` })
      .from(schema.journalEntryStudents)
      .innerJoin(schema.journalEntries, eq(schema.journalEntries.id, schema.journalEntryStudents.entryId))
      .where(and(eq(schema.journalEntries.authorId, ctx.user.id), eq(schema.journalEntries.isDraft, false)))
      .groupBy(schema.journalEntryStudents.studentId);
    // Sondagens sem mudança de nível nas duas últimas rodadas do mesmo modelo
    const results = await db
      .select({ studentId: schema.assessmentResults.studentId, level: schema.assessmentResults.levelKey, templateId: schema.assessmentRounds.templateId, tplName: schema.assessmentTemplates.name, kind: schema.assessmentTemplates.kind, on: schema.assessmentRounds.appliedOn, scale: schema.assessmentTemplates.scale })
      .from(schema.assessmentResults)
      .innerJoin(schema.assessmentRounds, eq(schema.assessmentRounds.id, schema.assessmentResults.roundId))
      .innerJoin(schema.assessmentTemplates, eq(schema.assessmentTemplates.id, schema.assessmentRounds.templateId))
      .where(inArray(schema.assessmentRounds.classId, hrIds))
      .orderBy(asc(schema.assessmentRounds.appliedOn));

    for (const s of studs) {
      const reasons: string[] = [];
      const abs = absences.find((a) => a.studentId === s.id)?.n ?? 0;
      if (abs >= 3) reasons.push(`${abs} faltas em 2 semanas`);
      const le = lastEntry.find((x) => x.studentId === s.id)?.last;
      if (!le || (term && le < term.startsOn)) {
        noRecords.count++;
        noRecords.classId = s.classId;
      }
      const byTpl = new Map<string, typeof results>();
      for (const r of results.filter((r) => r.studentId === s.id)) byTpl.set(r.templateId, [...(byTpl.get(r.templateId) ?? []), r]);
      for (const [, list] of byTpl) {
        if (list.length >= 3) {
          const [a, b, c] = list.slice(-3);
          const idx = (k: string | null) => a.scale.findIndex((l) => l.key === k);
          if (idx(a.level) === idx(b.level) && idx(b.level) === idx(c.level) && idx(c.level) < a.scale.length - 1)
            reasons.push(`${a.kind === "escrita" ? "Escrita" : a.kind === "leitura" ? "Leitura" : a.kind === "matematica" ? "Matemática" : a.tplName} sem avanço em 3 sondagens`);
        }
      }
      if (reasons.length)
        attention.push({ studentId: s.id, name: displayName(s), hue: s.hue, className: homerooms.find((c) => c.id === s.classId)?.name ?? "", reasons });
    }
    const weight = (a: AttentionItem) => a.reasons.length * 10 + (a.reasons.some((r) => r.includes("faltas")) ? 5 : 0);
    attention.sort((a, b) => weight(b) - weight(a));
  }

  // Próximos dias
  const horizon = addDays(today, 14);
  const events = await db
    .select()
    .from(schema.announcements)
    .where(
      and(
        eq(schema.announcements.schoolId, ctx.school.id),
        classIds.length ? or(isNull(schema.announcements.classId), inArray(schema.announcements.classId, classIds)) : isNull(schema.announcements.classId),
        gte(schema.announcements.startsAt, new Date(`${today}T00:00:00-03:00`)),
        lte(schema.announcements.startsAt, new Date(`${horizon}T23:59:00-03:00`)),
      ),
    )
    .orderBy(asc(schema.announcements.startsAt));
  const assessments = classIds.length
    ? await db
        .select({ id: schema.gradeItems.id, title: schema.gradeItems.title, date: schema.gradeItems.date, classId: schema.gradeItems.classId, subject: schema.subjects.name })
        .from(schema.gradeItems)
        .leftJoin(schema.subjects, eq(schema.subjects.id, schema.gradeItems.subjectId))
        .where(and(inArray(schema.gradeItems.classId, classIds), gte(schema.gradeItems.date, today), lte(schema.gradeItems.date, horizon)))
        .orderBy(asc(schema.gradeItems.date))
    : [];
  const tasks = classIds.length
    ? await db
        .select({ id: schema.tasks.id, title: schema.tasks.title, dueOn: schema.tasks.dueOn, classId: schema.tasks.classId, kind: schema.tasks.kind })
        .from(schema.tasks)
        .where(and(inArray(schema.tasks.classId, classIds), eq(schema.tasks.authorId, ctx.user.id), gte(schema.tasks.dueOn, today), lte(schema.tasks.dueOn, horizon)))
        .orderBy(asc(schema.tasks.dueOn))
    : [];
  const className = (id: string | null) => classes.find((c) => c.id === id)?.name;
  const upcoming = [
    ...events.map((e) => ({ id: e.id, date: isoFromTimestamp(e.startsAt!), title: e.title, detail: e.classId ? className(e.classId) : "Toda a escola", type: e.kind === "reuniao" ? "Reunião" : e.kind === "autorizacao" ? "Passeio" : "Evento", href: "/hoje" })),
    ...assessments.map((a) => ({ id: a.id, date: a.date, title: `${a.title}${a.subject ? ` · ${a.subject}` : ""}`, detail: className(a.classId), type: "Avaliação", href: `/avaliacoes/${a.id}` })),
    ...tasks.map((t) => ({ id: t.id, date: t.dueOn!, title: t.title, detail: className(t.classId), type: "Entrega", href: "/tarefas" })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  // Registros recentes
  const recent = await db
    .select({ id: schema.journalEntries.id, title: schema.journalEntries.title, body: schema.journalEntries.body, kind: schema.journalEntries.kind, occurredOn: schema.journalEntries.occurredOn, visibility: schema.journalEntries.visibility, scope: schema.journalEntries.scope })
    .from(schema.journalEntries)
    .where(and(eq(schema.journalEntries.authorId, ctx.user.id), eq(schema.journalEntries.isDraft, false)))
    .orderBy(desc(schema.journalEntries.occurredOn), desc(schema.journalEntries.createdAt))
    .limit(4);

  return { classes, term, items, unreadCount: unread.reduce((a, u) => a + u.n, 0), attention: attention.slice(0, 4), noRecords, upcoming: upcoming.slice(0, 6), recent };
}
