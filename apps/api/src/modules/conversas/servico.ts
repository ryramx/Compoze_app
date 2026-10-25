import type { Conversa, Mensagem, PaginaDeMensagens } from "@compoze/contracts";
import { conversationMembers, conversations, messages, users, type Banco } from "@compoze/db";
import { and, desc, eq, getTableColumns, lt, ne, sql } from "drizzle-orm";

import type { AoVivo } from "../../lib/aoVivo";
import { usuarioPublico } from "../../lib/mapear";
import { ErroDaApi } from "../../plugins/erros";

/**
 * Conversas a dois (Fase 4b, ADR 0014). Qualquer conta escreve para qualquer
 * outra; quem não está na conversa recebe 404, como nas canções.
 */

const { passwordHash: _hash, location: _local, ...colunasPublicas } = getTableColumns(users);

type LinhaMsg = typeof messages.$inferSelect;
const mensagem = (m: LinhaMsg): Mensagem => ({
  id: m.id,
  conversation_id: m.conversationId,
  author_id: m.authorId,
  content: m.content,
  created_at: m.createdAt.toISOString(),
});

/** Ids de quem está na conversa; 404 se eu não estiver. */
async function membros(db: Banco, conversaId: string, euId: string): Promise<string[]> {
  const linhas = await db
    .select({ id: conversationMembers.userId })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conversaId));
  const ids = linhas.map((l) => l.id);
  if (!ids.includes(euId)) throw new ErroDaApi(404, "Conversa não encontrada.");
  return ids;
}

export async function listar(db: Banco, euId: string): Promise<Conversa[]> {
  const eu = conversationMembers;
  const linhas = await db.execute<{ id: string }>(sql`
    SELECT c.id
    FROM ${conversations} c
    JOIN ${eu} m ON m.conversation_id = c.id AND m.user_id = ${euId}
    ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    LIMIT 200`);
  return Promise.all(linhas.rows.map((r) => obter(db, r.id, euId)));
}

export async function obter(db: Banco, id: string, euId: string): Promise<Conversa> {
  await membros(db, id, euId);
  const [c] = await db.select().from(conversations).where(eq(conversations.id, id));
  const [outra] = await db
    .select(colunasPublicas)
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .where(and(eq(conversationMembers.conversationId, id), ne(conversationMembers.userId, euId)));
  const [ultima] = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(desc(messages.id)).limit(1);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(conversationMembers, and(eq(conversationMembers.conversationId, messages.conversationId), eq(conversationMembers.userId, euId)))
    .where(
      and(
        eq(messages.conversationId, id),
        ne(messages.authorId, euId),
        sql`(${conversationMembers.lastReadAt} IS NULL OR ${messages.createdAt} > ${conversationMembers.lastReadAt})`,
      ),
    ) as [{ n: number }];
  if (!outra) throw new ErroDaApi(404, "Conversa não encontrada.");
  return {
    id,
    other: usuarioPublico(outra),
    last_message: ultima ? mensagem(ultima) : null,
    unread_count: n,
    created_at: c!.createdAt.toISOString(),
  };
}

/** Abre (ou reabre) a conversa com a pessoa. Uma só por dupla. */
export async function abrir(db: Banco, euId: string, outraId: string): Promise<{ conversa: Conversa; nova: boolean }> {
  if (outraId === euId) throw new ErroDaApi(422, "Você não pode conversar consigo mesma.");
  const [existe] = await db.select({ id: users.id }).from(users).where(eq(users.id, outraId));
  if (!existe) throw new ErroDaApi(404, "Pessoa não encontrada.");

  const chave = [euId, outraId].sort().join(":");
  const nova = await db.transaction(async (tx) => {
    const [c] = await tx.insert(conversations).values({ directKey: chave }).onConflictDoNothing().returning({ id: conversations.id });
    if (!c) return null;
    await tx.insert(conversationMembers).values([
      { conversationId: c.id, userId: euId },
      { conversationId: c.id, userId: outraId },
    ]);
    return c.id;
  });
  const id = nova ?? (await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.directKey, chave)))[0]!.id;
  return { conversa: await obter(db, id, euId), nova: nova !== null };
}

export async function mensagens(
  db: Banco,
  conversaId: string,
  euId: string,
  q: { before?: string; limit: number },
): Promise<PaginaDeMensagens> {
  await membros(db, conversaId, euId);
  const linhas = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversaId), q.before ? lt(messages.id, q.before) : undefined))
    .orderBy(desc(messages.id))
    .limit(q.limit + 1);
  const temMais = linhas.length > q.limit;
  const pagina = linhas.slice(0, q.limit);
  return { items: pagina.map(mensagem), next_cursor: temMais ? pagina.at(-1)!.id : null };
}

/** Grava e entrega ao vivo a quem estiver na conversa (inclusive meus outros aparelhos). */
export async function enviar(
  db: Banco,
  aoVivo: AoVivo,
  conversaId: string,
  euId: string,
  m: { id?: string; content: string },
): Promise<{ mensagem: Mensagem; nova: boolean }> {
  const ids = await membros(db, conversaId, euId);
  const resultado = await db.transaction(async (tx) => {
    const [nova] = await tx
      .insert(messages)
      .values({ ...(m.id ? { id: m.id } : {}), conversationId: conversaId, authorId: euId, content: m.content })
      .onConflictDoNothing()
      .returning();
    if (!nova) {
      const [existente] = await tx.select().from(messages).where(eq(messages.id, m.id!));
      if (!existente || existente.authorId !== euId || existente.conversationId !== conversaId) {
        throw new ErroDaApi(409, "Já existe uma mensagem com este id.");
      }
      return { mensagem: mensagem(existente), nova: false };
    }
    await tx.update(conversations).set({ lastMessageAt: nova.createdAt }).where(eq(conversations.id, conversaId));
    // Quem escreve leu tudo até aqui.
    await tx
      .update(conversationMembers)
      .set({ lastReadAt: nova.createdAt })
      .where(and(eq(conversationMembers.conversationId, conversaId), eq(conversationMembers.userId, euId)));
    return { mensagem: mensagem(nova), nova: true };
  });
  if (resultado.nova) aoVivo.avisar(ids, { type: "message", message: resultado.mensagem });
  return resultado;
}

export async function marcarLida(db: Banco, aoVivo: AoVivo, conversaId: string, euId: string): Promise<void> {
  const ids = await membros(db, conversaId, euId);
  const agora = new Date();
  await db
    .update(conversationMembers)
    .set({ lastReadAt: agora })
    .where(and(eq(conversationMembers.conversationId, conversaId), eq(conversationMembers.userId, euId)));
  aoVivo.avisar(ids, { type: "read", conversation_id: conversaId, user_id: euId, at: agora.toISOString() });
}
