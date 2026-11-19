"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { SearchField } from "@/components/ui/fields";
import { Menu } from "@/components/ui/menu";
import { entryKinds, type EntryKind } from "@/lib/vocabulary";
import { cn } from "@/lib/cn";

export function JournalFilters({ classes }: { classes: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();
  const set = (key: string, value: string | null) => {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    start(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  };
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) set("q", q || null);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const tipo = params.get("tipo") as EntryKind | null;
  const turma = params.get("turma");
  const Chip = ({ label, active, ...p }: { label: string; active: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...p} className={cn("press flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-subhead font-medium", active ? "bg-accent text-on-accent" : "bg-fill hover:bg-fill-2")}>
      {label}
      <ChevronDown aria-hidden className="size-3.5" strokeWidth={2.6} />
    </button>
  );

  return (
    <div className={cn("space-y-3 transition-opacity", pending && "opacity-70")}>
      <SearchField value={q} onChange={setQ} placeholder="Buscar no diário" />
      <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5">
        <Menu label="Tipo" align="start" items={[{ label: "Todos os tipos", checked: !tipo, onSelect: () => set("tipo", null) }, { separator: true }, ...(Object.keys(entryKinds) as EntryKind[]).map((k) => ({ label: entryKinds[k].label, checked: tipo === k, onSelect: () => set("tipo", k) }))]}>
          {(p) => <Chip {...p} label={tipo ? entryKinds[tipo].label : "Tipo"} active={Boolean(tipo)} />}
        </Menu>
        {classes.length > 1 && (
          <Menu label="Turma" align="start" items={[{ label: "Todas as turmas", checked: !turma, onSelect: () => set("turma", null) }, { separator: true }, ...classes.map((c) => ({ label: c.name, checked: turma === c.id, onSelect: () => set("turma", c.id) }))]}>
            {(p) => <Chip {...p} label={classes.find((c) => c.id === turma)?.name ?? "Turma"} active={Boolean(turma)} />}
          </Menu>
        )}
      </div>
    </div>
  );
}
