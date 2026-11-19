"use client";

import { useEffect, useTransition } from "react";
import { revokeInviteAction, markContributionsSeenAction } from "@/server/actions/student";

export function RevokeInviteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => revokeInviteAction(id))}
      className="rounded-full px-2.5 py-1 text-footnote font-semibold text-critical-ink hover:bg-[color-mix(in_oklab,var(--critical)_10%,transparent)] disabled:opacity-50"
    >
      Revogar
    </button>
  );
}

/** Marca como vistas as contribuições da família quando o professor abre a aba. */
export function MarkSeen({ studentId }: { studentId: string }) {
  useEffect(() => {
    const t = setTimeout(() => void markContributionsSeenAction(studentId), 1500);
    return () => clearTimeout(t);
  }, [studentId]);
  return null;
}
