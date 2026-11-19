"use client";

import { useMemo, useState } from "react";
import { Eye, Lock, Users, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { SearchField } from "@/components/ui/fields";
import { entryKinds, visibilityInfo, type EntryKind, type Visibility } from "@/lib/vocabulary";

export function KindPicker({ value, onChange }: { value: EntryKind; onChange: (k: EntryKind) => void }) {
  return (
    <div role="radiogroup" aria-label="Tipo de registro" className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {(Object.keys(entryKinds) as EntryKind[]).map((k) => {
        const active = k === value;
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(k)}
            className={cn(
              "press h-8 shrink-0 rounded-full px-3.5 text-subhead font-medium transition-colors",
              active ? "bg-label text-canvas" : "bg-fill text-label hover:bg-fill-2",
            )}
          >
            {entryKinds[k].label}
          </button>
        );
      })}
    </div>
  );
}

const visIcons = { private: Lock, coordination: Users, family: Eye };

/** Escolha explícita de quem pode ver. O padrão é sempre "Somente eu". */
export function VisibilityPicker({
  value,
  onChange,
  disabledFamily,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
  disabledFamily?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Quem pode ver" className="overflow-hidden rounded-xl bg-surface shadow-e1">
      {(Object.keys(visibilityInfo) as Visibility[]).map((v, i) => {
        const Icon = visIcons[v];
        const active = v === value;
        const disabled = v === "family" && Boolean(disabledFamily);
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(v)}
            className={cn(
              "flex w-full items-center gap-3 pl-4 text-left outline-none hover:bg-fill/60 focus-visible:bg-fill disabled:opacity-45",
            )}
          >
            <span
              className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px]"
              style={{
                background: `color-mix(in oklab, ${v === "family" ? "var(--family)" : v === "coordination" ? "var(--info)" : "var(--label-2)"} 14%, transparent)`,
                color: v === "family" ? "var(--family)" : v === "coordination" ? "var(--info)" : "var(--label-2)",
              }}
            >
              <Icon aria-hidden className="size-4" strokeWidth={2.2} />
            </span>
            <span className={cn("flex flex-1 items-center gap-3 py-2.5 pr-4", i < 2 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
              <span className="flex-1">
                <span className="block text-callout font-medium">{visibilityInfo[v].label}</span>
                <span className="block text-footnote text-label-2">{disabled ? disabledFamily : visibilityInfo[v].description}</span>
              </span>
              {active && <Check aria-hidden className="size-[18px] text-accent" strokeWidth={2.6} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function StudentPicker({
  students,
  selected,
  onChange,
  allowClass = true,
}: {
  students: { id: string; name: string; hue: number }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  allowClass?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const n = q.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    return students.filter((s) => s.name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(n));
  }, [q, students]);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <SearchField value={q} onChange={setQ} placeholder="Buscar aluno" className="flex-1" />
        {allowClass && (
          <button
            type="button"
            onClick={() => onChange([])}
            aria-pressed={selected.length === 0}
            className={cn(
              "press h-9 shrink-0 rounded-[10px] px-3 text-subhead font-medium",
              selected.length === 0 ? "bg-accent text-on-accent" : "bg-fill text-label hover:bg-fill-2",
            )}
          >
            Turma toda
          </button>
        )}
      </div>
      <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3" role="group" aria-label="Alunos">
        {filtered.map((s) => {
          const on = selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s.id)}
              className={cn(
                "flex items-center gap-2 rounded-[12px] p-1.5 pr-2 text-left text-subhead outline-none transition-colors",
                on ? "bg-accent-soft font-semibold text-accent" : "hover:bg-fill",
              )}
            >
              <span className="relative">
                <Avatar name={s.name} hue={s.hue} size="sm" />
                {on && (
                  <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-accent ring-2 ring-surface">
                    <Check className="size-2.5 text-on-accent" strokeWidth={3.5} />
                  </span>
                )}
              </span>
              <span className="truncate">{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
