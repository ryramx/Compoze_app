import { caminhoDaImagem, IMAGEM_BYTES_MAX } from "@compoze/contracts";
import { images, projects, users, type Banco } from "@compoze/db";
import { and, eq, lt, sql } from "drizzle-orm";

import { ErroDaApi } from "../../plugins/erros";
import * as projetos from "../projects/servico";
import { eu } from "../users/servico";

/**
 * Foto de perfil e capa de projeto (Fase 4c, ADR 0015). A imagem nova entra,
 * a coluna passa a apontar para ela e a antiga sai, tudo numa transação.
 */

/**
 * O tipo vem dos primeiros bytes, não do cabeçalho: a rota de leitura é
 * pública, e servir como imagem algo que não é imagem seria um convite a
 * abuso (HTML, SVG com script).
 */
export function tipoPelosBytes(b: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return null;
}

function validar(bytes: Buffer): string {
  if (bytes.length === 0) throw new ErroDaApi(422, "A imagem veio vazia.");
  if (bytes.length > IMAGEM_BYTES_MAX) throw new ErroDaApi(413, "A imagem passa de 2 MB.");
  const tipo = tipoPelosBytes(bytes);
  if (!tipo) throw new ErroDaApi(415, "Envie JPEG, PNG ou WebP.");
  return tipo;
}

const ID_NO_CAMINHO = /^\/images\/([0-9a-f-]{36})$/;

/** Id da imagem própria por trás de uma URL, ou null se for URL de fora. */
export function idDaImagem(url: string | null): string | null {
  return url?.match(ID_NO_CAMINHO)?.[1] ?? null;
}

type Tx = Parameters<Parameters<Banco["transaction"]>[0]>[0];

async function inserir(tx: Tx, donaId: string, bytes: Buffer): Promise<string> {
  const mimeType = validar(bytes);
  const [img] = await tx.insert(images).values({ ownerId: donaId, mimeType, sizeBytes: bytes.length, bytes }).returning({ id: images.id });
  return img!.id;
}

async function soltar(tx: Tx, urlAntiga: string | null) {
  const antiga = idDaImagem(urlAntiga);
  if (antiga) await tx.delete(images).where(eq(images.id, antiga));
}

export async function trocarAvatar(db: Banco, usuarioId: string, bytes: Buffer | null) {
  await db.transaction(async (tx) => {
    const [u] = await tx.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, usuarioId)).for("update");
    if (!u) throw new ErroDaApi(401, "Sessão de uma conta que não existe mais.");
    const nova = bytes ? caminhoDaImagem(await inserir(tx, usuarioId, bytes)) : null;
    await tx.update(users).set({ avatarUrl: nova }).where(eq(users.id, usuarioId));
    await soltar(tx, u.avatarUrl);
  });
  return eu(db, usuarioId);
}

export async function trocarCapa(db: Banco, projetoId: string, usuarioId: string, bytes: Buffer | null) {
  await db.transaction(async (tx) => {
    const [p] = await tx
      .select({ coverUrl: projects.coverUrl })
      .from(projects)
      .where(and(eq(projects.id, projetoId), eq(projects.ownerId, usuarioId)))
      .for("update");
    if (!p) throw new ErroDaApi(404, "Projeto não encontrado.");
    const nova = bytes ? caminhoDaImagem(await inserir(tx, usuarioId, bytes)) : null;
    await tx.update(projects).set({ coverUrl: nova }).where(eq(projects.id, projetoId));
    await soltar(tx, p.coverUrl);
  });
  return projetos.obter(db, projetoId, usuarioId);
}

export async function ler(db: Banco, id: string) {
  const [img] = await db.select({ mimeType: images.mimeType, bytes: images.bytes }).from(images).where(eq(images.id, id));
  if (!img) throw new ErroDaApi(404, "Imagem não encontrada.");
  return { mimeType: img.mimeType, bytes: Buffer.from(img.bytes) };
}

/**
 * Imagens que nenhum perfil nem projeto aponta mais: trocadas por PATCH com
 * outra URL, ou de projeto expurgado da lixeira. Só as com mais de um dia,
 * para não pegar uma que acabou de subir.
 */
export async function expurgarImagensSoltas(db: Banco): Promise<number> {
  const caminho = sql`'/images/' || ${images.id}::text`;
  const apagadas = await db
    .delete(images)
    .where(
      and(
        lt(images.createdAt, sql`now() - interval '1 day'`),
        sql`NOT EXISTS (SELECT 1 FROM ${users} WHERE ${users.avatarUrl} = ${caminho})`,
        sql`NOT EXISTS (SELECT 1 FROM ${projects} WHERE ${projects.coverUrl} = ${caminho})`,
      ),
    )
    .returning({ id: images.id });
  return apagadas.length;
}
