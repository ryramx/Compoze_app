import type { Comentario, NovaPublicacao, PaginaDoMural, PerfilPublico, PessoaNaLista, Publicacao, UsuarioPublico } from "@compoze/contracts";
import { follows, postComments, postLikes, posts, songs, users, type Banco } from "@compoze/db";
import { and, asc, desc, eq, getTableColumns, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";

import { usuarioPublico } from "../../lib/mapear";
import { ErroDaApi } from "../../plugins/erros";
import { acessar } from "../songs/acesso";

/**
 * Gente (Fase 4a, ADR 0013): seguir e mural. Seguir não pede aceite; o mural
 * de cada pessoa é visível para qualquer conta. Canção citada num post só
 * aparece enquanto não for privada nem estiver na lixeira.
 */

const { passwordHash: _hash, location: _local, ...colunasPublicas } = getTableColumns(users);

async function pessoa(db: Banco, id: string) {
  const [u] = await db.select(colunasPublicas).from(users).where(eq(users.id, id));
  if (!u) throw new ErroDaApi(404, "Pessoa não encontrada.");
  return u;
}

// ------------------------------------------------------------------ seguir

export async function perfil(db: Banco, username: string, euId: string): Promise<PerfilPublico> {
  const [u] = await db
    .select({
      ...colunasPublicas,
      seguidores: sql<number>`(SELECT count(*)::int FROM ${follows} WHERE ${follows.followedId} = ${users.id})`,
      seguindo: sql<number>`(SELECT count(*)::int FROM ${follows} WHERE ${follows.followerId} = ${users.id})`,
      sigo: sql<boolean>`EXISTS (SELECT 1 FROM ${follows} WHERE ${follows.followerId} = ${euId} AND ${follows.followedId} = ${users.id})`,
      meSegue: sql<boolean>`EXISTS (SELECT 1 FROM ${follows} WHERE ${follows.followerId} = ${users.id} AND ${follows.followedId} = ${euId})`,
    })
    .from(users)
    .where(eq(users.username, username));
  if (!u) throw new ErroDaApi(404, "Pessoa não encontrada.");
  return {
    ...usuarioPublico(u),
    followers_count: u.seguidores,
    following_count: u.seguindo,
    followed_by_me: u.sigo,
    follows_me: u.meSegue,
  };
}

/** Seguir de novo quem já sigo não faz nada (e não é erro). */
export async function seguir(db: Banco, euId: string, alvoId: string): Promise<void> {
  if (alvoId === euId) throw new ErroDaApi(422, "Você não pode seguir a si mesma.");
  await pessoa(db, alvoId);
  await db.insert(follows).values({ followerId: euId, followedId: alvoId }).onConflictDoNothing();
}

export async function deixarDeSeguir(db: Banco, euId: string, alvoId: string): Promise<void> {
  await db.delete(follows).where(and(eq(follows.followerId, euId), eq(follows.followedId, alvoId)));
}

/**
 * Quem segue a pessoa (`seguidores`) ou quem ela segue (`seguindo`), mais
 * recentes primeiro, cada uma com se eu sigo e se ela me segue, para a lista
 * mostrar "Seguir", "Seguir de volta" ou "Deixar de seguir".
 */
export async function lista(db: Banco, userId: string, lado: "seguidores" | "seguindo", euId: string): Promise<PessoaNaLista[]> {
  await pessoa(db, userId);
  const [filtro, junta] =
    lado === "seguidores"
      ? [eq(follows.followedId, userId), eq(users.id, follows.followerId)]
      : [eq(follows.followerId, userId), eq(users.id, follows.followedId)];
  const linhas = await db
    .select({
      pessoa: colunasPublicas,
      sigo: sql<boolean>`EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${euId} AND f.followed_id = ${users.id})`,
      meSegue: sql<boolean>`EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${users.id} AND f.followed_id = ${euId})`,
    })
    .from(follows)
    .innerJoin(users, junta)
    .where(filtro)
    .orderBy(desc(follows.createdAt))
    .limit(500);
  return linhas.map((l) => ({ ...usuarioPublico(l.pessoa), followed_by_me: l.sigo, follows_me: l.meSegue }));
}

// ------------------------------------------------------------------- mural

const colunasDoPost = (euId: string) => ({
  post: posts,
  autor: colunasPublicas,
  cancao: { id: songs.id, title: songs.title, status: songs.status, visibility: songs.visibility, deletedAt: songs.deletedAt },
  curtidas: sql<number>`(SELECT count(*)::int FROM ${postLikes} WHERE ${postLikes.postId} = ${posts.id})`,
  comentarios: sql<number>`(SELECT count(*)::int FROM ${postComments} WHERE ${postComments.postId} = ${posts.id})`,
  curti: sql<boolean>`EXISTS (SELECT 1 FROM ${postLikes} WHERE ${postLikes.postId} = ${posts.id} AND ${postLikes.userId} = ${euId})`,
});

type LinhaDoPost = {
  post: typeof posts.$inferSelect;
  autor: Parameters<typeof usuarioPublico>[0];
  cancao: { id: string; title: string; status: typeof songs.$inferSelect.status; visibility: string; deletedAt: Date | null } | null;
  curtidas: number;
  comentarios: number;
  curti: boolean;
};

function publicacao(l: LinhaDoPost): Publicacao {
  const c = l.cancao;
  const visivel = c && c.visibility !== "PRIVATE" && !c.deletedAt;
  return {
    id: l.post.id,
    author: usuarioPublico(l.autor),
    content: l.post.content,
    song: visivel ? { id: c.id, title: c.title, status: c.status } : null,
    like_count: l.curtidas,
    comment_count: l.comentarios,
    liked_by_me: l.curti,
    created_at: l.post.createdAt.toISOString(),
  };
}

async function lerPosts(db: Banco, euId: string, onde: SQL | undefined, limite: number) {
  const linhas = await db
    .select(colunasDoPost(euId))
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .leftJoin(songs, eq(songs.id, posts.songId))
    .where(onde)
    .orderBy(desc(posts.id))
    .limit(limite);
  return (linhas as LinhaDoPost[]).map(publicacao);
}

export async function obterPublicacao(db: Banco, id: string, euId: string): Promise<Publicacao> {
  const [p] = await lerPosts(db, euId, eq(posts.id, id), 1);
  if (!p) throw new ErroDaApi(404, "Publicação não encontrada.");
  return p;
}

/**
 * Mural: as minhas publicações e as de quem eu sigo, ou só as de uma pessoa.
 * Paginado pelo id (UUID v7 cresce com o tempo): `before` é o último id visto.
 */
export async function mural(
  db: Banco,
  euId: string,
  q: { author_id?: string; before?: string; limit: number },
): Promise<PaginaDoMural> {
  const quem = q.author_id
    ? eq(posts.authorId, q.author_id)
    : or(
        eq(posts.authorId, euId),
        inArray(posts.authorId, db.select({ id: follows.followedId }).from(follows).where(eq(follows.followerId, euId))),
      );
  const itens = await lerPosts(db, euId, and(quem, q.before ? lt(posts.id, q.before) : undefined), q.limit + 1);
  const temMais = itens.length > q.limit;
  const pagina = itens.slice(0, q.limit);
  return { items: pagina, next_cursor: temMais ? pagina.at(-1)!.id : null };
}

export async function publicar(db: Banco, euId: string, p: NovaPublicacao): Promise<{ post: Publicacao; nova: boolean }> {
  if (p.song_id) {
    // Só cita quem escreve a canção, e só se ela não for privada.
    const { cancao } = await acessar(db, p.song_id, euId);
    if (cancao.visibility === "PRIVATE" || cancao.deletedAt) {
      throw new ErroDaApi(422, "Só dá para citar uma canção que não seja privada.");
    }
  }
  const [nova] = await db
    .insert(posts)
    .values({ ...(p.id ? { id: p.id } : {}), authorId: euId, content: p.content, songId: p.song_id ?? null })
    .onConflictDoNothing()
    .returning({ id: posts.id });
  if (!nova) {
    // Mesmo id de novo: a fila do aparelho reenviou. Só vale se for meu.
    const [existente] = await db.select({ autor: posts.authorId }).from(posts).where(eq(posts.id, p.id!));
    if (existente?.autor !== euId) throw new ErroDaApi(409, "Já existe uma publicação com este id.");
    return { post: await obterPublicacao(db, p.id!, euId), nova: false };
  }
  return { post: await obterPublicacao(db, nova.id, euId), nova: true };
}

export async function apagarPublicacao(db: Banco, id: string, euId: string): Promise<void> {
  const [p] = await db.select({ autor: posts.authorId }).from(posts).where(eq(posts.id, id));
  if (!p) return;
  if (p.autor !== euId) throw new ErroDaApi(403, "Só quem publicou pode apagar.");
  await db.delete(posts).where(eq(posts.id, id));
}

export async function curtir(db: Banco, postId: string, euId: string, sim: boolean): Promise<Publicacao> {
  await obterPublicacao(db, postId, euId);
  if (sim) await db.insert(postLikes).values({ postId, userId: euId }).onConflictDoNothing();
  else await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, euId)));
  return obterPublicacao(db, postId, euId);
}

