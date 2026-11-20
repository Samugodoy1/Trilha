"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, ChevronRight, RotateCcw, UserMinus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { deactivateMemberAction, reactivateMemberAction, transferClassesAction } from "@/server/actions/team";
import { cn } from "@/lib/cn";

export type Person = {
  userId: string;
  name: string;
  hue: number;
  email: string;
  roleText: string;
  classes: { id: string; name: string }[];
  since: string;
  deactivatedAt: string | null;
  isMe: boolean;
  /** Quem está vendo pode desativar/reativar/transferir esta pessoa. */
  manageable: boolean;
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

/** Linha de pessoa no estilo de Contatos; tocar abre a ficha. */
export function PersonRow({ p, last, teachers }: { p: Person; last: boolean; teachers: { userId: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 pl-4 text-left outline-none hover:bg-fill/50 focus-visible:bg-fill">
        <Avatar name={p.name} hue={p.hue} size="sm" />
        <span className={cn("flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-4", !last && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate text-body", p.deactivatedAt && "text-label-2")}>
              {p.name}
              {p.isMe && <span className="text-label-2"> (você)</span>}
            </span>
            <span className="block truncate text-subhead text-label-2">
              {p.deactivatedAt ? `Sem acesso desde ${new Date(p.deactivatedAt).toLocaleDateString("pt-BR")}` : p.roleText}
              {p.classes.length ? ` · ${p.classes.map((c) => c.name).join(", ")}` : ""}
            </span>
          </span>
          <ChevronRight aria-hidden className="size-[15px] shrink-0 text-label-3/70" strokeWidth={2.6} />
        </span>
      </button>
      <PersonSheet p={p} open={open} onClose={() => setOpen(false)} teachers={teachers.filter((t) => t.userId !== p.userId)} />
    </li>
  );
}

function PersonSheet({ p, open, onClose, teachers }: { p: Person; open: boolean; onClose: () => void; teachers: { userId: string; name: string }[] }) {
  const [mode, setMode] = useState<"view" | "deactivate" | "transfer">("view");
  const [to, setTo] = useState<string>("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const first = p.name.split(" ")[0];
  const close = () => {
    onClose();
    setTimeout(() => setMode("view"), 300);
  };

  return (
    <Sheet open={open} onClose={close} title={mode === "deactivate" ? `Desativar ${first}?` : mode === "transfer" ? "Transferir turmas" : p.name} size="sm">
      {mode === "view" && (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center">
            <Avatar name={p.name} hue={p.hue} size="xl" />
            <p className="mt-3 text-title-3">{p.name}</p>
            <p className="text-subhead text-label-2">{p.deactivatedAt ? "Sem acesso a esta escola" : p.roleText}</p>
          </div>
          <dl className="overflow-hidden rounded-xl bg-surface shadow-e1">
            <Info label="E-mail" value={p.email} />
            <Info label="Na escola desde" value={fmt(p.since)} />
            {p.deactivatedAt && <Info label="Desativado em" value={fmt(p.deactivatedAt)} />}
            <Info label="Turmas" value={p.classes.length ? p.classes.map((c) => c.name).join(", ") : "Nenhuma"} last />
          </dl>
          {p.manageable && (
            <div className="space-y-2">
              {p.classes.length > 0 && teachers.length > 0 && (
                <Button variant="gray" size="lg" icon={ArrowRightLeft} onClick={() => setMode("transfer")}>
                  Transferir turmas
                </Button>
              )}
              {p.deactivatedAt ? (
                <Button
                  size="lg"
                  icon={RotateCcw}
                  loading={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await reactivateMemberAction(p.userId);
                      if (!r.ok) return toast({ title: r.error ?? "Não foi possível concluir.", tone: "error" });
                      toast({ title: `${first} voltou a ter acesso` });
                      close();
                      router.refresh();
                    })
                  }
                >
                  Reativar acesso
                </Button>
              ) : (
                <Button variant="destructive" size="lg" icon={UserMinus} onClick={() => setMode("deactivate")}>
                  Desativar acesso
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {mode === "deactivate" && (
        <div className="space-y-5">
          <ul className="space-y-3 text-callout">
            <li>
              <span className="font-semibold">{first} perde o acesso agora.</span> <span className="text-label-2">Se estiver com o app aberto, a sessão é encerrada.</span>
            </li>
            <li className="text-label-2">Alunos, sondagens, avaliações e registros compartilhados continuam na escola. Registros privados seguem privados.</li>
            <li className="text-label-2">A conta dele não é apagada. Se for engano, você pode reativar depois.</li>
          </ul>
          {p.classes.length > 0 && (
            <Select label={`As turmas de ${first} (${p.classes.length}) passam para`} value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Ninguém por enquanto</option>
              {teachers.map((t) => (
                <option key={t.userId} value={t.userId}>
                  {t.name}
                </option>
              ))}
            </Select>
          )}
          <Button
            variant="destructive"
            size="lg"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await deactivateMemberAction({ userId: p.userId, transferTo: to || null });
                if (!r.ok) return toast({ title: r.error ?? "Não foi possível concluir.", tone: "error" });
                toast({ title: `Acesso de ${first} desativado`, description: r.moved ? `${r.moved} ${r.moved === 1 ? "turma transferida" : "turmas transferidas"}.` : undefined });
                close();
                router.refresh();
              })
            }
          >
            Desativar acesso de {first}
          </Button>
          <button type="button" onClick={() => setMode("view")} className="flex h-11 w-full items-center justify-center text-body font-medium text-accent">
            Cancelar
          </button>
        </div>
      )}

      {mode === "transfer" && (
        <div className="space-y-5">
          <p className="text-callout text-label-2">
            {p.classes.map((c) => c.name).join(", ")} {p.classes.length === 1 ? "passa" : "passam"} para outro professor, com as conversas das famílias dessas turmas. Os registros continuam com quem escreveu.
          </p>
          <Select label="Novo professor" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Escolha…</option>
            {teachers.map((t) => (
              <option key={t.userId} value={t.userId}>
                {t.name}
              </option>
            ))}
          </Select>
          <Button
            size="lg"
            loading={pending}
            disabled={!to}
            onClick={() =>
              start(async () => {
                const r = await transferClassesAction(p.userId, to);
                if (!r.ok) return toast({ title: r.error ?? "Não foi possível concluir.", tone: "error" });
                toast({ title: r.moved === 1 ? "Turma transferida" : `${r.moved} turmas transferidas` });
                close();
                router.refresh();
              })
            }
          >
            Transferir
          </Button>
          <button type="button" onClick={() => setMode("view")} className="flex h-11 w-full items-center justify-center text-body font-medium text-accent">
            Cancelar
          </button>
        </div>
      )}
    </Sheet>
  );
}

function Info({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className="pl-4">
      <div className={cn("py-2.5 pr-4", !last && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
        <dt className="text-footnote text-label-2">{label}</dt>
        <dd className="text-body break-words">{value}</dd>
      </div>
    </div>
  );
}
