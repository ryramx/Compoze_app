import { randomBytes } from "node:crypto";

/**
 * UUID v7 (RFC 9562): 48 bits de milissegundos e o resto aleatório. O mesmo
 * formato do `uuidv7()` do Postgres 18, para ids que nascem fora do banco
 * (blocos criados direto no documento Yjs).
 */
export function uuidv7(agora = Date.now()): string {
  const b = randomBytes(16);
  b.writeUIntBE(agora, 0, 6);
  b[6] = (b[6]! & 0x0f) | 0x70;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
