import type { ConsultaDeNovidades, Novidade, PaginaDeNovidades, TipoDeNovidade } from "@compoze/contracts";
import { notificationMarks, users, type Banco } from "@compoze/db";
import { getTableColumns, inArray, sql } from "drizzle-orm";

import { usuarioPublico } from "../../lib/mapear";

/**
 * Novidades da Mesa (ADR 0023). Nada é gravado quando algo acontece: a lista
 * é montada na hora a partir das tabelas de origem, com um UNION por tipo.
 * Assim descurtir, apagar um comentário ou responder um convite já tira a
 * novidade, e quem nunca abriu a Mesa vê o que aconteceu antes desta rota
 * existir.
 *
 * Mensagens contam como não lidas pela própria conversa (`last_read_at`); o
 * resto, pelo que chegou depois da última vez que a pessoa olhou a lista.
 */

const { passwordHash: _hash, location: _local, ...colunasPublicas } = getTableColumns(users);

type Linha = {
  kind: TipoDeNovidade;
  ref: string;
  alvo: string | null;
  at: Date;
  actor_id: string | null;
  subject: string | null;
  excerpt: string | null;
  amount: number | null;
  count: number | null;
  unread: boolean;
  total: number;
};

const resumo = (t: string | null, max = 140) => (t && t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);

export async function listar(db: Banco, euId: string, q: ConsultaDeNovidades): Promise<PaginaDeNovidades> {
  const antes = q.before ? sql`WHERE at < ${q.before}::timestamptz` : sql``;
  const r = await db.execute<Linha>(sql`
    WITH visto AS (SELECT seen_at FROM notification_marks WHERE user_id = ${euId}),
    origem AS (
      -- Mensagens: a mais nova de outra pessoa em cada conversa.
      SELECT 'MESSAGE' AS kind, c.conversation_id::text AS ref, c.conversation_id::text AS alvo, c.created_at AS at,
             c.author_id AS actor_id, NULL::text AS subject, c.content AS excerpt, NULL::int AS amount, c.nao_lidas AS count
      FROM (
        SELECT DISTINCT ON (m.conversation_id) m.conversation_id, m.created_at, m.author_id, m.content,
          (SELECT count(*)::int FROM messages n
            WHERE n.conversation_id = m.conversation_id AND n.author_id IS NOT NULL AND n.author_id <> ${euId}
              AND (cm.last_read_at IS NULL OR n.created_at > cm.last_read_at)) AS nao_lidas
        FROM conversation_members cm
        JOIN messages m ON m.conversation_id = cm.conversation_id
        WHERE cm.user_id = ${euId} AND m.author_id IS NOT NULL AND m.author_id <> ${euId}
        ORDER BY m.conversation_id, m.id DESC
      ) c
      UNION ALL
      SELECT 'COMMENT', pc.id::text, p.id::text, pc.created_at, pc.author_id, p.content, pc.content, NULL, NULL
      FROM posts p JOIN post_comments pc ON pc.post_id = p.id
      WHERE p.author_id = ${euId} AND pc.author_id <> ${euId}
      UNION ALL
      SELECT 'LIKE', p.id || ':' || l.user_id, p.id::text, l.created_at, l.user_id, p.content, NULL, NULL, NULL
      FROM posts p JOIN post_likes l ON l.post_id = p.id
      WHERE p.author_id = ${euId} AND l.user_id <> ${euId}
      UNION ALL
      SELECT 'FOLLOW', f.follower_id::text, NULL, f.created_at, f.follower_id, NULL, NULL, NULL, NULL
      FROM follows f WHERE f.followed_id = ${euId}
      UNION ALL
      SELECT 'INVITE', i.id::text, s.id::text, i.created_at, i.invited_by, s.title, NULL, NULL, NULL
      FROM song_invites i JOIN songs s ON s.id = i.song_id
      WHERE i.invited_user_id = ${euId} AND i.accepted_at IS NULL AND i.declined_at IS NULL
        AND i.revoked_at IS NULL AND i.expires_at > now()
      UNION ALL
      SELECT 'INVITE_ACCEPTED', i.id::text, s.id::text, i.accepted_at, i.accepted_by, s.title, NULL, NULL, NULL
      FROM song_invites i JOIN songs s ON s.id = i.song_id
      WHERE i.invited_by = ${euId} AND i.accepted_by IS NOT NULL AND i.accepted_by <> ${euId}
      UNION ALL
      SELECT 'SUPPORT', a.id::text, pr.id::text, a.paid_claimed_at, a.supporter_id, pr.name, NULL, a.amount, NULL
      FROM project_contributions a JOIN projects pr ON pr.id = a.project_id
      WHERE pr.owner_id = ${euId} AND pr.deleted_at IS NULL AND a.status = 'PENDENTE' AND a.paid_claimed_at IS NOT NULL
      UNION ALL
      SELECT 'SUPPORT_CONFIRMED', a.id::text, pr.id::text, a.decided_at, pr.owner_id, pr.name, NULL, a.amount, NULL
      FROM project_contributions a JOIN projects pr ON pr.id = a.project_id
      WHERE a.supporter_id = ${euId} AND pr.owner_id <> ${euId} AND a.status = 'CONFIRMADO' AND a.decided_at IS NOT NULL
    ),
    todas AS (
      -- Em milissegundos, como o JavaScript: o cursor volta igual ao que saiu.
      SELECT o.kind, o.ref, o.alvo, date_trunc('milliseconds', o.at) AS at, o.actor_id, o.subject, o.excerpt, o.amount, o.count,
        CASE WHEN o.kind = 'MESSAGE' THEN o.count > 0
             ELSE NOT EXISTS (SELECT 1 FROM visto) OR o.at > (SELECT seen_at FROM visto) END AS unread
      FROM origem o
    )
    SELECT *, (SELECT count(*)::int FROM todas WHERE unread) AS total
    FROM todas ${antes}
    ORDER BY at DESC, kind, ref
    LIMIT ${q.limit + 1}`);

  const linhas = r.rows;
  const temMais = linhas.length > q.limit;
  const pagina = linhas.slice(0, q.limit);
  const ids = [...new Set(pagina.map((l) => l.actor_id).filter((x): x is string => x !== null))];
  const pessoas = ids.length ? await db.select(colunasPublicas).from(users).where(inArray(users.id, ids)) : [];
  const porId = new Map(pessoas.map((p) => [p.id, usuarioPublico(p)]));

  const items = pagina.map((l): Novidade => {
    const actor = (l.actor_id && porId.get(l.actor_id)) || null;
    return {
      id: `${l.kind}:${l.ref}`,
      kind: l.kind,
      at: new Date(l.at).toISOString(),
      unread: l.unread,
      actor,
      subject: resumo(l.subject, 80),
      excerpt: resumo(l.excerpt),
      amount: l.amount,
      count: l.kind === "MESSAGE" ? l.count : null,
      url: endereco(l, actor?.username ?? null),
    };
  });
  return {
    items,
    unread_count: linhas[0]?.total ?? (q.before ? await contarNaoLidas(db, euId) : 0),
    next_cursor: temMais ? items.at(-1)!.at : null,
  };
}

