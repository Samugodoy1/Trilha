import path from "node:path";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { count } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;
export { schema };

declare global {
  // eslint-disable-next-line no-var
  var __trilhaDb: Promise<DB> | undefined;
  // Conexão já aberta, disponível durante a preparação (antes de getDb() resolver)
  // eslint-disable-next-line no-var
  var __trilhaDbReady: DB | undefined;
}

const migrationsFolder = path.join(process.cwd(), "drizzle");

/**
 * Conexão única por processo.
 * - Com DATABASE_URL: PostgreSQL real (produção, Vercel + Neon/Supabase, ou local).
 * - Sem DATABASE_URL: PostgreSQL embutido (PGlite) — mesma engine, zero configuração,
 *   usado para demonstrações. Em serverless os dados vivem no /tmp da instância.
 */
async function create(): Promise<DB> {
  let db: DB;
  const demo = process.env.TRILHA_DEMO === "true" || !process.env.DATABASE_URL;

  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
    db = drizzlePg(pool, { schema });
    // Trava no Postgres: várias instâncias serverless podem iniciar ao mesmo tempo.
    const client = await pool.connect();
    try {
      await client.query("select pg_advisory_lock(727274)");
      await migratePg(drizzlePg(client, { schema }), { migrationsFolder });
      await prepare(db, demo);
    } finally {
      await client.query("select pg_advisory_unlock(727274)").catch(() => undefined);
      client.release();
    }
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const dir =
      process.env.PGLITE_DIR ?? (process.env.VERCEL ? "/tmp/trilha-db" : path.join(process.cwd(), ".data", "pglite"));
    const client = new PGlite(dir);
    const lite = drizzle(client, { schema });
    await migrate(lite, { migrationsFolder });
    db = lite as unknown as DB;
    await prepare(db, demo);
  }

  return db;
}

async function prepare(db: DB, demo: boolean) {
  globalThis.__trilhaDbReady = db;
  if (demo) {
    const [{ value }] = await db.select({ value: count() }).from(schema.schools);
    if (value === 0) {
      const { seed } = await import("./seed");
      // Tudo ou nada: uma falha no meio não deixa o banco populado pela metade.
      await db.transaction(async (tx) => {
        await seed(tx as unknown as DB);
      });
    }
  }
  if (process.env.TRILHA_BOOTSTRAP_USERS) {
    const { ensureBootstrapUsers } = await import("./bootstrap");
    await ensureBootstrapUsers(db, process.env.TRILHA_BOOTSTRAP_USERS);
  }
}

export function getDb(): Promise<DB> {
  if (!globalThis.__trilhaDb) {
    globalThis.__trilhaDb = create().catch((err) => {
      globalThis.__trilhaDb = undefined;
      throw err;
    });
  }
  return globalThis.__trilhaDb;
}
