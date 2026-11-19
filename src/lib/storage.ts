import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Armazenamento privado de arquivos. Nada aqui é público: os arquivos só são
 * servidos por /api/media/[id], depois da verificação de permissão.
 *
 * Drivers:
 *  - "disk": pasta local (desenvolvimento).
 *  - "db":   tabela file_objects no próprio Postgres (padrão na Vercel, cujo disco é efêmero).
 * Para grandes volumes, implemente a mesma interface com um bucket privado e URLs assinadas.
 */
function driver(): "disk" | "db" {
  const d = process.env.STORAGE_DRIVER;
  if (d === "disk" || d === "db") return d;
  return process.env.VERCEL ? "db" : "disk";
}

function root() {
  return process.env.STORAGE_DIR ?? path.join(process.cwd(), ".data", "uploads");
}

function safePath(key: string) {
  if (!/^[a-z0-9-]+\/[a-z0-9-]+\.[a-z0-9]+$/i.test(key)) throw new Error("Chave de arquivo inválida");
  return path.join(root(), key);
}

async function table() {
  const { getDb, schema } = await import("../db");
  return { db: await getDb(), t: schema.fileObjects };
}

export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function putObject(schoolId: string, data: Buffer, ext: string): Promise<string> {
  const key = `${schoolId}/${randomUUID()}.${ext}`;
  safePath(key);
  if (driver() === "db") {
    const { db, t } = await table();
    await db.insert(t).values({ key, data });
    return key;
  }
  const file = safePath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
  return key;
}

export async function getObject(key: string): Promise<Buffer | null> {
  try {
    safePath(key);
    if (driver() === "db") {
      const { db, t } = await table();
      const { eq } = await import("drizzle-orm");
      const [row] = await db.select().from(t).where(eq(t.key, key));
      return row ? Buffer.from(row.data) : null;
    }
    return await readFile(safePath(key));
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  if (driver() === "db") {
    const { db, t } = await table();
    const { eq } = await import("drizzle-orm");
    await db.delete(t).where(eq(t.key, key));
    return;
  }
  await unlink(safePath(key)).catch(() => undefined);
}

/** Verifica a assinatura binária do arquivo, sem confiar no tipo informado pelo navegador. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(4, 12).toString().startsWith("ftyphei") || buf.subarray(4, 12).toString().startsWith("ftypmif"))
    return "image/heic";
  if (buf.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return null;
}
