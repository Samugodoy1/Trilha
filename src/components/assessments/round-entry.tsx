"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MessageSquareText, TrendingDown, TrendingUp } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/fields";
import { SaveIndicator, type SaveState } from "@/components/ui/save-indicator";
import { Disclosure } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { saveResultAction, setRoundSharedAction, finishRoundAction } from "@/server/actions/assessments";
import type { schema } from "@/db";

type Result = { levelKey: string | null; criteria: schema.CriteriaAnswers; note: string | null; absent: boolean };

/**
 * Lançamento coletivo de sondagem.
 * Cada toque salva o resultado do aluno; o histórico individual é atualizado automaticamente.
 * No computador: ↑/↓ para mudar de aluno e 1–9 para escolher o nível.
 */
export function RoundEntry({
  roundId,
  scale,
  criteria,
  students,
  initial,
  previous,
  shared,
  color,
  readOnly,
}: {
  roundId: string;
  scale: schema.ScaleLevel[];
  criteria: schema.Criterion[];
  students: { id: string; name: string; hue: number }[];
  initial: Record<string, Result>;
  previous: Record<string, string | null>;
  shared: boolean;
  color: string;
  readOnly?: boolean;
}) {
  const [results, setResults] = useState<Record<string, Result>>(initial);
  const [save, setSave] = useState<SaveState>("idle");
  const [focusIdx, setFocusIdx] = useState(0);
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [isShared, setShared] = useState(shared);
  const toast = useToast();
  const router = useRouter();
  const pending = useRef(0);
  const rows = useRef<(HTMLDivElement | null)[]>([]);

  const done = students.filter((s) => results[s.id]?.levelKey || results[s.id]?.absent).length;
  const levelIndex = useCallback((k: string | null | undefined) => scale.findIndex((l) => l.key === k), [scale]);

  const persist = useCallback(
    async (studentId: string, next: Result) => {
      pending.current++;
      setSave("saving");
      const res = await saveResultAction({ roundId, studentId, ...next });
      pending.current--;
      if (!res.ok) {
        setSave("error");
        toast({ title: res.error ?? "Não foi possível salvar", tone: "error" });
      } else if (pending.current === 0) setSave("saved");
    },
    [roundId, toast],
  );

  const latest = useRef(results);
  latest.current = results;
  const update = useCallback(
    (studentId: string, patch: Partial<Result>) => {
      const base: Result = latest.current[studentId] ?? { levelKey: null, criteria: {}, note: null, absent: false };
      const next: Result = { ...base, ...patch };
      latest.current = { ...latest.current, [studentId]: next };
      setResults(latest.current);
      void persist(studentId, next);
    },
    [persist],
  );

  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(t.tagName) || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        setFocusIdx((i) => Math.min(students.length - 1, i + 1));
        e.preventDefault();
      } else if (e.key === "ArrowUp" || e.key === "k") {
        setFocusIdx((i) => Math.max(0, i - 1));
        e.preventDefault();
      } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= scale.length) {
        const s = students[focusIdx];
        update(s.id, { levelKey: scale[Number(e.key) - 1].key, absent: false });
        setFocusIdx((i) => Math.min(students.length - 1, i + 1));
      } else if (e.key.toLowerCase() === "a") {
        const s = students[focusIdx];
        update(s.id, { absent: !results[s.id]?.absent });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusIdx, students, scale, update, results, readOnly]);

  useEffect(() => {
    rows.current[focusIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusIdx]);

  const dist = useMemo(() => scale.map((l) => students.filter((s) => results[s.id]?.levelKey === l.key).length), [scale, students, results]);

  return (
    <div className="space-y-5">
      <div className="sticky top-[calc(env(safe-area-inset-top)+44px)] md:top-14 z-20 -mx-5 bg-canvas/90 px-5 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-rounded text-title-2 tabular">{done}</span>
              <span className="text-subhead text-label-2">de {students.length} lançados</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-fill">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(done / Math.max(1, students.length)) * 100}%`, background: color }} />
            </div>
          </div>
          <SaveIndicator state={save} savedLabel="Salvo" />
          {!readOnly && (
            <label className="flex items-center gap-2 text-subhead">
              <span className="text-label-2">Compartilhar com famílias</span>
              <Toggle
                checked={isShared}
                label="Compartilhar com famílias"
                onChange={async (v) => {
                  setShared(v);
                  await setRoundSharedAction(roundId, v);
                  toast({ title: v ? "Visível para as famílias" : "Somente para a escola", description: v ? "Cada família vê apenas o resultado do próprio filho, com explicação em linguagem simples." : undefined });
                }}
              />
            </label>
          )}
        </div>
      </div>

      <Disclosure summary="O que significa cada nível">
        <dl className="grid gap-2 sm:grid-cols-2">
          {scale.map((l, i) => (
            <div key={l.key} className="rounded-[12px] bg-surface p-3 shadow-e1">
              <dt className="text-subhead font-semibold">
                <kbd className="mr-1.5 hidden rounded-[5px] bg-fill px-1.5 font-sans text-caption text-label-2 md:inline">{i + 1}</kbd>
                {l.label} <span className="text-label-2">· {dist[i]}</span>
              </dt>
              <dd className="mt-0.5 text-footnote text-label-2">{l.description}</dd>
            </div>
          ))}
        </dl>
      </Disclosure>

      <div className="-mx-5 md:mx-0" role="list" aria-label="Alunos">
        {students.map((s, i) => {
          const r = results[s.id];
          const prev = previous[s.id];
          const pi = levelIndex(prev);
          const ci = levelIndex(r?.levelKey);
          const delta = pi >= 0 && ci >= 0 ? ci - pi : null;
          return (
            <div
              key={s.id}
              ref={(el) => {
                rows.current[i] = el;
              }}
              role="listitem"
              onClick={() => setFocusIdx(i)}
              className={cn(
                "flex flex-col gap-3 px-5 py-3.5 transition-colors md:flex-row md:items-center md:px-4",
                i < students.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]",
                focusIdx === i && !readOnly && "md:bg-accent-soft/60",
              )}
            >
              <div className="flex min-w-0 items-center gap-3 md:w-80 md:shrink-0">
                <Avatar name={s.name} hue={s.hue} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-callout font-medium">{s.name}</p>
                  <p className="flex items-center gap-1 text-footnote text-label-2">
                    {prev ? (
                      <>
                        Antes: {scale[pi]?.short ?? "—"}
                        {delta !== null && delta > 0 && <TrendingUp aria-label="avançou" className="size-3.5 text-positive-ink" strokeWidth={2.6} />}
                        {delta !== null && delta < 0 && <TrendingDown aria-label="recuou" className="size-3.5 text-warning-ink" strokeWidth={2.6} />}
                      </>
                    ) : (
                      "Primeira sondagem"
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  aria-pressed={r?.absent ?? false}
                  disabled={readOnly}
                  onClick={(e) => {
                    e.stopPropagation();
                    update(s.id, { absent: !r?.absent, levelKey: null });
                  }}
                  className={cn("press h-8 rounded-full px-3 text-footnote font-medium", r?.absent ? "bg-label text-canvas" : "text-accent hover:bg-fill")}
                >
                  Ausente
                </button>
                <button
                  type="button"
                  aria-label={`Observação sobre ${s.name}`}
                  aria-expanded={noteOpen === s.id}
                  disabled={readOnly}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteOpen(noteOpen === s.id ? null : s.id);
                  }}
                  className={cn("press flex size-9 items-center justify-center rounded-[10px]", r?.note ? "bg-accent-soft text-accent" : "text-label-2 hover:bg-fill")}
                >
                  <MessageSquareText aria-hidden className="size-[18px]" strokeWidth={2} />
                </button>
                </div>
              </div>

              <div
                className="grid flex-1 gap-1.5 md:flex md:flex-wrap md:items-center"
                style={{ gridTemplateColumns: `repeat(${scale.length}, minmax(0, 1fr))` }}
                role="radiogroup"
                aria-label={`Nível de ${s.name}`}
              >
                {scale.map((l) => {
                  const on = r?.levelKey === l.key && !r?.absent;
                  return (
                    <button
                      key={l.key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={readOnly}
                      title={l.label}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusIdx(i);
                        update(s.id, { levelKey: on ? null : l.key, absent: false });
                      }}
                      className={cn(
                        "press h-10 rounded-[10px] px-1 text-subhead font-semibold transition-colors disabled:opacity-60 md:h-9 md:min-w-11 md:px-2.5",
                        on ? "text-white shadow-e1" : "bg-fill text-label hover:bg-fill-2",
                      )}
                      style={on ? { background: color } : undefined}
                    >
                      {l.short}
                    </button>
                  );
                })}
              </div>

              {criteria.length > 0 && (
                <div className="flex flex-wrap gap-1.5 md:max-w-80">
                  {criteria.map((c) => {
                    const v = r?.criteria?.[c.key];
                    const next = v === "sim" ? "parcial" : v === "parcial" ? "nao" : v === "nao" ? undefined : "sim";
                    return (
                      <button
                        key={c.key}
                        type="button"
                        disabled={readOnly}
                        onClick={(e) => {
                          e.stopPropagation();
                          const crit = { ...(r?.criteria ?? {}) };
                          if (next) crit[c.key] = next;
                          else delete crit[c.key];
                          update(s.id, { criteria: crit });
                        }}
                        className={cn(
                          "press rounded-full px-2.5 py-1 text-caption font-semibold",
                          v === "sim" && "bg-[color-mix(in_oklab,var(--positive)_14%,transparent)] text-positive-ink",
                          v === "parcial" && "bg-[color-mix(in_oklab,var(--warning)_14%,transparent)] text-warning-ink",
                          v === "nao" && "bg-fill-2 text-label-2 line-through",
                          !v && "bg-fill text-label-2",
                        )}
                        title={`${c.label}: ${v ?? "sem registro"}`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {noteOpen === s.id && (
                <NoteInput
                  initial={r?.note ?? ""}
                  onSave={(note) => {
                    update(s.id, { note });
                    setNoteOpen(null);
                  }}
                />
              )}
              {r?.note && noteOpen !== s.id && <p className="text-footnote text-label-2 md:hidden">“{r.note}”</p>}
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            size="lg"
            className="max-w-sm"
            icon={ArrowRight}
            onClick={async () => {
              await finishRoundAction(roundId);
              toast({ title: "Sondagem salva", description: "Os resultados já aparecem no histórico de cada aluno." });
              router.push("/sondagens");
            }}
          >
            Concluir
          </Button>
          <p className="hidden text-footnote text-label-2 md:block">Atalhos: ↑ ↓ para trocar de aluno · 1–{scale.length} para escolher o nível · A para ausente</p>
        </div>
      )}
    </div>
  );
}

function NoteInput({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="flex w-full gap-2 md:basis-full">
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSave(v)}
        placeholder="Ex.: escreveu MACACO como MAKCO"
        aria-label="Observação"
        className="h-10 flex-1 rounded-[10px] bg-fill px-3 text-callout outline-none focus:bg-fill-2"
      />
      <Button size="sm" className="h-10" onClick={() => onSave(v)}>
        Salvar
      </Button>
    </div>
  );
}
