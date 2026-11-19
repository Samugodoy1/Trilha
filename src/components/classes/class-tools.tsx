"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ClipboardCheck, FileSpreadsheet, MessageSquareHeart, NotebookPen, UserPlus, UserRound, Check, X, Clock, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchField, SegmentedControl, TextArea, TextField, Select, Toggle } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useContextMenu } from "@/components/ui/menu";
import { QuickRecord } from "@/components/teacher/quick-record";
import { addStudentsAction, saveAttendanceAction } from "@/server/actions/classes";
import { createGradeItemAction } from "@/server/actions/grades";
import { formatRelativeDay, todayISO, formatFullDay } from "@/lib/format";
import { cn } from "@/lib/cn";

type Student = { id: string; name: string; hue: number; number: number | null; lastEntry: string | null; writing: string | null; reading: string | null; entryCount: number };

export function StudentList({ students, classId, termStart, initialFilter, canRecord }: { students: Student[]; classId: string; termStart?: string; initialFilter?: string; canRecord: boolean }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"todos" | "sem-registros">(initialFilter === "sem-registros" ? "sem-registros" : "todos");
  const list = useMemo(() => {
    const n = q.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    return students
      .filter((s) => s.name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(n))
      .filter((s) => filter === "todos" || !s.lastEntry || (termStart && s.lastEntry < termStart));
  }, [q, filter, students, termStart]);
  const without = students.filter((s) => !s.lastEntry || (termStart && s.lastEntry < termStart)).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchField value={q} onChange={setQ} placeholder={`Buscar entre ${students.length} alunos`} className="flex-1" />
        <SegmentedControl
          label="Filtro"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "todos", label: "Todos" },
            { value: "sem-registros", label: `Sem registro no bimestre (${without})` },
          ]}
        />
      </div>
      <div className="-mx-4 md:mx-0" role="list">
        {list.length === 0 && <p className="px-4 py-10 text-center text-callout text-label-2">Nenhum aluno encontrado.</p>}
        {list.map((s) => (
          <StudentRow key={s.id} s={s} classId={classId} canRecord={canRecord} />
        ))}
      </div>
      <p className="px-1 text-footnote text-label-2">Dica: toque e segure (ou clique com o botão direito) em um aluno para ações rápidas.</p>
    </div>
  );
}

function StudentRow({ s, classId, canRecord }: { s: Student; classId: string; canRecord: boolean }) {
  const router = useRouter();
  const [record, setRecord] = useState(false);
  const { bind, menu } = useContextMenu(
    [
      ...(canRecord ? [{ label: "Registrar observação", icon: NotebookPen, onSelect: () => setRecord(true) }] : []),
      { label: "Ver perfil", icon: UserRound, href: `/alunos/${s.id}` },
      ...(canRecord ? [{ label: "Enviar feedback", icon: MessageSquareHeart, onSelect: () => router.push(`/alunos/${s.id}?aba=familia`) }] : []),
    ],
    s.name,
  );
  const detail = [s.writing && `Escrita: ${s.writing}`, s.reading && `Leitura: ${s.reading}`].filter(Boolean).join(" · ");
  return (
    <div role="listitem" {...bind}>
      <Link href={`/alunos/${s.id}`} className="flex items-center gap-3 pl-4 outline-none select-none hover:bg-fill/60 focus-visible:bg-fill [-webkit-touch-callout:none]">
        <Avatar name={s.name} hue={s.hue} />
        <span className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-4 [div:not(:last-child)>a>&]:shadow-[inset_0_-0.5px_0_var(--separator)]">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body">{s.name}</span>
            <span className="block truncate text-footnote text-label-2">
              {s.lastEntry ? `Último registro: ${formatRelativeDay(s.lastEntry).toLowerCase()}` : "Sem registros individuais"}
              {detail ? ` · ${detail}` : ""}
            </span>
          </span>
          {s.number && <span className="text-footnote text-label-3 tabular">nº {s.number}</span>}
          <ChevronRight aria-hidden className="size-4 text-label-3" strokeWidth={2.4} />
        </span>
      </Link>
      {menu}
      {canRecord && <QuickRecord open={record} onClose={() => setRecord(false)} initial={{ classId, studentIds: [s.id] }} />}
    </div>
  );
}

