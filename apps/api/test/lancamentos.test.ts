import { describe, expect, it } from "vitest";

import { uuidv7 } from "../src/lib/uuidv7";
import { como, novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();

async function pessoa() {
  const p = await novaPessoa(ctx.app);
  return { ...p, api: como(ctx.app, p.token) };
}

describe("faixas com número à mão (ADR 0021)", () => {
  it("aceita pular número, recusa repetido e troca ao renumerar", async () => {
    const { api } = await pessoa();
    const p = (await api.post("/projects", { name: "Disco" })).json();
    const [a, b, c] = await Promise.all(["A", "B", "C"].map(async (t) => (await api.post("/songs", { title: t })).json()));

    await api.post(`/projects/${p.id}/songs`, { song_id: a.id });
    const sete = await api.post(`/projects/${p.id}/songs`, { song_id: b.id, track_number: 7 });
    expect(sete.statusCode).toBe(201);
    expect(sete.json().songs).toEqual([
      { song_id: a.id, track_number: 1 },
      { song_id: b.id, track_number: 7 },
    ]);
    // Sem número, segue depois da maior.
    await api.post(`/projects/${p.id}/songs`, { song_id: c.id });
    expect((await api.get(`/projects/${p.id}`)).json().songs.at(-1)).toEqual({ song_id: c.id, track_number: 8 });

    const repetida = await api.post(`/projects/${p.id}/songs`, { song_id: (await api.post("/songs", { title: "D" })).json().id, track_number: 7 });
    expect(repetida.statusCode).toBe(409);

    // A vira 7: B, que era a 7, fica com o 1 de A.
    const troca = await api.patch(`/projects/${p.id}/songs/${a.id}`, { track_number: 7 });
    expect(troca.statusCode).toBe(200);
    expect(troca.json().songs).toEqual([
      { song_id: b.id, track_number: 1 },
      { song_id: a.id, track_number: 7 },
      { song_id: c.id, track_number: 8 },
    ]);
    // Número livre: só muda.
    expect((await api.patch(`/projects/${p.id}/songs/${c.id}`, { track_number: 3 })).json().songs.map((f: { track_number: number }) => f.track_number)).toEqual([1, 3, 7]);
  });

  it("faixa que não está no projeto, ou projeto de outra pessoa, dá 404", async () => {
    const a = await pessoa();
    const b = await pessoa();
    const p = (await a.api.post("/projects", { name: "Dela" })).json();
    const s = (await a.api.post("/songs", { title: "Fora" })).json();
    expect((await a.api.patch(`/projects/${p.id}/songs/${s.id}`, { track_number: 2 })).statusCode).toBe(404);
    await a.api.post(`/projects/${p.id}/songs`, { song_id: s.id });
    expect((await b.api.patch(`/projects/${p.id}/songs/${s.id}`, { track_number: 2 })).statusCode).toBe(404);
    expect((await a.api.patch(`/projects/${p.id}/songs/${s.id}`, { track_number: 0 })).statusCode).toBe(422);
  });
});

describe("entradas e custos do projeto (ADR 0021)", () => {
  it("entrada soma no arrecadado; corrigir e apagar acertam a soma; custo não mexe", async () => {
    const { api } = await pessoa();
    const p = (await api.post("/projects", { name: "EP", funding_target: 2000, estimated_cost: 1500 })).json();

    const show = await api.post(`/projects/${p.id}/entries`, { kind: "ENTRADA", description: "Show no Bar do Zé", category: "Show", amount: 500, occurred_on: "2026-10-20" });
    expect(show.statusCode).toBe(201);
    expect(show.json()).toMatchObject({ kind: "ENTRADA", amount: 500, category: "Show", occurred_on: "2026-10-20" });
    expect((await api.get(`/projects/${p.id}`)).json().funding_current).toBe(500);

    const cache = await api.post(`/projects/${p.id}/entries`, { kind: "CUSTO", description: "Cachê do baterista", category: "Cachê", amount: 300 });
    await api.post(`/projects/${p.id}/entries`, { kind: "CUSTO", description: "Locação do estúdio", amount: 450 });
    expect((await api.get(`/projects/${p.id}`)).json().funding_current).toBe(500);

    expect((await api.patch(`/projects/${p.id}/entries/${show.json().id}`, { amount: 650 })).json().amount).toBe(650);
    expect((await api.get(`/projects/${p.id}`)).json().funding_current).toBe(650);
    expect((await api.patch(`/projects/${p.id}/entries/${cache.json().id}`, { amount: 350, category: null })).json()).toMatchObject({ amount: 350, category: null });

    const lista = (await api.get(`/projects/${p.id}/entries`)).json() as { kind: string; amount: number }[];
    expect(lista).toHaveLength(3);
    expect(lista.filter((l) => l.kind === "CUSTO").reduce((s, l) => s + l.amount, 0)).toBe(800);

    expect((await api.delete(`/projects/${p.id}/entries/${show.json().id}`)).statusCode).toBe(204);
    expect((await api.get(`/projects/${p.id}`)).json().funding_current).toBe(0);
    expect((await api.get(`/projects/${p.id}/entries`)).json()).toHaveLength(2);
  });

  it("id do aparelho torna o envio repetível", async () => {
    const { api } = await pessoa();
    const p = (await api.post("/projects", { name: "Single" })).json();
    const id = uuidv7();
    const corpo = { id, kind: "ENTRADA", description: "Vaquinha", amount: 100 };
    expect((await api.post(`/projects/${p.id}/entries`, corpo)).statusCode).toBe(201);
    expect((await api.post(`/projects/${p.id}/entries`, corpo)).json().id).toBe(id);
    expect((await api.get(`/projects/${p.id}`)).json().funding_current).toBe(100);
  });

  it("valida e só a dona mexe", async () => {
    const a = await pessoa();
    const b = await pessoa();
    const p = (await a.api.post("/projects", { name: "Meu" })).json();
    expect((await a.api.post(`/projects/${p.id}/entries`, { kind: "CUSTO", description: "", amount: 10 })).statusCode).toBe(422);
    expect((await a.api.post(`/projects/${p.id}/entries`, { kind: "CUSTO", description: "x", amount: 0 })).statusCode).toBe(422);
    expect((await a.api.post(`/projects/${p.id}/entries`, { kind: "OUTRO", description: "x", amount: 1 })).statusCode).toBe(422);
    const l = (await a.api.post(`/projects/${p.id}/entries`, { kind: "CUSTO", description: "Ensaio", amount: 80 })).json();
    expect((await b.api.get(`/projects/${p.id}/entries`)).statusCode).toBe(404);
    expect((await b.api.post(`/projects/${p.id}/entries`, { kind: "ENTRADA", description: "x", amount: 1 })).statusCode).toBe(404);
    expect((await b.api.delete(`/projects/${p.id}/entries/${l.id}`)).statusCode).toBe(404);

    await a.api.delete(`/projects/${p.id}`);
    expect((await a.api.post(`/projects/${p.id}/entries`, { kind: "CUSTO", description: "x", amount: 1 })).statusCode).toBe(409);
  });
});
