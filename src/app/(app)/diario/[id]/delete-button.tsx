"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { IconButton, Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { deleteEntryAction } from "@/server/actions/journal";

export function DeleteEntryButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <IconButton icon={Trash2} label="Apagar registro" variant="plain" className="text-critical-ink hover:bg-[color-mix(in_oklab,var(--critical)_10%,transparent)]" onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title="Apagar registro?" size="sm">
        <p className="text-callout text-label-2">O registro sai do diário e da linha do tempo dos alunos. Esta ação não pode ser desfeita.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="gray" size="lg" className="flex-1" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="flex-1"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteEntryAction(id);
                if (res.ok) {
                  toast({ title: "Registro apagado" });
                  router.push("/diario");
                } else toast({ title: "Não foi possível apagar", tone: "error" });
              })
            }
          >
            Apagar
          </Button>
        </div>
      </Sheet>
    </>
  );
}
