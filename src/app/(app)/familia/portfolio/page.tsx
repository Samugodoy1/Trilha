import type { Metadata } from "next";
import { Images } from "lucide-react";
import { getFamilyPortfolio } from "@/server/queries/family";
import { Page } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/misc";
import { loadFamily, NoChild } from "../shared";
import { formatDay, formatMonth } from "@/lib/format";
import { portfolioKinds } from "@/lib/vocabulary";

export const metadata: Metadata = { title: "Portfólio" };

export default async function PortfolioPage() {
  const { child } = await loadFamily();
  if (!child) return <NoChild title="Portfólio" />;
  const items = await getFamilyPortfolio(child);
  const months = new Map<string, typeof items>();
  for (const it of items) {
    const k = it.p.date.slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), it]);
  }
  return (
    <Page title="Portfólio" subtitle={`Produções e memórias de ${child.firstName} ao longo do ano.`} width="wide">
      {items.length === 0 ? (
        <EmptyState icon={Images} title="Ainda vazio" message="Desenhos, textos e projetos compartilhados pela escola aparecem aqui." />
      ) : (
        <div className="space-y-8">
          {[...months.entries()].map(([k, list]) => (
            <section key={k} aria-label={`${formatMonth(`${k}-01`)} de ${k.slice(0, 4)}`}>
              <h2 className="mb-3 font-sans text-[1.375rem] leading-7 font-bold tracking-[-0.02em]">
                {formatMonth(`${k}-01`)} <span className="font-normal text-label-2">{k.slice(0, 4)}</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {list.map(({ p, mediaId }) => (
                  <figure key={p.id} className="group">
                    <div className="relative overflow-hidden rounded-[18px] bg-fill shadow-e1">
                      {mediaId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/media/${mediaId}`} alt={p.title} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                      ) : (
                        <div className="flex aspect-square items-center justify-center p-4 text-center text-subhead text-label-2">{p.title}</div>
                      )}
                      <span className="absolute bottom-2 left-2.5 text-footnote font-semibold text-white drop-shadow-[0_1px_4px_rgb(0_0_0/0.5)]">{portfolioKinds[p.kind]}</span>
                    </div>
                    <figcaption className="mt-2 px-0.5">
                      <p className="truncate text-subhead font-semibold">{p.title}</p>
                      <p className="text-footnote text-label-2">{formatDay(p.date)}</p>
                      {p.description && <p className="mt-0.5 line-clamp-2 text-footnote text-label-2">{p.description}</p>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
