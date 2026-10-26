import type { Aviso } from "@compoze/contracts";
import { pushSubscriptions } from "@compoze/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import type { Inscricao } from "../src/lib/avisador";
import { como, novaPessoa, usarApp } from "./ajuda";

// O serviço de push de mentira: anota o que sairia e responde o status combinado.
const entregues: { endpoint: string; aviso: Aviso }[] = [];
const respostas = new Map<string, number>();
const ctx = usarApp({}, {
  entregarPush: async (i: Inscricao, aviso: Aviso) => {
    entregues.push({ endpoint: i.endpoint, aviso });
    return respostas.get(i.endpoint) ?? 201;
  },
  // No FCM o token faz o papel do endpoint.
  entregarFcm: async (token: string, aviso: Aviso) => {
    entregues.push({ endpoint: token, aviso });
    return respostas.get(token) ?? 200;
  },
});

let n = 0;
const inscricao = () => ({ endpoint: `https://push.exemplo/${process.pid}-${++n}`, keys: { p256dh: "chave-p256dh", auth: "segredo" } });

/** O envio não segura a resposta da rota: espera ele acontecer. */
async function esperar(condicao: () => boolean) {
  for (let i = 0; i < 50 && !condicao(); i++) await new Promise((r) => setTimeout(r, 20));
}

async function dupla() {
  const ana = await novaPessoa(ctx.app, "Ana Aviso");
  const bia = await novaPessoa(ctx.app, "Bia Aviso");
  const conversa = (await como(ctx.app, ana.token).post("/conversations", { user_id: bia.id })).json();
  const daBia = inscricao();
  expect((await como(ctx.app, bia.token).put("/push/subscriptions", daBia)).statusCode).toBe(204);
  return { ana, bia, conversa, daBia };
}

