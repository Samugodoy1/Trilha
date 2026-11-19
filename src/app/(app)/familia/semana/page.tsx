import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { getFamilyPosts } from "@/server/queries/family";
import { Page } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/misc";
import { PostCard } from "@/components/family/post-card";
import { loadFamily, NoChild } from "../shared";
import { addDays, formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "Nossa semana" };

export default async function FamilyWeekPage() {
  const { child } = await loadFamily();
  if (!child) return <NoChild title="Nossa semana" />;
  const posts = await getFamilyPosts(child);
  return (
    <Page title="Nossa semana" subtitle={`O que acontece na turma de ${child.firstName}.`} width="narrow">
      {posts.length === 0 ? (
        <EmptyState icon={BookOpen} title="Ainda sem publicações" message="Quando a professora publicar o resumo da semana, ele aparece aqui." />
      ) : (
        <div className="space-y-6">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={{
                id: p.id,
                title: p.title,
                authorName: p.authorName,
                authorHue: p.authorHue,
                className: p.className,
                dateLabel: `${formatDay(p.weekStart)} a ${formatDay(addDays(p.weekStart, 4))}`,
                sections: p.sections,
                photos: p.photos,
                personal: Boolean(p.studentId),
              }}
            />
          ))}
        </div>
      )}
    </Page>
  );
}