// ------------------------------------------------------------- comentários

function comentario(l: { c: typeof postComments.$inferSelect; autor: Parameters<typeof usuarioPublico>[0] }): Comentario {
  return { id: l.c.id, post_id: l.c.postId, author: usuarioPublico(l.autor), content: l.c.content, created_at: l.c.createdAt.toISOString() };
}

export async function comentarios(db: Banco, postId: string, euId: string): Promise<Comentario[]> {
  await obterPublicacao(db, postId, euId);
  const linhas = await db
    .select({ c: postComments, autor: colunasPublicas })
    .from(postComments)
    .innerJoin(users, eq(users.id, postComments.authorId))
    .where(eq(postComments.postId, postId))
    .orderBy(asc(postComments.id))
    .limit(500);
  return linhas.map(comentario);
}

export async function comentar(db: Banco, postId: string, euId: string, c: { id?: string; content: string }): Promise<Comentario> {
  await obterPublicacao(db, postId, euId);
  const [novo] = await db
    .insert(postComments)
    .values({ ...(c.id ? { id: c.id } : {}), postId, authorId: euId, content: c.content })
    .onConflictDoNothing()
    .returning({ id: postComments.id });
  const id = novo?.id ?? c.id!;
  const [l] = await db
    .select({ c: postComments, autor: colunasPublicas })
    .from(postComments)
    .innerJoin(users, eq(users.id, postComments.authorId))
    .where(and(eq(postComments.id, id), eq(postComments.postId, postId), eq(postComments.authorId, euId)));
  if (!l) throw new ErroDaApi(409, "Já existe um comentário com este id.");
  return comentario(l);
}

