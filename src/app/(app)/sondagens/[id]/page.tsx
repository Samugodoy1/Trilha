import type { Metadata } from "next";
import { requireRole } from "@/server/session";
import { isTeacher, pageGuard } from "@/server/access";
import { getRoundForEntry } from "@/server/queries/assessments";
import { Page } from "@/components/ui/page";
import { CategoryLabel, categoryColor } from "@/components/ui/misc";
import { RoundEntry } from "@/components/assessments/round-entry";
import { seriesMeta } from "@/components/student/highlights";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "Sondagem" };

export default async function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRole("teacher", "coordinator", "admin");
  const d = await pageGuard(() => getRoundForEntry(ctx, id));
  const meta = seriesMeta[d.template.kind];
  return (
    <Page
      title={d.round.title}
      back={{ href: `/turmas/${d.cls.id}?aba=sondagens`, label: d.cls.name }}
      eyebrow={
        <CategoryLabel icon={meta.icon} category={meta.category}>
          {d.template.name}
        </CategoryLabel>
      }
      subtitle={`${d.cls.name} · ${d.term.name} · aplicada em ${formatDay(d.round.appliedOn)}`}
      width="wide"
    >
      <RoundEntry
        roundId={d.round.id}
        scale={d.template.scale}
        criteria={d.template.criteria}
        students={d.students}
        initial={d.results}
        previous={d.previous}
        shared={d.round.sharedWithFamily}
        color={categoryColor[meta.category]}
        readOnly={!isTeacher(ctx) || Boolean(d.cls.archivedAt)}
      />
    </Page>
  );
}
