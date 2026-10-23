import { songBlocks } from "@compoze/db";
import { editarTexto, inserirBloco, lerBlocos, nomeDoDocumento, Y } from "@compoze/documento";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { como, convidarEAceitar, novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();
let url = "";

beforeAll(async () => {
  const endereco = await ctx.app.listen({ host: "127.0.0.1", port: 0 });
  url = `${endereco.replace("http", "ws")}/collab`;
});

const abertos: HocuspocusProvider[] = [];
afterEach(() => {
  for (const p of abertos.splice(0)) p.destroy();
});

/** Abre o editor de uma canção como a pessoa do token. Resolve ao sincronizar. */
function abrir(songId: string, token: string) {
  const doc = new Y.Doc();
  return new Promise<{ doc: Y.Doc; provider: HocuspocusProvider }>((resolve, reject) => {
    const provider = new HocuspocusProvider({
      url,
      name: nomeDoDocumento(songId),
      document: doc,
      token,
      onSynced: () => resolve({ doc, provider }),
      onAuthenticationFailed: ({ reason }) => reject(new Error(reason)),
    });
    abertos.push(provider);
  });
}

/** Espera até a condição valer (as mensagens do WebSocket são assíncronas). */
async function ate(condicao: () => boolean | Promise<boolean>, ms = 4000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if (await condicao()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("condição não aconteceu a tempo");
}

async function cancaoComCoautora(papel = "COMPOSER") {
  const dona = await novaPessoa(ctx.app, "Dona");
  const coautora = await novaPessoa(ctx.app, "Coautora");
  const cancao = (await como(ctx.app, dona.token).post("/songs", { title: "Maré" })).json();
  await convidarEAceitar(ctx.app, como(ctx.app, dona.token), cancao.id, coautora, papel);
  return { dona, coautora, cancao };
}

describe("edição em tempo real (Hocuspocus)", () => {
  it("o documento nasce com os blocos que a canção já tinha", async () => {
    const { dona, cancao } = await cancaoComCoautora();
    const { doc } = await abrir(cancao.id, dona.token);
    expect(lerBlocos(doc).map((b) => [b.id, b.type, b.label])).toEqual(
      cancao.blocks.map((b: { id: string; type: string; label: string | null }) => [b.id, b.type, b.label]),
    );
  });

  it("duas pessoas no mesmo verso: cada uma vê a outra, e a projeção grava as duas", async () => {
    const { dona, coautora, cancao } = await cancaoComCoautora();
    const verso = cancao.blocks[1].id as string;
    const a = await abrir(cancao.id, dona.token);
    const b = await abrir(cancao.id, coautora.token);

    editarTexto(a.doc, verso, "a cidade respira");
    await ate(() => lerBlocos(b.doc)[1]?.content === "a cidade respira");
    editarTexto(b.doc, verso, "a cidade respira sem mim");
    inserirBloco(b.doc, { id: "01920000-0000-7000-8000-00000000b10c", type: "CHORD", label: null, content: "Am F", author_id: coautora.id }, 1);
    await ate(() => lerBlocos(a.doc).length === 3);

    // Fechar os editores grava na hora.
    a.provider.destroy();
    b.provider.destroy();
    await ate(async () => {
      const r = (await como(ctx.app, dona.token).get(`/songs/${cancao.id}`)).json();
      return r.blocks.length === 3 && r.blocks[2].content === "a cidade respira sem mim";
    });
    const r = (await como(ctx.app, dona.token).get(`/songs/${cancao.id}`)).json();
    expect(r.blocks.map((x: { type: string; position: number }) => [x.type, x.position])).toEqual([
      ["SECTION", 0],
      ["CHORD", 1],
      ["LYRIC", 2],
    ]);
    expect(r.blocks[1].author_id).toBe(coautora.id);
  });

  it("autoria de alguém de fora da canção não é aceita", async () => {
    const { dona, cancao } = await cancaoComCoautora();
    const estranha = await novaPessoa(ctx.app);
    const a = await abrir(cancao.id, dona.token);
    inserirBloco(a.doc, { id: "01920000-0000-7000-8000-0000000fa15e", type: "NOTE", label: null, content: "x", author_id: estranha.id });
    a.provider.destroy();
    await ate(async () => (await como(ctx.app, dona.token).get(`/songs/${cancao.id}`)).json().blocks.length === 3);
    const r = (await como(ctx.app, dona.token).get(`/songs/${cancao.id}`)).json();
    expect(r.blocks[2].author_id).toBeNull();
  });

  it("quem não é da canção não entra", async () => {
    const { cancao } = await cancaoComCoautora();
    const estranha = await novaPessoa(ctx.app);
    await expect(abrir(cancao.id, estranha.token)).rejects.toThrow();
  });

  it("token inválido não entra", async () => {
    const { cancao } = await cancaoComCoautora();
    await expect(abrir(cancao.id, "token-falso")).rejects.toThrow();
  });

  it("quem só vê acompanha, mas o que escreve não chega a ninguém", async () => {
    const { dona, coautora, cancao } = await cancaoComCoautora("VIEWER");
    const verso = cancao.blocks[1].id as string;
    const a = await abrir(cancao.id, dona.token);
    const v = await abrir(cancao.id, coautora.token);

    editarTexto(v.doc, verso, "tentativa");
    editarTexto(a.doc, verso, "da dona");
    await ate(() => lerBlocos(v.doc)[1]?.content.includes("da dona") ?? false);
    await new Promise((r) => setTimeout(r, 200));
    expect(lerBlocos(a.doc)[1]?.content).toBe("da dona");
  });

  it("bloco criado pela rota REST aparece na hora para quem está com a canção aberta", async () => {
    const { dona, coautora, cancao } = await cancaoComCoautora();
    const b = await abrir(cancao.id, coautora.token);
    const r = await como(ctx.app, dona.token).post(`/songs/${cancao.id}/blocks`, { type: "NOTE", content: "pela API" });
    expect(r.statusCode).toBe(201);
    expect(r.json().blocks.at(-1)).toMatchObject({ type: "NOTE", content: "pela API", author_id: dona.id });
    await ate(() => lerBlocos(b.doc).at(-1)?.content === "pela API");
  });

  it("mandar para a lixeira derruba os editores; ao voltar, ficam só leitura", async () => {
    const { dona, coautora, cancao } = await cancaoComCoautora();
    const verso = cancao.blocks[1].id as string;
    const b = await abrir(cancao.id, coautora.token);
    await como(ctx.app, dona.token).delete(`/songs/${cancao.id}`);
    // Reconecta sozinho; a canção na lixeira não aceita escrita.
    await new Promise((r) => setTimeout(r, 300));
    editarTexto(b.doc, verso, "escrito na lixeira");
    await new Promise((r) => setTimeout(r, 2500));
    b.provider.destroy();
    await new Promise((r) => setTimeout(r, 300));
    const [linha] = await ctx.banco.db.select().from(songBlocks).where(eq(songBlocks.id, verso));
    expect(linha?.content).toBe("");
  });
});
