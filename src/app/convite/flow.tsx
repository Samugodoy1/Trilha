"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, TextField } from "@/components/ui/fields";
import { acceptInviteAction, checkInviteAction, type InvitePreview } from "@/server/actions/invite";

export function InviteFlow({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState<Extract<InvitePreview, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [birth, setBirth] = useState("");
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();
  const staff = preview?.kind === "staff";

  if (!preview)
    return (
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await checkInviteAction(code);
            if (res.ok) setPreview(res);
            else setError(res.error);
          });
        }}
      >
        <div className="text-center">
          <h1 className="text-title-1">Convite da escola</h1>
          <p className="mt-2 text-callout text-label-2">Digite o código que você recebeu da escola — para acompanhar seu filho ou filha, ou para entrar na equipe.</p>
        </div>
        <TextField
          label="Código do convite"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          className="text-center font-mono text-title-3 tracking-[0.12em]"
          error={error}
        />
        <Button type="submit" size="lg" loading={pending} disabled={code.replace(/[^A-Z0-9]/gi, "").length < 8}>
          Continuar
        </Button>
        <p className="text-center text-subhead">
          <Link href="/entrar" className="text-accent">
            Já tenho acesso
          </Link>
        </p>
      </form>
    );

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await acceptInviteAction({ code, birthDate: staff ? undefined : birth, mode, name, email, password });
          if (!res.ok) return setError(res.error);
          window.location.assign(res.href);
          await new Promise(() => {});
        });
      }}
    >
      {preview.kind === "staff" ? (
        <div className="text-center">
          <p className="text-subhead font-semibold text-label-2">{preview.school}</p>
          <h1 className="mt-1 text-title-1">{preview.role === "teacher" ? "Entrar como professor(a)" : "Entrar na coordenação"}</h1>
          <p className="mt-2 text-callout text-label-2">
            {preview.invitedBy} convidou você para a equipe da escola no Trilha. Crie sua conta ou entre com a que você já tem.
          </p>
        </div>
      ) : (
        <>
          <div className="text-center">
            <p className="text-subhead font-semibold text-label-2">{preview.school}</p>
            <h1 className="mt-1 text-title-1">Acompanhar {preview.childFirstName}</h1>
            <p className="mt-2 text-callout text-label-2">Para sua segurança, confirme a data de nascimento de {preview.childFirstName}.</p>
          </div>
          <TextField label={`Data de nascimento de ${preview.childFirstName}`} type="date" value={birth} onChange={(e) => setBirth(e.target.value)} required />
        </>
      )}

      <SegmentedControl
        label="Conta"
        value={mode}
        onChange={setMode}
        options={[
          { value: "new", label: "Criar conta" },
          { value: "existing", label: "Já tenho conta" },
        ]}
      />
      {mode === "new" && <TextField label="Seu nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
      <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <TextField
        label="Senha"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === "new" ? "new-password" : "current-password"}
        hint={mode === "new" ? "Pelo menos 10 caracteres, com letras e números." : undefined}
      />
      {error && (
        <p role="alert" className="rounded-[12px] bg-[color-mix(in_oklab,var(--critical)_10%,transparent)] px-4 py-3 text-subhead text-critical-ink">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} disabled={(!staff && !birth) || !email || !password}>
        Confirmar e entrar
      </Button>
      <p className="flex items-start gap-2 text-footnote text-label-2">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive-ink" />
        {preview.kind === "staff"
          ? "Seus registros começam privados. A coordenação vê apenas o que você compartilhar. O código vale uma única vez."
          : `Você verá somente as informações de ${preview.childFirstName} compartilhadas pela escola. O código vale uma única vez.`}
      </p>
    </form>
  );
}
