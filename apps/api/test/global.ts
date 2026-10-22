import { migrar } from "@compoze/db/migrar";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

let pg: StartedPostgreSqlContainer;

/** Um PostgreSQL 18 + PostGIS para a suíte inteira; cada teste cria a própria gente. */
export async function setup(project: TestProject) {
  pg = await new PostgreSqlContainer("postgis/postgis:18-3.6").start();
  await migrar(pg.getConnectionUri());
  project.provide("databaseUrl", pg.getConnectionUri());
}

export async function teardown() {
  await pg?.stop();
}
