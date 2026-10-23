import { conectar } from "@compoze/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { construirApp } from "../src/app";
import type { Email } from "../src/lib/correio";
import { como, configDeTeste, novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();

async function cancaoDe() {
  const dona = await novaPessoa(ctx.app, "Dona Lua");
  const api = como(ctx.app, dona.token);
  const cancao = (await api.post("/songs", { title: "Maré" })).json();
  return { dona, api, cancao };
}

describe("convite pela conta", () => {
  it("a pessoa vê, aceita e passa a escrever; a divisão reabre", async () => {
    const { api, cancao } = await cancaoDe();
    const ana = await novaPessoa(ctx.app, "Ana");
    const daAna = como(ctx.app, ana.token);

    const c = await api.post(`/songs/${cancao.id}/invites`, { user_id: ana.id, role: "LYRICIST" });
    expect(c.statusCode).toBe(201);
    expect(c.json()).toMatchObject({ kind: "USUARIO", invited_user_id: ana.id, token: null, emailed: false });

    // Antes de aceitar, ela não entra na canção.
    expect((await daAna.get(`/songs/${cancao.id}`)).statusCode).toBe(404);
    const [recebido] = (await daAna.get("/invites")).json();
    expect(recebido).toMatchObject({ song_title: "Maré", role: "LYRICIST", already_member: false });
    expect(recebido.invited_by.name).toMatch(/^Dona Lua/);

    const aceite = await daAna.post(`/invites/${recebido.id}/accept`);
    expect(aceite.statusCode).toBe(200);
    expect(aceite.json().collaborators).toContainEqual(
      expect.objectContaining({ user_id: ana.id, role: "LYRICIST", contribution_percent: 0 }),
    );
    expect(aceite.json().contributions_confirmed).toBe(false);
    expect((await daAna.get("/invites")).json()).toEqual([]);
    expect((await daAna.post(`/invites/${recebido.id}/accept`)).statusCode).toBe(410);
  });

  it("recusar fecha o convite sem entrar", async () => {
    const { api, cancao } = await cancaoDe();
    const bia = await novaPessoa(ctx.app);
    const id = (await api.post(`/songs/${cancao.id}/invites`, { user_id: bia.id })).json().id;
    expect((await como(ctx.app, bia.token).post(`/invites/${id}/decline`)).statusCode).toBe(204);
    expect((await como(ctx.app, bia.token).post(`/invites/${id}/accept`)).statusCode).toBe(410);
    expect((await api.get(`/songs/${cancao.id}/invites`)).json().invites).toEqual([]);
  });

  it("só a pessoa convidada usa o convite; só a dona convida", async () => {
    const { api, cancao } = await cancaoDe();
    const ana = await novaPessoa(ctx.app);
    const outra = await novaPessoa(ctx.app);
    const id = (await api.post(`/songs/${cancao.id}/invites`, { user_id: ana.id })).json().id;
    expect((await como(ctx.app, outra.token).post(`/invites/${id}/accept`)).statusCode).toBe(404);
    expect(
      (await como(ctx.app, outra.token).post(`/songs/${cancao.id}/invites`, { user_id: ana.id })).statusCode,
    ).toBe(404);
  });

  it("convidar de novo troca o convite aberto; quem já está recebe 409", async () => {
    const { dona, api, cancao } = await cancaoDe();
    const ana = await novaPessoa(ctx.app);
    const primeiro = (await api.post(`/songs/${cancao.id}/invites`, { user_id: ana.id })).json().id;
    const segundo = (await api.post(`/songs/${cancao.id}/invites`, { user_id: ana.id, role: "PRODUCER" })).json().id;
    const abertos = (await api.get(`/songs/${cancao.id}/invites`)).json().invites;
    expect(abertos.map((c: { id: string }) => c.id)).toEqual([segundo]);
    expect((await como(ctx.app, ana.token).post(`/invites/${primeiro}/accept`)).statusCode).toBe(410);

    expect((await api.post(`/songs/${cancao.id}/invites`, { user_id: dona.id })).statusCode).toBe(422);
    await como(ctx.app, ana.token).post(`/invites/${segundo}/accept`);
    expect((await api.post(`/songs/${cancao.id}/invites`, { user_id: ana.id })).statusCode).toBe(409);
  });

  it("a dona cancela o convite", async () => {
    const { api, cancao } = await cancaoDe();
    const ana = await novaPessoa(ctx.app);
    const id = (await api.post(`/songs/${cancao.id}/invites`, { user_id: ana.id })).json().id;
    expect((await api.delete(`/songs/${cancao.id}/invites/${id}`)).statusCode).toBe(204);
    expect((await como(ctx.app, ana.token).get("/invites")).json()).toEqual([]);
    const r = await como(ctx.app, ana.token).post(`/invites/${id}/accept`);
    expect(r.statusCode).toBe(410);
    expect(r.json().detail).toMatch(/cancelado/);
  });
});

describe("convite por link", () => {
  it("o link vale uma vez, para quem tiver; o banco guarda só o hash", async () => {
    const { api, cancao } = await cancaoDe();
    const c = (await api.post(`/songs/${cancao.id}/invites`, { link: true, role: "MUSICIAN" })).json();
    expect(c).toMatchObject({ kind: "LINK", invited_user_id: null, emailed: false });
    expect(c.token).toMatch(/^[\w-]{43}$/);

    const linhas = await ctx.banco.pool.query("select token_hash from song_invites where id = $1", [c.id]);
    expect(linhas.rows[0].token_hash).not.toBe(c.token);

    const nova = await novaPessoa(ctx.app);
    const daNova = como(ctx.app, nova.token);
    expect((await daNova.get(`/invites/link/${c.token}`)).json()).toMatchObject({ song_title: "Maré", role: "MUSICIAN" });
    const aceite = await daNova.post(`/invites/link/${c.token}/accept`);
    expect(aceite.json().collaborators).toContainEqual(expect.objectContaining({ user_id: nova.id, role: "MUSICIAN" }));

    const terceira = await novaPessoa(ctx.app);
    expect((await como(ctx.app, terceira.token).post(`/invites/link/${c.token}/accept`)).statusCode).toBe(410);
    // O id de um convite por link não serve de atalho.
    expect((await como(ctx.app, terceira.token).post(`/invites/${c.id}/accept`)).statusCode).toBe(404);
  });

  it("quem já escreve na canção não gasta o link", async () => {
    const { api, cancao } = await cancaoDe();
    const { token } = (await api.post(`/songs/${cancao.id}/invites`, { link: true })).json();
    expect((await api.post(`/invites/link/${token}/accept`)).statusCode).toBe(200);
    const outra = await novaPessoa(ctx.app);
    expect((await como(ctx.app, outra.token).post(`/invites/link/${token}/accept`)).statusCode).toBe(200);
  });

  it("link vencido ou inventado não entra", async () => {
    const { api, cancao } = await cancaoDe();
    const c = (await api.post(`/songs/${cancao.id}/invites`, { link: true })).json();
    await ctx.banco.pool.query("update song_invites set expires_at = now() - interval '1 minute' where id = $1", [c.id]);
    const r = await api.get(`/invites/link/${c.token}`);
    expect(r.statusCode).toBe(410);
    expect(r.json().detail).toMatch(/venceu/);
    expect((await api.get(`/invites/link/${"x".repeat(43)}`)).statusCode).toBe(404);
  });

  it("sem e-mail ligado, o pedido com e-mail sai só como link", async () => {
    const { api, cancao } = await cancaoDe();
    expect((await api.get(`/songs/${cancao.id}/invites`)).json().email_enabled).toBe(false);
    const c = (await api.post(`/songs/${cancao.id}/invites`, { link: true, email: "amiga@exemplo.com" })).json();
    expect(c).toMatchObject({ emailed: false, email: "amiga@exemplo.com" });
  });
});

describe("convite por e-mail", () => {
  const enviados: Email[] = [];
  const local = {} as { app: Awaited<ReturnType<typeof construirApp>>; banco: ReturnType<typeof conectar> };
  beforeAll(async () => {
    const config = configDeTeste({ WEB_URL: "https://web.teste/" });
    local.banco = conectar(config.DATABASE_URL, { max: 2 });
    local.app = await construirApp({
      config,
      banco: local.banco,
      remetente: { entregar: async (e) => void enviados.push(e) },
    });
    await local.app.ready();
  });
  afterAll(async () => {
    await local.app?.close();
    await local.banco?.fechar();
  });

  it("manda o link para o e-mail, com o nome de quem convida e o título", async () => {
    const dona = await novaPessoa(local.app, "Dona Lua");
    const api = como(local.app, dona.token);
    const cancao = (await api.post("/songs", { title: "Maré <alta>" })).json();
    expect((await api.get(`/songs/${cancao.id}/invites`)).json().email_enabled).toBe(true);
    const c = (await api.post(`/songs/${cancao.id}/invites`, { link: true, email: "amiga@exemplo.com" })).json();
    expect(c.emailed).toBe(true);
    await expect.poll(() => enviados.length).toBe(1);
    const [e] = enviados;
    expect(e!.para).toBe("amiga@exemplo.com");
    expect(e!.assunto).toMatch(/^Dona Lua \d+ te chamou para escrever “Maré <alta>”$/);
    expect(e!.texto).toContain(`https://web.teste/convite/${c.token}`);
    expect(e!.html).toContain("Maré &lt;alta&gt;");
  });
});

describe("busca de pessoas para convidar", () => {
  it("acha pelo começo do @ e por parte do nome, sem acento; não acha quem busca", async () => {
    const eu = await novaPessoa(ctx.app, "Eu Mesma");
    const joao = await novaPessoa(ctx.app, "João Coração");
    const api = como(ctx.app, eu.token);
    const porNome = (await api.get("/users?q=coracao")).json();
    expect(porNome.map((u: { id: string }) => u.id)).toContain(joao.id);
    const porArroba = (await api.get(`/users?q=@${joao.username.slice(0, -1)}`)).json();
    expect(porArroba[0].id).toBeDefined();
    expect(porArroba.map((u: { id: string }) => u.id)).toContain(joao.id);
    expect((await api.get(`/users?q=${eu.username}`)).json()).toEqual([]);
    expect((await api.get("/users?q=%25")).json().length).toBeLessThanOrEqual(10);
    expect((await api.get("/users")).statusCode).toBe(422);
  });
});
