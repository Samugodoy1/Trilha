"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, Clock, Copy, Printer, Share, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { SegmentedControl, TextField } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { InviteSheet } from "@/components/student/student-actions";
import { createClassInvitesAction, createStaffInviteAction, revokeStaffInviteAction } from "@/server/actions/team";
import { cn } from "@/lib/cn";

const origin = () => (typeof window === "undefined" ? "" : window.location.origin);
const canShare = () => typeof navigator !== "undefined" && "share" in navigator;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

/** O código grande, como na tela de pareamento do iPhone, com Copiar e Compartilhar. */
function CodeBlock({ code, text, url }: { code: string; text: string; url: string }) {
  const toast = useToast();
  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-surface-2 py-5 text-center font-mono text-title-1 tracking-[0.08em] select-all dark:bg-surface">{code}</p>
      <div className="flex gap-2">
        <Button
          variant="gray"
          icon={Copy}
          className="min-w-0 flex-1"
          onClick={async () => {
            await navigator.clipboard?.writeText(`${text}\n${url}`);
            toast({ title: "Convite copiado", description: "Cole no WhatsApp ou no e-mail." });
          }}
        >
          Copiar
        </Button>
        {canShare() && (
          <Button variant="gray" icon={Share} className="min-w-0 flex-1" onClick={() => navigator.share({ title: "Convite do Trilha", text, url }).catch(() => undefined)}>
            Compartilhar
          </Button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Equipe da escola ───────────────────────── */

export function TeamInviteSheet({ open, onClose, defaultRole = "teacher", onCreated }: { open: boolean; onClose: () => void; defaultRole?: "teacher" | "coordinator"; onCreated?: () => void }) {
  const [role, setRole] = useState<"teacher" | "coordinator">(defaultRole);
  const [name, setName] = useState("");
  const [result, setResult] = useState<{ code: string; expiresAt: string; school: string } | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (open) setRole(defaultRole);
  }, [open, defaultRole]);
  const who = role === "teacher" ? "professor(a)" : "coordenação";

  return (
    <Sheet
      open={open}
      onClose={() => {
        onClose();
        setTimeout(() => {
          setResult(null);
          setName("");
        }, 300);
      }}
      title={result ? "Convite pronto" : "Convidar para a equipe"}
      size="sm"
    >
      {!result ? (
        <div className="space-y-5">
          <SegmentedControl
            label="Função"
            value={role}
            onChange={setRole}
            options={[
              { value: "teacher", label: "Professor(a)" },
              { value: "coordinator", label: "Coordenação" },
            ]}
          />
          <TextField label="Nome (opcional)" value={name} onChange={(e) => setName(e.target.value)} placeholder="Para você lembrar a quem enviou" />
          <p className="text-footnote text-label-2">
            {role === "coordinator"
              ? "A coordenação acompanha as turmas da escola, mas só vê os registros que cada professor decidir compartilhar."
              : "O professor cria as próprias turmas e alunos. Os registros dele começam privados."}{" "}
            O código vale uma única vez, por 14 dias.
          </p>
          <Button
            size="lg"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await createStaffInviteAction({ role, recipientName: name });
                if (!r.ok) return toast({ title: r.error, tone: "error" });
                setResult({ code: r.code, expiresAt: r.expiresAt, school: r.school });
                onCreated?.();
                router.refresh();
              })
            }
          >
            Gerar convite
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-center text-callout text-label-2">
            Envie para {name.trim() || `a pessoa da ${who}`}. Ela abre o link, cria a conta e já entra na {result.school}.
          </p>
          <CodeBlock
            code={result.code}
            url={`${origin()}/convite?codigo=${result.code}`}
            text={`Olá${name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}! Você foi convidado(a) para a equipe da ${result.school} no Trilha, como ${who}. Código: ${result.code}`}
          />
          <p className="text-center text-footnote text-label-2">Válido até {fmtDate(result.expiresAt)}. O código aparece só agora.</p>
        </div>
      )}
    </Sheet>
  );
}

export function TeamInviteButton({ role = "teacher", label = "Convidar", variant = "tinted" }: { role?: "teacher" | "coordinator"; label?: string; variant?: "tinted" | "row" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "row" ? (
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-body text-accent outline-none hover:bg-fill/50 focus-visible:bg-fill">
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-accent text-white">
            <UserPlus aria-hidden className="size-[16px]" strokeWidth={2.4} />
          </span>
          {label}
        </button>
      ) : (
        <Button size="sm" variant="tinted" icon={UserPlus} onClick={() => setOpen(true)}>
          {label}
        </Button>
      )}
      <TeamInviteSheet open={open} onClose={() => setOpen(false)} defaultRole={role} />
    </>
  );
}

