import { idempotencyKeys } from "@compoze/db";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { expurgarIdempotencia } from "../src/plugins/idempotencia";
import { novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();

const enviar = (token: string, chave: string | null, method: "POST" | "PATCH" | "DELETE", url: string, payload?: object) =>
  ctx.app.inject({
    method,
    url,
    headers: { authorization: `Bearer ${token}`, ...(chave ? { "idempotency-key": chave } : {}) },
    ...(payload ? { payload } : {}),
  });

describe("Idempotency-Key (ADR 0008)", () => {
  it("reenviar a mesma criação devolve a mesma resposta e não duplica", async () => {
    const p = await novaPessoa(ctx.app);
    const chave = `fila-${crypto.randomUUID()}`;
    const a = await enviar(p.token, chave, "POST", "/folders", { name: "Rascunhos" });
    const b = await enviar(p.token, chave, "POST", "/folders", { name: "Rascunhos" });
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(201);
    expect(b.headers["idempotent-replayed"]).toBe("true");
    expect(b.json()).toEqual(a.json());
    const pastas = (await ctx.app.inject({ method: "GET", url: "/folders", headers: { authorization: `Bearer ${p.token}` } })).json();
    expect(pastas).toHaveLength(1);
  });

  it("sem chave, cada envio é uma escrita", async () => {
    const p = await novaPessoa(ctx.app);
    await enviar(p.token, null, "POST", "/folders", { name: "A" });
    await enviar(p.token, null, "POST", "/folders", { name: "A" });
    const pastas = (await ctx.app.inject({ method: "GET", url: "/folders", headers: { authorization: `Bearer ${p.token}` } })).json();
    expect(pastas).toHaveLength(2);
  });

  it("erro 4xx também é lembrado; 204 é repetido sem corpo", async () => {
    const p = await novaPessoa(ctx.app);
    const chave = `fila-${crypto.randomUUID()}`;
    const inexistente = "01920000-0000-7000-8000-00000000dead";
    expect((await enviar(p.token, chave, "DELETE", `/folders/${inexistente}`)).statusCode).toBe(404);
    expect((await enviar(p.token, chave, "DELETE", `/folders/${inexistente}`)).statusCode).toBe(404);

    const pasta = (await enviar(p.token, null, "POST", "/folders", { name: "Some" })).json();
    const outra = `fila-${crypto.randomUUID()}`;
    expect((await enviar(p.token, outra, "DELETE", `/folders/${pasta.id}`)).statusCode).toBe(204);
    const repetida = await enviar(p.token, outra, "DELETE", `/folders/${pasta.id}`);
    expect(repetida.statusCode).toBe(204);
    expect(repetida.body).toBe("");
  });

  it("a mesma chave em outra rota é recusada", async () => {
    const p = await novaPessoa(ctx.app);
    const chave = `fila-${crypto.randomUUID()}`;
    await enviar(p.token, chave, "POST", "/folders", { name: "X" });
    expect((await enviar(p.token, chave, "POST", "/projects", { name: "Y" })).statusCode).toBe(422);
  });

  it("chaves são por pessoa", async () => {
    const a = await novaPessoa(ctx.app);
    const b = await novaPessoa(ctx.app);
    const chave = `fila-${crypto.randomUUID()}`;
    await enviar(a.token, chave, "POST", "/folders", { name: "De A" });
    const r = await enviar(b.token, chave, "POST", "/folders", { name: "De B" });
    expect(r.statusCode).toBe(201);
    expect(r.json().name).toBe("De B");
  });

  it("chave malformada é recusada", async () => {
    const p = await novaPessoa(ctx.app);
    expect((await enviar(p.token, "curta", "POST", "/folders", { name: "X" })).statusCode).toBe(422);
  });

  it("o expurgo apaga as chaves com mais de 24 h", async () => {
    const p = await novaPessoa(ctx.app);
    const chave = `fila-${crypto.randomUUID()}`;
    await enviar(p.token, chave, "POST", "/folders", { name: "Velha" });
    await ctx.banco.db
      .update(idempotencyKeys)
      .set({ createdAt: new Date(Date.now() - 25 * 3600_000) })
      .where(eq(idempotencyKeys.key, chave));
    expect(await expurgarIdempotencia(ctx.banco.db)).toBeGreaterThanOrEqual(1);
  });
});
