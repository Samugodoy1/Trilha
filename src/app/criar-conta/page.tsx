"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";
import { signupAction } from "@/server/actions/session";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signupAction, undefined);
  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pt-[max(env(safe-area-inset-top),48px)] pb-12 md:justify-center">
      <div className="w-full max-w-[400px] animate-rise">
        <BrandMark className="mx-auto mb-6 size-14" />
        <h1 className="text-center text-title-1">Criar conta</h1>
        <p className="mt-2 mb-8 text-center text-callout text-label-2">Para professores. Famílias entram com o convite da escola.</p>
        <form action={action} className="space-y-4" noValidate>
          <TextField name="name" label="Nome completo" autoComplete="name" error={state?.fieldErrors?.name} />
          <TextField name="email" type="email" label="E-mail" autoComplete="email" error={state?.fieldErrors?.email} />
          <TextField name="password" type="password" label="Senha" autoComplete="new-password" hint="Pelo menos 10 caracteres, com letras e números." error={state?.fieldErrors?.password} />
          <Button type="submit" size="lg" loading={pending}>
            Continuar
          </Button>
          <p className="text-center text-subhead">
            <Link href="/entrar" className="text-accent">
              Já tenho conta
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
