"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteEntryAction, restoreEntryAction } from "@/server/actions/journal";
import { navigateAfterAction } from "@/lib/navigate";

/** Apaga na hora, com "Desfazer" — o padrão de Mail e Notas. */
export function DeleteEntryButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <IconButton
      icon={Trash2}
      label="Apagar registro"
      variant="plain"
      disabled={pending}
      className="text-critical-ink hover:bg-[color-mix(in_oklab,var(--critical)_10%,transparent)]"
      onClick={() =>
        start(async () => {
          const res = await deleteEntryAction(id);
          if (!res.ok) return toast({ title: "Não foi possível apagar", tone: "error" });
          void navigateAfterAction(router, "/diario");
          toast({
            title: "Registro apagado",
            tone: "info",
            action: {
              label: "Desfazer",
              onClick: async () => {
                const r = await restoreEntryAction(id);
                if (r.ok) {
                  toast({ title: "Registro restaurado" });
                  void navigateAfterAction(router, `/diario/${id}`);
                } else toast({ title: "Não foi mais possível desfazer", tone: "error" });
              },
            },
          });
        })
      }
    />
  );
}