describe("avisos por push (ADR 0016)", () => {
  it("a chave pública nasce uma vez e fica a mesma", async () => {
    const eu = await novaPessoa(ctx.app);
    const a = (await como(ctx.app, eu.token).get("/push/public-key")).json().key;
    const b = (await como(ctx.app, eu.token).get("/push/public-key")).json().key;
    expect(a).toMatch(/^[\w-]{80,}$/);
    expect(b).toBe(a);
    expect((await como(ctx.app, eu.token).get("/push/public-key")).json().fcm).toBe(true);
  });

  it("mensagem nova vira aviso para quem está fora do app", async () => {
    const { ana, conversa, daBia } = await dupla();
    await como(ctx.app, ana.token).post(`/conversations/${conversa.id}/messages`, { content: "Achei a ponte da canção!" });
    await esperar(() => entregues.some((e) => e.endpoint === daBia.endpoint));
    const e = entregues.find((x) => x.endpoint === daBia.endpoint)!;
    expect(e.aviso).toMatchObject({ body: "Achei a ponte da canção!", url: `/messages/${conversa.id}`, tag: `conversa-${conversa.id}` });
    expect(e.aviso.title).toContain("Ana Aviso");
  });

  it("com o app aberto, não manda push: o fluxo ao vivo já entregou", async () => {
    const { ana, bia, conversa, daBia } = await dupla();
    const parar = ctx.app.aoVivo.ouvir(bia.id, () => undefined);
    await como(ctx.app, ana.token).post(`/conversations/${conversa.id}/messages`, { content: "oi" });
    await new Promise((r) => setTimeout(r, 200));
    parar();
    expect(entregues.some((e) => e.endpoint === daBia.endpoint)).toBe(false);
  });

  it("inscrição vencida (410) sai da lista", async () => {
    const { ana, conversa, daBia } = await dupla();
    respostas.set(daBia.endpoint, 410);
    await como(ctx.app, ana.token).post(`/conversations/${conversa.id}/messages`, { content: "ainda aí?" });
    const db = ctx.banco.db;
    let resta = 1;
    for (let i = 0; i < 50 && resta > 0; i++) {
      resta = (await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, daBia.endpoint))).length;
      if (resta) await new Promise((r) => setTimeout(r, 20));
    }
    expect(resta).toBe(0);
  });

  it("convite pela conta avisa a convidada", async () => {
    const dona = await novaPessoa(ctx.app, "Dona Convite");
    const convidada = await novaPessoa(ctx.app, "Convidada");
    const dela = inscricao();
    await como(ctx.app, convidada.token).put("/push/subscriptions", dela);
    const cancao = (await como(ctx.app, dona.token).post("/songs", { title: "Valsa" })).json();
    await como(ctx.app, dona.token).post(`/songs/${cancao.id}/invites`, { user_id: convidada.id });
    await esperar(() => entregues.some((e) => e.endpoint === dela.endpoint));
    expect(entregues.find((e) => e.endpoint === dela.endpoint)!.aviso.body).toMatch(/Dona Convite .* “Valsa”/);
  });

  it("seguir avisa quem foi seguida, só na primeira vez", async () => {
    const { ana, bia, daBia } = await dupla();
    await como(ctx.app, ana.token).put(`/users/${bia.id}/follow`);
    await esperar(() => entregues.some((e) => e.endpoint === daBia.endpoint));
    const avisos = () => entregues.filter((e) => e.endpoint === daBia.endpoint);
    expect(avisos()[0]!.aviso).toMatchObject({ title: "Nova pessoa seguindo você", url: `/profile/${ana.username}` });
    expect(avisos()[0]!.aviso.body).toMatch(/Ana Aviso/);
    await como(ctx.app, ana.token).put(`/users/${bia.id}/follow`);
    await new Promise((r) => setTimeout(r, 200));
    expect(avisos()).toHaveLength(1);
  });

  it("o mesmo aparelho em outra conta passa para ela; cancelar só a própria", async () => {
    const ana = await novaPessoa(ctx.app);
    const bia = await novaPessoa(ctx.app);
    const i = inscricao();
    await como(ctx.app, ana.token).put("/push/subscriptions", i);
    await como(ctx.app, bia.token).put("/push/subscriptions", i);
    const db = ctx.banco.db;
    const [linha] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, i.endpoint));
    expect(linha!.userId).toBe(bia.id);

    await como(ctx.app, ana.token).delete("/push/subscriptions", { endpoint: i.endpoint });
    expect(await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, i.endpoint))).toHaveLength(1);
    await como(ctx.app, bia.token).delete("/push/subscriptions", { endpoint: i.endpoint });
    expect(await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, i.endpoint))).toHaveLength(0);

    expect((await como(ctx.app, bia.token).put("/push/subscriptions", { ...i, endpoint: "http://inseguro/x" })).statusCode).toBe(422);
  });

  it("app Android: token do Firebase recebe o aviso; token morto sai", async () => {
    const ana = await novaPessoa(ctx.app, "Ana Android");
    const bia = await novaPessoa(ctx.app, "Bia Android");
    const conversa = (await como(ctx.app, ana.token).post("/conversations", { user_id: bia.id })).json();
    const token = `fcm-${process.pid}-${++n}`;
    expect((await como(ctx.app, bia.token).put("/push/subscriptions", { fcm_token: token })).statusCode).toBe(204);
    await como(ctx.app, ana.token).post(`/conversations/${conversa.id}/messages`, { content: "no celular" });
    await esperar(() => entregues.some((e) => e.endpoint === token));
    expect(entregues.find((e) => e.endpoint === token)!.aviso.body).toBe("no celular");

    respostas.set(token, 404);
    await como(ctx.app, ana.token).post(`/conversations/${conversa.id}/messages`, { content: "de novo" });
    const db = ctx.banco.db;
    let resta = 1;
    for (let i = 0; i < 50 && resta > 0; i++) {
      resta = (await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, token))).length;
      if (resta) await new Promise((r) => setTimeout(r, 20));
    }
    expect(resta).toBe(0);
  });
});
