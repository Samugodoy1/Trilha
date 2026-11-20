"use client";

import { Search } from "lucide-react";

export function openSearch() {
  window.dispatchEvent(new Event("trilha:search"));
}

/** Botão de busca (abre a busca universal); no computador, também ⌘K. */
export function SearchButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-label="Buscar alunos e áreas"
      className={`press glass flex size-9 items-center justify-center rounded-full text-label ${className ?? ""}`}
    >
      <Search className="size-[18px]" strokeWidth={2.3} />
    </button>
  );
}
