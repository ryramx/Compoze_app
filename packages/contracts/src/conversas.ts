import { z } from "zod";

import { DataHora, Id } from "./comum";
import { UsuarioPublico } from "./users";

/** Conversas (Fase 4b, ADR 0014). */

export const MENSAGEM_MAX = 4000;

export const Mensagem = z.object({
  id: Id,
  conversation_id: Id,
  author_id: Id.nullable(),
  content: z.string(),
  created_at: DataHora,
});
export type Mensagem = z.infer<typeof Mensagem>;

export const Conversa = z.object({
  id: Id,
  /** A outra pessoa da conversa a dois. */
  other: UsuarioPublico,
  last_message: Mensagem.nullable(),
  unread_count: z.number().int(),
  created_at: DataHora,
});
export type Conversa = z.infer<typeof Conversa>;

export const NovaConversa = z.object({ user_id: Id });

export const NovaMensagem = z.object({
  /** Gerado no aparelho, para reenviar sem duplicar. */
  id: Id.optional(),
  content: z.string().trim().min(1, "Escreva alguma coisa.").max(MENSAGEM_MAX),
});

export const PaginaDeMensagens = z.object({
  /** Da mais nova à mais antiga. */
  items: z.array(Mensagem),
  next_cursor: Id.nullable(),
});
export type PaginaDeMensagens = z.infer<typeof PaginaDeMensagens>;

export const ConsultaDeMensagens = z.object({
  before: Id.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/** O que chega pelo fluxo ao vivo (`GET /events`, text/event-stream). */
export const EventoAoVivo = z.discriminatedUnion("type", [
  z.object({ type: z.literal("message"), message: Mensagem }),
  z.object({ type: z.literal("read"), conversation_id: Id, user_id: Id, at: DataHora }),
]);
export type EventoAoVivo = z.infer<typeof EventoAoVivo>;
