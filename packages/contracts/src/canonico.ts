/**
 * Sem zod de propósito: o front importa daqui (`@compoze/contracts/canonico`)
 * para conferir o hash de uma versão sem levar o zod para o bundle.
 */
import type { Versao } from "./versoes";

/**
 * JSON canônico: chaves em ordem alfabética, sem espaços. O mesmo objeto dá
 * sempre o mesmo texto, em qualquer linguagem que siga a regra — é o que
 * permite a qualquer pessoa recalcular o hash de uma versão.
 */
export function jsonCanonico(valor: unknown): string {
  if (valor === null || typeof valor !== "object") return JSON.stringify(valor);
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(",")}]`;
  const chaves = Object.keys(valor as Record<string, unknown>)
    .filter((k) => (valor as Record<string, unknown>)[k] !== undefined)
    .sort();
  return `{${chaves.map((k) => `${JSON.stringify(k)}:${jsonCanonico((valor as Record<string, unknown>)[k])}`).join(",")}}`;
}

/**
 * O texto cujo SHA-256 é o `sha256` da versão. Entra tudo o que a versão
 * afirma, inclusive o hash da anterior: mudar uma versão antiga quebra todas
 * as seguintes.
 */
export function textoDaVersao(v: Omit<Versao, "id" | "sha256" | "title">): string {
  return jsonCanonico({
    formato: 1,
    song_id: v.song_id,
    number: v.number,
    reason: v.reason,
    label: v.label,
    created_by: v.created_by,
    created_at: v.created_at,
    previous_sha256: v.previous_sha256,
    snapshot: v.snapshot,
  });
}
