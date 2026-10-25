/**
 * "Compartilhar para o Compoze" (Fase 3b). Um verso anotado no bloco de notas,
 * uma mensagem, um link: o texto chega de outro app e vira uma canção nova no
 * estágio "ideia". No Android chega pelo app nativo (lib/nativo.ts); na PWA
 * instalada, pelo `share_target` do manifesto. Os dois caem em /compartilhar.
 */

export interface Compartilhado {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}

export interface IdeiaCompartilhada {
  titulo: string;
  estrofes: string[];
}

const TITULO_MAX = 60;
// Ninguém compartilha um livro; o limite só impede uma folha impossível.
const TEXTO_MAX = 20_000;
const ESTROFES_MAX = 60;

function encurtar(linha: string): string {
  if (linha.length <= TITULO_MAX) return linha;
  const corte = linha.slice(0, TITULO_MAX);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > TITULO_MAX / 2 ? corte.slice(0, espaco) : corte).trimEnd()}…`;
}

/** Monta título e estrofes. `null` quando não veio nada que se aproveite. */
export function lerCompartilhado({ title, text, url }: Compartilhado): IdeiaCompartilhada | null {
  const titulo = title?.trim() ?? "";
  let texto = (text ?? "").replace(/\r\n?/g, "\n").trim();
  const link = url?.trim() ?? "";
  // Alguns apps mandam o link no texto e de novo no campo url.
  if (link && !texto.includes(link)) texto = texto ? `${texto}\n\n${link}` : link;
  texto = texto.slice(0, TEXTO_MAX);

  if (!texto && !titulo) return null;

  const estrofes = texto
    .split(/\n[ \t]*\n/)
    .map((e) => e.trim())
    .filter(Boolean)
    .slice(0, ESTROFES_MAX);

  // O título compartilhado costuma ser o assunto ("Nota de 12/10"); quando é
  // igual ao texto ou não veio, usa a primeira linha.
  const primeira = texto.split("\n")[0]?.trim() ?? "";
  const nome = titulo && titulo !== texto ? titulo : primeira;
  return { titulo: encurtar(nome) || "Ideia compartilhada", estrofes };
}
