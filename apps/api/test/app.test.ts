import { conectar, type Conexao } from "@compoze/db";
import { z } from "zod";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { construirApp, type App } from "../src/app";
import { lerConfig } from "../src/config";
import { configDeTeste } from "./ajuda";

let banco: Conexao;
let app: App;

beforeAll(async () => {
  const config = configDeTeste();
  banco = conectar(config.DATABASE_URL);
  app = await construirApp({ config, banco });

  // Rotas só de teste, para exercitar a validação e o formato de erro.
  app.post(
    "/_eco",
    { schema: { body: z.object({ titulo: z.string().min(1), bpm: z.number().int().min(20).max(300) }) } },
    async (req) => req.body,
  );
  app.get("/_quebra", async () => {
    throw new Error("segredo interno");
  });
  await app.ready();
});

afterAll(async () => {
  await app?.close();
  await banco?.fechar();
});

describe("GET /health", () => {
  it("responde ok e a versão do Postgres", async () => {
    const r = await app.inject({ method: "GET", url: "/health" });
    expect(r.statusCode).toBe(200);
    const corpo = r.json();
    expect(corpo.status).toBe("ok");
    expect(corpo.banco.ok).toBe(true);
    expect(corpo.banco.versao).toMatch(/^18/);
  });
});

describe("erros no formato do contrato", () => {
  it("validação vira 422 com os campos em `detail`", async () => {
    const r = await app.inject({ method: "POST", url: "/_eco", payload: { titulo: "", bpm: 500 } });
    expect(r.statusCode).toBe(422);
    const campos = r.json().detail.map((d: { campo: string }) => d.campo);
    expect(campos).toEqual(expect.arrayContaining(["body.titulo", "body.bpm"]));
  });

  it("rota inexistente vira 404 com `detail`", async () => {
    const r = await app.inject({ method: "GET", url: "/nao-existe" });
    expect(r.statusCode).toBe(404);
    expect(r.json().detail).toMatch(/não encontrada/);
  });

  it("erro inesperado vira 500 sem vazar a mensagem interna", async () => {
    const r = await app.inject({ method: "GET", url: "/_quebra" });
    expect(r.statusCode).toBe(500);
    expect(r.json()).toEqual({ detail: "Erro interno." });
  });
});

describe("documentação e borda", () => {
  it("publica o OpenAPI com /health", async () => {
    const r = await app.inject({ method: "GET", url: "/docs/json" });
    expect(r.statusCode).toBe(200);
    expect(r.json().paths["/health"]).toBeDefined();
  });

  it("aceita o front local no CORS", async () => {
    const r = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { origin: "http://localhost:5173", "access-control-request-method": "GET" },
    });
    expect(r.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});

describe("configuração", () => {
  it("falha cedo e diz o que falta", () => {
    expect(() => lerConfig({})).toThrow(/DATABASE_URL/);
    expect(() => lerConfig({ DATABASE_URL: "postgres://x@y/z", JWT_SECRET: "curto" })).toThrow(/JWT_SECRET/);
  });
});
