import "server-only";
import { and, asc, desc, eq, inArray, isNull, or, count, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "../session";
import { assertStudent, isFamily, isStaff } from "../access";
import { displayName, getTerms } from "./common";
import { ageFrom, isoFromTimestamp } from "@/lib/format";

export type LevelPoint = {
  roundId: string;
  title: string;
  appliedOn: string;
  termId: string;
  termName: string;
  levelKey: string | null;
  levelIndex: number;
  levelLabel: string;
  note: string | null;
  absent: boolean;
  criteria: schema.CriteriaAnswers;
  sharedWithFamily: boolean;
};

export type AssessmentSeries = {
  templateId: string;
  name: string;
  kind: (typeof schema.templateKindEnum.enumValues)[number];
  scale: schema.ScaleLevel[];
  criteria: schema.Criterion[];
  points: LevelPoint[];
};

export type TimelineEvent = {
  id: string;
  date: string;
  type: "journal" | "assessment" | "feedback" | "portfolio" | "report" | "contribution" | "enrollment";
  category: "notes" | "reading" | "writing" | "math" | "achievement" | "family" | "accent" | "diagnostic" | "skills" | "custom" | "critical" | "warning";
  label: string;
  title: string;
  body?: string;
  visibility?: "private" | "coordination" | "family";
  author?: string;
  href?: string;
  mediaId?: string;
  delta?: number;
};

const kindCategory = { leitura: "reading", escrita: "writing", matematica: "math", diagnostica: "diagnostic", habilidades: "skills", personalizada: "custom" } as const;

/** Séries de sondagem do aluno. Para famílias, somente rodadas compartilhadas. */
export async function getAssessmentSeries(studentId: string, opts: { familyOnly?: boolean } = {}): Promise<AssessmentSeries[]> {
  const db = await getDb();
  const rows = await db
    .select({ r: schema.assessmentResults, round: schema.assessmentRounds, tpl: schema.assessmentTemplates, term: schema.terms })
    .from(schema.assessmentResults)
    .innerJoin(schema.assessmentRounds, eq(schema.assessmentRounds.id, schema.assessmentResults.roundId))
    .innerJoin(schema.assessmentTemplates, eq(schema.assessmentTemplates.id, schema.assessmentRounds.templateId))
    .innerJoin(schema.terms, eq(schema.terms.id, schema.assessmentRounds.termId))
    .where(and(eq(schema.assessmentResults.studentId, studentId), opts.familyOnly ? eq(schema.assessmentRounds.sharedWithFamily, true) : undefined))
    .orderBy(asc(schema.assessmentRounds.appliedOn));
  const map = new Map<string, AssessmentSeries>();
  for (const { r, round, tpl, term } of rows) {
    if (!map.has(tpl.id)) map.set(tpl.id, { templateId: tpl.id, name: tpl.name, kind: tpl.kind, scale: tpl.scale, criteria: tpl.criteria, points: [] });
    const idx = tpl.scale.findIndex((l) => l.key === r.levelKey);
    map.get(tpl.id)!.points.push({
      roundId: round.id,
      title: round.title,
      appliedOn: round.appliedOn,
      termId: term.id,
      termName: `${term.name}${term.startsOn.slice(0, 4) !== new Date().getFullYear().toString() ? ` de ${term.startsOn.slice(0, 4)}` : ""}`,
      levelKey: r.levelKey,
      levelIndex: idx,
      levelLabel: idx >= 0 ? tpl.scale[idx].label : r.absent ? "Ausente" : "—",
      note: r.note,
      absent: r.absent,
      criteria: r.criteria,
      sharedWithFamily: round.sharedWithFamily,
    });
  }
  const order = ["leitura", "escrita", "matematica", "diagnostica", "habilidades", "personalizada"];
  return [...map.values()].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

/** Frase de tendência, no estilo dos resumos de saúde: humana e factual. */
export function trendSentence(s: AssessmentSeries): string {
  const pts = s.points.filter((p) => p.levelIndex >= 0);
  if (pts.length === 0) return "Sem resultados registrados";
  if (pts.length === 1) return `${pts[0].levelLabel} na primeira sondagem`;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const delta = last.levelIndex - first.levelIndex;
  const since = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(`${first.appliedOn}T12:00:00Z`));
  const year = first.appliedOn.slice(0, 4) !== last.appliedOn.slice(0, 4) ? ` de ${first.appliedOn.slice(0, 4)}` : "";
  if (delta > 0) return `Avançou ${delta} ${delta === 1 ? "nível" : "níveis"} desde ${since}${year}`;
  if (delta < 0) return `Oscilou desde ${since}${year}`;
  // Mesmo nível: quanto tempo?
  let k = pts.length - 1;
  while (k > 0 && pts[k - 1].levelIndex === last.levelIndex) k--;
  const sinceSame = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(`${pts[k].appliedOn}T12:00:00Z`));
  return last.levelIndex === s.scale.length - 1 ? `No nível mais avançado desde ${sinceSame}` : `Mesmo nível desde ${sinceSame}`;
}

