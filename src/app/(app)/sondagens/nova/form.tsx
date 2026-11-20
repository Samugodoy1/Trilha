"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { navigateAfterAction } from "@/lib/navigate";
import { Button } from "@/components/ui/button";
import { Select, TextField } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { categoryColor } from "@/components/ui/misc";
import { seriesMeta } from "@/components/student/highlights";
import { createRoundAction } from "@/server/actions/assessments";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { TemplateKind } from "@/lib/vocabulary";

export function NewRoundForm({
  classes,
  templates,
  terms,
  defaults,
}: {
  classes: { id: string; name: string }[];
  templates: { id: string; name: string; kind: TemplateKind; levels: number; description: string | null }[];
  terms: { id: string; name: string }[];
  defaults: { classId?: string; templateId?: string; termId?: string };
}) {
  const [classId, setClassId] = useState(defaults.classId && classes.some((c) => c.id === defaults.classId) ? defaults.classId : classes[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(defaults.templateId ?? templates[0]?.id ?? "");
  const [termId, setTermId] = useState(defaults.termId ?? terms[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const tpl = templates.find((t) => t.id === templateId);
  const term = terms.find((t) => t.id === termId);
  const area = tpl ? (seriesMeta[tpl.kind].area === "Sondagem" || tpl.kind === "diagnostica" ? tpl.name : seriesMeta[tpl.kind].area) : "";
  const title = tpl && term ? `${area} — ${term.name}` : "";

  return (
    <div className="space-y-6">
      <Select label="Turma" value={classId} onChange={(e) => setClassId(e.target.value)}>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <fieldset className="space-y-2">
        <legend className="mb-1.5 px-1 text-subhead font-medium text-label-2">Modelo</legend>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
          {templates.map((t) => {
            const meta = seriesMeta[t.kind];
            const on = t.id === templateId;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setTemplateId(t.id)}
                className={cn("press relative rounded-xl bg-surface p-4 text-left shadow-e1 outline-none", on && "ring-2 ring-accent")}
              >
                <meta.icon aria-hidden className="mb-2 size-5" style={{ color: categoryColor[meta.category] }} strokeWidth={2.2} />
                <p className="text-callout font-semibold">{t.name}</p>
                <p className="text-footnote text-label-2">{t.description ?? `${t.levels} níveis`}</p>
                {on && (
                  <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-accent">
                    <Check className="size-3 text-on-accent" strokeWidth={3.2} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Bimestre" value={termId} onChange={(e) => setTermId(e.target.value)}>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <TextField label="Aplicada em" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
      </div>

      <Button
        size="lg"
        loading={pending}
        disabled={!classId || !templateId || !termId}
        onClick={() =>
          void (async () => {
            // Fora de useTransition: a navegação iniciada dentro da transição da ação
            // às vezes nunca era exibida pelo roteador.
            setPending(true);
            const res = await createRoundAction({ classId, templateId, termId, title, appliedOn: date });
            if (!res.ok) {
              setPending(false);
              return toast({ title: res.error, tone: "error" });
            }
            await navigateAfterAction(router, `/sondagens/${res.id}`);
          })()
        }
      >
        Começar lançamento
      </Button>
      <p className="text-center text-footnote text-label-2">Você lança a turma toda em uma única tela. Cada resultado alimenta o histórico do aluno.</p>
    </div>
  );
}
