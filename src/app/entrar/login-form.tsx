"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { loginAction } from "@/server/actions/session";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";
import { Avatar } from "@/components/ui/avatar";

const demo = [
  { email: "helena@trilha.demo", name: "Helena Prado", hue: 162, role: "Professora · 3º ano A" },
  { email: "rafael@trilha.demo", name: "Rafael Moura", hue: 214, role: "Matemática · 6º e 7º anos" },
  { email: "juliana@familia.demo", name: "Juliana Ribeiro", hue: 340, role: "Mãe do Lucas e da Sofia" },
  { email: "carlos@familia.demo", name: "Carlos Nunes", hue: 200, role: "Pai da Ana Clara" },
  { email: "marta@trilha.demo", name: "Marta Sales", hue: 280, role: "Coordenação pedagógica" },
  { email: "beatriz@trilha.demo", name: "Beatriz Lima", hue: 120, role: "Professora · outra escola" },
];

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const form = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-10">
      <form ref={form} action={action} className="space-y-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <TextField
          name="email"
          type="email"
          label="E-mail"
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={state?.fieldErrors?.email}
          required
        />
        <TextField
          name="password"
          type="password"
          label="Senha"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={state?.fieldErrors?.password}
          required
        />
        {state?.error && (
          <p role="alert" className="rounded-[12px] bg-[color-mix(in_oklab,var(--critical)_10%,transparent)] px-4 py-3 text-subhead text-critical">
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" loading={pending} className="mt-2">
          Entrar
        </Button>
        <div className="flex flex-col items-center gap-2 pt-2 text-subhead">
          <Link href="/convite" className="font-medium text-accent hover:underline">
            Recebi um convite da escola
          </Link>
          <Link href="/criar-conta" className="text-label-2 hover:text-label">
            Sou professor(a) e quero criar uma conta
          </Link>
        </div>
      </form>

      <section aria-labelledby="demo-h" className="space-y-2">
        <h2 id="demo-h" className="px-4 font-sans text-footnote font-medium uppercase tracking-[0.04em] text-label-2">
          Contas de demonstração
        </h2>
        <div className="overflow-hidden rounded-xl bg-surface shadow-e1">
          {demo.map((d, i) => (
            <button
              key={d.email}
              type="button"
              disabled={pending}
              onClick={() => {
                setEmail(d.email);
                setPassword("trilha2026");
                setTimeout(() => form.current?.requestSubmit(), 0);
              }}
              className="flex w-full items-center gap-3 pl-4 text-left outline-none hover:bg-fill/60 focus-visible:bg-fill disabled:opacity-50"
            >
              <Avatar name={d.name} hue={d.hue} size="sm" />
              <span className={`flex flex-1 items-center gap-2 py-2.5 pr-4 ${i < demo.length - 1 ? "shadow-[inset_0_-0.5px_0_var(--separator)]" : ""}`}>
                <span className="flex-1">
                  <span className="block text-callout font-medium">{d.name}</span>
                  <span className="block text-footnote text-label-2">{d.role}</span>
                </span>
                <ChevronRight aria-hidden className="size-4 text-label-3" strokeWidth={2.4} />
              </span>
            </button>
          ))}
        </div>
        <p className="px-4 text-footnote text-label-2">
          Todos os dados são fictícios. Senha de todas as contas: <span className="font-mono">trilha2026</span>
        </p>
      </section>
    </div>
  );
}
