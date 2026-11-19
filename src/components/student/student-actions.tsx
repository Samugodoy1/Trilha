"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ChartColumnIncreasing,
  Copy,
  FileText,
  ImagePlus,
  Ellipsis,
  MessageSquareHeart,
  NotebookPen,
  Share,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { Sheet } from "@/components/ui/sheet";
import { SegmentedControl, Select, TextArea, TextField } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { Disclosure, Tag } from "@/components/ui/misc";
import { QuickRecord } from "@/components/teacher/quick-record";
import { cn } from "@/lib/cn";
import { feedbackTones, portfolioKinds, type FeedbackTone } from "@/lib/vocabulary";
import { todayISO } from "@/lib/format";
import {
  addPortfolioItemAction,
  createGuardianInviteAction,
  saveFeedbackAction,
  suggestFeedbackAction,
} from "@/server/actions/student";
import type { GroundedDraft } from "@/server/ai";

function ActionTile({ icon: Icon, label, ...rest }: { icon: typeof NotebookPen; label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} className="press flex h-[60px] flex-col items-center justify-center gap-1 rounded-[14px] bg-surface-2 text-accent outline-none hover:brightness-[0.98] dark:bg-surface">
      <Icon aria-hidden className="size-5" strokeWidth={2.2} />
      <span className="text-caption font-semibold">{label}</span>
    </button>
  );
}

export function StudentTabs({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const go = (v: string) =>
    start(() => {
      const p = new URLSearchParams(params);
      if (v === options[0].value) p.delete("aba");
      else p.set("aba", v);
      router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false });
    });
  return (
    <div role="tablist" aria-label="Seções" className={cn("scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0", pending && "opacity-70")}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => go(o.value)}
            className={cn("press h-9 shrink-0 rounded-full px-4 text-subhead font-semibold transition-colors", on ? "bg-label text-canvas" : "bg-fill text-label hover:bg-fill-2")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function StudentActions({
  studentId,
  classId,
  firstName,
  guardians,
  canInvite,
  imageConsent,
}: {
  studentId: string;
  classId?: string;
  firstName: string;
  guardians: string[];
  canInvite: boolean;
  imageConsent: boolean;
}) {
  const [record, setRecord] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [invite, setInvite] = useState(false);
  const [portfolio, setPortfolio] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="grid w-full max-w-md grid-cols-3 gap-2">
        <ActionTile icon={NotebookPen} label="Registrar" onClick={() => setRecord(true)} />
        <ActionTile icon={MessageSquareHeart} label="Feedback" onClick={() => setFeedback(true)} />
        <Menu
          label="Mais ações"
          items={[
            { label: "Comparar bimestres", icon: ChartColumnIncreasing, href: `/alunos/${studentId}/comparar` },
            { label: "Gerar parecer", icon: FileText, href: `/relatorios/novo?aluno=${studentId}` },
            { label: "Adicionar ao portfólio", icon: ImagePlus, onSelect: () => setPortfolio(true) },
            ...(canInvite ? [{ separator: true } as const, { label: "Convidar responsável", icon: UserPlus, onSelect: () => setInvite(true) }] : []),
          ]}
        >
          {(p) => <ActionTile {...p} icon={Ellipsis} label="Mais" />}
        </Menu>
      </div>
      <QuickRecord open={record} onClose={() => setRecord(false)} initial={{ classId, studentIds: [studentId] }} />
      <FeedbackSheet open={feedback} onClose={() => setFeedback(false)} studentId={studentId} firstName={firstName} guardians={guardians} onSent={() => router.refresh()} />
      <InviteSheet open={invite} onClose={() => setInvite(false)} studentId={studentId} firstName={firstName} />
      <PortfolioSheet open={portfolio} onClose={() => setPortfolio(false)} studentId={studentId} imageConsent={imageConsent} />
    </>
  );
}

export function SourcesList({ draft }: { draft: GroundedDraft }) {
  if (!draft.sources.length) return null;
  return (
    <Disclosure summary={`Fundamentado em ${draft.sources.length} ${draft.sources.length === 1 ? "registro" : "registros"}`}>
      <ul className="space-y-2">
        {draft.sources.map((s) => (
          <li key={s.key} className="rounded-[12px] bg-surface-2 px-3 py-2">
            <p className="text-footnote font-semibold">
              <span className="mr-1.5 font-mono text-label-2">{s.key}</span>
              {s.label}
            </p>
            <p className="line-clamp-3 text-footnote text-label-2">{s.text}</p>
          </li>
        ))}
      </ul>
    </Disclosure>
  );
}

