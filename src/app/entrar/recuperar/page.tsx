import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function RecoverPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pt-[max(env(safe-area-inset-top),48px)] pb-12 md:justify-center">
      <div className="w-full max-w-[400px] animate-rise text-center">
        <span className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
          <KeyRound aria-hidden className="size-8" strokeWidth={1.8} />
        </span>
        <h1 className="text-title-1">Esqueci minha senha</h1>
        <div className="mt-6 space-y-4 text-left">
          <div className="rounded-[14px] bg-surface-2 p-4">
            <p className="text-headline">Professores e coordenação</p>
            <p className="mt-1 text-callout text-label-2">Peça à gestão da sua escola. Em Ajustes → Pessoas, ela gera uma senha temporária para você trocar depois.</p>
          </div>
          <div className="rounded-[14px] bg-surface-2 p-4">
            <p className="text-headline">Famílias</p>
            <p className="mt-1 text-callout text-label-2">Fale com a secretaria ou com a professora. A escola pode redefinir sua senha ou enviar um novo convite.</p>
          </div>
        </div>
        <p className="mt-6 text-footnote text-label-2">Por segurança, a escola confirma sua identidade antes de redefinir o acesso.</p>
        <Link href="/entrar" className="mt-8 inline-block text-callout font-medium text-accent">
          Voltar para entrar
        </Link>
      </div>
    </main>
  );
}
