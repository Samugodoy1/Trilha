import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSession } from "@/server/session";
import { isUuid } from "@/server/access";
import { canViewMedia } from "@/server/media-access";
import { getObject } from "@/lib/storage";

const notFound = () => new Response("Não encontrado", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const ctx = await getSession();
  if (!ctx) return notFound();
  const db = await getDb();
  const [m] = await db.select().from(schema.media).where(eq(schema.media.id, id));
  if (!m || !(await canViewMedia(ctx, m))) return notFound();
  const data = await getObject(m.storageKey);
  if (!data) return notFound();
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": m.mime,
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
      "Content-Disposition": m.mime === "application/pdf" ? `inline; filename="${encodeURIComponent(m.originalName ?? "documento.pdf")}"` : "inline",
    },
  });
}
