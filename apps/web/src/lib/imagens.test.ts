import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ URL_DA_API: "https://api.exemplo" }));

const { enderecoDaImagem, medidas } = await import("./imagens");

describe("imagens", () => {
  it("resolve o caminho da API e deixa o resto como veio", () => {
    expect(enderecoDaImagem("/images/0190-abc")).toBe("https://api.exemplo/images/0190-abc");
    expect(enderecoDaImagem("https://cdn.exemplo/foto.jpg")).toBe("https://cdn.exemplo/foto.jpg");
    expect(enderecoDaImagem("data:image/webp;base64,AAA")).toBe("data:image/webp;base64,AAA");
    expect(enderecoDaImagem(null)).toBe("");
  });

  it("reduz pelo lado maior e nunca amplia", () => {
    expect(medidas(4000, 3000, 1200)).toEqual({ largura: 1200, altura: 900 });
    expect(medidas(3000, 4000, 512)).toEqual({ largura: 384, altura: 512 });
    expect(medidas(300, 200, 512)).toEqual({ largura: 300, altura: 200 });
  });
});
