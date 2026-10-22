import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

export const PASTA_DE_MIGRACOES = fileURLToPath(new URL("../migrations", import.meta.url));

/** Aplica as migrações pendentes. Idempotente: roda no deploy e nos testes. */
export async function migrar(url: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: PASTA_DE_MIGRACOES });
  } finally {
    await pool.end();
  }
}
