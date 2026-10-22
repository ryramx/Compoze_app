import { describe, expect, it } from "vitest";

import { usarApp } from "./ajuda";

const ctx = usarApp({ LIMITE_AUTH_POR_MINUTO: "3" });

describe("limite de tentativas", () => {
  it("login em massa recebe 429 com `detail`", async () => {
    const tentar = () =>
      ctx.app.inject({ method: "POST", url: "/auth/login", payload: { email: "alvo@teste.dev", password: "chute" } });
    for (let i = 0; i < 3; i++) expect((await tentar()).statusCode).toBe(401);
    const r = await tentar();
    expect(r.statusCode).toBe(429);
    expect(r.json().detail).toMatch(/Muitas tentativas/);
  });
});
