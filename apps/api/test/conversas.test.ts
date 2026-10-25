import type { AddressInfo } from "node:net";

import { describe, expect, it } from "vitest";

import { uuidv7 } from "../src/lib/uuidv7";
import { como, novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();

async function dupla() {
  const ana = await novaPessoa(ctx.app, "Ana");
  const bia = await novaPessoa(ctx.app, "Bia");
  const deAna = como(ctx.app, ana.token);
  const deBia = como(ctx.app, bia.token);
  const r = await deAna.post("/conversations", { user_id: bia.id });
  return { ana, bia, deAna, deBia, conversa: r.json(), status: r.statusCode };
}

describe("conversas (ADR 0014)", () => {
  it("uma conversa só por dupla, aberta por qualquer lado", async () => {
    const { ana, bia, deBia, conversa, status } = await dupla();
    expect(status).toBe(201);
    expect(conversa).toMatchObject({ other: { id: bia.id }, last_message: null, unread_count: 0 });
    const doOutroLado = await deBia.post("/conversations", { user_id: ana.id });
    expect(doOutroLado.statusCode).toBe(200);
    expect(doOutroLado.json()).toMatchObject({ id: conversa.id, other: { id: ana.id } });
  });

  it("mensagens em páginas, não lidas e lidas", async () => {
    const { deAna, deBia, conversa } = await dupla();
    for (const t of ["oi", "tem a letra?", "manda"]) await deAna.post(`/conversations/${conversa.id}/messages`, { content: t });

    const daBia = (await deBia.get("/conversations")).json();
    expect(daBia[0]).toMatchObject({ id: conversa.id, unread_count: 3, last_message: { content: "manda" } });
    // Quem escreveu não tem nada por ler.
    expect((await deAna.get(`/conversations/${conversa.id}`)).json().unread_count).toBe(0);

    const p1 = (await deBia.get(`/conversations/${conversa.id}/messages?limit=2`)).json();
    expect(p1.items.map((m: { content: string }) => m.content)).toEqual(["manda", "tem a letra?"]);
    const p2 = (await deBia.get(`/conversations/${conversa.id}/messages?limit=2&before=${p1.next_cursor}`)).json();
    expect(p2.items.map((m: { content: string }) => m.content)).toEqual(["oi"]);
    expect(p2.next_cursor).toBeNull();

    expect((await deBia.post(`/conversations/${conversa.id}/read`)).statusCode).toBe(204);
    expect((await deBia.get(`/conversations/${conversa.id}`)).json().unread_count).toBe(0);
  });

  it("reenviar a mesma mensagem não duplica; quem está fora não lê nem escreve", async () => {
    const { deAna, conversa } = await dupla();
    const id = uuidv7();
    expect((await deAna.post(`/conversations/${conversa.id}/messages`, { id, content: "uma vez" })).statusCode).toBe(201);
    expect((await deAna.post(`/conversations/${conversa.id}/messages`, { id, content: "uma vez" })).statusCode).toBe(200);
    expect((await deAna.get(`/conversations/${conversa.id}/messages`)).json().items).toHaveLength(1);

    const carla = await novaPessoa(ctx.app, "Carla");
    const deCarla = como(ctx.app, carla.token);
    expect((await deCarla.get(`/conversations/${conversa.id}/messages`)).statusCode).toBe(404);
    expect((await deCarla.post(`/conversations/${conversa.id}/messages`, { content: "oi" })).statusCode).toBe(404);
    expect((await deAna.post("/conversations", { user_id: (await novaPessoa(ctx.app)).id })).statusCode).toBe(201);
  });

  it("não conversa consigo mesma", async () => {
    const { ana, deAna } = await dupla();
    expect((await deAna.post("/conversations", { user_id: ana.id })).statusCode).toBe(422);
    expect((await deAna.post(`/conversations/${uuidv7()}/messages`, { content: "oi" })).statusCode).toBe(404);
  });

  it("a mensagem chega ao vivo pelo /events", async () => {
    const { bia, deAna, conversa } = await dupla();
    await ctx.app.listen({ port: 0, host: "127.0.0.1" });
    const { port } = ctx.app.server.address() as AddressInfo;
    const controle = new AbortController();
    const r = await fetch(`http://127.0.0.1:${port}/events`, {
      headers: { authorization: `Bearer ${bia.token}`, origin: "http://localhost:5173" },
      signal: controle.signal,
    });
    expect(r.headers.get("content-type")).toMatch(/text\/event-stream/);
    // O fluxo sai por fora do Fastify (hijack), mas leva o CORS junto.
    expect(r.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    const leitor = r.body!.getReader();
    const decodificar = new TextDecoder();
    let lido = decodificar.decode((await leitor.read()).value);
    expect(lido).toContain(": conectado");

    await deAna.post(`/conversations/${conversa.id}/messages`, { content: "chegou?" });
    while (!lido.includes("event: message")) lido += decodificar.decode((await leitor.read()).value);
    const dados = JSON.parse(lido.split("data: ")[1]!.split("\n")[0]!);
    expect(dados).toMatchObject({ type: "message", message: { conversation_id: conversa.id, content: "chegou?" } });
    controle.abort();
  });
});
