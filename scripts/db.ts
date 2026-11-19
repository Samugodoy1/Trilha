/**
 * Utilitário de banco: npx tsx scripts/db.ts <migrate|seed|reset>
 *  - migrate: aplica as migrações
 *  - seed:    popula com dados fictícios (somente se o banco estiver vazio)
 *  - reset:   apaga tudo, migra e popula novamente (apenas desenvolvimento)
 */
import path from "node:path";
import { rm } from "node:fs/promises";
import { count, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { seed } from "../src/db/seed";

async function main() {
  const cmd = process.argv[2] ?? "migrate";
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Defina DATABASE_URL (ou use o modo embutido, que migra e popula sozinho).");
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  if (cmd === "reset") {
    if (process.env.NODE_ENV === "production") throw new Error("reset não é permitido em produção");
    await db.execute(sql`drop schema if exists public cascade; create schema public; drop schema if exists drizzle cascade;`);
    await rm(path.join(process.cwd(), ".data", "uploads"), { recursive: true, force: true });
  }
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("✓ migrações aplicadas");

  if (cmd === "seed" || cmd === "reset") {
    const [{ value }] = await db.select({ value: count() }).from(schema.schools);
    if (value > 0) console.log("• banco já possui dados; seed ignorado");
    else {
      const t = Date.now();
      await seed(db);
      console.log(`✓ dados fictícios criados em ${((Date.now() - t) / 1000).toFixed(1)}s`);
    }
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
