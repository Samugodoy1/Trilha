"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Select, TextArea, TextField } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { completeTaskAction, uploadFileAction } from "@/server/actions/tasks";
import { addContributionAction, markAnnouncementsReadAction, markFeedbackReadAction, respondAnnouncementAction } from "@/server/actions/family";
import { startConversationAction } from "@/server/actions/messages";
import { contributionKinds, conversationCategories, type ConversationCategory } from "@/lib/vocabulary";

export function TaskCheck({ taskId, studentId, done, title, acceptsSubmissions }: { taskId: string; studentId: string; done: boolean; title: string; acceptsSubmissions: boolean }) {
  const [checked, setChecked] = useState(done);
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState("");
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const submit = (value: boolean, extra?: { note?: string; mediaId?: string }) =>
    start(async () => {
      setChecked(value);
      const res = await completeTaskAction({ taskId, studentId, done: value, ...extra });
      if (!res.ok) {
        setChecked(!value);
        toast({ title: "Não foi possível atualizar", tone: "error" });
      } else router.refresh();
    });
  return (
    <>
      <CheckCircle
        checked={checked}
        label={`Marcar “${title}” como feita`}
        onChange={(v) => {
          if (v && acceptsSubmissions) setSheet(true);
          else submit(v);
        }}
      />
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Tarefa feita" description={title} size="sm">
        <div className="space-y-4">
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[16px] bg-surface text-label-2">
            {mediaId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/media/${mediaId}`} alt="Foto enviada" className="size-full object-cover" />
            ) : uploading ? (
              <Spinner />
            ) : (
              <>
                <Camera aria-hidden className="size-8 text-accent" strokeWidth={1.8} />
                <span className="text-callout font-medium">Enviar uma foto (opcional)</span>
              </>
            )}
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                const fd = new FormData();
                fd.set("file", f);
                const res = await uploadFileAction(fd);
                setUploading(false);
                if (res.ok) setMediaId(res.id);
                else toast({ title: res.error, tone: "error" });
              }}
            />
          </label>
          <TextField label="Recado para a professora (opcional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: fez sozinho!" />
          <Button
            size="lg"
            loading={pending}
            onClick={() => {
              submit(true, { note, mediaId: mediaId ?? undefined });
              setSheet(false);
            }}
          >
            Marcar como feita
          </Button>
        </div>
      </Sheet>
    </>
  );
}

export function AnnouncementActions({
  announcementId,
  studentId,
  isAuthorization,
  requiresConfirmation,
  response,
}: {
  announcementId: string;
  studentId: string;
  isAuthorization: boolean;
  requiresConfirmation: boolean;
  response: { confirmedAt: string | null; authorization: "granted" | "denied" | null } | null;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState(response);
  const router = useRouter();
  const toast = useToast();
  const answer = (a: "confirm" | "granted" | "denied") =>
    start(async () => {
      const res = await respondAnnouncementAction({ announcementId, studentId, answer: a });
      if (!res.ok) return toast({ title: "Não foi possível responder", tone: "error" });
      setState({ confirmedAt: new Date().toISOString(), authorization: a === "confirm" ? state?.authorization ?? null : a });
      toast({ title: a === "granted" ? "Autorização enviada" : a === "denied" ? "Resposta enviada" : "Presença confirmada" });
      router.refresh();
    });
  if (isAuthorization) {
    if (state?.authorization)
      return (
        <p className={cn("flex items-center gap-1.5 text-subhead font-semibold", state.authorization === "granted" ? "text-positive-ink" : "text-label-2")}>
          <Check aria-hidden className="size-4" strokeWidth={2.8} />
          {state.authorization === "granted" ? "Vocês autorizaram" : "Vocês não autorizaram"}
          <button type="button" onClick={() => answer(state.authorization === "granted" ? "denied" : "granted")} className="ml-2 font-normal text-accent">
            Alterar
          </button>
        </p>
      );
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => answer("granted")} loading={pending}>
          Autorizar
        </Button>
        <Button size="sm" variant="gray" onClick={() => answer("denied")} disabled={pending}>
          Não autorizar
        </Button>
      </div>
    );
  }
  if (requiresConfirmation) {
    if (state?.confirmedAt)
      return (
        <p className="flex items-center gap-1.5 text-subhead font-semibold text-positive-ink">
          <Check aria-hidden className="size-4" strokeWidth={2.8} /> Presença confirmada
        </p>
      );
    return (
      <Button size="sm" variant="tinted" onClick={() => answer("confirm")} loading={pending}>
        Confirmar presença
      </Button>
    );
  }
  return null;
}

export function MarkAnnouncementsRead({ studentId, ids }: { studentId: string; ids: string[] }) {
  useEffect(() => {
    if (ids.length) void markAnnouncementsReadAction(studentId, ids);
  }, [studentId, ids]);
  return null;
}

export function MarkFeedbackRead({ studentId }: { studentId: string }) {
  useEffect(() => {
    const t = setTimeout(() => void markFeedbackReadAction(studentId), 2000);
    return () => clearTimeout(t);
  }, [studentId]);
  return null;
}

export function ContributionForm({ studentId, firstName }: { studentId: string; firstName: string }) {
  const [kind, setKind] = useState<keyof typeof contributionKinds>("leitura");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="space-y-3 rounded-[20px] bg-surface p-4 shadow-e1">
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
        {(Object.keys(contributionKinds) as (keyof typeof contributionKinds)[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={k === kind}
            onClick={() => setKind(k)}
            className={cn("press h-8 shrink-0 rounded-full px-3.5 text-subhead font-semibold", k === kind ? "bg-label text-canvas" : "bg-fill")}
          >
            {contributionKinds[k]}
          </button>
        ))}
      </div>
      <TextArea bare value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={`Conte para a professora o que ${firstName} fez ou disse em casa.`} aria-label="Relato" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-footnote text-label-2">Só a escola de {firstName} vê.</p>
        <Button
          size="sm"
          icon={PenLine}
          loading={pending}
          disabled={body.trim().length < 3}
          onClick={() =>
            start(async () => {
              const res = await addContributionAction({ studentId, kind, body });
              if (!res.ok) return toast({ title: res.error ?? "Erro", tone: "error" });
              setBody("");
              toast({ title: "Compartilhado com a escola" });
              router.refresh();
            })
          }
        >
          Compartilhar
        </Button>
      </div>
    </div>
  );
}

export function NewConversationButton({
  studentId,
  teachers,
}: {
  studentId: string;
  teachers: { id: string; name: string; label: string; officeText: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [category, setCategory] = useState<ConversationCategory>("recado");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const teacher = teachers.find((t) => t.id === teacherId);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Nova mensagem" className="flex size-9 items-center justify-center rounded-full bg-fill text-accent hover:bg-fill-2">
        <PenLine className="size-[18px]" />
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Nova mensagem"
        footer={
          <Button
            size="lg"
            loading={pending}
            disabled={!subject.trim() || !body.trim()}
            onClick={() =>
              start(async () => {
                const res = await startConversationAction({ studentId, teacherId, category, subject, body });
                if (!res.ok) return toast({ title: res.error, tone: "error" });
                setOpen(false);
                router.push(`/familia/mensagens/${res.id}`);
              })
            }
          >
            Enviar
          </Button>
        }
      >
        <div className="space-y-4">
          {teachers.length > 1 && (
            <Select label="Para" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.label}
                </option>
              ))}
            </Select>
          )}
          <div className="space-y-2">
            <p className="px-1 text-subhead font-medium text-label-2">Sobre o quê?</p>
            <div className="overflow-hidden rounded-[12px] bg-surface">
              {(Object.keys(conversationCategories) as ConversationCategory[]).map((c, i, arr) => (
                <button key={c} type="button" role="radio" aria-checked={c === category} onClick={() => setCategory(c)} className="flex w-full items-center gap-3 pl-4 text-left">
                  <span className={cn("flex flex-1 items-center py-2.5 pr-4", i < arr.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
                    <span className="flex-1">
                      <span className="block text-body">{conversationCategories[c].label}</span>
                      <span className="block text-footnote text-label-2">{conversationCategories[c].hint}</span>
                    </span>
                    {c === category && <Check aria-hidden className="size-5 text-accent" strokeWidth={2.6} />}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <TextField label="Assunto" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex.: Consulta médica na sexta" />
          <TextArea label="Mensagem" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          {teacher && <p className="text-footnote text-label-2">{teacher.officeText}</p>}
        </div>
      </Sheet>
    </>
  );
}
