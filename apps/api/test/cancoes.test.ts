import { describe, expect, it } from "vitest";

import { como, convidarEAceitar, novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();

async function cancaoDe(titulo = "Maré") {
  const dona = await novaPessoa(ctx.app, "Dona");
  const api = como(ctx.app, dona.token);
  const cancao = (await api.post("/songs", { title: titulo })).json();
  return { dona, api, cancao };
}

describe("canções", () => {
  it("nasce com a dona a 100% e uma folha pautada", async () => {
    const { dona, cancao } = await cancaoDe();
    expect(cancao).toMatchObject({ title: "Maré", status: "IDEIA", visibility: "PRIVATE", owner_id: dona.id, time_signature: "4/4" });
    expect(cancao.collaborators).toEqual([expect.objectContaining({ user_id: dona.id, role: "OWNER", contribution_percent: 100 })]);
    expect(cancao.blocks.map((b: { type: string }) => b.type)).toEqual(["SECTION", "LYRIC"]);
  });

  it("aceita o id gerado no aparelho (ADR 0005)", async () => {
    const p = await novaPessoa(ctx.app);
    const id = "01920000-0000-7000-8000-0000000c0de1";
    const r = await como(ctx.app, p.token).post("/songs", { id, title: "Feita offline" });
    expect(r.statusCode).toBe(201);
    expect(r.json().id).toBe(id);
    // Reenviar o mesmo id não duplica: 409.
    expect((await como(ctx.app, p.token).post("/songs", { id, title: "De novo" })).statusCode).toBe(409);
  });

  it("folha_pautada: false cria sem blocos (o app monta a folha no documento)", async () => {
    const p = await novaPessoa(ctx.app);
    const r = await como(ctx.app, p.token).post("/songs", { title: "Em branco", folha_pautada: false });
    expect(r.statusCode).toBe(201);
    expect(r.json().blocks).toEqual([]);
  });

  it("quem não é coautora recebe 404, não 403", async () => {
    const { cancao } = await cancaoDe();
    const estranha = await novaPessoa(ctx.app);
    expect((await como(ctx.app, estranha.token).get(`/songs/${cancao.id}`)).statusCode).toBe(404);
  });

  it("edita a ficha técnica e valida bpm", async () => {
    const { api, cancao } = await cancaoDe();
    const r = await api.patch(`/songs/${cancao.id}`, { status: "ESCRITA", musical_key: "Am", bpm: 92, tags: ["mar", "mar", "noite"] });
    expect(r.json()).toMatchObject({ status: "ESCRITA", musical_key: "Am", bpm: 92, tags: ["mar", "noite"] });
    expect((await api.patch(`/songs/${cancao.id}`, { bpm: 900 })).statusCode).toBe(422);
  });

  it("lista só as da pessoa e busca sem acento em título, tag e verso", async () => {
    const { api, cancao } = await cancaoDe("Coração de Pedra");
    const outra = (await api.post("/songs", { title: "Outra" })).json();
    await api.patch(`/songs/${outra.id}`, { tags: ["Saudade"] });
    const terceira = (await api.post("/songs", { title: "Terceira" })).json();
    await api.patch(`/songs/${terceira.id}/blocks/${terceira.blocks[1].id}`, { content: "o sertão vai virar mar" });

    const busca = async (q: string) =>
      ((await api.get(`/songs?q=${encodeURIComponent(q)}`)).json() as { id: string }[]).map((s) => s.id);
    expect(await busca("coracao")).toEqual([cancao.id]);
    expect(await busca("SAUDADE")).toEqual([outra.id]);
    expect(await busca("sertao")).toEqual([terceira.id]);
    expect(await busca("100%")).toEqual([]);

    const estranha = await novaPessoa(ctx.app);
    expect((await como(ctx.app, estranha.token).get("/songs")).json()).toEqual([]);
  });

  it("expand=blocks,collaborators devolve as canções completas numa ida só", async () => {
    const { dona, api, cancao } = await cancaoDe();
    await api.post(`/songs/${cancao.id}/blocks`, { type: "LYRIC", content: "linha" });
    const resumo = (await api.get("/songs")).json()[0];
    expect(resumo).not.toHaveProperty("blocks");
    const [completa] = (await api.get("/songs?expand=blocks,collaborators")).json();
    expect(completa.blocks.map((b: { content: string }) => b.content)).toEqual(["", "", "linha"]);
    expect(completa.collaborators).toEqual([expect.objectContaining({ user_id: dona.id, role: "OWNER" })]);
    expect((await api.get("/songs?expand=tudo")).statusCode).toBe(422);
  });

  it("filtra por estágio", async () => {
    const { api, cancao } = await cancaoDe();
    await api.post("/songs", { title: "Ainda ideia" });
    await api.patch(`/songs/${cancao.id}`, { status: "FINALIZADA" });
    const lista = (await api.get("/songs?status=FINALIZADA")).json() as { id: string }[];
    expect(lista.map((s) => s.id)).toEqual([cancao.id]);
  });
});

describe("blocos", () => {
  it("insere na posição pedida e renumera os seguintes", async () => {
    const { api, cancao } = await cancaoDe();
    const r = await api.post(`/songs/${cancao.id}/blocks`, { type: "NOTE", content: "meio", position: 1 });
    expect(r.statusCode).toBe(201);
    const blocos = r.json().blocks as { content: string; position: number; type: string }[];
    expect(blocos.map((b) => b.type)).toEqual(["SECTION", "NOTE", "LYRIC"]);
    expect(blocos.map((b) => b.position)).toEqual([0, 1, 2]);
  });

  it("sem posição entra no fim", async () => {
    const { api, cancao } = await cancaoDe();
    const blocos = (await api.post(`/songs/${cancao.id}/blocks`, { type: "CHORD", content: "Am  G" })).json().blocks;
    expect(blocos.at(-1)).toMatchObject({ type: "CHORD", position: 2 });
  });

  it("remover recompacta as posições", async () => {
    const { api, cancao } = await cancaoDe();
    await api.post(`/songs/${cancao.id}/blocks`, { type: "LYRIC", content: "fim" });
    expect((await api.delete(`/songs/${cancao.id}/blocks/${cancao.blocks[0].id}`)).statusCode).toBe(204);
    const blocos = (await api.get(`/songs/${cancao.id}`)).json().blocks as { position: number }[];
    expect(blocos.map((b) => b.position)).toEqual([0, 1]);
  });

  it("autoria do bloco não muda quando outra pessoa edita", async () => {
    const { dona, api, cancao } = await cancaoDe();
    const coautora = await novaPessoa(ctx.app);
    await convidarEAceitar(ctx.app, api, cancao.id, coautora, "LYRICIST");
    const r = await como(ctx.app, coautora.token).patch(`/songs/${cancao.id}/blocks/${cancao.blocks[1].id}`, { content: "verso dela" });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ content: "verso dela", author_id: dona.id });
  });

  it("quem só vê não edita (403)", async () => {
    const { api, cancao } = await cancaoDe();
    const leitora = await novaPessoa(ctx.app);
    await convidarEAceitar(ctx.app, api, cancao.id, leitora, "VIEWER");
    const leitura = como(ctx.app, leitora.token);
    expect((await leitura.get(`/songs/${cancao.id}`)).statusCode).toBe(200);
    expect((await leitura.patch(`/songs/${cancao.id}/blocks/${cancao.blocks[0].id}`, { content: "x" })).statusCode).toBe(403);
  });

  it("bloco de outra canção é 404", async () => {
    const a = await cancaoDe();
    const b = await cancaoDe();
    expect((await a.api.patch(`/songs/${a.cancao.id}/blocks/${b.cancao.blocks[0].id}`, { content: "x" })).statusCode).toBe(404);
  });
});

