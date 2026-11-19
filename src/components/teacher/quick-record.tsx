"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { getComposeContextAction, type ComposeContext } from "@/server/actions/journal";
import { EntryComposer, type EntryDraft } from "./entry-composer";

/** Registro rápido: disponível de qualquer tela (botão + ou tecla N). */
export function QuickRecord({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<EntryDraft>;
}) {
  const [ctx, setCtx] = useState<ComposeContext | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (open && !ctx) void getComposeContextAction().then(setCtx);
    if (open) setKey((k) => k + 1);
  }, [open, ctx]);

  return (
    <Sheet open={open} onClose={onClose} title="Novo registro" size="md">
      {ctx ? (
        <EntryComposer key={key} context={ctx} initial={initial} onDone={onClose} />
      ) : (
        <div className="flex justify-center py-16 text-label-2">
          <Spinner />
        </div>
      )}
    </Sheet>
  );
}
