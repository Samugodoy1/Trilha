import "server-only";
import { getDb, schema } from "@/db";
import { clientIp } from "./session";

export async function audit(
  ctx: { user: { id: string }; school?: { id: string } | null } | null,
  action: string,
  entityType?: string,
  entityId?: string,
  meta?: Record<string, unknown>,
) {
  try {
    const db = await getDb();
    await db.insert(schema.auditLogs).values({
      schoolId: ctx?.school?.id ?? null,
      userId: ctx?.user.id ?? null,
      action,
      entityType,
      entityId,
      meta,
      ip: await clientIp().catch(() => null),
    });
  } catch (err) {
    console.error("[audit] falha ao registrar", action, err);
  }
}
