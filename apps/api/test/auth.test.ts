import { refreshTokens } from "@compoze/db";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { hashDoRefresh } from "../src/modules/auth/tokens";

import { como, novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();

describe("cadastro", () => {
  it("cria a conta e já devolve o par de tokens", async () => {
    const p = await novaPessoa(ctx.app, "Lara");
    const eu = (await como(ctx.app, p.token).get("/users/me")).json();
    expect(eu).toMatchObject({ username: p.username, email: p.email, show_on_map: false, latitude: null });
    expect(eu).not.toHaveProperty("password_hash");
  });

  it("recusa e-mail repetido, sem diferenciar maiúsculas (409)", async () => {
    const p = await novaPessoa(ctx.app);
    const r = await ctx.app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { name: "Outra", username: "outra_pessoa_x", email: p.email.toUpperCase(), password: "12345678" },
    });
    expect(r.statusCode).toBe(409);
    expect(r.json().detail).toMatch(/e-mail/);
  });

  it("recusa @ repetido (409)", async () => {
    const p = await novaPessoa(ctx.app);
    const r = await ctx.app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { name: "Outra", username: p.username, email: "nova@teste.dev", password: "12345678" },
    });
    expect(r.statusCode).toBe(409);
    expect(r.json().detail).toMatch(/usuário/);
  });

  it("valida @ e senha (422)", async () => {
    const r = await ctx.app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { name: "X", username: "Com Espaço", email: "x@teste.dev", password: "curta" },
    });
    expect(r.statusCode).toBe(422);
    const campos = r.json().detail.map((d: { campo: string }) => d.campo);
    expect(campos).toEqual(expect.arrayContaining(["body.username", "body.password"]));
  });
});

describe("login", () => {
  it("entra com e-mail e senha", async () => {
    const p = await novaPessoa(ctx.app);
    const r = await ctx.app.inject({ method: "POST", url: "/auth/login", payload: { email: p.email, password: "senha-boa-123" } });
    expect(r.statusCode).toBe(200);
    expect(r.json().token_type).toBe("bearer");
  });

  it("a mesma mensagem para senha errada e conta inexistente (401)", async () => {
    const p = await novaPessoa(ctx.app);
    const errada = await ctx.app.inject({ method: "POST", url: "/auth/login", payload: { email: p.email, password: "outra-senha" } });
    const ninguem = await ctx.app.inject({ method: "POST", url: "/auth/login", payload: { email: "ninguem@teste.dev", password: "x" } });
    expect(errada.statusCode).toBe(401);
    expect(ninguem.statusCode).toBe(401);
    expect(errada.json()).toEqual(ninguem.json());
  });
});

describe("refresh", () => {
  const renovar = (refresh_token: string) =>
    ctx.app.inject({ method: "POST", url: "/auth/refresh", payload: { refresh_token } });

  it("troca o refresh por um par novo e o antigo deixa de valer", async () => {
    const p = await novaPessoa(ctx.app);
    const r1 = await renovar(p.refresh);
    expect(r1.statusCode).toBe(200);
    expect(r1.json().refresh_token).not.toBe(p.refresh);
    expect((await como(ctx.app, r1.json().access_token).get("/users/me")).statusCode).toBe(200);
  });

  it("dois envios quase juntos: o segundo perde, mas a sessão continua", async () => {
    const p = await novaPessoa(ctx.app);
    const [a, b] = await Promise.all([renovar(p.refresh), renovar(p.refresh)]);
    const codigos = [a.statusCode, b.statusCode].sort();
    expect(codigos).toEqual([200, 401]);
    const vencedor = a.statusCode === 200 ? a : b;
    expect((await renovar(vencedor.json().refresh_token)).statusCode).toBe(200);
  });

  it("reuso de um refresh já gasto (fora da janela de corrida) derruba a família inteira", async () => {
    const p = await novaPessoa(ctx.app);
    const novo = (await renovar(p.refresh)).json().refresh_token;
    // Envelhece o uso para fora da janela de 10 s.
    await ctx.banco.db
      .update(refreshTokens)
      .set({ usedAt: sql`now() - interval '1 minute'` })
      .where(eq(refreshTokens.tokenHash, hashDoRefresh(p.refresh)));
    // Alguém reapresenta o token antigo (cópia vazada):
    expect((await renovar(p.refresh)).statusCode).toBe(401);
    // ...e o token legítimo mais novo também deixa de valer.
    expect((await renovar(novo)).statusCode).toBe(401);
  });

  it("token desconhecido é 401", async () => {
    expect((await renovar("inventado")).statusCode).toBe(401);
  });
});

describe("senha nova", () => {
  const trocar = (token: string | null, new_password: string) =>
    ctx.app.inject({
      method: "POST",
      url: "/auth/password",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      payload: { new_password },
    });
  const entrarCom = (email: string, password: string) =>
    ctx.app.inject({ method: "POST", url: "/auth/login", payload: { email, password } });
  const renovar = (refresh_token: string) =>
    ctx.app.inject({ method: "POST", url: "/auth/refresh", payload: { refresh_token } });

  it("troca a senha sem pedir a atual: a velha deixa de entrar e a nova entra", async () => {
    const p = await novaPessoa(ctx.app);
    const r = await trocar(p.token, "senha-nova-456");
    expect(r.statusCode).toBe(200);
    expect((await entrarCom(p.email, "senha-boa-123")).statusCode).toBe(401);
    expect((await entrarCom(p.email, "senha-nova-456")).statusCode).toBe(200);
  });

  it("derruba as outras sessões e devolve um par novo para este aparelho", async () => {
    const p = await novaPessoa(ctx.app);
    const outro = (await entrarCom(p.email, "senha-boa-123")).json().refresh_token as string;
    const novo = (await trocar(p.token, "senha-nova-456")).json();
    expect((await renovar(outro)).statusCode).toBe(401);
    expect((await renovar(p.refresh)).statusCode).toBe(401);
    expect((await renovar(novo.refresh_token)).statusCode).toBe(200);
  });

  it("pede login e senha com pelo menos 8 caracteres", async () => {
    const p = await novaPessoa(ctx.app);
    expect((await trocar(null, "senha-nova-456")).statusCode).toBe(401);
    expect((await trocar(p.token, "curta")).statusCode).toBe(422);
  });
});

describe("rotas privadas", () => {
  it("sem token é 401 com `detail`", async () => {
    const r = await ctx.app.inject({ method: "GET", url: "/songs" });
    expect(r.statusCode).toBe(401);
    expect(r.json().detail).toBeTruthy();
  });

  it("token adulterado é 401", async () => {
    const p = await novaPessoa(ctx.app);
    expect((await como(ctx.app, `${p.token}x`).get("/users/me")).statusCode).toBe(401);
  });
});
