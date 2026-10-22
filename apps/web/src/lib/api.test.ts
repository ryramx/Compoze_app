import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, getAccessToken, setAccessToken } from "@/lib/api";

function mockResponse(body: unknown, init: { status?: number } = {}) {
  const status = init.status ?? 200;
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: status === 204 ? {} : { "content-type": "application/json" },
  });
}

beforeEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

afterEach(() => {
  setAccessToken(null);
});

describe("token", () => {
  it("guarda e remove o token de acesso", () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken("abc123");
    expect(getAccessToken()).toBe("abc123");
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});

describe("envio da requisicao", () => {
  it("nao manda Authorization quando nao ha token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await api.get("/health/");

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it("manda Bearer token quando ha token guardado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    setAccessToken("abc123");

    await api.get("/songs");

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer abc123");
  });

  it("serializa o corpo como JSON no POST", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ id: "1" }));
    vi.stubGlobal("fetch", fetchMock);

    await api.post("/songs", { title: "Nova" });

    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ title: "Nova" });
  });
});

describe("tratamento de erro", () => {
  it("traduz o detail do FastAPI na mensagem do erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse({ detail: "Musica nao encontrada" }, { status: 404 })),
    );

    await expect(api.get("/songs/999")).rejects.toThrow("Musica nao encontrada");
  });

  it("classifica 401, 403 e 422", async () => {
    for (const [status, campo] of [
      [401, "isUnauthorized"],
      [403, "isForbidden"],
      [422, "isValidationError"],
    ] as const) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse({ detail: "x" }, { status })));

      const erro = await api.get("/songs").catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(ApiError);
      expect((erro as ApiError)[campo]).toBe(true);
    }
  });

  it("reporta falha de conexao como status 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const erro = await api.get("/health/").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(0);
  });

  it("devolve undefined em 204 sem tentar parsear corpo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(null, { status: 204 })));

    await expect(api.delete("/songs/1")).resolves.toBeUndefined();
  });
});