describe("coautoria (RN05)", () => {
  it("convite entra a 0% e reabre a divisão", async () => {
    const { api, cancao } = await cancaoDe();
    await api.put(`/songs/${cancao.id}/contributions`, { contributions: [], confirm: true });
    const coautor = await novaPessoa(ctx.app);
    const r = (await convidarEAceitar(ctx.app, api, cancao.id, coautor, "COMPOSER")).json();
    expect(r.contributions_confirmed).toBe(false);
    expect(r.collaborators).toContainEqual(expect.objectContaining({ user_id: coautor.id, contribution_percent: 0 }));
  });

  it("só fecha quando soma exatamente 100", async () => {
    const { dona, api, cancao } = await cancaoDe();
    const coautor = await novaPessoa(ctx.app);
    await convidarEAceitar(ctx.app, api, cancao.id, coautor, "COMPOSER");

    const aberta = await api.put(`/songs/${cancao.id}/contributions`, {
      contributions: [{ user_id: dona.id, percentage: 70 }, { user_id: coautor.id, percentage: 20.5 }],
      confirm: true,
    });
    expect(aberta.statusCode).toBe(422);
    expect(aberta.json().detail).toBe("A divisão soma 90,50%. Precisa fechar em 100%.");

    const rascunho = await api.put(`/songs/${cancao.id}/contributions`, {
      contributions: [{ user_id: dona.id, percentage: 70 }, { user_id: coautor.id, percentage: 20 }],
    });
    expect(rascunho.json().contributions_confirmed).toBe(false);

    const fechada = await api.put(`/songs/${cancao.id}/contributions`, {
      contributions: [{ user_id: coautor.id, percentage: 30 }],
      confirm: true,
    });
    expect(fechada.statusCode).toBe(200);
    expect(fechada.json().contributions_confirmed).toBe(true);
  });

  it("mexer na ficha não reabre a divisão, mas remover coautor reabre", async () => {
    const { dona, api, cancao } = await cancaoDe();
    const coautor = await novaPessoa(ctx.app);
    await convidarEAceitar(ctx.app, api, cancao.id, coautor, "COMPOSER");
    await api.put(`/songs/${cancao.id}/contributions`, {
      contributions: [{ user_id: dona.id, percentage: 50 }, { user_id: coautor.id, percentage: 50 }],
      confirm: true,
    });
    expect((await api.patch(`/songs/${cancao.id}`, { title: "Novo" })).json().contributions_confirmed).toBe(true);
    expect((await api.delete(`/songs/${cancao.id}/collaborators/${coautor.id}`)).statusCode).toBe(204);
    expect((await api.get(`/songs/${cancao.id}`)).json().contributions_confirmed).toBe(false);
    expect((await como(ctx.app, coautor.token).get(`/songs/${cancao.id}`)).statusCode).toBe(404);
  });

  it("divisão com quem não é coautor é 422; coautor não acerta a divisão (403)", async () => {
    const { dona, api, cancao } = await cancaoDe();
    const estranho = await novaPessoa(ctx.app);
    const r = await api.put(`/songs/${cancao.id}/contributions`, { contributions: [{ user_id: estranho.id, percentage: 10 }] });
    expect(r.statusCode).toBe(422);

    const coautor = await novaPessoa(ctx.app);
    await convidarEAceitar(ctx.app, api, cancao.id, coautor, "COMPOSER");
    const dele = await como(ctx.app, coautor.token).put(`/songs/${cancao.id}/contributions`, {
      contributions: [{ user_id: dona.id, percentage: 0 }],
    });
    expect(dele.statusCode).toBe(403);
  });

  it("a dona não sai da própria canção", async () => {
    const { dona, api, cancao } = await cancaoDe();
    expect((await api.delete(`/songs/${cancao.id}/collaborators/${dona.id}`)).statusCode).toBe(422);
  });

  it("removido e convidado de novo volta como coautor", async () => {
    const { api, cancao } = await cancaoDe();
    const c = await novaPessoa(ctx.app);
    await convidarEAceitar(ctx.app, api, cancao.id, c, "COMPOSER");
    await api.delete(`/songs/${cancao.id}/collaborators/${c.id}`);
    const r = await convidarEAceitar(ctx.app, api, cancao.id, c, "PRODUCER");
    expect(r.statusCode).toBe(200);
    expect(r.json().collaborators).toContainEqual(expect.objectContaining({ user_id: c.id, role: "PRODUCER" }));
    expect((await como(ctx.app, c.token).get(`/songs/${cancao.id}`)).statusCode).toBe(200);
  });
});

