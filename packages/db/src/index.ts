import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";

export { schema };
export * from "./schema";

export type Banco = NodePgDatabase<typeof schema>;

export interface Conexao {
  db: Banco;
  pool: pg.Pool;
  fechar: () => Promise<void>;
}

/** Abre um pool e o Drizzle sobre ele. Quem abre fecha (`fechar`). */
export function conectar(url: string, opcoes: { max?: number } = {}): Conexao {
  const pool = new pg.Pool({ connectionString: url, max: opcoes.max ?? 10 });
  const db = drizzle(pool, { schema, casing: "snake_case" });
  return { db, pool, fechar: () => pool.end() };
}
