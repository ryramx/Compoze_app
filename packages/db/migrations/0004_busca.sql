-- Busca em português sem acento e sem caixa: "coracao" acha "Coração".
-- `unaccent` não é IMMUTABLE (depende do dicionário configurado), então não
-- entra em índice. Esta função fixa o dicionário e pode ser declarada imutável,
-- que é a forma documentada de indexar texto sem acento no Postgres.
CREATE FUNCTION compoze_normalizar(texto text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
RETURN lower(public.unaccent('public.unaccent'::regdictionary, texto));--> statement-breakpoint

CREATE INDEX songs_title_busca_idx ON songs USING gin (compoze_normalizar(title) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX song_blocks_content_busca_idx ON song_blocks USING gin (compoze_normalizar(content) gin_trgm_ops);