export async function getGradesByTerm(studentId: string, schoolId: string, opts: { familyOnly?: boolean } = {}) {
  const db = await getDb();
  const rows = await db
    .select({ item: schema.gradeItems, grade: schema.grades, subject: schema.subjects.name, term: schema.terms })
    .from(schema.gradeItems)
    .innerJoin(schema.enrollments, and(eq(schema.enrollments.classId, schema.gradeItems.classId), eq(schema.enrollments.studentId, studentId)))
    .innerJoin(schema.terms, eq(schema.terms.id, schema.gradeItems.termId))
    .leftJoin(schema.subjects, eq(schema.subjects.id, schema.gradeItems.subjectId))
    .leftJoin(schema.grades, and(eq(schema.grades.gradeItemId, schema.gradeItems.id), eq(schema.grades.studentId, studentId)))
    .where(and(eq(schema.gradeItems.schoolId, schoolId), opts.familyOnly ? eq(schema.gradeItems.sharedWithFamily, true) : undefined))
    .orderBy(asc(schema.terms.startsOn), asc(schema.gradeItems.date));
  return rows.map(({ item, grade, subject, term }) => ({
    id: item.id,
    title: item.title,
    subject: subject ?? "Geral",
    kind: item.kind,
    maxScore: item.maxScore ? Number(item.maxScore) : null,
    weight: Number(item.weight),
    isRecovery: item.isRecovery,
    date: item.date,
    termId: term.id,
    termName: term.name,
    termOrdinal: term.ordinal,
    score: grade?.score ? Number(grade.score) : null,
    concept: grade?.concept ?? null,
    comment: grade?.comment ?? null,
    bncc: item.bnccCodes,
  }));
}

export async function getAttendanceByTerm(studentId: string, schoolId: string) {
  const db = await getDb();
  const terms = await getTerms(schoolId);
  const rows = await db
    .select({ status: schema.attendance.status, date: schema.attendance.date })
    .from(schema.attendance)
    .where(eq(schema.attendance.studentId, studentId));
  return terms
    .map((t) => {
      const inTerm = rows.filter((r) => r.date >= t.startsOn && r.date <= t.endsOn);
      const c = (s: string) => inTerm.filter((r) => r.status === s).length;
      const total = inTerm.length;
      const absences = c("falta");
      return {
        termId: t.id,
        termName: t.name,
        year: t.startsOn.slice(0, 4),
        total,
        present: c("presente") + c("atraso"),
        absences,
        justified: c("justificada"),
        late: c("atraso"),
        rate: total ? (total - absences - c("justificada")) / total : null,
      };
    })
    .filter((t) => t.total > 0);
}

