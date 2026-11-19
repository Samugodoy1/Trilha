import Link from "next/link";
import { Archive, Inbox } from "lucide-react";

export function ArchiveToggle({ archived }: { archived: boolean }) {
  return (
    <Link
      href={archived ? "/mensagens" : "/mensagens?arquivadas=1"}
      aria-label={archived ? "Ver caixa de entrada" : "Ver arquivadas"}
      title={archived ? "Caixa de entrada" : "Arquivadas"}
      className="flex size-9 items-center justify-center rounded-full bg-fill text-accent hover:bg-fill-2"
    >
      {archived ? <Inbox className="size-[18px]" /> : <Archive className="size-[18px]" />}
    </Link>
  );
}
