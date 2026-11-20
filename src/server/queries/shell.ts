import "server-only";
import { and, asc, count, eq, inArray, isNull, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SessionContext } from "../session";
import { familyStudentIds, isFamily, isStaff } from "../access";
import { getClasses, displayName } from "./common";
import { roleLabel } from "@/lib/vocabulary";
import type { NavItem } from "@/components/shell/icons";
import type { ShellProps } from "@/components/shell/app-shell";

export async function unreadMessages(ctx: SessionContext): Promise<number> {
  const db = await getDb();
  const col = isFamily(ctx) ? schema.conversations.guardianId : schema.conversations.teacherId;
  const [r] = await db
    .select({ n: count() })
    .from(schema.messages)
    .innerJoin(schema.conversations, eq(schema.conversations.id, schema.messages.conversationId))
    .where(and(eq(col, ctx.user.id), ne(schema.messages.senderId, ctx.user.id), isNull(schema.messages.readAt)));
  return r?.n ?? 0;
}

/** Estudantes vinculados à família, com turma e escola (podem ser escolas diferentes). */
export async function familyStudents(ctx: SessionContext) {
  const ids = await familyStudentIds(ctx);
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.students.id,
      fullName: schema.students.fullName,
      preferredName: schema.students.preferredName,
      hue: schema.students.hue,
      schoolId: schema.students.schoolId,
      schoolShort: schema.schools.shortName,
      className: schema.classes.name,
      classId: schema.classes.id,
      archivedAt: schema.classes.archivedAt,
      birthDate: schema.students.birthDate,
    })
    .from(schema.students)
    .innerJoin(schema.schools, eq(schema.schools.id, schema.students.schoolId))
    .innerJoin(schema.enrollments, eq(schema.enrollments.studentId, schema.students.id))
    .innerJoin(schema.classes, eq(schema.classes.id, schema.enrollments.classId))
    .where(and(inArray(schema.students.id, ids), isNull(schema.classes.archivedAt), isNull(schema.enrollments.endedOn)))
    .orderBy(asc(schema.students.fullName));
  return rows.map((r) => ({ ...r, name: displayName(r), firstName: r.preferredName ?? r.fullName.split(" ")[0] }));
}

export async function buildShell(ctx: SessionContext): Promise<Omit<ShellProps, "children">> {
  const db = await getDb();
  const mems = await db
    .select({ id: schema.memberships.id, role: schema.memberships.role, school: schema.schools.shortName })
    .from(schema.memberships)
    .innerJoin(schema.schools, eq(schema.schools.id, schema.memberships.schoolId))
    .where(and(eq(schema.memberships.userId, ctx.user.id), isNull(schema.memberships.revokedAt)));
  const memberships = mems.map((m) => ({ id: m.id, label: `${roleLabel[m.role]} · ${m.school}`, active: m.id === ctx.membership.id }));
  const user = { name: ctx.user.name, hue: ctx.user.hue, roleLabel: ctx.membership.title ?? roleLabel[ctx.membership.role] };
  const school = { shortName: ctx.school.shortName };
  const unread = await unreadMessages(ctx);

  if (isFamily(ctx)) {
    const students = await familyStudents(ctx);
    const nav: NavItem[] = [
      { href: "/familia", label: "Início", icon: "home" },
      { href: "/familia/agenda", label: "Agenda", icon: "agenda" },
      { href: "/familia/semana", label: "Semana", icon: "week" },
      { href: "/familia/desenvolvimento", label: "Evolução", icon: "growth" },
      { href: "/familia/mensagens", label: "Mensagens", icon: "messages", badge: unread },
      { href: "/familia/portfolio", label: "Portfólio", icon: "portfolio" },
      { href: "/familia/participar", label: "Em casa", icon: "family" },
    ];
    return {
      variant: "family",
      nav,
      tabs: ["/familia", "/familia/agenda", "/familia/semana", "/familia/desenvolvimento", "/familia/mensagens"],
      user,
      school,
      memberships,
      family: {
        students: students.map((s) => ({ id: s.id, name: s.name, hue: s.hue, detail: `${s.className} · ${s.schoolShort}` })),
        activeId: ctx.activeStudentId && students.some((s) => s.id === ctx.activeStudentId) ? ctx.activeStudentId : students[0]?.id ?? null,
      },
    };
  }

  if (isStaff(ctx)) {
    const nav: NavItem[] = [
      { href: "/coordenacao", label: "Visão geral", icon: "overview" },
      { href: "/turmas", label: "Turmas", icon: "classes" },
      { href: "/sondagens", label: "Sondagens", icon: "assessments" },
      { href: "/coordenacao/orientacoes", label: "Orientações", icon: "journal" },
      { href: "/coordenacao/conselho", label: "Conselho de classe", icon: "reports" },
      { href: "/equipe", label: "Equipe", icon: "team" },
    ];
    return { variant: "staff", nav, tabs: nav.slice(0, 5).map((n) => n.href), user, school, memberships };
  }

  const classes = await getClasses(ctx);
  const nav: NavItem[] = [
    { href: "/hoje", label: "Hoje", icon: "today" },
    { href: "/turmas", label: "Turmas", icon: "classes", match: ["/alunos", "/avaliacoes"] },
    { href: "/diario", label: "Diário", icon: "journal" },
    { href: "/mensagens", label: "Mensagens", icon: "messages", badge: unread },
    { href: "/semana", label: "Semana", icon: "week" },
    { href: "/sondagens", label: "Sondagens", icon: "assessments" },
    { href: "/tarefas", label: "Tarefas", icon: "tasks" },
    { href: "/relatorios", label: "Relatórios", icon: "reports" },
    { href: "/equipe", label: "Equipe", icon: "team" },
  ];
  return {
    variant: "teacher",
    nav,
    tabs: ["/hoje", "/turmas", "/diario", "/mensagens", "/semana"],
    user,
    school,
    memberships,
    classLinks: classes.map((c) => ({ href: `/turmas/${c.id}`, label: c.name, detail: String(c.studentCount) })),
  };
}