describe("lixeira (RN07)", () => {
  it("vai para a lixeira mantendo a pasta, e volta", async () => {
    const { api, cancao } = await cancaoDe();
    const pasta = (await api.post("/folders", { name: "Rascunhos" })).json();
    await api.patch(`/songs/${cancao.id}`, { folder_id: pasta.id });

    expect((await api.delete(`/songs/${cancao.id}`)).statusCode).toBe(204);
    expect((await api.get("/songs")).json().map((s: { id: string }) => s.id)).not.toContain(cancao.id);

    const lixeira = (await api.get("/songs/trash")).json();
    expect(lixeira).toContainEqual(expect.objectContaining({ id: cancao.id, days_remaining: 30, folder_id: pasta.id }));

    expect((await api.patch(`/songs/${cancao.id}`, { title: "x" })).statusCode).toBe(409);

    const restaurada = (await api.post(`/songs/${cancao.id}/restore`)).json();
    expect(restaurada).toMatchObject({ deleted_at: null, folder_id: pasta.id });
  });

  it("só a dona manda para a lixeira ou apaga de vez", async () => {
    const { api, cancao } = await cancaoDe();
    const c = await novaPessoa(ctx.app);
    await convidarEAceitar(ctx.app, api, cancao.id, c, "COMPOSER");
    expect((await como(ctx.app, c.token).delete(`/songs/${cancao.id}`)).statusCode).toBe(403);
    expect((await como(ctx.app, c.token).delete(`/songs/${cancao.id}/permanent`)).statusCode).toBe(403);
    expect((await api.delete(`/songs/${cancao.id}/permanent`)).statusCode).toBe(204);
    expect((await api.get(`/songs/${cancao.id}`)).statusCode).toBe(404);
  });
});
