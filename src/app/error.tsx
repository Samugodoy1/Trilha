"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-title-1">Algo não saiu como esperado</h1>
      <p className="mt-2 max-w-sm text-callout text-label-2">Nenhum dado foi perdido. Tente novamente — se continuar, avise a coordenação da escola.</p>
      {error.digest && <p className="mt-2 font-mono text-footnote text-label-3">Código: {error.digest}</p>}
      <button type="button" onClick={reset} className="mt-8 rounded-full bg-accent px-6 py-3 text-callout font-semibold text-white">
        Tentar novamente
      </button>
    </main>
  );
}