function endereco(l: Linha, username: string | null): string {
  switch (l.kind) {
    case "MESSAGE":
      return `/messages/${l.alvo}`;
    case "COMMENT":
    case "LIKE":
      return `/posts/${l.alvo}`;
    case "FOLLOW":
      return username ? `/profile/${username}` : "/profile";
    case "INVITE":
      // Os convites esperam resposta no alto da Mesa.
      return "/";
    case "INVITE_ACCEPTED":
      return `/songs/${l.alvo}/edit`;
    case "SUPPORT":
      return `/projects/${l.alvo}`;
    case "SUPPORT_CONFIRMED":
      return `/apoiar/${l.alvo}`;
  }
}

/** Página depois da última: o total ainda é preciso, e a consulta não trouxe linha. */
async function contarNaoLidas(db: Banco, euId: string): Promise<number> {
  const r = await listar(db, euId, { limit: 1 });
  return r.unread_count;
}

/** Tudo o que chegou até agora passa a contar como visto (mensagens, não: essas se leem na conversa). */
export async function marcarVisto(db: Banco, euId: string): Promise<void> {
  const agora = new Date();
  await db
    .insert(notificationMarks)
    .values({ userId: euId, seenAt: agora })
    .onConflictDoUpdate({ target: notificationMarks.userId, set: { seenAt: agora } });
}
