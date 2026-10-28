import type { Aviso } from "@compoze/contracts";
import { describe, expect, it } from "vitest";

import { uuidv7 } from "../src/lib/uuidv7";
import { como, novaPessoa, usarApp } from "./ajuda";

const avisos: { para: string; aviso: Aviso }[] = [];
const ctx = usarApp({}, {
  entregarPush: async (i, aviso) => {
    avisos.push({ para: i.endpoint, aviso });
    return 201;
  },
});

type Novidade = { id: string; kind: string; unread: boolean; actor: { id: string } | null; subject: string | null; excerpt: string | null; amount: number | null; count: number | null; url: string };

describe("novidades da Mesa (ADR 0023)", () => {
  it("junta mensagem, comentário, curtida, seguidor, convite e convite aceito, do mais novo ao mais antigo", async () => {
    const ana = await novaPessoa(ctx.app, "Ana Novidade");
    const bia = await novaPessoa(ctx.app, "Bia Novidade");
    const deAna = como(ctx.app, ana.token);
    const deBia = como(ctx.app, bia.token);

    expect((await deAna.get("/notifications")).json()).toEqual({ items: [], unread_count: 0, next_cursor: null });

    const post = (await deAna.post("/posts", { id: uuidv7(), content: "Terminei o refrão de Inverno." })).json();
    await deBia.put(`/users/${ana.id}/follow`);
    await deBia.put(`/posts/${post.id}/like`);
    await deBia.post(`/posts/${post.id}/comments`, { content: "Ficou lindo!" });
    // O que a própria Ana faz não vira novidade para ela.
    await deAna.post(`/posts/${post.id}/comments`, { content: "Obrigada!" });
    await deAna.put(`/posts/${post.id}/like`);
    const conversa = (await deBia.post("/conversations", { user_id: ana.id })).json();
    await deBia.post(`/conversations/${conversa.id}/messages`, { content: "Bora gravar?" });
    await deBia.post(`/conversations/${conversa.id}/messages`, { content: "Amanhã?" });
    const cancao = (await deBia.post("/songs", { id: uuidv7(), title: "Maré" })).json();
    await deBia.post(`/songs/${cancao.id}/invites`, { user_id: ana.id, role: "LYRICIST" });

    const pagina = (await deAna.get("/notifications")).json() as { items: Novidade[]; unread_count: number };
    expect(pagina.items.map((n) => n.kind)).toEqual(["INVITE", "MESSAGE", "COMMENT", "LIKE", "FOLLOW"]);
    expect(pagina.unread_count).toBe(5);
    expect(pagina.items.every((n) => n.unread && n.actor?.id === bia.id)).toBe(true);
    const [convite, mensagem, comentario, curtida, seguidor] = pagina.items;
    expect(convite).toMatchObject({ subject: "Maré", url: "/" });
    expect(mensagem).toMatchObject({ excerpt: "Amanhã?", count: 2, url: `/messages/${conversa.id}` });
    expect(comentario).toMatchObject({ excerpt: "Ficou lindo!", subject: "Terminei o refrão de Inverno.", url: `/posts/${post.id}` });
    expect(curtida).toMatchObject({ url: `/posts/${post.id}` });
    expect(seguidor).toMatchObject({ url: `/profile/${bia.username}` });

    // Ver a lista apaga o "novo" de tudo, menos da conversa, que se lê nela.
    expect((await deAna.put("/notifications/seen")).statusCode).toBe(204);
    let depois = (await deAna.get("/notifications")).json() as { items: Novidade[]; unread_count: number };
    expect(depois.unread_count).toBe(1);
    expect(depois.items.filter((n) => n.unread).map((n) => n.kind)).toEqual(["MESSAGE"]);
    await deAna.post(`/conversations/${conversa.id}/read`);
    depois = (await deAna.get("/notifications")).json();
    expect(depois.unread_count).toBe(0);

    // Aceitar o convite tira a novidade dela e dá uma à Bia.
    const [recebido] = (await deAna.get("/invites")).json();
    await deAna.post(`/invites/${recebido.id}/accept`);
    expect(((await deAna.get("/notifications")).json().items as Novidade[]).some((n) => n.kind === "INVITE")).toBe(false);
    const daBia = (await deBia.get("/notifications")).json().items as Novidade[];
    expect(daBia[0]).toMatchObject({ kind: "INVITE_ACCEPTED", subject: "Maré", url: `/songs/${cancao.id}/edit`, actor: { id: ana.id } });

    // Descurtir tira a curtida da lista.
    await deBia.delete(`/posts/${post.id}/like`);
    expect(((await deAna.get("/notifications")).json().items as Novidade[]).some((n) => n.kind === "LIKE")).toBe(false);
  });

  it("pagina por data, sem repetir nem pular", async () => {
    const ana = await novaPessoa(ctx.app, "Ana Pagina");
    for (let i = 0; i < 5; i++) {
      const p = await novaPessoa(ctx.app, `Fã ${i}`);
      await como(ctx.app, p.token).put(`/users/${ana.id}/follow`);
    }
    const deAna = como(ctx.app, ana.token);
    const um = (await deAna.get("/notifications?limit=3")).json();
    expect(um.items).toHaveLength(3);
    expect(um.next_cursor).toBe(um.items[2].at);
    const dois = (await deAna.get(`/notifications?limit=3&before=${encodeURIComponent(um.next_cursor)}`)).json();
    expect(dois.items).toHaveLength(2);
    expect(dois.next_cursor).toBeNull();
    expect(dois.unread_count).toBe(5);
    expect(new Set([...um.items, ...dois.items].map((n: Novidade) => n.id)).size).toBe(5);
  });

  it("apoio: a dona vê quem diz que pagou; quem apoiou vê a confirmação", async () => {
    const dona = await novaPessoa(ctx.app, "Dona Novidade");
    const daDona = como(ctx.app, dona.token);
    const projeto = (await daDona.post("/projects", { name: "Disco de Verão", funding_target: 1000 })).json();
    await daDona.put(`/projects/${projeto.id}/pix`, { key_type: "EMAIL", key: "dona@exemplo.com", receiver_name: "Dona", city: "Recife" });
    const bia = await novaPessoa(ctx.app, "Bia Apoio");
    const deBia = como(ctx.app, bia.token);
    const a = (await deBia.post(`/support/${projeto.id}/contributions`, { amount: 40 })).json().contribution;

    // Só o QR Code gerado não é novidade.
    expect((await daDona.get("/notifications")).json().items).toEqual([]);
    await deBia.post(`/support/${projeto.id}/contributions/${a.id}/paid`);
    expect((await daDona.get("/notifications")).json().items[0]).toMatchObject({ kind: "SUPPORT", amount: 40, subject: "Disco de Verão", url: `/projects/${projeto.id}` });

    await daDona.post(`/projects/${projeto.id}/contributions/${a.id}/confirm`);
    expect((await daDona.get("/notifications")).json().items).toEqual([]);
    expect((await deBia.get("/notifications")).json().items[0]).toMatchObject({ kind: "SUPPORT_CONFIRMED", amount: 40, actor: { id: dona.id }, url: `/apoiar/${projeto.id}` });
  });

  it("comentário na minha publicação vira push", async () => {
    const ana = await novaPessoa(ctx.app, "Ana Push");
    const bia = await novaPessoa(ctx.app, "Bia Push");
    const deAna = como(ctx.app, ana.token);
    await deAna.put("/push/subscriptions", { endpoint: `https://push.exemplo/ana-${ana.id}`, keys: { p256dh: "x", auth: "y" } });
    const post = (await deAna.post("/posts", { content: "Alguém tem um verso?" })).json();
    await deAna.post(`/posts/${post.id}/comments`, { content: "Eu mesma." });
    await como(ctx.app, bia.token).post(`/posts/${post.id}/comments`, { content: "Tenho dois!" });
    for (let i = 0; i < 50 && !avisos.some((x) => x.para.endsWith(ana.id)); i++) await new Promise((r) => setTimeout(r, 20));
    const meus = avisos.filter((x) => x.para.endsWith(ana.id));
    expect(meus).toHaveLength(1);
    expect(meus[0]!.aviso).toMatchObject({ title: expect.stringMatching(/^Bia Push.* comentou$/), body: "Tenho dois!", url: `/posts/${post.id}` });
  });
});
