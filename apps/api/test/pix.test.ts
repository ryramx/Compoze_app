import { normalizarChavePix } from "@compoze/contracts";
import { describe, expect, it } from "vitest";

import { codigoPix, crc16, semAcento } from "../src/lib/pix";

describe("BR Code do PIX (ADR 0018)", () => {
  it("bate com o exemplo do manual do Banco Central", () => {
    const esperado =
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913FULANO DE TAL6008BRASILIA62070503***6304";
    const codigo = codigoPix({ chave: "123e4567-e12b-12d1-a456-426655440000", nome: "Fulano de Tal", cidade: "Brasília" });
    expect(codigo.slice(0, -4)).toBe(esperado);
    expect(codigo.slice(-4)).toBe(crc16(esperado));
  });

  it("CRC16-CCITT confere com o valor de referência", () => {
    // "123456789" → 0x29B1 é o vetor clássico do CRC-16/CCITT-FALSE.
    expect(crc16("123456789")).toBe("29B1");
  });

  it("leva valor, identificador e corta nome e cidade no tamanho do padrão", () => {
    const c = codigoPix({ chave: "+5511999998888", nome: "Lara Mendes Compositora de Canções", cidade: "São José dos Campos", valor: 50, txid: "CPZ-01a1b2c3" });
    expect(c).toContain("540550.00");
    expect(c).toContain("5925LARA MENDES COMPOSITORA ");
    expect(c).toContain("6015SAO JOSE DOS CA6");
    expect(c).toContain("0511CPZ01a1b2c3");
    expect(semAcento("Ação", 10)).toBe("ACAO");
  });

  it("normaliza cada tipo de chave e recusa o que não é", () => {
    expect(normalizarChavePix("CPF", "123.456.789-09")).toBe("12345678909");
    expect(normalizarChavePix("CPF", "1234")).toBeNull();
    expect(normalizarChavePix("CNPJ", "12.345.678/0001-90")).toBe("12345678000190");
    expect(normalizarChavePix("PHONE", "(11) 99999-8888")).toBe("+5511999998888");
    expect(normalizarChavePix("PHONE", "+55 11 99999-8888")).toBe("+5511999998888");
    expect(normalizarChavePix("EMAIL", " Lara@Exemplo.com ")).toBe("lara@exemplo.com");
    expect(normalizarChavePix("EMAIL", "lara")).toBeNull();
    expect(normalizarChavePix("EVP", "123E4567-E12B-12D1-A456-426655440000")).toBe("123e4567-e12b-12d1-a456-426655440000");
  });
});
