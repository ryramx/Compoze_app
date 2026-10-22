import { songs } from "@compoze/db";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { expurgarLixeira } from "../src/modules/lixeira/expurgo";
import { como, novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();

async function pessoa() {
  const p = await novaPessoa(ctx.app);
  return { ...p, api: como(ctx.app, p.token) };
}

describe("pastas", () => {
  it("cria árvore, renomeia e move", async () => {
    const { api } = await pessoa();
    const mae = (await api.post("/folders", { name: "Álbum" })).json();
    const filha = (await api.post("/folders", { name: "Demos", parent_id: mae.id })).json();
    expect(filha.parent_id).toBe(mae.id);
    expect((await api.patch(`/folders/${filha.id}`, { name: "Demos 2", parent_id: null })).json()).toMatchObject({
      name: "Demos 2",
      parent_id: null,
    });
    expect((await api.get("/folders")).json()).toHaveLength(2);
  });

  it("recusa ciclo (422)", async () => {
    const { api } = await pessoa();
    const a = (await api.post("/folders", { name: "A" })).json();
    const b = (await api.post("/folders", { name: "B", parent_id: a.id })).json();
    const r = await api.patch(`/folders/${a.id}`, { parent_id: b.id });
    expect(r.statusCode).toBe(422);
    expect(r.json().detail).toMatch(/dentro de si mesma/);
  });

  it("apagar sobe as subpastas e solta as canções", async () => {
    const { api } = await pessoa();
    const avo = (await api.post("/folders", { name: "Avó" })).json();
    const mae = (await api.post("/folders", { name: "Mãe", parent_id: avo.id })).json();
    const neta = (await api.post("/folders", { name: "Neta", parent_id: mae.id })).json();
    const s = (await api.post("/songs", { title: "Dentro", folder_id: mae.id })).json();

    expect((await api.delete(`/folders/${mae.id}`)).statusCode).toBe(204);
    const pastas = (await api.get("/folders")).json() as { id: string; parent_id: string | null }[];
    expect(pastas.map((p) => p.id).sort()).toEqual([avo.id, neta.id].sort());
    expect(pastas.find((p) => p.id === neta.id)!.parent_id).toBe(avo.id);
    expect((await api.get(`/songs/${s.id}`)).json().folder_id).toBeNull();
  });

  it("pasta de outra pessoa não existe para mim", async () => {
    const a = await pessoa();
    const b = await pessoa();
    const dela = (await a.api.post("/folders", { name: "Dela" })).json();
    expect((await b.api.patch(`/folders/${dela.id}`, { name: "x" })).statusCode).toBe(404);
    expect((await b.api.post("/songs", { title: "x", folder_id: dela.id })).statusCode).toBe(422);
  });
});

describe("projetos", () => {
  it("cria, muda de fase e monta a lista de faixas", async () => {
    const { api } = await pessoa();
    const p = (await api.post("/projects", { name: "Primeiro EP", type: "EP", style: "ACUSTICO", funding_target: 5000 })).json();
    expect(p).toMatchObject({ type: "EP", status: "PLANEJAMENTO", funding_current: 0, songs: [] });

    const s1 = (await api.post("/songs", { title: "Um" })).json();
    const s2 = (await api.post("/songs", { title: "Dois" })).json();
    await api.post(`/projects/${p.id}/songs`, { song_id: s1.id });
    const r = await api.post(`/projects/${p.id}/songs`, { song_id: s2.id });
    expect(r.statusCode).toBe(201);
    expect(r.json().songs).toEqual([
      { song_id: s1.id, track_number: 1 },
      { song_id: s2.id, track_number: 2 },
    ]);

    expect((await api.patch(`/projects/${p.id}`, { status: "PRODUCAO", release_date: "2027-03-01" })).json()).toMatchObject({
      status: "PRODUCAO",
      release_date: "2027-03-01",
    });

    expect((await api.get("/projects")).json()[0].songs).toHaveLength(2);

    expect((await api.delete(`/projects/${p.id}/songs/${s1.id}`)).statusCode).toBe(204);
    expect((await api.get(`/projects/${p.id}`)).json().songs).toEqual([{ song_id: s2.id, track_number: 2 }]);
    expect((await api.get(`/songs/${s1.id}`)).statusCode).toBe(200);
  });

  it("não aceita canção que a pessoa não vê", async () => {
    const a = await pessoa();
    const b = await pessoa();
    const p = (await a.api.post("/projects", { name: "Meu" })).json();
    const dela = (await b.api.post("/songs", { title: "Dela" })).json();
    expect((await a.api.post(`/projects/${p.id}/songs`, { song_id: dela.id })).statusCode).toBe(404);
  });

  it("lixeira de projeto não leva as canções", async () => {
    const { api } = await pessoa();
    const p = (await api.post("/projects", { name: "Single" })).json();
    const s = (await api.post("/songs", { title: "Faixa" })).json();
    await api.post(`/projects/${p.id}/songs`, { song_id: s.id });

    expect((await api.delete(`/projects/${p.id}`)).statusCode).toBe(204);
    expect((await api.get("/projects")).json()).toEqual([]);
    expect((await api.get(`/songs/${s.id}`)).json().deleted_at).toBeNull();

    const volta = (await api.post(`/projects/${p.id}/restore`)).json();
    expect(volta).toMatchObject({ deleted_at: null, songs: [{ song_id: s.id, track_number: 1 }] });
  });
});

describe("expurgo da lixeira (RN08)", () => {
  it("apaga só o que está na lixeira há mais de 30 dias", async () => {
    const { api } = await pessoa();
    const velha = (await api.post("/songs", { title: "Velha" })).json();
    const recente = (await api.post("/songs", { title: "Recente" })).json();
    const viva = (await api.post("/songs", { title: "Viva" })).json();
    await api.delete(`/songs/${velha.id}`);
    await api.delete(`/songs/${recente.id}`);
    await ctx.banco.db
      .update(songs)
      .set({ deletedAt: sql`now() - interval '31 days'` })
      .where(eq(songs.id, velha.id));

    const lixeira = (await api.get("/songs/trash")).json() as { id: string; days_remaining: number }[];
    expect(lixeira.find((s) => s.id === velha.id)!.days_remaining).toBe(0);

    const r = await expurgarLixeira(ctx.banco.db);
    expect(r.cancoes).toBeGreaterThanOrEqual(1);
    expect((await api.get(`/songs/${velha.id}`)).statusCode).toBe(404);
    expect((await api.get(`/songs/${recente.id}`)).statusCode).toBe(200);
    expect((await api.get(`/songs/${viva.id}`)).statusCode).toBe(200);
  });
});