function FeedbackSheet({
  open,
  onClose,
  studentId,
  firstName,
  guardians,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  firstName: string;
  guardians: string[];
  onSent: () => void;
}) {
  const toast = useToast();
  const [tone, setTone] = useState<FeedbackTone>("conquista");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [draft, setDraft] = useState<GroundedDraft | null>(null);
  const [suggesting, startSuggest] = useTransition();
  const [saving, startSave] = useTransition();

  const suggest = () =>
    startSuggest(async () => {
      const res = await suggestFeedbackAction(studentId, tone);
      if ("error" in res) return toast({ title: res.error, tone: "error" });
      setDraft(res);
      setBody(res.paragraphs.map((p) => p.text).join("\n\n"));
      if (!title) setTitle(`${feedbackTones[tone].label}: ${firstName}`);
      if (res.gaps.length) toast({ title: "Sugestão parcial", description: res.gaps[0], tone: "info" });
    });

  const save = (publish: boolean) =>
    startSave(async () => {
      const res = await saveFeedbackAction({ studentId, tone, title, body, publish, aiAssisted: Boolean(draft) });
      if (!res.ok) return toast({ title: res.error, tone: "error" });
      toast({ title: publish ? "Feedback enviado" : "Rascunho guardado", description: publish ? `${guardians.join(" e ") || "A família"} vai receber no Trilha.` : undefined });
      setTitle("");
      setBody("");
      setDraft(null);
      onSent();
      onClose();
    });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Feedback para a família`}
      description={firstName}
      footer={
        <div className="flex gap-2">
          <Button variant="gray" size="lg" className="flex-1" onClick={() => save(false)} disabled={saving || !body.trim()}>
            Guardar rascunho
          </Button>
          <Button size="lg" className="flex-1" onClick={() => save(true)} loading={saving} disabled={!body.trim() || !title.trim() || guardians.length === 0}>
            Enviar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div role="radiogroup" aria-label="Tom" className="flex flex-wrap gap-2">
          {(Object.keys(feedbackTones) as FeedbackTone[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={t === tone}
              onClick={() => setTone(t)}
              className={cn("press h-8 rounded-full px-3.5 text-subhead font-medium", t === tone ? "bg-label text-canvas" : "bg-fill hover:bg-fill-2")}
            >
              {feedbackTones[t].label}
            </button>
          ))}
        </div>
        <p className="-mt-2 text-footnote text-label-2">{feedbackTones[tone].prompt}. Compartilhar conquistas aproxima a família — não apenas os problemas.</p>

        <button
          type="button"
          onClick={suggest}
          disabled={suggesting}
          className="press flex w-full items-center gap-3 rounded-xl bg-surface p-3.5 text-left shadow-e1 hover:shadow-e2 disabled:opacity-60"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Sparkles aria-hidden className={cn("size-[18px]", suggesting && "animate-pulse")} strokeWidth={2.1} />
          </span>
          <span className="flex-1">
            <span className="block text-callout font-semibold">{suggesting ? "Lendo os registros…" : "Sugerir a partir dos registros"}</span>
            <span className="block text-footnote text-label-2">Um rascunho com base no que você já registrou. Você revisa tudo antes de enviar.</span>
          </span>
        </button>

        {draft && (
          <div className="flex items-center gap-2">
            <Tag tone="accent" icon={Sparkles}>
              Rascunho sugerido
            </Tag>
            <span className="text-footnote text-label-2">{draft.engine === "claude" ? "Redigido com Claude, com nomes ocultados" : "Composto localmente a partir dos seus registros"}</span>
          </div>
        )}

        <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Ex.: ${firstName} leu sozinho hoje!`} />
        <TextArea label="Mensagem" value={body} onChange={(e) => setBody(e.target.value)} rows={6} hint="Trechos entre colchetes são lembretes para você completar." />
        {draft && <SourcesList draft={draft} />}
        <p className="text-footnote text-label-2">
          {guardians.length ? `Será enviado para ${guardians.join(" e ")}.` : "Este aluno ainda não tem responsáveis cadastrados. Convide a família primeiro."}
        </p>
      </div>
    </Sheet>
  );
}

