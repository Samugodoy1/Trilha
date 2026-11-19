import Link from "next/link";
import { BrandMark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <BrandMark className="mb-6 size-14 opacity-90" />
      <h1 className="text-title-1">Não encontrado</h1>
      <p className="mt-2 max-w-sm text-callout text-label-2">Esta página não existe ou você não tem permissão para vê-la. As informações dos alunos ficam visíveis apenas para quem tem vínculo autorizado.</p>
      <Link href="/" className="mt-8 rounded-full bg-accent px-6 py-3 text-callout font-semibold text-white">
        Voltar ao início
      </Link>
    </main>
  );
}
