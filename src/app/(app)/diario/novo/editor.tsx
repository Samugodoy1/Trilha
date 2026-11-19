"use client";

import { useRouter } from "next/navigation";
import { EntryComposer, type EntryDraft } from "@/components/teacher/entry-composer";
import type { ComposeContext } from "@/server/actions/journal";

export function EntryPageEditor({ context, initial }: { context: ComposeContext; initial?: Partial<EntryDraft> }) {
  const router = useRouter();
  return <EntryComposer context={context} initial={initial} variant="page" onDone={() => router.push("/diario")} />;
}
