import { describe, expect, it } from "vitest";

import { uuidv7 } from "../src/lib/uuidv7";
import { como, convidarEAceitar, novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();

const som = Buffer.from("OggS-de-mentira-mas-com-bytes");

async function cancaoDe() {
  const dona = await novaPessoa(ctx.app, "Dona Voz");
  const api = como(ctx.app, dona.token);
  const cancao = (await api.post("/songs", { title: "Cantarolado" })).json();
  return { dona, api, cancao };
}

function subir(token: string, songId: string, memoId: string, opcoes: { tipo?: string; corpo?: Buffer; query?: string } = {}) {
  return ctx.app.inject({
    method: "PUT",
    url: `/songs/${songId}/memos/${memoId}?${opcoes.query ?? "duration_ms=4200&title=refrão"}`,
    headers: { authorization: `Bearer ${token}`, "content-type": opcoes.tipo ?? "audio/webm;codecs=opus" },
    payload: opcoes.corpo ?? som,
  });
}

describe("memos de voz (ADR 0012)", () => {
  it("sobe com o id do aparelho, lista e devolve o mesmo áudio", async () => {
    const { dona, api, cancao } = await cancaoDe();
    const id = uuidv7();
    const r = await subir(dona.token, cancao.id, id);
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ id, song_id: cancao.id, author_id: dona.id, title: "refrão", duration_ms: 4200, mime_type: "audio/webm", size_bytes: som.length });

    expect((await api.get(`/songs/${cancao.id}/memos`)).json()).toEqual([r.json()]);
    const audio = await api.get(`/songs/${cancao.id}/memos/${id}/audio`);
    expect(audio.statusCode).toBe(200);
    expect(audio.headers["content-type"]).toBe("audio/webm");
    expect(audio.rawPayload.equals(som)).toBe(true);
  });

  it("reenviar o mesmo memo não duplica", async () => {
    const { dona, api, cancao } = await cancaoDe();
    const id = uuidv7();
    await subir(dona.token, cancao.id, id);
    const de_novo = await subir(dona.token, cancao.id, id);
    expect(de_novo.statusCode).toBe(200);
    expect((await api.get(`/songs/${cancao.id}/memos`)).json()).toHaveLength(1);
  });

  it("recusa o que não é áudio, vazio ou grande demais", async () => {
    const { dona, cancao } = await cancaoDe();
    expect((await subir(dona.token, cancao.id, uuidv7(), { tipo: "audio/flac" })).statusCode).toBe(415);
    expect((await subir(dona.token, cancao.id, uuidv7(), { corpo: Buffer.alloc(9 * 1024 * 1024, 1) })).statusCode).toBe(413);
    expect((await subir(dona.token, cancao.id, uuidv7(), { query: "title=sem-duracao" })).statusCode).toBe(422);
  });

  it("quem não está na canção não vê nem sobe; quem só vê, ouve mas não grava", async () => {
    const { dona, cancao } = await cancaoDe();
    const id = uuidv7();
    await subir(dona.token, cancao.id, id);

    const estranha = await novaPessoa(ctx.app, "Estranha");
    expect((await como(ctx.app, estranha.token).get(`/songs/${cancao.id}/memos/${id}/audio`)).statusCode).toBe(404);
    expect((await subir(estranha.token, cancao.id, uuidv7())).statusCode).toBe(404);

    const ouvinte = await novaPessoa(ctx.app, "Ouvinte");
    await convidarEAceitar(ctx.app, como(ctx.app, dona.token), cancao.id, ouvinte, "VIEWER");
    expect((await como(ctx.app, ouvinte.token).get(`/songs/${cancao.id}/memos/${id}/audio`)).statusCode).toBe(200);
    expect((await subir(ouvinte.token, cancao.id, uuidv7())).statusCode).toBe(403);
  });

  it("renomear e apagar: quem gravou ou a dona, mais ninguém", async () => {
    const { api, cancao } = await cancaoDe();
    const coautora = await novaPessoa(ctx.app, "Coautora");
    await convidarEAceitar(ctx.app, api, cancao.id, coautora);
    const outra = await novaPessoa(ctx.app, "Outra");
    await convidarEAceitar(ctx.app, api, cancao.id, outra);

    const id = uuidv7();
    await subir(coautora.token, cancao.id, id);
    const deOutra = como(ctx.app, outra.token);
    expect((await deOutra.patch(`/songs/${cancao.id}/memos/${id}`, { title: "meu" })).statusCode).toBe(403);
    expect((await deOutra.delete(`/songs/${cancao.id}/memos/${id}`)).statusCode).toBe(403);

    const r = await como(ctx.app, coautora.token).patch(`/songs/${cancao.id}/memos/${id}`, { title: "ponte, ideia 2" });
    expect(r.json().title).toBe("ponte, ideia 2");
    expect((await api.delete(`/songs/${cancao.id}/memos/${id}`)).statusCode).toBe(204);
    expect((await api.get(`/songs/${cancao.id}/memos`)).json()).toEqual([]);
    expect((await api.get(`/songs/${cancao.id}/memos/${id}/audio`)).statusCode).toBe(404);
  });
});
