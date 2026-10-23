import type { TipoDeBloco } from "@compoze/contracts";
import * as Y from "yjs";

/**
 * Formato do documento Yjs de uma canção (ADR 0007).
 *
 * O documento é a fonte do conteúdo: letra, cifra, notas e seções. A tabela
 * `song_blocks` é uma projeção dele, que o servidor mantém para busca e
 * listagens. Tudo que lê ou escreve a estrutura passa por aqui.
 */

export interface BlocoDoDocumento {
  id: string;
  type: TipoDeBloco;
  label: string | null;
  content: string;
  author_id: string | null;
}

export type NovoBlocoDoDocumento = Omit<BlocoDoDocumento, "content"> & { content?: string };

const PREFIXO = "song:";

export const nomeDoDocumento = (songId: string) => `${PREFIXO}${songId}`;

/** Id da canção a partir do nome do documento; `null` se o nome não for de canção. */
export function idDaCancao(nome: string): string | null {
  return nome.startsWith(PREFIXO) ? nome.slice(PREFIXO.length) : null;
}

export function blocosDe(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray<Y.Map<unknown>>("blocos");
}

function texto(m: Y.Map<unknown>): Y.Text {
  return m.get("content") as Y.Text;
}

function lerUm(m: Y.Map<unknown>): BlocoDoDocumento {
  return {
    id: m.get("id") as string,
    type: m.get("type") as TipoDeBloco,
    label: (m.get("label") as string | null | undefined) ?? null,
    content: texto(m)?.toString() ?? "",
    author_id: (m.get("author_id") as string | null | undefined) ?? null,
  };
}

export function lerBlocos(doc: Y.Doc): BlocoDoDocumento[] {
  return blocosDe(doc).toArray().map(lerUm);
}

function indiceDe(doc: Y.Doc, id: string): number {
  return blocosDe(doc)
    .toArray()
    .findIndex((m) => m.get("id") === id);
}

function mapaDe(doc: Y.Doc, id: string): Y.Map<unknown> | undefined {
  return blocosDe(doc)
    .toArray()
    .find((m) => m.get("id") === id);
}

function criarMapa(b: NovoBlocoDoDocumento): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set("id", b.id);
  m.set("type", b.type);
  m.set("label", b.label ?? null);
  m.set("content", new Y.Text(b.content ?? ""));
  m.set("author_id", b.author_id ?? null);
  return m;
}

/**
 * Insere um bloco. Sem `posicao` (ou além do fim), entra no fim. Id repetido é
 * ignorado: reenviar a mesma criação não duplica.
 */
export function inserirBloco(doc: Y.Doc, b: NovoBlocoDoDocumento, posicao?: number, origem?: unknown): void {
  doc.transact(() => {
    if (indiceDe(doc, b.id) >= 0) return;
    const arr = blocosDe(doc);
    const i = posicao === undefined ? arr.length : Math.max(0, Math.min(posicao, arr.length));
    arr.insert(i, [criarMapa(b)]);
  }, origem);
}

export function removerBloco(doc: Y.Doc, id: string, origem?: unknown): boolean {
  let removeu = false;
  doc.transact(() => {
    const i = indiceDe(doc, id);
    if (i < 0) return;
    blocosDe(doc).delete(i, 1);
    removeu = true;
  }, origem);
  return removeu;
}

/**
 * Troca o texto de um bloco pelo valor novo, aplicando só a diferença.
 *
 * O editor entrega o valor inteiro do campo a cada tecla. Reescrever o Y.Text
 * inteiro apagaria o que outra pessoa digitou no mesmo verso ao mesmo tempo;
 * aplicar só o trecho que mudou (entre o prefixo e o sufixo comuns) deixa o
 * Yjs fundir as duas edições.
 */
export function editarTexto(doc: Y.Doc, id: string, novo: string, origem?: unknown): void {
  const m = mapaDe(doc, id);
  if (!m) return;
  const t = texto(m);
  const atual = t.toString();
  if (atual === novo) return;

  let inicio = 0;
  const limite = Math.min(atual.length, novo.length);
  while (inicio < limite && atual[inicio] === novo[inicio]) inicio++;
  let fimAtual = atual.length;
  let fimNovo = novo.length;
  while (fimAtual > inicio && fimNovo > inicio && atual[fimAtual - 1] === novo[fimNovo - 1]) {
    fimAtual--;
    fimNovo--;
  }

  doc.transact(() => {
    if (fimAtual > inicio) t.delete(inicio, fimAtual - inicio);
    if (fimNovo > inicio) t.insert(inicio, novo.slice(inicio, fimNovo));
  }, origem);
}

export function mudarBloco(
  doc: Y.Doc,
  id: string,
  patch: { label?: string | null; type?: TipoDeBloco },
  origem?: unknown,
): void {
  const m = mapaDe(doc, id);
  if (!m) return;
  doc.transact(() => {
    if (patch.label !== undefined && m.get("label") !== patch.label) m.set("label", patch.label);
    if (patch.type !== undefined && m.get("type") !== patch.type) m.set("type", patch.type);
  }, origem);
}

/**
 * Preenche um documento vazio com os blocos que já existiam no banco. Só o
 * servidor semeia, uma única vez, na primeira abertura: se dois aparelhos
 * semeassem cada um o seu, os blocos apareceriam em dobro.
 */
export function semear(doc: Y.Doc, blocos: NovoBlocoDoDocumento[], origem?: unknown): void {
  if (blocosDe(doc).length > 0) return;
  doc.transact(() => {
    blocosDe(doc).insert(0, blocos.map(criarMapa));
  }, origem);
}

export { Y };
