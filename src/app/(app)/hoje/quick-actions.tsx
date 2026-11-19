"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { QuickRecord } from "@/components/teacher/quick-record";

/** "Novo registro" no rodapé da lista, como "Novo lembrete". */
export function HojeCompose() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 flex items-center gap-2 py-2 text-body font-medium text-accent outline-none">
        <span className="flex size-[22px] items-center justify-center rounded-full bg-accent text-white">
          <Plus aria-hidden className="size-4" strokeWidth={3} />
        </span>
        Novo registro
      </button>
      <QuickRecord open={open} onClose={() => setOpen(false)} />
    </>
  );
}
