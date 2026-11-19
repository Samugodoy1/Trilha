"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Toggle } from "@/components/ui/fields";
import { SaveIndicator, type SaveState } from "@/components/ui/save-indicator";
import { useToast } from "@/components/ui/toast";
import { saveGradeAction, setGradeItemSharedAction } from "@/server/actions/grades";
import { cn } from "@/lib/cn";
import { formatScore } from "@/lib/format";

type G = { score: number | null; concept: string | null; comment: string | null };

export function GradeEntry({
  itemId,
  kind,
  maxScore,
  concepts,
  students,
  initial,
  shared,
  readOnly,
}: {
  itemId: string;
  kind: "numeric" | "concept" | "descriptive";
  maxScore: number | null;
  concepts: { key: string; label: string; description: string }[];
  students: { id: string; name: string; hue: number }[];
  initial: Record<string, G>;
  shared: boolean;
  readOnly: boolean;
}) {
  const [grades, setGrades] = useState(initial);
  const [save, setSave] = useState<SaveState>("idle");
  const [isShared, setShared] = useState(shared);
  const toast = useToast();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const persist = async (studentId: string, g: G) => {
    setGrades((x) => ({ ...x, [studentId]: g }));
    setSave("saving");
    const res = await saveGradeAction({ gradeItemId: itemId, studentId, ...g });
    if (!res.ok) {
      setSave("error");
      toast({ title: res.error ?? "Não foi possível salvar", tone: "error" });
    } else setSave("saved");
  };

  const filled = students.filter((s) => grades[s.id] && (grades[s.id].score !== null || grades[s.id].concept || grades[s.id].comment)).length;
  const numericValues = students.map((s) => grades[s.id]?.score).filter((v): v is number => v !== null && v !== undefined);
  const avg = numericValues.length ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-surface p-4 shadow-e1">
        <div className="flex-1">
          <p className="text-footnote text-label-2">Lançados</p>
          <p className="font-rounded text-title-2 tabular">
            {filled}
            <span className="text-callout text-label-2">/{students.length}</span>
          </p>
        </div>
        {avg !== null && (
          <div className="flex-1">
            <p className="text-footnote text-label-2">Média da turma</p>
            <p className="font-rounded text-title-2 tabular">{formatScore(avg)}</p>
          </div>
        )}
        <SaveIndicator state={save} savedLabel="Salvo" />
        {!readOnly && (
          <label className="flex items-center gap-2 text-subhead">
            <span className="text-label-2">Visível para famílias</span>
            <Toggle
              checked={isShared}
              label="Visível para famílias"
              onChange={async (v) => {
                setShared(v);
                await setGradeItemSharedAction(itemId, v);
              }}
            />
          </label>
        )}
      </div>
      <p className="px-1 text-footnote text-label-2">A média da turma é só para você. Famílias veem apenas o resultado do próprio filho — nunca rankings ou comparações.</p>

      <div className="-mx-5 md:mx-0">
        {students.map((s, i) => {
          const g = grades[s.id] ?? { score: null, concept: null, comment: null };
          return (
            <div key={s.id} className={cn("flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center", i < students.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
              <div className="flex min-w-0 items-center gap-3 sm:w-64 sm:shrink-0">
                <Avatar name={s.name} hue={s.hue} size="sm" />
                <span className="truncate text-callout">{s.name}</span>
              </div>
              {kind === "numeric" && (
                <input
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  type="text"
                  inputMode="decimal"
                  disabled={readOnly}
                  defaultValue={g.score !== null ? formatScore(g.score) : ""}
                  aria-label={`Nota de ${s.name}`}
                  placeholder="—"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") inputs.current[i + 1]?.focus();
                  }}
                  onBlur={(e) => {
                    const raw = e.target.value.replace(",", ".").trim();
                    const v = raw === "" ? null : Number(raw);
                    if (v !== null && (Number.isNaN(v) || v < 0 || (maxScore !== null && v > maxScore))) {
                      toast({ title: `Use um valor entre 0 e ${maxScore}`, tone: "error" });
                      return;
                    }
                    if (v !== g.score) void persist(s.id, { ...g, score: v });
                  }}
                  className="h-10 w-24 rounded-[10px] bg-fill px-3 text-center font-rounded text-headline tabular outline-none focus:bg-surface focus:shadow-[0_0_0_2px_var(--accent)]"
                />
              )}
              {kind === "concept" && (
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Conceito de ${s.name}`}>
                  {concepts.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      role="radio"
                      aria-checked={g.concept === c.key}
                      title={c.label}
                      disabled={readOnly}
                      onClick={() => void persist(s.id, { ...g, concept: g.concept === c.key ? null : c.key })}
                      className={cn("press h-9 min-w-12 rounded-[10px] px-3 text-subhead font-semibold", g.concept === c.key ? "bg-accent text-on-accent" : "bg-fill hover:bg-fill-2")}
                    >
                      {c.key}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="text"
                disabled={readOnly}
                defaultValue={g.comment ?? ""}
                aria-label={`Comentário sobre ${s.name}`}
                placeholder={kind === "descriptive" ? "Parecer sobre a atividade" : "Comentário (opcional)"}
                onBlur={(e) => {
                  if ((e.target.value || null) !== g.comment) void persist(s.id, { ...g, comment: e.target.value || null });
                }}
                className="h-10 flex-1 rounded-[10px] bg-transparent px-3 text-subhead outline-none placeholder:text-label-3 focus:bg-fill"
              />
            </div>
          );
        })}
      </div>
      {kind === "concept" && (
        <dl className="grid gap-2 sm:grid-cols-2">
          {concepts.map((c) => (
            <div key={c.key} className="text-footnote text-label-2">
              <dt className="inline font-semibold text-label">{c.key}</dt> — <dd className="inline">{c.label}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
