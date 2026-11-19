"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Select } from "@/components/ui/fields";

export function TermPicker({ terms, a, b }: { terms: { id: string; label: string }[]; a: string; b: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const go = (na: string, nb: string) => router.replace(`${pathname}?a=${na}&b=${nb}`, { scroll: false });
  return (
    <div className="flex items-end gap-3">
      <Select label="De" value={a} onChange={(e) => go(e.target.value, b)} wrapClassName="flex-1">
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </Select>
      <ArrowRight aria-hidden className="mb-3.5 size-5 shrink-0 text-label-3" />
      <Select label="Para" value={b} onChange={(e) => go(a, e.target.value)} wrapClassName="flex-1">
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
