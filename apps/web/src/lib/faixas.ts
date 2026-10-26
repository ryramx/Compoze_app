/**
 * Números de faixa de um projeto (ADR 0021). A pessoa pode escolher o número
 * (cadastrar a faixa 7 num projeto que só tem uma) ou deixar no automático,
 * que segue depois da maior. Número repetido não existe: renumerar para um
 * número ocupado troca as duas faixas de lugar, como o servidor faz.
 */
import type { Project } from "@/types";

/** Número da faixa; cópias antigas do aparelho não tinham o mapa, e valia a ordem. */
export function numeroDaFaixa(p: Project, songId: string): number {
  return p.trackNumbers?.[songId] ?? p.songIds.indexOf(songId) + 1;
}

function numeros(p: Project): Record<string, number> {
  return Object.fromEntries(p.songIds.map((id) => [id, numeroDaFaixa(p, id)]));
}

/** Próximo número automático: depois da maior faixa. */
export function proximaFaixa(p: Project): number {
  return p.songIds.reduce((m, id) => Math.max(m, numeroDaFaixa(p, id)), 0) + 1;
}

/** A faixa que já tem esse número, se houver. */
export function faixaComNumero(p: Project, numero: number): string | undefined {
  return p.songIds.find((id) => numeroDaFaixa(p, id) === numero);
}

function ordenado(p: Project, mapa: Record<string, number>): Project {
  const songIds = Object.keys(mapa).sort((a, b) => mapa[a]! - mapa[b]!);
  return { ...p, songIds, trackNumbers: mapa };
}

/** O projeto com a canção como faixa, no número dado ou no próximo. */
export function comFaixa(p: Project, songId: string, numero?: number): Project {
  if (p.songIds.includes(songId)) return p;
  return ordenado(p, { ...numeros(p), [songId]: numero ?? proximaFaixa(p) });
}

/** Muda o número; quem tinha o número fica com o antigo. */
export function renumerar(p: Project, songId: string, numero: number): Project {
  const mapa = numeros(p);
  const antigo = mapa[songId];
  if (antigo === undefined || antigo === numero) return p;
  const outra = faixaComNumero(p, numero);
  if (outra) mapa[outra] = antigo;
  mapa[songId] = numero;
  return ordenado(p, mapa);
}

export function semFaixa(p: Project, songId: string): Project {
  const mapa = numeros(p);
  delete mapa[songId];
  return ordenado(p, mapa);
}
