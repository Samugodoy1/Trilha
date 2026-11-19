"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { SaveIndicator, type SaveState } from "@/components/ui/save-indicator";
import { KindPicker, StudentPicker, VisibilityPicker } from "./pickers";
import { saveEntryAction, type ComposeContext } from "@/server/actions/journal";
import { todayISO, formatRelativeDay } from "@/lib/format";
import { entryKinds, type EntryKind, type Visibility } from "@/lib/vocabulary";
import { cn } from "@/lib/cn";

export type EntryDraft = {
  id?: string;
  classId: string;
  studentIds: string[];
  kind: EntryKind;
  title: string;
  body: string;
  visibility: Visibility;
  occurredOn: string;
};

/**
 * Editor de registro pedagógico. Escrever deve ser tão leve quanto anotar:
 * campos mínimos visíveis, rascunho salvo automaticamente e privacidade explícita.
 */
export function EntryComposer({
  context,
  initial,
  onDone,
  variant = "sheet",
}: {
  context: ComposeContext;
  initial?: Partial<EntryDraft>;
  onDone?: (id: string) => void;
  variant?: "sheet" | "page";
}) {
  const toast = useToast();
  const router = useRouter();
  const [draft, setDraft] = useState<EntryDraft>(() => ({
    classId: initial?.classId ?? context.classes[0]?.id ?? "",
    studentIds: initial?.studentIds ?? [],
    kind: initial?.kind ?? "observacao",
    title: initial?.title ?? "",
    body: initial?.body ?? "",
    visibility: initial?.visibility ?? "private",
    occurredOn: initial?.occurredOn ?? todayISO(),
    id: initial?.id,
  }));
  const [save, setSave] = useState<SaveState>(initial?.id ? "saved" : "idle");
  const [step, setStep] = useState<"write" | "who">("write");
  const [pending, start] = useTransition();
  const idRef = useRef(initial?.id);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cls = context.classes.find((c) => c.id === draft.classId);
  const update = (patch: Partial<EntryDraft>) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, ...patch }));
  };

  const persist = useCallback(
    async (d: EntryDraft, isDraft: boolean) => {
      setSave("saving");
      const res = await saveEntryAction({ ...d, id: idRef.current, isDraft });
      if (res.ok) {
        idRef.current = res.id;
        dirty.current = false;
        setSave("saved");
      } else {
        setSave("error");
        if (!isDraft) toast({ title: res.error, tone: "error" });
      }
      return res;
    },
    [toast],
  );

  // Salvamento automático de rascunho, discreto
  useEffect(() => {
    if (!dirty.current || !draft.body.trim()) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(draft, true), 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, persist]);

  const submit = () =>
    start(async () => {
      if (timer.current) clearTimeout(timer.current);
      const res = await persist(draft, false);
      if (res.ok) {
        toast({
          title: "Registro salvo",
          description: draft.studentIds.length === 1 ? "Já aparece na linha do tempo do aluno." : undefined,
        });
        onDone?.(res.id);
        router.refresh();
      }
    });

  const who =
    draft.studentIds.length === 0
      ? "Turma toda"
      : draft.studentIds.length === 1
        ? cls?.students.find((s) => s.id === draft.studentIds[0])?.name ?? "1 aluno"
        : `${draft.studentIds.length} alunos`;

  if (context.classes.length === 0)
    return <p className="py-10 text-center text-callout text-label-2">Você ainda não tem turmas ativas.</p>;

  return (
    <div className={cn("space-y-5", variant === "page" && "pb-6")}>
      <div className="flex flex-wrap items-center gap-2">
        {context.classes.length > 1 && (
          <Menu
            label="Turma"
            align="start"
            items={context.classes.map((c) => ({
              label: c.name,
              checked: c.id === draft.classId,
              onSelect: () => update({ classId: c.id, studentIds: [] }),
            }))}
          >
            {(p) => (
              <button type="button" {...p} className="press flex h-8 items-center gap-1 rounded-full bg-fill px-3 text-subhead font-medium hover:bg-fill-2">
                {cls?.name}
                <ChevronDown aria-hidden className="size-3.5 text-label-2" strokeWidth={2.6} />
              </button>
            )}
          </Menu>
        )}
        <button
          type="button"
          onClick={() => setStep(step === "who" ? "write" : "who")}
          aria-expanded={step === "who"}
          className={cn(
            "press flex h-8 items-center gap-1 rounded-full px-3 text-subhead font-medium",
            step === "who" ? "bg-accent text-on-accent" : "bg-accent-soft text-accent",
          )}
        >
          {who}
          <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", step === "who" && "rotate-180")} strokeWidth={2.6} />
        </button>
        <label className="press relative flex h-8 items-center gap-1.5 rounded-full bg-fill px-3 text-subhead font-medium hover:bg-fill-2">
          <CalendarDays aria-hidden className="size-3.5 text-label-2" strokeWidth={2.4} />
          {formatRelativeDay(draft.occurredOn)}
          <input
            type="date"
            aria-label="Data do registro"
            value={draft.occurredOn}
            max={todayISO()}
            onChange={(e) => e.target.value && update({ occurredOn: e.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <span className="ml-auto">
          <SaveIndicator state={save} />
        </span>
      </div>

      {step === "who" && cls && (
        <div className="animate-rise">
          <StudentPicker students={cls.students} selected={draft.studentIds} onChange={(ids) => update({ studentIds: ids })} />
        </div>
      )}

      <KindPicker value={draft.kind} onChange={(kind) => update({ kind })} />

      <div className="rounded-xl bg-surface p-4 shadow-e1">
        <input
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={entryKinds[draft.kind].label}
          aria-label="Título (opcional)"
          className="w-full bg-transparent text-title-3 font-semibold outline-none placeholder:text-label-3"
        />
        <textarea
          data-autofocus
          value={draft.body}
          onChange={(e) => {
            update({ body: e.target.value });
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          rows={variant === "page" ? 8 : 4}
          placeholder="O que você observou? Escreva como falaria com uma colega."
          aria-label="Registro"
          className="mt-2 w-full resize-none bg-transparent text-body leading-relaxed outline-none placeholder:text-label-3"
        />
        {context.templates.length > 0 && (
          <div className="mt-2 flex justify-end">
            <Menu
              label="Modelos"
              items={context.templates.map((t) => ({
                label: t.name,
                icon: FileText,
                onSelect: () =>
                  update({
                    body: draft.body ? `${draft.body}\n${t.body}` : t.body,
                    kind: t.kind as EntryKind,
                  }),
              }))}
            >
              {(p) => (
                <button type="button" {...p} className="flex items-center gap-1 rounded-full px-2 py-1 text-footnote font-medium text-accent hover:bg-accent-soft">
                  <FileText aria-hidden className="size-3.5" strokeWidth={2.2} />
                  Usar modelo
                </button>
              )}
            </Menu>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="px-1 font-sans text-footnote font-medium uppercase tracking-[0.04em] text-label-2">Quem pode ver</h3>
        <VisibilityPicker value={draft.visibility} onChange={(visibility) => update({ visibility })} />
        {draft.visibility === "family" && draft.studentIds.length === 0 && (
          <p className="px-1 text-footnote text-label-2">Registros da turma toda aparecem para todas as famílias da turma e podem compor a Nossa semana.</p>
        )}
      </div>

      <Button size="lg" onClick={submit} loading={pending} disabled={!draft.body.trim()}>
        Salvar registro
      </Button>
    </div>
  );
}
