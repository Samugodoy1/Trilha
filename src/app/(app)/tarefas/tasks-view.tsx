"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Link2, Paperclip, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, TextArea, TextField, Toggle } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { createTaskAction, deleteTaskAction, restoreTaskAction, uploadFileAction } from "@/server/actions/tasks";
import { SwipeRow } from "@/components/ui/swipe-row";
import { formatRelativeDay, todayISO, addDays } from "@/lib/format";
import { taskKinds } from "@/lib/vocabulary";
import { cn } from "@/lib/cn";

type Row = {
  id: string;
  title: string;
  kind: keyof typeof taskKinds;
  instructions: string | null;
  dueOn: string | null;
  className: string;
  links: { url: string; title: string }[];
  acceptsSubmissions: boolean;
  done: number;
  total: number;
};

function ProgressRing({ value, total }: { value: number; total: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const p = total ? value / total : 0;
  return (
    <svg viewBox="0 0 22 22" className="mt-[13px] size-[22px] shrink-0 -rotate-90" aria-label={`${value} de ${total} famílias marcaram como feita`}>
      <circle cx="11" cy="11" r={r} fill="none" stroke="var(--separator-strong)" strokeWidth="1.6" />
      {p > 0 && <circle cx="11" cy="11" r={r} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeDasharray={`${p * c} ${c}`} strokeLinecap="round" />}
    </svg>
  );
}

export function TasksView({ upcoming, past, classes, openNew }: { upcoming: Row[]; past: Row[]; classes: { id: string; name: string }[]; openNew: boolean }) {
  const [open, setOpen] = useState(openNew);
  const today = todayISO();
  const groups: { label: string; rows: Row[] }[] = [
    { label: "Hoje", rows: upcoming.filter((r) => r.dueOn === today) },
    { label: "Esta semana", rows: upcoming.filter((r) => r.dueOn && r.dueOn > today && r.dueOn <= addDays(today, 7)) },
    { label: "Mais adiante", rows: upcoming.filter((r) => !r.dueOn || r.dueOn > addDays(today, 7)) },
    { label: "Encerradas", rows: past.slice(0, 10) },
  ].filter((g) => g.rows.length);

  return (
    <>
      <div className="-mx-5 md:mx-0">
        {groups.length === 0 && <p className="px-5 py-8 text-callout text-label-2 md:px-0">Nenhuma tarefa publicada.</p>}
        {groups.map((g) => (
          <section key={g.label} aria-label={g.label}>
            <h2 className="px-5 pt-4 pb-1 font-sans text-subhead font-semibold text-label-2 shadow-[inset_0_0.5px_0_var(--separator)] md:px-0">{g.label}</h2>
            <ul>
              {g.rows.map((r, i) => (
                <TaskRow key={r.id} r={r} last={i === g.rows.length - 1} past={g.label === "Encerradas"} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <button type="button" onClick={() => setOpen(true)} className="mt-3 flex items-center gap-2 py-2 text-body font-medium text-accent">
        <span className="flex size-[22px] items-center justify-center rounded-full bg-accent text-white">
          <Plus aria-hidden className="size-4" strokeWidth={3} />
        </span>
        Nova tarefa
      </button>
      <NewTaskSheet open={open} onClose={() => setOpen(false)} classes={classes} />
    </>
  );
}

function TaskRow({ r, last, past }: { r: Row; last: boolean; past: boolean }) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const today = todayISO();
  const remove = () =>
    start(async () => {
      setGone(true);
      const res = await deleteTaskAction(r.id);
      if (!res.ok) {
        setGone(false);
        return toast({ title: "Não foi possível apagar", tone: "error" });
      }
      toast({
        title: "Tarefa apagada",
        description: "Ela também saiu da agenda das famílias.",
        tone: "info",
        action: {
          label: "Desfazer",
          onClick: async () => {
            const back = await restoreTaskAction(r.id);
            if (back.ok) {
              setGone(false);
              router.refresh();
            } else toast({ title: "Não foi mais possível desfazer", tone: "error" });
          },
        },
      });
      router.refresh();
    });
  if (gone) return null;
  return (
    <li>
      <SwipeRow label={r.title} actions={[{ label: "Apagar", icon: Trash2, tint: "var(--critical)", destructive: true, onAction: remove }]}>
    <div className={cn("group flex items-start gap-3.5 pl-5 md:pl-0", pending && "opacity-50")}>
      <ProgressRing value={r.done} total={r.total} />
      <div className={cn("min-w-0 flex-1 py-[11px] pr-4", !last && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
        <div className="flex items-start gap-2">
          <p className={cn("flex-1 text-body", past && "text-label-2")}>{r.title}</p>
          <button
            type="button"
            aria-label={`Apagar ${r.title}`}
            onClick={remove}
            className="rounded-full p-1 text-label-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-critical-ink focus:opacity-100"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        <p className="mt-0.5 text-subhead text-label-2">
          {r.className} · {taskKinds[r.kind]}
          {r.dueOn && (
            <>
              {" – "}
              <span className={cn(r.dueOn <= today && !past ? "text-critical-ink" : "")}>{formatRelativeDay(r.dueOn)}</span>
            </>
          )}
        </p>
        {r.instructions && <p className="mt-0.5 line-clamp-1 text-subhead text-label-2">{r.instructions}</p>}
        <p className="mt-1 text-footnote text-label-2">
          {r.done > 0 ? `${r.done} de ${r.total} famílias concluíram` : "Nenhuma família concluiu ainda"}
          {r.acceptsSubmissions ? " · aceita envio de foto" : ""}
          {r.links.length ? ` · ${r.links.length} link${r.links.length > 1 ? "s" : ""}` : ""}
        </p>
      </div>
    </div>
      </SwipeRow>
    </li>
  );
}

function NewTaskSheet({ open, onClose, classes }: { open: boolean; onClose: () => void; classes: { id: string; name: string }[] }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [kind, setKind] = useState<keyof typeof taskKinds>("casa");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueOn, setDueOn] = useState(addDays(todayISO(), 2));
  const [links, setLinks] = useState<{ url: string; title: string }[]>([]);
  const [accepts, setAccepts] = useState(false);
  const [files, setFiles] = useState<{ id: string; name: string; mime: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nova tarefa"
      footer={
        <Button
          size="lg"
          loading={pending}
          disabled={!title.trim()}
          onClick={() =>
            start(async () => {
              const res = await createTaskAction({ classId, kind, title, instructions, dueOn, links: links.filter((l) => l.url), acceptsSubmissions: accepts, mediaIds: files.map((f) => f.id) });
              if (!res.ok) return toast({ title: res.error, tone: "error" });
              toast({ title: "Tarefa publicada", description: "Já aparece na agenda das famílias." });
              setTitle("");
              setInstructions("");
              setLinks([]);
              setFiles([]);
              onClose();
              router.refresh();
            })
          }
        >
          Publicar
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-3 rounded-xl bg-surface p-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" aria-label="Título" autoFocus className="w-full bg-transparent text-headline outline-none placeholder:text-label-3" />
          <TextArea bare value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Orientações para a família e o aluno" aria-label="Orientações" rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Turma" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Tipo" value={kind} onChange={(e) => setKind(e.target.value as keyof typeof taskKinds)}>
            {Object.entries(taskKinds).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <TextField label="Data de entrega" type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} min={todayISO()} />

        <div className="space-y-2">
          {links.map((l, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-surface px-3">
              <Link2 aria-hidden className="size-4 text-label-2" />
              <input value={l.url} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://" aria-label="Endereço do link" inputMode="url" className="h-11 flex-1 bg-transparent text-callout outline-none" />
              <input value={l.title} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Nome" aria-label="Nome do link" className="h-11 w-28 bg-transparent text-callout outline-none" />
              <button type="button" aria-label="Remover link" onClick={() => setLinks(links.filter((_, j) => j !== i))} className="text-label-3">
                <X className="size-4" />
              </button>
            </div>
          ))}
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-callout">
              <FileText aria-hidden className="size-4 text-label-2" />
              <span className="flex-1 truncate">{f.name}</span>
              <button type="button" aria-label="Remover arquivo" onClick={() => setFiles(files.filter((x) => x.id !== f.id))} className="text-label-3">
                <X className="size-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="gray" size="sm" icon={Link2} onClick={() => setLinks([...links, { url: "", title: "" }])}>
              Link
            </Button>
            <label className="press inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-fill px-3 text-subhead font-semibold hover:bg-fill-2">
              {uploading ? <Spinner className="size-4" /> : <Paperclip aria-hidden className="size-4" strokeWidth={2.1} />}
              PDF ou imagem
              <input
                type="file"
                accept="application/pdf,image/*"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploading(true);
                  const fd = new FormData();
                  fd.set("file", f);
                  const res = await uploadFileAction(fd);
                  setUploading(false);
                  if (res.ok) setFiles([...files, { id: res.id, name: res.name, mime: res.mime }]);
                  else toast({ title: res.error, tone: "error" });
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl bg-surface px-4 py-3">
          <span>
            <span className="block text-callout">Família pode enviar foto</span>
            <span className="block text-footnote text-label-2">Para atividades feitas no papel ou em casa</span>
          </span>
          <Toggle checked={accepts} onChange={setAccepts} label="Família pode enviar foto" />
        </div>
      </div>
    </Sheet>
  );
}