export function RevokeStaffInviteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await revokeStaffInviteAction(id);
          router.refresh();
        })
      }
      className="rounded-full px-3 py-1 text-subhead font-medium text-critical-ink hover:bg-fill disabled:opacity-40"
    >
      Cancelar
    </button>
  );
}

/* ───────────────────────── Famílias da turma ───────────────────────── */

type FamilyRow = {
  id: string;
  name: string;
  hue: number;
  hasBirthDate: boolean;
  guardians: { name: string; relationship: string }[];
  inviteExpiresAt: string | null;
  status: "connected" | "invited" | "none";
};

type Batch = { school: string; expiresAt: string; invites: { studentId: string; name: string; firstName: string; code: string; hasBirthDate: boolean }[] };

export function ClassFamilies({ classId, className, rows, canInvite }: { classId: string; className: string; rows: FamilyRow[]; canInvite: boolean }) {
  const [single, setSingle] = useState<FamilyRow | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const connected = rows.filter((r) => r.status === "connected").length;
  const missing = rows.filter((r) => r.status === "none");
  const pct = rows.length ? connected / rows.length : 0;

  const invite = (ids: string[]) =>
    start(async () => {
      const r = await createClassInvitesAction(classId, ids);
      if (!r.ok) return toast({ title: r.error, tone: "error" });
      setBatch({ school: r.school, expiresAt: r.expiresAt, invites: r.invites });
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-4 rounded-xl bg-surface p-4 shadow-e1">
        <Ring value={pct} />
        <div className="min-w-0 flex-1">
          <p className="text-headline">
            {connected} de {rows.length} famílias conectadas
          </p>
          <p className="text-subhead text-label-2">
            {missing.length ? `${missing.length} ainda sem convite. Cada família recebe um código próprio.` : connected === rows.length ? "Todas as famílias já acompanham a turma." : "Os convites restantes estão aguardando as famílias."}
          </p>
        </div>
      </section>

      {canInvite && missing.length > 0 && (
        <Button size="lg" icon={Users} loading={pending} onClick={() => invite(missing.map((m) => m.id))}>
          Convidar {missing.length === 1 ? "1 família" : `${missing.length} famílias`}
        </Button>
      )}

      <ul className="-mx-5 md:mx-0">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-3 pl-5 md:pl-0">
            <Avatar name={r.name} hue={r.hue} size="sm" />
            <div className={cn("flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-5 md:pr-0", i < rows.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body">{r.name}</p>
                <p className={cn("truncate text-footnote", r.status === "connected" ? "text-positive-ink" : r.status === "invited" ? "text-warning-ink" : "text-label-2")}>
                  {r.status === "connected" ? (
                    <>
                      <Check aria-hidden className="mr-1 inline size-3.5 align-[-2px]" strokeWidth={2.8} />
                      {r.guardians.map((g) => `${g.name.split(" ")[0]} (${g.relationship})`).join(", ")}
                    </>
                  ) : r.status === "invited" ? (
                    <>
                      <Clock aria-hidden className="mr-1 inline size-3.5 align-[-2px]" strokeWidth={2.4} />
                      Convite enviado · vale até {fmtDate(r.inviteExpiresAt!)}
                    </>
                  ) : (
                    "Ainda sem convite"
                  )}
                  {!r.hasBirthDate && r.status !== "connected" ? " · falta a data de nascimento" : ""}
                </p>
              </div>
              {canInvite && r.status !== "connected" && (
                <button
                  type="button"
                  onClick={() => setSingle(r)}
                  className="shrink-0 rounded-full bg-fill px-3.5 py-1.5 text-subhead font-semibold text-accent outline-none hover:bg-fill-2 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {r.status === "none" ? "Convidar" : "Reenviar"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-footnote text-label-2">
        Para entrar, o responsável digita o código e confirma a data de nascimento da criança: só saber o nome não basta. Gerar um convite novo cancela o anterior do mesmo aluno.
      </p>

      {single && <InviteSheet open onClose={() => setSingle(null)} studentId={single.id} firstName={single.name.split(" ")[0]} />}
      <BatchSheet batch={batch} className={className} onClose={() => setBatch(null)} />
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 52 52" className="size-[52px] shrink-0 -rotate-90" aria-hidden>
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--fill-2)" strokeWidth="6" />
      {value > 0 && <circle cx="26" cy="26" r={r} fill="none" stroke="var(--family)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${value * c} ${c}`} />}
    </svg>
  );
}

/** Convites em lote: compartilhar um a um (WhatsApp) ou imprimir bilhetes para a agenda. */
function BatchSheet({ batch, className, onClose }: { batch: Batch | null; className: string; onClose: () => void }) {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    document.documentElement.classList.add("printing-invites");
    const done = () => {
      document.documentElement.classList.remove("printing-invites");
      setPrinting(false);
    };
    window.addEventListener("afterprint", done, { once: true });
    const t = setTimeout(() => window.print(), 60);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", done);
      document.documentElement.classList.remove("printing-invites");
    };
  }, [printing]);
  if (!batch) return null;
  const url = `${origin()}/convite`;
  const host = origin().replace(/^https?:\/\//, "");

  return (
    <>
      <Sheet open onClose={onClose} title="Convites prontos" description={`${className} · válidos até ${fmtDate(batch.expiresAt)}`}>
        <div className="space-y-5">
          <p className="text-callout text-label-2">Os códigos aparecem só agora. Imprima os bilhetes para colar na agenda ou envie cada um pelo WhatsApp.</p>
          <Button size="lg" icon={Printer} onClick={() => setPrinting(true)}>
            Imprimir bilhetes
          </Button>
          <ul className="overflow-hidden rounded-xl bg-surface shadow-e1">
            {batch.invites.map((v, i) => (
              <li key={v.studentId} className={cn("flex items-center gap-3 px-4 py-3", i < batch.invites.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body">{v.name}</p>
                  <p className="font-mono text-subhead tracking-[0.06em] text-label-2">{v.code}</p>
                </div>
                <ShareCode invite={v} school={batch.school} url={url} />
              </li>
            ))}
          </ul>
        </div>
      </Sheet>
      {printing &&
        createPortal(
          <div data-print-area className="bg-white p-6 text-black">
            <div className="grid grid-cols-2 gap-4">
              {batch.invites.map((v) => (
                <div key={v.studentId} className="break-inside-avoid rounded-[12px] border border-dashed border-black/40 p-4">
                  <p className="text-[11px] font-semibold tracking-[0.04em] uppercase">{batch.school} · Trilha</p>
                  <p className="mt-1 text-[15px] font-bold">Para a família de {v.name}</p>
                  <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-[12px]">
                    <li>Acesse {host}/convite</li>
                    <li>Digite o código abaixo</li>
                    <li>Confirme a data de nascimento de {v.firstName}</li>
                  </ol>
                  <p className="mt-3 text-center font-mono text-[20px] font-bold tracking-[0.1em]">{v.code}</p>
                  <p className="mt-2 text-[10px]">Válido até {fmtDate(batch.expiresAt)}. Uso único. Não compartilhe com outras pessoas.</p>
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function ShareCode({ invite, school, url }: { invite: Batch["invites"][number]; school: string; url: string }) {
  const toast = useToast();
  const text = `Olá! Este é o convite da ${school} para acompanhar ${invite.firstName} no Trilha. Acesse ${url}?codigo=${invite.code} e confirme a data de nascimento de ${invite.firstName}.`;
  return (
    <button
      type="button"
      aria-label={`Enviar convite de ${invite.firstName}`}
      onClick={async () => {
        if (canShare()) await navigator.share({ title: "Convite do Trilha", text }).catch(() => undefined);
        else {
          await navigator.clipboard?.writeText(text);
          toast({ title: "Convite copiado" });
        }
      }}
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fill text-accent hover:bg-fill-2"
    >
      <Share aria-hidden className="size-[17px]" strokeWidth={2.2} />
    </button>
  );
}

/** No perfil do aluno: o aviso "família não conectada" já é o atalho para convidar. */
export function ConnectFamilyTag({ studentId, firstName }: { studentId: string; firstName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press inline-flex h-[22px] items-center gap-1 rounded-full px-2.5 text-caption font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={{ color: "var(--warning-ink)", background: "color-mix(in oklab, var(--warning-ink) 13%, transparent)" }}
      >
        Família não conectada · <span className="text-accent">Convidar</span>
      </button>
      <InviteSheet open={open} onClose={() => setOpen(false)} studentId={studentId} firstName={firstName} />
    </>
  );
}

export function InviteGuardianRow({ studentId, firstName }: { studentId: string; firstName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-body text-accent outline-none hover:bg-fill/50 focus-visible:bg-fill">
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <UserPlus aria-hidden className="size-[16px]" strokeWidth={2.4} />
        </span>
        Convidar responsável
      </button>
      <InviteSheet open={open} onClose={() => setOpen(false)} studentId={studentId} firstName={firstName} />
    </>
  );
}
