import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { FileText, Plus } from "lucide-react";
import { getDb, schema } from "@/db";
import { requireRole } from "@/server/session";
import { Page } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { ListRow, ListSection } from "@/components/ui/list";
import { EmptyState, Tag } from "@/components/ui/misc";
import { displayName } from "@/server/queries/common";
import { formatDay, isoFromTimestamp } from "@/lib/format";
import { reportKinds } from "@/lib/vocabulary";

export const metadata: Metadata = { title: "Relatórios" };

export default async function ReportsPage() {
  const ctx = await requireRole("teacher");
  const db = await getDb();
  const rows = await db
    .select({ r: schema.reports, s: schema.students })
    .from(schema.reports)
    .leftJoin(schema.students, eq(schema.students.id, schema.reports.studentId))
    .where(eq(schema.reports.authorId, ctx.user.id))
    .orderBy(desc(schema.reports.updatedAt));
  return (
    <Page
      title="Relatórios"
      subtitle="Pareceres e relatórios montados a partir do que você já registrou — sempre revisados por você."
      actions={<Button size="sm" variant="tinted" icon={Plus} href="/relatorios/novo">Novo</Button>}
    >
      {rows.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum relatório" message="Escolha um aluno e o período: o Trilha reúne sondagens, observações e frequência em um rascunho." action={<Button href="/relatorios/novo">Criar relatório</Button>} />
      ) : (
        <ListSection>
          {rows.map(({ r, s }) => (
            <ListRow
              key={r.id}
              href={`/relatorios/${r.id}`}
              icon={FileText}
              iconTint={r.status === "approved" ? "var(--positive)" : "var(--label-3)"}
              title={s ? `${displayName(s)}` : r.title}
              subtitle={`${reportKinds[r.kind].label} · atualizado em ${formatDay(isoFromTimestamp(r.updatedAt))}`}
              trailing={r.status === "approved" ? <Tag tone="positive">{r.visibility === "family" ? "Compartilhado" : "Aprovado"}</Tag> : <Tag>Rascunho</Tag>}
            />
          ))}
        </ListSection>
      )}
    </Page>
  );
}
