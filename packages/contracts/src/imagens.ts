/**
 * Imagens enviadas (Fase 4c, ADR 0015): foto de perfil, capa do perfil
 * (ADR 0021) e capa de projeto. Sobem cruas (`PUT /users/me/avatar`,
 * `PUT /users/me/cover`, `PUT /projects/{id}/cover`, com
 * `Content-Type: image/jpeg|png|webp`) e descem por `GET /images/{id}`, sem
 * login, para um `<img>` comum conseguir mostrar.
 */

/** Teto no servidor. O aparelho reduz antes e costuma mandar bem menos. */
export const IMAGEM_BYTES_MAX = 2 * 1024 * 1024;

/** Lado maior depois da redução no aparelho. */
export const AVATAR_LADO_PX = 512;
export const CAPA_LADO_PX = 1200;
/** A capa do perfil é uma faixa larga no topo da página. */
export const CAPA_DO_PERFIL_LADO_PX = 1600;

/** Caminho que vai em `avatar_url` e `cover_url`. Relativo à API. */
export const caminhoDaImagem = (id: string) => `/images/${id}`;
