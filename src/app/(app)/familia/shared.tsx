import { HeartHandshake } from "lucide-react";
import { requireRole } from "@/server/session";
import { getActiveChild } from "@/server/queries/family";
import { Page } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/misc";

export async function loadFamily() {
  const ctx = await requireRole("guardian", "student");
  const { list, active } = await getActiveChild(ctx);
  return { ctx, list, child: active };
}

export function NoChild({ title }: { title: string }) {
  return (
    <Page title={title}>
      <EmptyState
        icon={HeartHandshake}
        title="Nenhum aluno vinculado"
        message="Para acompanhar a vida escolar, use o código de convite entregue pela escola. Ele confirma o vínculo com segurança."
      />
    </Page>
  );
}
