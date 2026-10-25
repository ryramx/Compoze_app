import { describe, expect, it } from "vitest";
import { lerEventos } from "./aoVivo";

describe("lerEventos", () => {
  it("lê eventos inteiros, ignora comentários e guarda o pedaço que ainda não chegou", () => {
    const m = { type: "message", message: { id: "1", conversation_id: "c", author_id: "a", content: "oi", created_at: "x" } };
    const texto = `: conectado\n\nevent: message\ndata: ${JSON.stringify(m)}\n\n: pulso\n\nevent: read\ndata: {"type":"re`;
    const { eventos, resto } = lerEventos(texto);
    expect(eventos).toEqual([m]);
    expect(resto).toBe('event: read\ndata: {"type":"re');
  });
});
