import type { Metadata } from "next";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireRole } from "@/server/session";
import { accessibleClassIds } from "@/server/access";
import { getComposeClasses } from "@/server/queries/weekly";
import { Page } from "@/components/ui/page";
import { TasksView } from "./tasks-view";
import { todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Tarefas" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ nova?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireRole("teacher");
  const ids = await accessibleClassIds(ctx);
  const db = await getDb();
  const tasks = ids.length
    ? await db
        .select({ t: schema.tasks, className: schema.classes.name })
        .from(schema.tasks)
        .innerJoin(schema.classes, eq(schema.classes.id, schema.tasks.classId))
        .where(and(inArray(schema.tasks.classId, ids), eq(schema.tasks.authorId, ctx.user.id)))
        .orderBy(asc(schema.tasks.dueOn))
    : [];
  const done = tasks.length
    ? await db
        .select({ taskId: schema.taskCompletions.taskId, n: count() })
        .from(schema.taskCompletions)
        .where(inArray(schema.taskCompletions.taskId, tasks.map((x) => x.t.id)))
        .groupBy(schema.taskCompletions.taskId)
    : [];
  const sizes = ids.length
    ? await db.select({ classId: schema.enrollments.classId, n: count() }).from(schema.enrollments).where(inArray(schema.enrollments.classId, ids)).groupBy(schema.enrollments.classId)
    : [];
  const classes = await getComposeClasses(ctx);
  const today = todayISO();
  const rows = tasks.map(({ t, className }) => ({
    id: t.id,
    title: t.title,
    kind: t.kind,
    instructions: t.instructions,
    dueOn: t.dueOn,
    className,
    links: t.links,
    acceptsSubmissions: t.acceptsSubmissions,
    done: done.find((d) => d.taskId === t.id)?.n ?? 0,
    total: sizes.find((s) => s.classId === t.classId)?.n ?? 0,
  }));
  return (
    <Page title="Tarefas" titleTint subtitle="Publicadas aqui, aparecem na agenda de cada família." width="default">
      <TasksView
        upcoming={rows.filter((r) => !r.dueOn || r.dueOn >= today)}
        past={rows.filter((r) => r.dueOn && r.dueOn < today).reverse()}
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        openNew={sp.nova === "1"}
      />
    </Page>
  );
}
