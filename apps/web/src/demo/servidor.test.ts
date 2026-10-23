import { beforeEach, describe, expect, it } from "vitest";

import { emailDemo, SENHA_DEMO } from "@/demo/semente";
import { responder, restaurarDadosDeExemplo } from "@/demo/servidor";
import { conferir } from "@/services/api/versionService";

async function chamar(caminho: string, opcoes: { method?: string; body?: unknown; token?: string } = {}) {
  const r = await responder(caminho, {
    method: opcoes.method ?? "GET",
    headers: opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {},
    body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
  });
  return { status: r.status, corpo: r.status === 204 ? null : await r.json() };
}

async function entrar(quem = "laramendes") {
  const { corpo } = await chamar("/auth/login", {
    method: "POST",
    body: { email: emailDemo(quem), password: SENHA_DEMO },
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

  it("registra a obra só com a divisão fechada, e o hash confere (ADR 0009)", async () => {
    const token = await entrar();
    expect((await chamar("/songs/s1", { method: "PATCH", token, body: { status: "REGISTRADA" } })).status).toBe(409);
    await chamar("/songs/s1/contributions", { method: "PUT", token, body: { contributions: [], confirm: false } });
    expect((await chamar("/songs/s1/register", { method: "POST", token })).status).toBe(409);

    await chamar("/songs/s1/contributions", {
      method: "PUT",
      token,
      body: { contributions: [{ user_id: "u1", percentage: 70 }, { user_id: "u3", percentage: 30 }], confirm: true },
    });
    const r = await chamar("/songs/s1/register", { method: "POST", token });
    expect(r.status).toBe(201);
    expect(r.corpo.song.status).toBe("REGISTRADA");
    expect(await conferir(r.corpo.version)).toBe(true);

    const v2 = (await chamar("/songs/s1/versions", { method: "POST", token, body: { label: "depois" } })).corpo;
    expect(v2.previous_sha256).toBe(r.corpo.version.sha256);
    const lista = (await chamar("/songs/s1/versions", { token })).corpo;
    expect(lista.map((v: { number: number }) => v.number)).toEqual([2, 1]);
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

  it("convite pela conta: busca por @, a pessoa aceita e só então entra (ADR 0010)", async () => {
    const lara = await entrar();
    const [iuri] = (await chamar("/users?q=@iu", { token: lara })).corpo;
    expect(iuri.username).toBe("iuri");
    const c = await chamar("/songs/s1/invites", { method: "POST", token: lara, body: { user_id: iuri.id, role: "LYRICIST" } });
    expect(c.status).toBe(201);

    const doIuri = await entrar("iuri");
    expect((await chamar("/songs/s1", { token: doIuri })).status).toBe(404);
    const [recebido] = (await chamar("/invites", { token: doIuri })).corpo;
    expect(recebido).toMatchObject({ song_title: "Café da madrugada", role: "LYRICIST" });
    const aceite = await chamar(`/invites/${recebido.id}/accept`, { method: "POST", token: doIuri, body: {} });
    expect(aceite.corpo.collaborators.some((x: { user_id: string }) => x.user_id === iuri.id)).toBe(true);
    expect((await chamar("/songs/s1", { token: doIuri })).status).toBe(200);
  });

  it("convite por link vale uma vez", async () => {
    const lara = await entrar();
    const { token } = (await chamar("/songs/s1/invites", { method: "POST", token: lara, body: { link: true } })).corpo;
    const sofia = await entrar("sofialemos");
    expect((await chamar(`/invites/link/${token}`, { token: sofia })).corpo.song_title).toBe("Café da madrugada");
    expect((await chamar(`/invites/link/${token}/accept`, { method: "POST", token: sofia, body: {} })).status).toBe(200);
    const theo = await entrar("theor");
    expect((await chamar(`/invites/link/${token}/accept`, { method: "POST", token: theo, body: {} })).status).toBe(410);
  });
});