function InviteSheet({ open, onClose, studentId, firstName }: { open: boolean; onClose: () => void; studentId: string; firstName: string }) {
  const toast = useToast();
  const router = useRouter();
  const [relationship, setRelationship] = useState("Mãe");
  const [name, setName] = useState("");
  const [result, setResult] = useState<{ code: string; expiresAt: string } | null>(null);
  const [pending, start] = useTransition();
  const link = result && typeof window !== "undefined" ? `${window.location.origin}/convite?codigo=${result.code}` : "";

  return (
    <Sheet
      open={open}
      onClose={() => {
        onClose();
        setTimeout(() => setResult(null), 300);
      }}
      title="Convidar responsável"
      description={firstName}
      size="sm"
    >
      {!result ? (
        <div className="space-y-4">
          <Select label="Parentesco" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
            {["Mãe", "Pai", "Avó", "Avô", "Tia", "Tio", "Responsável legal"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
          <TextField label="Nome (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
          <p className="text-footnote text-label-2">
            O convite gera um código de uso único, válido por 14 dias. Para aceitar, o responsável precisa confirmar a data de nascimento de {firstName} — saber
            apenas o nome da criança não basta.
          </p>
          <Button
            size="lg"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await createGuardianInviteAction({ studentId, relationship, recipientName: name });
                if (!res.ok) return toast({ title: res.error, tone: "error" });
                setResult({ code: res.code, expiresAt: res.expiresAt });
                router.refresh();
              })
            }
          >
            Gerar convite
          </Button>
        </div>
      ) : (
        <div className="space-y-5 text-center">
          <p className="text-callout text-label-2">Entregue este código ao responsável. Ele aparece somente agora.</p>
          <p className="rounded-xl bg-surface py-5 font-mono text-title-1 tracking-[0.08em] shadow-e1 select-all">{result.code}</p>
          <div className="flex gap-2">
            <Button
              variant="gray"
              icon={Copy}
              className="flex-1"
              onClick={async () => {
                await navigator.clipboard?.writeText(`Convite do Trilha para acompanhar ${firstName}: ${link}`);
                toast({ title: "Copiado" });
              }}
            >
              Copiar
            </Button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button variant="gray" icon={Share} className="flex-1" onClick={() => navigator.share({ title: "Convite do Trilha", text: `Código: ${result.code}`, url: link }).catch(() => undefined)}>
                Compartilhar
              </Button>
            )}
          </div>
          <p className="text-footnote text-label-2">Válido até {new Date(result.expiresAt).toLocaleDateString("pt-BR")}. Você pode revogar a qualquer momento no perfil do aluno.</p>
        </div>
      )}
    </Sheet>
  );
}

function PortfolioSheet({ open, onClose, studentId, imageConsent }: { open: boolean; onClose: () => void; studentId: string; imageConsent: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [visibility, setVisibility] = useState<"private" | "family">("family");
  const [kind, setKind] = useState("desenho");
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <Sheet open={open} onClose={onClose} title="Adicionar ao portfólio">
      <form
        className="space-y-4"
        action={(form) =>
          start(async () => {
            form.set("studentId", studentId);
            form.set("visibility", visibility);
            const res = await addPortfolioItemAction(form);
            if (!res.ok) return toast({ title: res.error ?? "Não foi possível salvar", tone: "error" });
            toast({ title: "Adicionado ao portfólio" });
            setPreview(null);
            router.refresh();
            onClose();
          })
        }
      >
        <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-surface text-label-2 shadow-e1 hover:bg-surface-2">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <>
              <ImagePlus aria-hidden className="size-8 text-accent" strokeWidth={1.8} />
              <span className="text-callout font-medium">Foto ou arquivo da produção</span>
              <span className="text-footnote">JPG, PNG, HEIC ou PDF · até 10 MB</span>
            </>
          )}
          <input
            type="file"
            name="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        <TextField name="title" label="Título" required placeholder="Ex.: Meu primeiro bilhete" />
        <div className="grid grid-cols-2 gap-3">
          <Select name="kind" label="Tipo" value={kind} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(portfolioKinds).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <TextField name="date" type="date" label="Data" defaultValue={todayISO()} max={todayISO()} />
        </div>
        <TextArea name="description" label="Sobre esta produção (opcional)" rows={2} />
        <SegmentedControl
          label="Quem pode ver"
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: "family", label: "Família" },
            { value: "private", label: "Somente eu" },
          ]}
        />
        {!imageConsent && kind === "foto" && visibility === "family" && (
          <p className="text-footnote text-warning-ink">A família não autorizou o uso de imagem. Fotografias deste aluno só podem ser guardadas como privadas.</p>
        )}
        <Button type="submit" size="lg" loading={pending}>
          Adicionar
        </Button>
      </form>
    </Sheet>
  );
}
