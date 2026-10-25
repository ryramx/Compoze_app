import { images } from "@compoze/db";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { expurgarImagensSoltas } from "../src/modules/imagens/servico";
import { como, novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();

// Cabeçalhos de verdade, com uns bytes depois: o servidor só olha o começo.
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("resto-do-png")]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("resto-do-jpeg")]);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBPVP8 resto")]);

function subir(token: string, url: string, corpo: Buffer, tipo = "image/png") {
  return ctx.app.inject({ method: "PUT", url, headers: { authorization: `Bearer ${token}`, "content-type": tipo }, payload: corpo });
}

const idDe = (url: string) => url.replace("/images/", "");

describe("imagens (ADR 0015)", () => {
  it("foto de perfil: sobe, aparece no perfil e desce sem login", async () => {
    const eu = await novaPessoa(ctx.app, "Com Foto");
    const r = await subir(eu.token, "/users/me/avatar", png);
    expect(r.statusCode).toBe(200);
    const url = r.json().avatar_url as string;
    expect(url).toMatch(/^\/images\/[0-9a-f-]{36}$/);

    const outra = await novaPessoa(ctx.app, "Quem Vê");
    expect((await como(ctx.app, outra.token).get(`/users/${eu.username}`)).json().avatar_url).toBe(url);

    const img = await ctx.app.inject({ method: "GET", url });
    expect(img.statusCode).toBe(200);
    expect(img.headers["content-type"]).toBe("image/png");
    expect(img.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(img.headers["cache-control"]).toContain("immutable");
    expect(img.rawPayload.equals(png)).toBe(true);
  });

  it("trocar apaga a antiga; tirar volta ao monograma", async () => {
    const eu = await novaPessoa(ctx.app, "Troca Foto");
    const primeira = (await subir(eu.token, "/users/me/avatar", png)).json().avatar_url as string;
    const segunda = (await subir(eu.token, "/users/me/avatar", jpeg, "image/jpeg")).json().avatar_url as string;
    expect(segunda).not.toBe(primeira);
    expect((await ctx.app.inject({ method: "GET", url: primeira })).statusCode).toBe(404);
    expect((await ctx.app.inject({ method: "GET", url: segunda })).headers["content-type"]).toBe("image/jpeg");

    const sem = await como(ctx.app, eu.token).delete("/users/me/avatar");
    expect(sem.json().avatar_url).toBeNull();
    expect((await ctx.app.inject({ method: "GET", url: segunda })).statusCode).toBe(404);
  });

  it("o tipo vem dos bytes: recusa o que não é imagem, vazio ou grande demais", async () => {
    const eu = await novaPessoa(ctx.app, "Tenta");
    expect((await subir(eu.token, "/users/me/avatar", Buffer.from("<svg onload=alert(1)>"), "image/svg+xml")).statusCode).toBe(415);
    expect((await subir(eu.token, "/users/me/avatar", Buffer.from("<html>"), "image/png")).statusCode).toBe(415);
    expect((await subir(eu.token, "/users/me/avatar", Buffer.alloc(3 * 1024 * 1024, 1))).statusCode).toBe(413);
    // Cabeçalho diz PNG, bytes são WebP: vale o que os bytes dizem.
    const r = await subir(eu.token, "/users/me/avatar", webp, "image/png");
    expect((await ctx.app.inject({ method: "GET", url: r.json().avatar_url })).headers["content-type"]).toBe("image/webp");
    expect((await ctx.app.inject({ method: "PUT", url: "/users/me/avatar", headers: { "content-type": "image/png" }, payload: png })).statusCode).toBe(401);
  });

  it("capa de projeto: só a dona troca", async () => {
    const dona = await novaPessoa(ctx.app, "Dona Capa");
    const projeto = (await como(ctx.app, dona.token).post("/projects", { name: "Disco" })).json();
    const r = await subir(dona.token, `/projects/${projeto.id}/cover`, jpeg, "image/jpeg");
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ id: projeto.id, cover_url: expect.stringMatching(/^\/images\//) });

    const outra = await novaPessoa(ctx.app, "Outra");
    expect((await subir(outra.token, `/projects/${projeto.id}/cover`, png)).statusCode).toBe(404);

    const sem = await como(ctx.app, dona.token).delete(`/projects/${projeto.id}/cover`);
    expect(sem.json().cover_url).toBeNull();
  });

  it("o expurgo leva só as imagens que ninguém aponta, com mais de um dia", async () => {
    const eu = await novaPessoa(ctx.app, "Expurgo");
    const usada = idDe((await subir(eu.token, "/users/me/avatar", png)).json().avatar_url);
    // Trocada por PATCH com uma URL de fora: a do Compoze fica solta.
    const solta = idDe((await subir(eu.token, "/users/me/avatar", jpeg, "image/jpeg")).json().avatar_url);
    await como(ctx.app, eu.token).patch("/users/me", { avatar_url: "https://exemplo.com/foto.jpg" });
    const db = ctx.banco.db;
    await db.update(images).set({ createdAt: sql`now() - interval '2 days'` }).where(eq(images.ownerId, eu.id));

    expect(await expurgarImagensSoltas(db)).toBeGreaterThanOrEqual(1);
    expect(await db.select({ id: images.id }).from(images).where(eq(images.id, solta))).toHaveLength(0);
    // A primeira já tinha saído na troca.
    expect(await db.select({ id: images.id }).from(images).where(eq(images.id, usada))).toHaveLength(0);
  });
});
