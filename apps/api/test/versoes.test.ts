import { createHash } from "node:crypto";

import { textoDaVersao, type Versao } from "@compoze/contracts";
import { songVersions } from "@compoze/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { como, convidarEAceitar, novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();

async function cancaoDe(titulo = "Maré") {
  const dona = await novaPessoa(ctx.app, "Dona Lua");
  const api = como(ctx.app, dona.token);
  const cancao = (await api.post("/songs", { title: titulo })).json();
  return { dona, api, cancao };
}

const hashDe = (v: Versao) => createHash("sha256").update(textoDaVersao(v), "utf8").digest("hex");

describe("versões (ADR 0009)", () => {
  it("guarda o texto de agora, com nomes, e o hash confere de fora", async () => {
    const { dona, api, cancao } = await cancaoDe();
    await api.patch(`/songs/${cancao.id}/blocks/${cancao.blocks[1].id}`, { content: "a maré subiu" });

    const r = await api.post(`/songs/${cancao.id}/versions`, { label: "primeira de pé" });
    expect(r.statusCode).toBe(201);
    const v = r.json() as Versao;
    expect(v).toMatchObject({ number: 1, reason: "MANUAL", label: "primeira de pé", title: "Maré", previous_sha256: null, created_by: dona.id });
    expect(v.snapshot.blocks.map((b) => b.content)).toEqual(["", "a maré subiu"]);
    expect(v.snapshot.blocks[1]!.author_id).toBe(dona.id);
    expect(v.snapshot.collaborators).toEqual([
      expect.objectContaining({ user_id: dona.id, name: expect.stringMatching(/^Dona Lua/), username: dona.username, role: "OWNER", contribution_percent: 100 }),
    ]);
    // Qualquer pessoa recalcula o hash a partir do que a API devolve.
    expect(hashDe(v)).toBe(v.sha256);

    // E continua conferindo depois de ida e volta pelo banco (jsonb reordena chaves).
    const lida = (await api.get(`/songs/${cancao.id}/versions/1`)).json() as Versao;
    expect(hashDe(lida)).toBe(v.sha256);
  });

  it("as versões formam uma corrente, e a lista vem da mais nova", async () => {
    const { api, cancao } = await cancaoDe();
    const v1 = (await api.post(`/songs/${cancao.id}/versions`, {})).json() as Versao;
    const v2 = (await api.post(`/songs/${cancao.id}/versions`, {})).json() as Versao;
    expect(v2.number).toBe(2);
    expect(v2.previous_sha256).toBe(v1.sha256);

    const lista = (await api.get(`/songs/${cancao.id}/versions`)).json();
    expect(lista.map((x: { number: number }) => x.number)).toEqual([2, 1]);
    expect(lista[0]).not.toHaveProperty("snapshot");
  });

  it("o banco recusa mudar uma versão guardada", async () => {
    const { api, cancao } = await cancaoDe();
    await api.post(`/songs/${cancao.id}/versions`, {});
    await expect(
      ctx.banco.db.update(songVersions).set({ label: "adulterada" }).where(eq(songVersions.songId, cancao.id)),
    ).rejects.toThrow();
  });

  it("mudar de estágio guarda uma versão automática", async () => {
    const { api, cancao } = await cancaoDe();
    await api.patch(`/songs/${cancao.id}`, { status: "ESCRITA" });
    await api.patch(`/songs/${cancao.id}`, { title: "Só o título" });
    const lista = (await api.get(`/songs/${cancao.id}/versions`)).json();
    expect(lista).toEqual([expect.objectContaining({ reason: "ESTAGIO", number: 1 })]);
    const v = (await api.get(`/songs/${cancao.id}/versions/1`)).json() as Versao;
    expect(v.snapshot.status).toBe("ESCRITA");
  });

  it("registrar exige a dona e a divisão fechada, e faz estágio + versão juntos", async () => {
    const { api, cancao } = await cancaoDe();
    const coautora = await novaPessoa(ctx.app, "Coautora");
    await convidarEAceitar(ctx.app, api, cancao.id, coautora, "LYRICIST");

    // Não dá para pular o registro mudando o estágio direto.
    expect((await api.patch(`/songs/${cancao.id}`, { status: "REGISTRADA" })).statusCode).toBe(409);
    // A coautora não registra.
    expect((await como(ctx.app, coautora.token).post(`/songs/${cancao.id}/register`)).statusCode).toBe(403);
    // Divisão aberta: não registra.
    const aberta = await api.post(`/songs/${cancao.id}/register`);
    expect(aberta.statusCode).toBe(409);
    expect(aberta.json().detail).toMatch(/divisão/);

    await api.put(`/songs/${cancao.id}/contributions`, {
      contributions: [
        { user_id: (await api.get("/users/me")).json().id, percentage: 60 },
        { user_id: coautora.id, percentage: 40 },
      ],
      confirm: true,
    });
    const r = await api.post(`/songs/${cancao.id}/register`);
    expect(r.statusCode).toBe(201);
    const { song, version } = r.json();
    expect(song.status).toBe("REGISTRADA");
    expect(version).toMatchObject({ reason: "REGISTRO", number: 1 });
    expect(version.snapshot).toMatchObject({ status: "REGISTRADA", contributions_confirmed: true });
    expect(version.snapshot.collaborators.map((c: { contribution_percent: number }) => c.contribution_percent).sort()).toEqual([40, 60]);
    expect(hashDe(version)).toBe(version.sha256);
  });

  it("só quem é da canção vê as versões; leitora não guarda", async () => {
    const { api, cancao } = await cancaoDe();
    await api.post(`/songs/${cancao.id}/versions`, {});
    const estranha = await novaPessoa(ctx.app);
    expect((await como(ctx.app, estranha.token).get(`/songs/${cancao.id}/versions`)).statusCode).toBe(404);

    const leitora = await novaPessoa(ctx.app);
    await convidarEAceitar(ctx.app, api, cancao.id, leitora, "VIEWER");
    const comoLeitora = como(ctx.app, leitora.token);
    expect((await comoLeitora.get(`/songs/${cancao.id}/versions/1`)).statusCode).toBe(200);
    expect((await comoLeitora.post(`/songs/${cancao.id}/versions`, {})).statusCode).toBe(403);
  });

  it("versões apagam junto com a canção apagada de vez", async () => {
    const { api, cancao } = await cancaoDe();
    await api.post(`/songs/${cancao.id}/versions`, {});
    await api.delete(`/songs/${cancao.id}/permanent`);
    const restantes = await ctx.banco.db.select().from(songVersions).where(eq(songVersions.songId, cancao.id));
    expect(restantes).toHaveLength(0);
  });
});
