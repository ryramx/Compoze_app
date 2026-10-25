/**
 * "PIX copia e cola" estático (BR Code, padrão EMV do Banco Central), com
 * valor e identificador (Fase 4d, ADR 0018). É o mesmo texto que vira o
 * QR Code; qualquer app de banco lê.
 *
 * Referência: Manual de Padrões para Iniciação do PIX, BCB, anexo do BR Code.
 */

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, "0")}${valor}`;

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), como o BR Code pede. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(texto, "utf8")) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Nome e cidade vão sem acento e em maiúsculas: nem todo banco lê UTF-8 ali. */
export function semAcento(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

export function codigoPix(o: { chave: string; nome: string; cidade: string; valor?: number; txid?: string }): string {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", o.chave);
  const txid = (o.txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (o.valor ? campo("54", o.valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", semAcento(o.nome, 25) || "COMPOZE") +
    campo("60", semAcento(o.cidade, 15) || "BRASIL") +
    campo("62", campo("05", txid)) +
    "6304";
  return corpo + crc16(corpo);
}
