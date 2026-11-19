import { House } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

export type PostView = {
  id: string;
  title: string;
  authorName: string;
  authorHue: number;
  className: string;
  dateLabel: string;
  sections: { key: string; title: string; body: string }[];
  photos: { id?: string; src: string; caption?: string | null }[];
  personal?: boolean;
};

/**
 * Publicação da Nossa semana, como a família vê: editorial, fotográfica e serena.
 * Sem curtidas, contadores ou comparações.
 */
export function PostCard({ post, className }: { post: PostView; className?: string }) {
  const [hero, ...rest] = post.photos;
  return (
    <article className={cn("overflow-hidden rounded-2xl bg-surface shadow-e1", className)}>
      <header className="flex items-center gap-3 px-5 pt-5">
        <Avatar name={post.authorName} hue={post.authorHue} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-subhead font-semibold">{post.authorName}</p>
          <p className="truncate text-footnote text-label-2">
            {post.className} · {post.dateLabel}
          </p>
        </div>
        {post.personal && <span className="rounded-full bg-[color-mix(in_oklab,var(--family)_12%,transparent)] px-2.5 py-1 text-caption font-semibold text-family-ink">Só para vocês</span>}
      </header>
      <h3 className="px-5 pt-4 text-title-2">{post.title}</h3>
      {hero && (
        <figure className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero.src} alt={hero.caption ?? ""} loading="lazy" className="aspect-[4/3] w-full object-cover" />
          {hero.caption && <figcaption className="px-5 pt-2 text-footnote text-label-2">{hero.caption}</figcaption>}
        </figure>
      )}
      {rest.length > 0 && (
        <div className="mt-1 grid grid-cols-3 gap-1 px-1">
          {rest.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id ?? i} src={p.src} alt={p.caption ?? ""} loading="lazy" className="aspect-square w-full rounded-[4px] object-cover" />
          ))}
        </div>
      )}
      <div className="space-y-5 px-5 pt-5 pb-6">
        {post.sections.map((s) =>
          s.key === "casa" ? (
            <section key={s.key} className="rounded-[16px] bg-[color-mix(in_oklab,var(--family)_8%,var(--surface))] p-4">
              <h4 className="flex items-center gap-1.5 font-sans text-subhead font-semibold text-family-ink">
                <House aria-hidden className="size-4" strokeWidth={2.3} />
                {s.title}
              </h4>
              <p className="mt-1 text-body whitespace-pre-line">{s.body}</p>
            </section>
          ) : (
            <section key={s.key}>
              <h4 className="font-sans text-footnote font-semibold tracking-[0.03em] text-label-2 uppercase">{s.title}</h4>
              <p className="mt-1 text-body whitespace-pre-line">{s.body}</p>
            </section>
          ),
        )}
      </div>
    </article>
  );
}
