import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Armazenamento privado de arquivos. Nada aqui é público: os arquivos só são
 * servidos por /api/media/[id], depois da verificação de permissão.
 * Driver local (disco). Para produção, implemente a mesma interface com um
 * bucket privado (S3, R2, Vercel Blob privado) e URLs assinadas de curta duração.
 */
function root() {
  return process.env.STORAGE_DIR ?? (process.env.VERCEL ? "/tmp/trilha-uploads" : path.join(process.cwd(), ".data", "uploads"));
}

function safePath(key: string) {
  if (!/^[a-z0-9-]+\/[a-z0-9-]+\.[a-z0-9]+$/i.test(key)) throw new Error("Chave de arquivo inválida");
  return path.join(root(), key);
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
  const file = safePath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
  return key;
}

export async function getObject(key: string): Promise<Buffer | null> {
  try {
    return await readFile(safePath(key));
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
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
