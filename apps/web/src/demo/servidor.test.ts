import { beforeEach, describe, expect, it } from "vitest";

import { emailDemo, SENHA_DEMO } from "@/demo/semente";
import { responder, restaurarDadosDeExemplo } from "@/demo/servidor";

async function chamar(caminho: string, opcoes: { method?: string; body?: unknown; token?: string } = {}) {
  const r = await responder(caminho, {
    method: opcoes.method ?? "GET",
    headers: opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {},
    body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
  });
  return { status: r.status, corpo: r.status === 204 ? null : await r.json() };
}

async function entrar() {
  const { corpo } = await chamar("/auth/login", {
    method: "POST",
    body: { email: emailDemo("laramendes"), password: SENHA_DEMO },
  });
  return corpo.access_token as string;
}

beforeEach(() => {
  localStorage.clear();
  restaurarDadosDeExemplo();
});

describe("servidor de demonstração", () => {
  it("recusa rota privada sem token, como a API real", async () => {
    expect((await chamar("/songs")).status).toBe(401);
  });

  it("recusa senha errada com a mensagem em `detail`", async () => {
    const r = await chamar("/auth/login", { method: "POST", body: { email: emailDemo("laramendes"), password: "x" } });
    expect(r.status).toBe(401);
    expect(r.corpo.detail).toMatch(/senha/i);
  });

  it("lista só as canções em que a pessoa é coautora", async () => {
    const token = await entrar();
    const { corpo } = await chamar("/songs", { token });
    expect(corpo.length).toBeGreaterThan(0);
    expect(corpo.every((s: { deleted_at: string | null }) => s.deleted_at === null)).toBe(true);
  });

  it("insere bloco na posição pedida e renumera os demais", async () => {
    const token = await entrar();
    const antes = (await chamar("/songs/s1", { token })).corpo;
    await chamar("/songs/s1/blocks", { method: "POST", token, body: { type: "NOTE", content: "meio", position: 1 } });
    const depois = (await chamar("/songs/s1", { token })).corpo;
    expect(depois.blocks).toHaveLength(antes.blocks.length + 1);
    expect(depois.blocks[1].content).toBe("meio");
    expect(depois.blocks.map((b: { position: number }) => b.position)).toEqual(depois.blocks.map((_: unknown, i: number) => i));
  });

  it("só fecha a divisão de coautoria quando soma 100 (RN05)", async () => {
    const token = await entrar();
    const aberta = await chamar("/songs/s1/contributions", {
      method: "PUT",
      token,
      body: { contributions: [{ user_id: "u1", percentage: 70 }, { user_id: "u3", percentage: 20 }], confirm: true },
    });
    expect(aberta.status).toBe(422);

    const fechada = await chamar("/songs/s1/contributions", {
      method: "PUT",
      token,
      body: { contributions: [{ user_id: "u1", percentage: 70 }, { user_id: "u3", percentage: 30 }], confirm: true },
    });
    expect(fechada.status).toBe(200);
    expect(fechada.corpo.contributions_confirmed).toBe(true);
  });

  it("exclusão é reversível: vai para a lixeira e volta", async () => {
    const token = await entrar();
    await chamar("/songs/s2", { method: "DELETE", token });
    const lixeira = (await chamar("/songs/trash", { token })).corpo;
    expect(lixeira.some((s: { id: string; days_remaining: number }) => s.id === "s2" && s.days_remaining === 30)).toBe(true);
    await chamar("/songs/s2/restore", { method: "POST", token });
    expect((await chamar("/songs/s2", { token })).corpo.deleted_at).toBeNull();
  });

  it("o mapa não expõe e-mail", async () => {
    const token = await entrar();
    const { corpo } = await chamar("/map/people", { token });
    expect(corpo.length).toBeGreaterThan(0);
    expect(corpo.every((u: Record<string, unknown>) => !("email" in u))).toBe(true);
  });
});