/** Adicionar alunos: um a um, colando da planilha ou importando CSV. */
export function AddStudentsButton({ classId }: { classId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"um" | "lista">("lista");
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const parsed = useMemo(() => parseRoster(text), [text]);

  const submit = (rows: { fullName: string; birthDate?: string; enrollmentCode?: string }[]) =>
    start(async () => {
      const res = await addStudentsAction(classId, rows);
      if (!res.ok) return toast({ title: res.error, tone: "error" });
      toast({ title: res.added === 1 ? "Aluno adicionado" : `${res.added} alunos adicionados` });
      setText("");
      setName("");
      setBirth("");
      setCode("");
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button variant="tinted" size="sm" icon={UserPlus} onClick={() => setOpen(true)}>
        Adicionar alunos
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Adicionar alunos">
        <div className="space-y-4">
          <SegmentedControl
            label="Forma"
            value={mode}
            onChange={setMode}
            options={[
              { value: "lista", label: "Colar ou importar" },
              { value: "um", label: "Um aluno" },
            ]}
          />
          {mode === "um" ? (
            <div className="space-y-4">
              <TextField label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Nascimento" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
                <TextField label="Matrícula (opcional)" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <p className="text-footnote text-label-2">A data de nascimento é usada para verificar a família no convite. Não aparece para outros responsáveis.</p>
              <Button size="lg" loading={pending} disabled={name.trim().split(" ").length < 2} onClick={() => submit([{ fullName: name, birthDate: birth, enrollmentCode: code }])}>
                Adicionar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <TextArea
                label="Lista de alunos"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                placeholder={"Cole da planilha: nome, nascimento e matrícula (opcionais)\n\nAna Beatriz Souza\t12/03/2017\t2017-0045\nBruno Henrique Lima\t02/08/2017"}
                hint="Uma pessoa por linha. Aceita colunas separadas por tabulação, vírgula ou ponto e vírgula."
              />
              <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-surface p-3.5 shadow-e1 hover:bg-surface-2">
                <FileSpreadsheet aria-hidden className="size-5 text-positive-ink" />
                <span className="flex-1 text-callout">Importar arquivo CSV</span>
                <span className="text-footnote text-label-2">Exportado do Excel ou Planilhas</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setText(await f.text());
                  }}
                />
              </label>
              {parsed.rows.length > 0 && (
                <div className="overflow-hidden rounded-xl bg-surface shadow-e1">
                  <p className="px-4 pt-3 pb-1 text-footnote font-semibold text-label-2">Pré-visualização · {parsed.rows.length} alunos</p>
                  <ul className="max-h-48 overflow-y-auto">
                    {parsed.rows.map((r, i) => (
                      <li key={i} className="flex justify-between gap-3 px-4 py-1.5 text-subhead">
                        <span className="truncate">{r.fullName}</span>
                        <span className="shrink-0 text-label-2 tabular">{r.birthDate ? r.birthDate.split("-").reverse().join("/") : ""}</span>
                      </li>
                    ))}
                  </ul>
                  {parsed.skipped > 0 && <p className="px-4 pb-3 text-footnote text-warning-ink">{parsed.skipped} linhas ignoradas (sem nome e sobrenome).</p>}
                </div>
              )}
              <Button size="lg" loading={pending} disabled={!parsed.rows.length} onClick={() => submit(parsed.rows)}>
                {parsed.rows.length ? `Adicionar ${parsed.rows.length} alunos` : "Adicionar"}
              </Button>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}

export function parseRoster(text: string) {
  const rows: { fullName: string; birthDate?: string; enrollmentCode?: string }[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const fullName = cols[0];
    if (/^nome|^aluno|^estudante/i.test(fullName)) continue; // cabeçalho
    if (!fullName || fullName.split(/\s+/).length < 2) {
      skipped++;
      continue;
    }
    let birthDate: string | undefined;
    let enrollmentCode: string | undefined;
    for (const c of cols.slice(1)) {
      const br = c.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      const iso = c.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (br) birthDate = `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
      else if (iso) birthDate = c;
      else if (c) enrollmentCode = c;
    }
    rows.push({ fullName, birthDate, enrollmentCode });
  }
  return { rows, skipped };
}

type AttendanceStatus = "presente" | "falta" | "atraso" | "justificada";

/** Chamada rápida: todos começam presentes; um toque alterna o estado. */
export function AttendanceButton({ classId, students, today }: { classId: string; students: { id: string; name: string; hue: number }[]; today: { studentId: string; status: AttendanceStatus }[] }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Record<string, AttendanceStatus>>(() => Object.fromEntries(students.map((s) => [s.id, today.find((t) => t.studentId === s.id)?.status ?? "presente"])));
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const cycle: AttendanceStatus[] = ["presente", "falta", "atraso", "justificada"];
  const absent = Object.values(state).filter((v) => v === "falta").length;
  const meta: Record<AttendanceStatus, { label: string; icon: typeof Check; color: string }> = {
    presente: { label: "Presente", icon: Check, color: "var(--positive)" },
    falta: { label: "Falta", icon: X, color: "var(--critical)" },
    atraso: { label: "Atraso", icon: Clock, color: "var(--warning)" },
    justificada: { label: "Justificada", icon: ShieldCheck, color: "var(--info)" },
  };
  return (
    <>
      <Button variant="gray" size="sm" icon={ClipboardCheck} onClick={() => setOpen(true)}>
        Chamada{today.length ? " ✓" : ""}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Chamada"
        description={formatFullDay(todayISO())}
        footer={
          <Button
            size="lg"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await saveAttendanceAction(classId, todayISO(), Object.entries(state).map(([studentId, status]) => ({ studentId, status })));
                if (!res.ok) return toast({ title: "Não foi possível salvar a chamada", tone: "error" });
                toast({ title: "Chamada salva", description: absent ? `${absent} ${absent === 1 ? "falta" : "faltas"}` : "Todos presentes" });
                setOpen(false);
                router.refresh();
              })
            }
          >
            Salvar chamada
          </Button>
        }
      >
        <p className="mb-3 text-footnote text-label-2">Toque para alternar: presente → falta → atraso → justificada.</p>
        <div className="overflow-hidden rounded-xl bg-surface shadow-e1">
          {students.map((s, i) => {
            const st = state[s.id];
            const M = meta[st];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setState((x) => ({ ...x, [s.id]: cycle[(cycle.indexOf(st) + 1) % cycle.length] }))}
                className="flex w-full items-center gap-3 pl-4 text-left hover:bg-fill/60"
                aria-label={`${s.name}: ${M.label}`}
              >
                <Avatar name={s.name} hue={s.hue} size="sm" />
                <span className={cn("flex flex-1 items-center gap-3 py-2.5 pr-4", i < students.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
                  <span className="flex-1 text-body">{s.name}</span>
                  <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-footnote font-semibold" style={{ color: M.color, background: `color-mix(in oklab, ${M.color} 12%, transparent)` }}>
                    <M.icon aria-hidden className="size-3.5" strokeWidth={2.8} />
                    {M.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}

export function NewGradeItemButton({
  classId,
  terms,
  subjects,
  defaultSubjectId,
  defaultKind,
  currentTermId,
}: {
  classId: string;
  terms: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  defaultSubjectId?: string | null;
  defaultKind: "numeric" | "concept" | "descriptive";
  currentTermId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(defaultKind);
  const [recovery, setRecovery] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <>
      <Button variant="tinted" size="sm" onClick={() => setOpen(true)}>
        Nova avaliação
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Nova avaliação">
        <form
          className="space-y-4"
          action={(f) =>
            start(async () => {
              const bncc = String(f.get("bncc") ?? "")
                .toUpperCase()
                .split(/[\s,;]+/)
                .filter(Boolean);
              const res = await createGradeItemAction({
                classId,
                subjectId: String(f.get("subjectId") ?? ""),
                termId: String(f.get("termId")),
                title: String(f.get("title")),
                kind,
                maxScore: kind === "numeric" ? Number(f.get("maxScore") || 10) : undefined,
                weight: Number(f.get("weight") || 1),
                isRecovery: recovery,
                date: String(f.get("date")),
                bnccCodes: bncc,
              });
              if (!res.ok) return toast({ title: res.error, tone: "error" });
              setOpen(false);
              router.push(`/avaliacoes/${res.id}`);
            })
          }
        >
          <TextField name="title" label="Nome" placeholder="Ex.: Prova de frações" required />
          <SegmentedControl
            label="Forma de avaliar"
            value={kind}
            onChange={setKind}
            options={[
              { value: "numeric", label: "Nota" },
              { value: "concept", label: "Conceito" },
              { value: "descriptive", label: "Descritiva" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select name="termId" label="Bimestre" defaultValue={currentTermId}>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <TextField name="date" type="date" label="Data" defaultValue={todayISO()} required />
          </div>
          <Select name="subjectId" label="Componente" defaultValue={defaultSubjectId ?? ""}>
            <option value="">Geral</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          {kind === "numeric" && (
            <div className="grid grid-cols-2 gap-3">
              <TextField name="maxScore" type="number" inputMode="decimal" step="0.5" label="Nota máxima" defaultValue={10} />
              <TextField name="weight" type="number" inputMode="decimal" step="0.5" label="Peso" defaultValue={1} />
            </div>
          )}
          <TextField name="bncc" label="Habilidades da BNCC (opcional)" placeholder="EF06MA07, EF06MA03" />
          <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-e1">
            <span className="text-callout">É uma recuperação</span>
            <Toggle checked={recovery} onChange={setRecovery} label="É uma recuperação" />
          </div>
          <Button type="submit" size="lg" loading={pending}>
            Criar e lançar
          </Button>
        </form>
      </Sheet>
    </>
  );
}
