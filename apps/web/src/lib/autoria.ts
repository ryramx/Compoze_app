/** Cor de autor como variável CSS. A mesma cor marca a pessoa e o que ela escreveu. */
export const corDoAutor = (cor: number | undefined) => `var(--autor-${cor ?? 1})`;

export function iniciais(nome: string | undefined): string {
  const partes = (nome ?? "?").trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}
