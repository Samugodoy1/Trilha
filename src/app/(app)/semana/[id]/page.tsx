import type { Metadata } from "next";
import { requireRole } from "@/server/session";
import { pageGuard } from "@/server/access";
import { getComposeClasses, getWeeklyPost } from "@/server/queries/weekly";
import { Page } from "@/components/ui/page";
import { WeeklyComposer } from "@/components/teacher/weekly-composer";

export const metadata: Metadata = { title: "Nossa semana" };

export default async function WeeklyPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRole("teacher");
  const { post, photos } = await pageGuard(() => getWeeklyPost(ctx, id));
  const classes = await getComposeClasses(ctx);
  return (
    <Page title={post.status === "published" ? "Editar publicação" : "Rascunho"} back={{ href: "/semana", label: "Publicações" }} width="narrow">
      <WeeklyComposer
        classes={classes}
        author={{ name: ctx.user.name, hue: ctx.user.hue }}
        initial={{ id: post.id, classId: post.classId, studentId: post.studentId, weekStart: post.weekStart, title: post.title, sections: post.sections, photos }}
      />
    </Page>
  );
}
