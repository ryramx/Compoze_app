import { z } from "zod";

import { DataHora, Id } from "./comum";
import { StatusDaCancao } from "./enums";
import { UsuarioPublico } from "./users";

/**
 * Gente (Fase 4a, ADR 0013): seguir pessoas e o mural.
 */

/** Perfil de alguém, com o que muda de pessoa para pessoa: quem segue quem. */
export const PerfilPublico = UsuarioPublico.extend({
  followers_count: z.number().int(),
  following_count: z.number().int(),
  /** Eu sigo esta pessoa. */
  followed_by_me: z.boolean(),
  /** Esta pessoa me segue. */
  follows_me: z.boolean(),
});
export type PerfilPublico = z.infer<typeof PerfilPublico>;

export const PUBLICACAO_MAX = 1000;
export const COMENTARIO_MAX = 500;

export const Publicacao = z.object({
  id: Id,
  author: UsuarioPublico,
  content: z.string(),
  /** A canção citada, só o que é público dela. */
  song: z.object({ id: Id, title: z.string(), status: StatusDaCancao }).nullable(),
  like_count: z.number().int(),
  comment_count: z.number().int(),
  liked_by_me: z.boolean(),
  created_at: DataHora,
});
export type Publicacao = z.infer<typeof Publicacao>;

export const NovaPublicacao = z.object({
  /** Gerado no aparelho (UUID v7), para a fila offline não duplicar. */
  id: Id.optional(),
  content: z.string().trim().min(1, "Escreva alguma coisa.").max(PUBLICACAO_MAX),
  song_id: Id.nullable().optional(),
});
export type NovaPublicacao = z.infer<typeof NovaPublicacao>;

/** Página do mural, da mais nova à mais antiga. `next_cursor` vai em `before`. */
export const PaginaDoMural = z.object({
  items: z.array(Publicacao),
  next_cursor: Id.nullable(),
});
export type PaginaDoMural = z.infer<typeof PaginaDoMural>;

export const ConsultaDoMural = z.object({
  /** Só as publicações desta pessoa (o mural do perfil). Sem isto: eu e quem eu sigo. */
  author_id: Id.optional(),
  before: Id.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const Comentario = z.object({
  id: Id,
  post_id: Id,
  author: UsuarioPublico,
  content: z.string(),
  created_at: DataHora,
});
export type Comentario = z.infer<typeof Comentario>;

export const NovoComentario = z.object({
  id: Id.optional(),
  content: z.string().trim().min(1, "Escreva alguma coisa.").max(COMENTARIO_MAX),
});
