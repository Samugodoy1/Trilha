"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, Select, TextField, Toggle } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { revokeMembershipAction, saveOfficeHoursAction, setThemeAction, updateSchoolAction } from "@/server/actions/settings";
import { changePasswordAction, logoutAction } from "@/server/actions/session";

export function ThemePicker({ value }: { value: "system" | "light" | "dark" }) {
  const [v, setV] = useState(value);
  const router = useRouter();
  return (
    <SegmentedControl
      label="Aparência"
      value={v}
      onChange={async (n) => {
        setV(n);
        await setThemeAction(n);
        if (n === "system") document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme", n);
        router.refresh();
      }}
      options={[
        { value: "system", label: "Automático" },
        { value: "light", label: "Claro" },
        { value: "dark", label: "Escuro" },
      ]}
    />
  );
}

const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function OfficeHoursForm({ initial }: { initial: { days: number[]; start: string; end: string; note?: string } }) {
  const [days, setDays] = useState(initial.days);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [pending, startT] = useTransition();
  const toast = useToast();
  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-1.5" role="group" aria-label="Dias">
        {DAYS.map((d, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={days.includes(i)}
            aria-label={DAY_NAMES[i]}
            onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}
            className={cn("press size-10 rounded-full text-subhead font-semibold", days.includes(i) ? "bg-accent text-white" : "bg-fill text-label")}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Das" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <TextField label="Até" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <Button
        variant="tinted"
        loading={pending}
        onClick={() =>
          startT(async () => {
            const res = await saveOfficeHoursAction({ days, start, end });
            toast(res.ok ? { title: "Horário salvo" } : { title: res.error ?? "Erro", tone: "error" });
          })
        }
      >
        Salvar horário
      </Button>
    </div>
  );
}

export function SchoolForm({ initial }: { initial: { aiEnabled: boolean; retentionYears: number; evaluationModel: "numeric" | "concept" | "descriptive" } }) {
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  const save = (next: typeof s) => {
    setS(next);
    start(async () => {
      const res = await updateSchoolAction(next);
      toast(res.ok ? { title: "Ajustes da escola salvos" } : { title: "Não foi possível salvar", tone: "error" });
    });
  };
  return (
    <div className={cn("space-y-4", pending && "opacity-70")}>
      <div className="flex items-center justify-between gap-4">
        <span>
          <span className="block text-callout">Redação assistida com Claude</span>
          <span className="block text-footnote text-label-2">Sem ela, o assistente funciona apenas localmente</span>
        </span>
        <Toggle checked={s.aiEnabled} onChange={(v) => save({ ...s, aiEnabled: v })} label="Redação assistida com Claude" />
      </div>
      <Select label="Modelo de avaliação padrão" value={s.evaluationModel} onChange={(e) => save({ ...s, evaluationModel: e.target.value as typeof s.evaluationModel })}>
        <option value="numeric">Notas numéricas</option>
        <option value="concept">Conceitos</option>
        <option value="descriptive">Avaliação descritiva</option>
      </Select>
      <Select label="Guardar registros por" value={s.retentionYears} onChange={(e) => save({ ...s, retentionYears: Number(e.target.value) })}>
        {[2, 3, 5, 10].map((y) => (
          <option key={y} value={y}>
            {y} anos após a saída do aluno
          </option>
        ))}
      </Select>
    </div>
  );
}

export function RevokeButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => (await revokeMembershipAction(id), router.refresh()))}
      className="rounded-full px-2.5 py-1 text-footnote font-semibold text-critical hover:bg-fill disabled:opacity-40"
    >
      Revogar
    </button>
  );
}

export function LogoutRow() {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => logoutAction())} className="flex w-full items-center justify-center gap-2 py-3 text-body text-critical">
      <LogOut aria-hidden className="size-[18px]" />
      Sair
    </button>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <div className="space-y-3">
      <TextField label="Senha atual" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <TextField label="Nova senha" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint="Pelo menos 10 caracteres, com letras e números." />
      <Button
        variant="tinted"
        loading={pending}
        disabled={!current || !next}
        onClick={() =>
          start(async () => {
            const res = await changePasswordAction({ current, next });
            if (!res.ok) return toast({ title: res.error ?? "Erro", tone: "error" });
            setCurrent("");
            setNext("");
            toast({ title: "Senha alterada", description: "Outras sessões abertas foram encerradas." });
          })
        }
      >
        Alterar senha
      </Button>
    </div>
  );
}
