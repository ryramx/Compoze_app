import { describe, expect, it } from "vitest";

import { como, novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();

describe("perfil", () => {
  it("atualiza o próprio perfil e a posição", async () => {
    const p = await novaPessoa(ctx.app);
    const r = await como(ctx.app, p.token).patch("/users/me", {
      bio: "Compõe no ônibus",
      city: "Recife",
      latitude: -8.05,
      longitude: -34.9,
      show_on_map: true,
      instruments: ["violão"],
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ bio: "Compõe no ônibus", latitude: -8.05, longitude: -34.9, instruments: ["violão"] });
  });

  it("latitude sem longitude é 422", async () => {
    const p = await novaPessoa(ctx.app);
    expect((await como(ctx.app, p.token).patch("/users/me", { latitude: 1 })).statusCode).toBe(422);
  });

  it("perfil público não traz e-mail nem coordenadas (RN11)", async () => {
    const [a, b] = [await novaPessoa(ctx.app), await novaPessoa(ctx.app)];
    await como(ctx.app, b.token).patch("/users/me", { latitude: 1, longitude: 2, show_on_map: true });
    const r = (await como(ctx.app, a.token).get(`/users/${b.username}`)).json();
    expect(r.username).toBe(b.username);
    for (const k of ["email", "latitude", "longitude", "show_on_map"]) expect(r).not.toHaveProperty(k);
  });

  it("busca várias pessoas por id e omite as desconhecidas", async () => {
    const [a, b] = [await novaPessoa(ctx.app), await novaPessoa(ctx.app)];
    const ids = [a.id, b.id, "01920000-0000-7000-8000-00000000dead", "lixo"].join(",");
    const r = await como(ctx.app, a.token).get(`/users?ids=${ids}`);
    expect(r.statusCode).toBe(200);
    expect(r.json().map((u: { id: string }) => u.id).sort()).toEqual([a.id, b.id].sort());
  });

  it("@ inexistente é 404", async () => {
    const p = await novaPessoa(ctx.app);
    expect((await como(ctx.app, p.token).get("/users/ninguem_aqui")).statusCode).toBe(404);
  });
});

describe("mapa (RN11)", () => {
  it("mostra só quem optou, com posição e sem e-mail", async () => {
    const [vis, oculta] = [await novaPessoa(ctx.app), await novaPessoa(ctx.app)];
    await como(ctx.app, vis.token).patch("/users/me", { latitude: -23.5, longitude: -46.6, show_on_map: true });
    await como(ctx.app, oculta.token).patch("/users/me", { latitude: -22.9, longitude: -43.2, show_on_map: false });

    const mapa = (await como(ctx.app, vis.token).get("/map/people")).json() as Record<string, unknown>[];
    const ids = mapa.map((u) => u.id);
    expect(ids).toContain(vis.id);
    expect(ids).not.toContain(oculta.id);
    const eu = mapa.find((u) => u.id === vis.id)!;
    expect(eu).toMatchObject({ latitude: -23.5, longitude: -46.6 });
    expect(eu).not.toHaveProperty("email");
  });

  it("apagar a posição tira a pessoa do mapa", async () => {
    const p = await novaPessoa(ctx.app);
    await como(ctx.app, p.token).patch("/users/me", { latitude: 1, longitude: 1, show_on_map: true });
    await como(ctx.app, p.token).patch("/users/me", { latitude: null, longitude: null });
    const mapa = (await como(ctx.app, p.token).get("/map/people")).json() as { id: string }[];
    expect(mapa.map((u) => u.id)).not.toContain(p.id);
  });
});
