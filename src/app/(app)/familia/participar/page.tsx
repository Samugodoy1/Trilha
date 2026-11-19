import type { Metadata } from "next";
import { House } from "lucide-react";
import { getContributions } from "@/server/queries/family";
import { Page } from "@/components/ui/page";
import { SectionTitle } from "@/components/ui/misc";
import { ContributionForm } from "@/components/family/family-ui";
import { loadFamily, NoChild } from "../shared";
import { formatDay, isoFromTimestamp } from "@/lib/format";
import { contributionKinds } from "@/lib/vocabulary";

export const metadata: Metadata = { title: "Em casa" };

export default async function ParticipatePage() {
  const { child } = await loadFamily();
  if (!child) return <NoChild title="Em casa" />;
  const { own, ideas } = await getContributions(child);
  return (
    <Page title="Em casa" subtitle={`Pequenos momentos para aprender junto com ${child.firstName} — sem custo e no tempo de vocês.`} width="narrow">
      <section aria-labelledby="ideias" className="mb-10">
        <SectionTitle id="ideias">Sugestões da professora</SectionTitle>
        {ideas.length === 0 ? (
          <p className="text-callout text-label-2">As sugestões aparecem aqui quando a professora publicar a Nossa semana.</p>
        ) : (
          <div className="space-y-3">
            {ideas.map((i) => (
              <article key={i.id} className="rounded-[20px] bg-[color-mix(in_oklab,var(--family)_7%,var(--surface))] p-4">
                <p className="flex items-center gap-1.5 text-footnote font-semibold text-family">
                  <House aria-hidden className="size-3.5" /> Semana de {formatDay(i.date)}
                </p>
                <p className="mt-1 text-body">{i.body}</p>
                <p className="mt-2 text-footnote text-label-2">{i.author}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="compartilhar" className="mb-10">
        <SectionTitle id="compartilhar">Conte para a escola</SectionTitle>
        <ContributionForm studentId={child.id} firstName={child.firstName} />
      </section>

      {own.length > 0 && (
        <section aria-labelledby="enviados">
          <SectionTitle id="enviados">Compartilhados</SectionTitle>
          <ul className="-mx-4 md:mx-0">
            {own.map((c, i) => (
              <li key={c.id} className={`px-4 py-3 md:px-0 ${i < own.length - 1 ? "shadow-[inset_0_-0.5px_0_var(--separator)]" : ""}`}>
                <p className="text-footnote font-semibold text-label-2">
                  {contributionKinds[c.kind]} · {formatDay(isoFromTimestamp(c.createdAt))}
                  {c.seenAt && <span className="text-positive-ink"> · vista pela professora</span>}
                </p>
                <p className="mt-0.5 text-body">{c.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