/** Apaga quem comentou ou quem publicou o post. */
export async function apagarComentario(db: Banco, postId: string, id: string, euId: string): Promise<void> {
  const [l] = await db
    .select({ autor: postComments.authorId, dono: posts.authorId })
    .from(postComments)
    .innerJoin(posts, eq(posts.id, postComments.postId))
    .where(and(eq(postComments.id, id), eq(postComments.postId, postId)));
  if (!l) return;
  if (l.autor !== euId && l.dono !== euId) throw new ErroDaApi(403, "Só quem comentou ou quem publicou pode apagar.");
  await db.delete(postComments).where(eq(postComments.id, id));
}

/** Sugestões de quem seguir: quem escreve canções comigo e eu ainda não sigo. */
export async function sugestoes(db: Banco, euId: string): Promise<UsuarioPublico[]> {
  const linhas = await db.execute<{ id: string }>(sql`
    SELECT DISTINCT outra.user_id AS id
    FROM song_collaborators minha
    JOIN song_collaborators outra ON outra.song_id = minha.song_id AND outra.user_id <> minha.user_id
    WHERE minha.user_id = ${euId} AND minha.deleted_at IS NULL AND outra.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${euId} AND f.followed_id = outra.user_id)
    LIMIT 10`);
  const ids = linhas.rows.map((r) => r.id);
  if (ids.length === 0) return [];
  const pessoas = await db.select(colunasPublicas).from(users).where(and(inArray(users.id, ids), ne(users.id, euId)));
  return pessoas.map(usuarioPublico);
}
