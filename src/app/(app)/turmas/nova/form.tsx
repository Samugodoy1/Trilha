"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SegmentedControl, Select, TextField } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { createClassAction } from "@/server/actions/classes";
import { stageLabels, shiftLabels, type Stage } from "@/lib/vocabulary";
import { navigateAfterAction } from "@/lib/navigate";

const grades: Record<Stage, number[]> = {
  infantil: [0],
  fundamental_1: [1, 2, 3, 4, 5],
  fundamental_2: [6, 7, 8, 9],
  medio: [1, 2, 3],
};

export function NewClassForm({ subjects, onCreated }: { subjects: { id: string; name: string }[]; onCreated?: (id: string) => void }) {
  const [stage, setStage] = useState<Stage>("fundamental_1");
  const [grade, setGrade] = useState(3);
  const [letter, setLetter] = useState("A");
  const [shift, setShift] = useState<keyof typeof shiftLabels>("manha");
  const [mode, setMode] = useState<"polivalente" | "componente">("polivalente");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [room, setRoom] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const name = stage === "infantil" ? `Infantil ${letter}` : `${grade}º ano ${letter}`.trim();

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createClassAction({ name, stage, grade, shift, room, subjectId: mode === "componente" ? subjectId : "" });
          if (!res.ok) return toast({ title: res.error, tone: "error" });
          toast({ title: `${name} criada` });
          if (onCreated) onCreated(res.id);
          else void navigateAfterAction(router, `/turmas/${res.id}`);
        });
      }}
    >
      <div className="space-y-2">
        <p className="px-1 text-subhead font-medium text-label-2">Etapa</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(stageLabels) as Stage[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === stage}
              onClick={() => {
                setStage(s);
                setGrade(grades[s][0]);
                setMode(s === "fundamental_2" || s === "medio" ? "componente" : "polivalente");
              }}
              className={`press rounded-xl px-3 py-3 text-left text-subhead font-medium shadow-e1 ${s === stage ? "bg-accent text-on-accent" : "bg-surface hover:bg-surface-2"}`}
            >
              {stageLabels[s].replace("Ensino ", "")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stage !== "infantil" && (
          <Select label="Ano" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
            {grades[stage].map((g) => (
              <option key={g} value={g}>
                {g}º ano
              </option>
            ))}
          </Select>
        )}
        <TextField label="Turma" value={letter} onChange={(e) => setLetter(e.target.value.toUpperCase().slice(0, 3))} maxLength={3} />
      </div>

      <div className="space-y-2">
        <p className="px-1 text-subhead font-medium text-label-2">Turno</p>
        <SegmentedControl label="Turno" value={shift} onChange={setShift} options={Object.entries(shiftLabels).map(([value, label]) => ({ value: value as keyof typeof shiftLabels, label }))} />
      </div>

      <div className="space-y-2">
        <p className="px-1 text-subhead font-medium text-label-2">Como você leciona nesta turma?</p>
        <SegmentedControl
          label="Forma de lecionar"
          value={mode}
          onChange={setMode}
          options={[
            { value: "polivalente", label: "Todas as áreas" },
            { value: "componente", label: "Um componente" },
          ]}
        />
        {mode === "componente" && (
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label="Componente curricular">
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <TextField label="Sala (opcional)" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Ex.: Sala 4" />

      <div className="rounded-xl bg-surface p-4 text-center shadow-e1">
        <p className="text-footnote text-label-2">A turma será criada como</p>
        <p className="text-title-2">{name}</p>
      </div>

      <Button type="submit" size="lg" loading={pending}>
        Criar turma
      </Button>
    </form>
  );
}
