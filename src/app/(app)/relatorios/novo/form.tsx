"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { generateReportAction } from "@/server/actions/reports";
import { reportKinds, type ReportKind } from "@/lib/vocabulary";
import { cn } from "@/lib/cn";

export function NewReportForm({
  students,
  terms,
  defaults,
  engine,
}: {
  students: { id: string; name: string; className: string }[];
  terms: { id: string; name: string }[];
  defaults: { studentId?: string; termId?: string };
  engine: "claude" | "local";
}) {
  const [studentId, setStudentId] = useState(defaults.studentId && students.some((s) => s.id === defaults.studentId) ? defaults.studentId : students[0]?.id ?? "");
  const [termId, setTermId] = useState(defaults.termId ?? terms[0]?.id ?? "");
  const [kind, setKind] = useState<ReportKind>("parecer");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const classes = [...new Set(students.map((s) => s.className))];

  return (
    <div className="space-y-6">
      <Select label="Aluno" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
        {classes.map((c) => (
          <optgroup key={c} label={c}>
            {students
              .filter((s) => s.className === c)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </optgroup>
        ))}
      </Select>
      <fieldset>
        <legend className="mb-2 px-1 text-subhead font-medium text-label-2">Tipo</legend>
        <div className="-mx-5 md:mx-0" role="radiogroup">
          {(Object.keys(reportKinds) as ReportKind[]).map((k, i, arr) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={k === kind}
              onClick={() => setKind(k)}
              className="flex w-full items-center gap-3 pl-4 text-left hover:bg-fill/50 md:pl-0"
            >
              <span className={cn("flex flex-1 items-center gap-3 py-3 pr-4", i < arr.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
                <span className="flex-1">
                  <span className="block text-body">{reportKinds[k].label}</span>
                  <span className="block text-subhead text-label-2">{reportKinds[k].description}</span>
                </span>
                {k === kind && <Check aria-hidden className="size-5 text-accent" strokeWidth={2.6} />}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <Select label="Período" value={termId} onChange={(e) => setTermId(e.target.value)}>
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>

      <div className="flex gap-3 rounded-[14px] bg-surface-2 p-4 text-footnote text-label-2">
        <Sparkles aria-hidden className="size-5 shrink-0 text-accent" />
        <p>
          O rascunho usa apenas registros existentes: sondagens, observações, avaliações e frequência. Cada parágrafo indica os registros que o fundamentam, e
          nada é compartilhado sem a sua aprovação.{" "}
          {engine === "claude"
            ? "A redação é feita com Claude, com os nomes substituídos por marcadores antes do envio."
            : "A redação é feita localmente, sem enviar dados para fora da escola."}{" "}
          Diagnósticos clínicos ou rótulos nunca são gerados.
        </p>
      </div>

      <Button
        size="lg"
        loading={pending}
        disabled={!studentId || !termId}
        icon={Sparkles}
        onClick={() =>
          start(async () => {
            const res = await generateReportAction({ studentId, kind, termId });
            if (!res.ok) return toast({ title: res.error, tone: "error" });
            router.push(`/relatorios/${res.id}`);
          })
        }
      >
        {pending ? "Reunindo registros…" : "Gerar rascunho"}
      </Button>
    </div>
  );
}
