import { conectar, type Conexao } from "@compoze/db";
import { afterAll, beforeAll, inject } from "vitest";

import { construirApp, type App } from "../src/app";
import { lerConfig, type Config } from "../src/config";

export const SEGREDO_DE_TESTE = "segredo-de-teste-com-pelo-menos-32-caracteres";

export function configDeTeste(extra: Record<string, string> = {}): Config {
  return lerConfig({
    NODE_ENV: "test",
    DATABASE_URL: inject("databaseUrl"),
    JWT_SECRET: SEGREDO_DE_TESTE,
    LOG_LEVEL: "silent",
    JOBS: "off",
    LIMITE_AUTH_POR_MINUTO: "1000",
    ...extra,
  });
}

/** Sobe a API uma vez por arquivo de teste, sobre o banco compartilhado. */
export function usarApp(extra: Record<string, string> = {}) {
  const ctx = {} as { app: App; banco: Conexao };
  beforeAll(async () => {
    const config = configDeTeste(extra);
    ctx.banco = conectar(config.DATABASE_URL, { max: 4 });
    ctx.app = await construirApp({ config, banco: ctx.banco });
    await ctx.app.ready();
  });
  afterAll(async () => {
    await ctx.app?.close();
    await ctx.banco?.fechar();
  });
  return ctx;
}

let n = 0;
/** Cadastra uma pessoa nova (nomes únicos por execução) e devolve o token. */
export async function novaPessoa(app: App, nome = "Pessoa") {
  n += 1;
  const sufixo = `${process.pid}${n}${Math.random().toString(36).slice(2, 6)}`;
  const username = `p${sufixo}`.slice(0, 30);
  const r = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { name: `${nome} ${n}`, username, email: `${username}@teste.dev`, password: "senha-boa-123" },
  });
  if (r.statusCode !== 201) throw new Error(`cadastro falhou: ${r.body}`);
  const { access_token, refresh_token } = r.json();
  const eu = (await app.inject({ method: "GET", url: "/users/me", headers: { authorization: `Bearer ${access_token}` } })).json();
  return { id: eu.id as string, username, email: `${username}@teste.dev`, token: access_token as string, refresh: refresh_token as string };
}

/** `inject` já autenticado como a pessoa. */
export function como(app: App, token: string) {
  const chamar = (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE") => (url: string, payload?: unknown) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, ...(payload === undefined ? {} : { payload: payload as object }) });
  return { get: chamar("GET"), post: chamar("POST"), put: chamar("PUT"), patch: chamar("PATCH"), delete: chamar("DELETE") };
}