export async function getStudentProfile(ctx: SessionContext, studentId: string) {
  const student = await assertStudent(ctx, studentId);
  const db = await getDb();
  const name = displayName(student);

  const enrollments = await db
    .select({ e: schema.enrollments, c: schema.classes, year: schema.academicYears.year })
    .from(schema.enrollments)
    .innerJoin(schema.classes, eq(schema.classes.id, schema.enrollments.classId))
    .innerJoin(schema.academicYears, eq(schema.academicYears.id, schema.classes.academicYearId))
    .where(eq(schema.enrollments.studentId, studentId))
    .orderBy(desc(schema.academicYears.year));
  const classIds = enrollments.map((x) => x.c.id);
  const teachers = classIds.length
    ? await db
        .select({ classId: schema.teachingAssignments.classId, name: schema.users.name, subject: schema.subjects.name, isHomeroom: schema.teachingAssignments.isHomeroom })
        .from(schema.teachingAssignments)
        .innerJoin(schema.users, eq(schema.users.id, schema.teachingAssignments.userId))
        .leftJoin(schema.subjects, eq(schema.subjects.id, schema.teachingAssignments.subjectId))
        .where(inArray(schema.teachingAssignments.classId, classIds))
    : [];
  const history = enrollments.map(({ e, c, year }) => ({
    classId: c.id,
    name: c.name,
    year,
    number: e.number,
    current: !c.archivedAt && !e.endedOn,
    teachers: teachers.filter((t) => t.classId === c.id).map((t) => (t.isHomeroom ? t.name : `${t.name} (${t.subject})`)),
  }));
  const current = history.find((h) => h.current) ?? history[0];

  const guardians = await db
    .select({ id: schema.users.id, name: schema.users.name, hue: schema.users.hue, relationship: schema.guardianLinks.relationship, verifiedAt: schema.guardianLinks.verifiedAt, linkId: schema.guardianLinks.id })
    .from(schema.guardianLinks)
    .innerJoin(schema.users, eq(schema.users.id, schema.guardianLinks.userId))
    .where(and(eq(schema.guardianLinks.studentId, studentId), isNull(schema.guardianLinks.revokedAt)));
  const pendingInvites = await db
    .select({ id: schema.invitations.id, hint: schema.invitations.codeHint, expiresAt: schema.invitations.expiresAt, relationship: schema.invitations.relationship })
    .from(schema.invitations)
    .where(and(eq(schema.invitations.studentId, studentId), isNull(schema.invitations.acceptedAt), isNull(schema.invitations.revokedAt)));

  const series = await getAssessmentSeries(studentId);
  const grades = await getGradesByTerm(studentId, student.schoolId);
  const attendance = await getAttendanceByTerm(studentId, student.schoolId);

  // Registros do diário: os próprios (qualquer visibilidade) + os de colegas compartilhados com a coordenação ou a família.
  const entries = await db
    .select({ e: schema.journalEntries, author: schema.users.name })
    .from(schema.journalEntryStudents)
    .innerJoin(schema.journalEntries, eq(schema.journalEntries.id, schema.journalEntryStudents.entryId))
    .innerJoin(schema.users, eq(schema.users.id, schema.journalEntries.authorId))
    .where(
      and(
        eq(schema.journalEntryStudents.studentId, studentId),
        eq(schema.journalEntries.isDraft, false),
        isStaff(ctx)
          ? inArray(schema.journalEntries.visibility, ["coordination", "family"])
          : or(eq(schema.journalEntries.authorId, ctx.user.id), inArray(schema.journalEntries.visibility, ["coordination", "family"])),
      ),
    )
    .orderBy(desc(schema.journalEntries.occurredOn));

  const feedbacks = await db
    .select({ f: schema.feedbacks, author: schema.users.name })
    .from(schema.feedbacks)
    .innerJoin(schema.users, eq(schema.users.id, schema.feedbacks.authorId))
    .where(and(eq(schema.feedbacks.studentId, studentId), or(eq(schema.feedbacks.status, "published"), eq(schema.feedbacks.authorId, ctx.user.id))))
    .orderBy(desc(schema.feedbacks.createdAt));

  const portfolio = await db
    .select({ p: schema.portfolioItems, mediaId: schema.media.id })
    .from(schema.portfolioItems)
    .leftJoin(schema.media, and(eq(schema.media.ownerType, "portfolio"), eq(schema.media.ownerId, schema.portfolioItems.id)))
    .where(eq(schema.portfolioItems.studentId, studentId))
    .orderBy(desc(schema.portfolioItems.date));

  const reports = await db
    .select()
    .from(schema.reports)
    .where(and(eq(schema.reports.studentId, studentId), or(eq(schema.reports.authorId, ctx.user.id), eq(schema.reports.status, "approved"))))
    .orderBy(desc(schema.reports.updatedAt));

  const contributions = await db
    .select({ c: schema.familyContributions, author: schema.users.name })
    .from(schema.familyContributions)
    .innerJoin(schema.users, eq(schema.users.id, schema.familyContributions.authorId))
    .where(eq(schema.familyContributions.studentId, studentId))
    .orderBy(desc(schema.familyContributions.createdAt));

  const conversations = await db
    .select({ id: schema.conversations.id, subject: schema.conversations.subject, category: schema.conversations.category, last: schema.conversations.lastMessageAt, guardian: schema.users.name })
    .from(schema.conversations)
    .innerJoin(schema.users, eq(schema.users.id, schema.conversations.guardianId))
    .where(and(eq(schema.conversations.studentId, studentId), isStaff(ctx) ? undefined : eq(schema.conversations.teacherId, ctx.user.id)))
    .orderBy(desc(schema.conversations.lastMessageAt))
    .limit(5);

  // Linha do tempo unificada
  const timeline: TimelineEvent[] = [];
  for (const { e, author } of entries) {
    timeline.push({
      id: e.id,
      date: e.occurredOn,
      type: "journal",
      category: e.kind === "conquista" ? "achievement" : e.kind === "dificuldade" ? "warning" : "notes",
      label: entryLabel(e.kind),
      title: e.title ?? entryLabel(e.kind),
      body: e.body,
      visibility: e.visibility,
      author,
      href: e.authorId === ctx.user.id ? `/diario/${e.id}` : undefined,
    });
  }
  for (const s of series) {
    s.points.forEach((p, i) => {
      const prev = s.points[i - 1];
      const delta = prev && p.levelIndex >= 0 && prev.levelIndex >= 0 ? p.levelIndex - prev.levelIndex : undefined;
      timeline.push({
        id: `${p.roundId}`,
        date: p.appliedOn,
        type: "assessment",
        category: kindCategory[s.kind],
        label: `Sondagem · ${s.name}`,
        title: delta && delta > 0 ? `Avançou para ${p.levelLabel}` : p.levelLabel,
        body: p.note ?? undefined,
        href: isFamily(ctx) ? undefined : `/sondagens/${p.roundId}`,
        delta,
      });
    });
  }
  for (const { f, author } of feedbacks)
    timeline.push({
      id: f.id,
      date: isoFromTimestamp(f.publishedAt ?? f.createdAt),
      type: "feedback",
      category: "family",
      label: f.status === "published" ? "Feedback enviado à família" : "Rascunho de feedback",
      title: f.title,
      body: f.body,
      author,
      visibility: f.status === "published" ? "family" : "private",
    });
  for (const { p, mediaId } of portfolio)
    timeline.push({ id: p.id, date: p.date, type: "portfolio", category: "accent", label: "Portfólio", title: p.title, body: p.description ?? undefined, mediaId: mediaId ?? undefined, visibility: p.visibility });
  for (const r of reports.filter((r) => r.status === "approved"))
    timeline.push({ id: r.id, date: isoFromTimestamp(r.approvedAt ?? r.updatedAt), type: "report", category: "notes", label: "Relatório aprovado", title: r.title, href: `/relatorios/${r.id}`, visibility: r.visibility });
  for (const { c, author } of contributions)
    timeline.push({ id: c.id, date: isoFromTimestamp(c.createdAt), type: "contribution", category: "family", label: `Em casa · ${author.split(" ")[0]}`, title: contributionTitle(c.kind), body: c.body, visibility: "family" });
  timeline.sort((a, b) => b.date.localeCompare(a.date));

  const [{ n: unreadContrib }] = await db
    .select({ n: count() })
    .from(schema.familyContributions)
    .where(and(eq(schema.familyContributions.studentId, studentId), isNull(schema.familyContributions.seenAt)));

  return {
    student: { ...student, name, age: student.birthDate ? ageFrom(student.birthDate) : null },
    current,
    history,
    guardians,
    pendingInvites,
    series,
    grades,
    attendance,
    entries,
    feedbacks,
    portfolio,
    reports,
    contributions,
    conversations,
    timeline,
    unreadContrib,
  };
}

function entryLabel(kind: string) {
  const map: Record<string, string> = {
    observacao: "Observação",
    conquista: "Conquista",
    dificuldade: "Dificuldade observada",
    estrategia: "Estratégia",
    intervencao: "Intervenção",
    participacao: "Participação",
    conteudo: "Conteúdo",
    atividade: "Atividade",
    acontecimento: "Acontecimento",
  };
  return map[kind] ?? "Registro";
}

function contributionTitle(kind: string) {
  return ({ leitura: "Lemos juntos", atividade: "Fizemos uma atividade", observacao: "Percebemos em casa", conquista: "Uma conquista" } as Record<string, string>)[kind] ?? "Em casa";
}

