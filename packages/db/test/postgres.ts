import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

/** A mesma imagem do docker-compose.yml: PostgreSQL 18 com PostGIS. */
export const IMAGEM_POSTGRES = "postgis/postgis:18-3.6";

export async function subirPostgres(): Promise<StartedPostgreSqlContainer> {
  return new PostgreSqlContainer(IMAGEM_POSTGRES).withDatabase("compoze_teste").start();
}
