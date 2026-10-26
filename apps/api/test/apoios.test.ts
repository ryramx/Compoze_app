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

const chave = { key_type: "EMAIL", key: "Lara@Exemplo.com", receiver_name: "Lara Mendes", city: "São Paulo" };

async function projetoAberto() {
  const dona = await novaPessoa(ctx.app, "Dona Disco");
  const daDona = como(ctx.app, dona.token);
  const projeto = (await daDona.post("/projects", { name: "Disco de Inverno", funding_target: 1000 })).json();
  const r = await daDona.put(`/projects/${projeto.id}/pix`, chave);
  expect(r.statusCode).toBe(200);
  return { dona, daDona, projeto };
}

describe("apoio por PIX (ADR 0018)", () => {
  it("a dona cadastra a chave normalizada; ninguém mais vê ou mexe", async () => {
    const { daDona, projeto } = await projetoAberto();
    expect((await daDona.get(`/projects/${projeto.id}/pix`)).json()).toMatchObject({ key_type: "EMAIL", key: "lara@exemplo.com", open: true });
    const outra = como(ctx.app, (await novaPessoa(ctx.app)).token);
    expect((await outra.get(`/projects/${projeto.id}/pix`)).statusCode).toBe(404);
    expect((await outra.put(`/projects/${projeto.id}/pix`, chave)).statusCode).toBe(404);
    expect((await daDona.put(`/projects/${projeto.id}/pix`, { ...chave, key_type: "CPF", key: "123" })).statusCode).toBe(422);
  });

  it("quem apoia vê o projeto sem a chave e recebe o copia e cola com o valor", async () => {
    const { projeto } = await projetoAberto();
    const bia = await novaPessoa(ctx.app, "Bia Apoia");
    const deBia = como(ctx.app, bia.token);
    const visto = (await deBia.get(`/support/${projeto.id}`)).json();
    expect(visto).toMatchObject({ name: "Disco de Inverno", funding_target: 1000, funding_current: 0, receiver_name: "Lara Mendes", supporters: 0 });
    expect(JSON.stringify(visto)).not.toContain("lara@exemplo.com");

    const id = uuidv7();
    const r = await deBia.post(`/support/${projeto.id}/contributions`, { id, amount: 50 });
    expect(r.statusCode).toBe(201);
    const { contribution, pix_code } = r.json();
    expect(contribution).toMatchObject({ id, amount: 50, status: "PENDENTE", supporter_id: bia.id });
    expect(pix_code).toMatch(/^000201/);
    expect(pix_code).toContain("lara@exemplo.com");
    expect(pix_code).toContain("540550.00");
    expect(pix_code).toContain(contribution.txid);
    // Repetir o pedido não cria outro apoio.
    await deBia.post(`/support/${projeto.id}/contributions`, { id, amount: 50 });
    expect((await deBia.get(`/support/${projeto.id}/contributions`)).json()).toHaveLength(1);
  });

  it("avisar que pagou, a dona confirma e o arrecadado sobe; recusar não soma", async () => {
    const { dona, daDona, projeto } = await projetoAberto();
    await daDona.put("/push/subscriptions", { endpoint: `https://push.exemplo/dona-${dona.id}`, keys: { p256dh: "x", auth: "y" } });
    const bia = await novaPessoa(ctx.app, "Bia Paga");
    const deBia = como(ctx.app, bia.token);
    const a = (await deBia.post(`/support/${projeto.id}/contributions`, { amount: 80 })).json().contribution;
    const b = (await deBia.post(`/support/${projeto.id}/contributions`, { amount: 30 })).json().contribution;

    expect((await deBia.post(`/support/${projeto.id}/contributions/${a.id}/paid`)).json().paid_claimed_at).not.toBeNull();
    for (let i = 0; i < 50 && !avisos.some((x) => x.para.endsWith(dona.id)); i++) await new Promise((r) => setTimeout(r, 20));
    expect(avisos.find((x) => x.para.endsWith(dona.id))!.aviso.body).toContain("R$ 80");

    const lista = (await daDona.get(`/projects/${projeto.id}/contributions`)).json();
    // O que foi avisado como pago vem primeiro.
    expect(lista[0]).toMatchObject({ id: a.id, supporter: { id: bia.id } });

    expect((await daDona.post(`/projects/${projeto.id}/contributions/${a.id}/confirm`)).json().status).toBe("CONFIRMADO");
    expect((await daDona.post(`/projects/${projeto.id}/contributions/${b.id}/refuse`)).json().status).toBe("RECUSADO");
    expect((await daDona.post(`/projects/${projeto.id}/contributions/${a.id}/refuse`)).statusCode).toBe(409);
    expect((await daDona.get(`/projects/${projeto.id}`)).json().funding_current).toBe(80);
    expect((await deBia.get(`/support/${projeto.id}`)).json()).toMatchObject({ funding_current: 80, supporters: 1 });

    // Só a dona decide.
    expect((await deBia.post(`/projects/${projeto.id}/contributions/${b.id}/confirm`)).statusCode).toBe(404);
  });

  it("sem chave, fechado ou o próprio projeto: não dá para apoiar", async () => {
    const { daDona, projeto } = await projetoAberto();
    expect((await daDona.post(`/support/${projeto.id}/contributions`, { amount: 10 })).statusCode).toBe(422);
    const bia = como(ctx.app, (await novaPessoa(ctx.app)).token);
    await daDona.put(`/projects/${projeto.id}/pix`, { ...chave, open: false });
    expect((await bia.get(`/support/${projeto.id}`)).statusCode).toBe(404);
    await daDona.delete(`/projects/${projeto.id}/pix`);
    expect((await bia.post(`/support/${projeto.id}/contributions`, { amount: 10 })).statusCode).toBe(404);
    expect((await bia.post(`/support/${projeto.id}/contributions`, { amount: 0 })).statusCode).toBe(422);
  });
});
