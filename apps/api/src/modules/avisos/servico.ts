import type { Aviso, Convite, InscricaoPush, Mensagem } from "@compoze/contracts";
import { conversationMembers, pushSubscriptions, songs, users, type Banco } from "@compoze/db";
import { and, eq, ne } from "drizzle-orm";

/**
 * Inscrições de push e o texto de cada aviso (ADR 0016). Quem envia é o
 * avisador (`lib/avisador.ts`); aqui só se decide para quem e o que dizer.
 */

/** Inscreve o aparelho. O mesmo endpoint em outra conta passa para esta. */
export async function inscrever(db: Banco, usuarioId: string, i: InscricaoPush): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({ userId: usuarioId, kind: "WEBPUSH", endpoint: i.endpoint, p256dh: i.keys.p256dh, auth: i.keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: usuarioId, kind: "WEBPUSH", p256dh: i.keys.p256dh, auth: i.keys.auth },
    });
}

/** Só a dona da inscrição a cancela; endpoint desconhecido não é erro. */
export async function cancelar(db: Banco, usuarioId: string, endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, usuarioId)));
}

const resumo = (t: string, max = 140) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);

async function nome(db: Banco, id: string | null): Promise<string> {
  if (!id) return "Alguém";
  const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, id));
  return u?.name ?? "Alguém";
}

export async function avisoDeMensagem(db: Banco, m: Mensagem): Promise<{ para: string[]; aviso: Aviso } | null> {
  if (!m.author_id) return null;
  const outros = await db
    .select({ id: conversationMembers.userId })
    .from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, m.conversation_id), ne(conversationMembers.userId, m.author_id)));
  return {
    para: outros.map((o) => o.id),
    aviso: { title: await nome(db, m.author_id), body: resumo(m.content), url: `/messages/${m.conversation_id}`, tag: `conversa-${m.conversation_id}` },
  };
}

export async function avisoDeConvite(db: Banco, c: Convite): Promise<{ para: string[]; aviso: Aviso } | null> {
  if (!c.invited_user_id) return null;
  const [s] = await db.select({ title: songs.title }).from(songs).where(eq(songs.id, c.song_id));
  const papel = c.role === "VIEWER" ? "ler" : "escrever";
  return {
    para: [c.invited_user_id],
    aviso: {
      title: "Convite para uma canção",
      body: `${await nome(db, c.invited_by)} chamou você para ${papel} “${resumo(s?.title ?? "sem título", 60)}”.`,
      url: "/",
      tag: `convite-${c.id}`,
    },
  };
}
