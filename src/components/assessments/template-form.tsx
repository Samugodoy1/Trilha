"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, TextField } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { createTemplateAction } from "@/server/actions/assessments";
import { templateKinds, type TemplateKind } from "@/lib/vocabulary";

/** Criador de modelos de sondagem com níveis e critérios personalizados. */
export function NewTemplateButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<TemplateKind>("personalizada");
  const [levels, setLevels] = useState([
    { label: "Ainda não", description: "", familyDescription: "" },
    { label: "Em desenvolvimento", description: "", familyDescription: "" },
    { label: "Desenvolvido", description: "", familyDescription: "" },
  ]);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1 text-subhead font-medium text-accent">
        <Plus aria-hidden className="size-4" /> Novo modelo
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Novo modelo de sondagem"
        footer={
          <Button
            size="lg"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await createTemplateAction({ name, kind, levels, criteria: criteria.filter((c) => c.trim()) });
                if (!res.ok) return toast({ title: res.error, tone: "error" });
                toast({ title: "Modelo criado" });
                setOpen(false);
                router.refresh();
              })
            }
          >
            Criar modelo
          </Button>
        }
      >
        <div className="space-y-5">
          <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Produção de texto — 4º ano" />
          <Select label="Área" value={kind} onChange={(e) => setKind(e.target.value as TemplateKind)}>
            {Object.entries(templateKinds).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>

          <div className="space-y-2">
            <p className="px-1 text-subhead font-medium text-label-2">Níveis, do inicial ao mais avançado</p>
            {levels.map((l, i) => (
              <div key={i} className="space-y-2 rounded-xl bg-surface p-3 shadow-e1">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fill text-footnote font-semibold tabular">{i + 1}</span>
                  <input
                    value={l.label}
                    onChange={(e) => setLevels(levels.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    placeholder="Nome do nível"
                    aria-label={`Nome do nível ${i + 1}`}
                    className="h-9 flex-1 bg-transparent text-callout font-medium outline-none"
                  />
                  {levels.length > 2 && (
                    <button type="button" aria-label="Remover nível" onClick={() => setLevels(levels.filter((_, j) => j !== i))} className="text-label-3 hover:text-critical">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <input
                  value={l.description}
                  onChange={(e) => setLevels(levels.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                  placeholder="Descrição pedagógica (para a escola)"
                  aria-label="Descrição pedagógica"
                  className="h-9 w-full rounded-[10px] bg-fill px-3 text-footnote outline-none"
                />
                <input
                  value={l.familyDescription}
                  onChange={(e) => setLevels(levels.map((x, j) => (j === i ? { ...x, familyDescription: e.target.value } : x)))}
                  placeholder="Como explicar para a família, em linguagem simples"
                  aria-label="Explicação para a família"
                  className="h-9 w-full rounded-[10px] bg-fill px-3 text-footnote outline-none"
                />
              </div>
            ))}
            {levels.length < 10 && (
              <Button variant="plain" size="sm" icon={Plus} onClick={() => setLevels([...levels, { label: "", description: "", familyDescription: "" }])}>
                Adicionar nível
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <p className="px-1 text-subhead font-medium text-label-2">Critérios (opcional)</p>
            {criteria.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={c}
                  onChange={(e) => setCriteria(criteria.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder="Ex.: Usa letra maiúscula no início das frases"
                  aria-label={`Critério ${i + 1}`}
                  className="h-10 flex-1 rounded-[10px] bg-surface px-3 text-callout shadow-e1 outline-none"
                />
                <button type="button" aria-label="Remover critério" onClick={() => setCriteria(criteria.filter((_, j) => j !== i))} className="px-2 text-label-3 hover:text-critical">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <Button variant="plain" size="sm" icon={Plus} onClick={() => setCriteria([...criteria, ""])}>
              Adicionar critério
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
