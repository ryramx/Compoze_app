import { exportPKCS8, generateKeyPair } from "jose";
import { describe, expect, it } from "vitest";

import { CANAL_ANDROID, criarFcm } from "../src/lib/fcm";

const aviso = { title: "Ana", body: "oi", url: "/messages/c1", tag: "conversa-c1" };

async function conta() {
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  return { project_id: "compoze-teste", client_email: "push@compoze-teste.iam.gserviceaccount.com", private_key: await exportPKCS8(privateKey) };
}

/** Um Google de mentira: troca o JWT por token e aceita (ou recusa) o envio. */
function google(envio: { status: number; corpo?: unknown } = { status: 200 }) {
  const chamadas: { url: string; init: RequestInit }[] = [];
  const buscar = (async (url: string | URL, init: RequestInit = {}) => {
    chamadas.push({ url: String(url), init });
    if (String(url).includes("oauth2")) return Response.json({ access_token: "token-de-acesso", expires_in: 3600 });
    return Response.json(envio.corpo ?? { name: "projects/x/messages/1" }, { status: envio.status });
  }) as typeof fetch;
  return { chamadas, buscar };
}

describe("FCM HTTP v1 (ADR 0016)", () => {
  it("assina com a conta de serviço, manda ao token e guarda o token de acesso", async () => {
    const g = google();
    const entregar = criarFcm(await conta(), g.buscar);
    expect(await entregar("token-do-aparelho", aviso)).toBe(200);
    expect(await entregar("outro-aparelho", aviso)).toBe(200);

    const oauth = g.chamadas.filter((c) => c.url.includes("oauth2"));
    expect(oauth).toHaveLength(1);
    expect(String(oauth[0]!.init.body)).toContain("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer");

    const envio = g.chamadas.find((c) => c.url.includes("fcm.googleapis.com"))!;
    expect(envio.url).toBe("https://fcm.googleapis.com/v1/projects/compoze-teste/messages:send");
    expect((envio.init.headers as Record<string, string>).authorization).toBe("Bearer token-de-acesso");
    const { message } = JSON.parse(String(envio.init.body));
    expect(message).toMatchObject({
      token: "token-do-aparelho",
      notification: { title: "Ana", body: "oi" },
      data: { url: "/messages/c1", tag: "conversa-c1" },
      android: { priority: "HIGH", notification: { channel_id: CANAL_ANDROID } },
    });
  });

  it("token desinstalado vira 404, para a inscrição sair", async () => {
    const g = google({ status: 404, corpo: { error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } } });
    expect(await criarFcm(await conta(), g.buscar)("velho", aviso)).toBe(404);
  });
});
