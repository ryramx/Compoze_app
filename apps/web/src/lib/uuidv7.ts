/**
 * UUID v7: 48 bits de milissegundos e o resto aleatório, o mesmo formato do
 * `uuidv7()` do Postgres 18. Blocos nascem no aparelho já com o id definitivo,
 * inclusive offline (ADR 0005).
 */
export function uuidv7(agora = Date.now()): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  let t = agora;
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = (b[6]! & 0x0f) | 0x70;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
