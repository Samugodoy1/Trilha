"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, TextArea, TextField } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { createCoordinationNoteAction } from "@/server/actions/coordination";
import { todayISO } from "@/lib/format";

export function NewNoteButton({ teachers, classes }: { teachers: { id: string; name: string }[]; classes: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <>
      <Button size="sm" variant="tinted" icon={Plus} onClick={() => setOpen(true)}>
        Nova
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Nova orientação">
        <form
          className="space-y-4"
          action={(f) =>
            start(async () => {
              const res = await createCoordinationNoteAction({
                kind: String(f.get("kind")) as "orientacao",
                title: String(f.get("title")),
                body: String(f.get("body")),
                classId: String(f.get("classId") ?? ""),
                teacherId: String(f.get("teacherId") ?? ""),
                date: String(f.get("date")),
              });
              if (!res.ok) return toast({ title: res.error ?? "Erro", tone: "error" });
              toast({ title: "Orientação registrada" });
              setOpen(false);
              router.refresh();
            })
          }
        >
          <Select name="kind" label="Tipo" defaultValue="orientacao">
            <option value="orientacao">Orientação a professor</option>
            <option value="acompanhamento">Acompanhamento de intervenção</option>
            <option value="pauta">Pauta de reunião</option>
            <option value="conselho">Conselho de classe</option>
          </Select>
          <TextField name="title" label="Título" required />
          <TextArea name="body" label="Texto" rows={5} required />
          <div className="grid grid-cols-2 gap-3">
            <Select name="teacherId" label="Professor (opcional)" defaultValue="">
              <option value="">—</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Select name="classId" label="Turma (opcional)" defaultValue="">
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <TextField name="date" type="date" label="Data" defaultValue={todayISO()} />
          <Button type="submit" size="lg" loading={pending}>
            Salvar
          </Button>
        </form>
      </Sheet>
    </>
  );
}
