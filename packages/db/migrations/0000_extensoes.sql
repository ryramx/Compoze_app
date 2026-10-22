-- Extensões que o schema usa. Precisam existir antes das tabelas:
-- citext (e-mail e @ sem diferenciar maiúsculas), PostGIS (mapa, RN11),
-- pg_trgm e unaccent (busca em português, Fase 1).
CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
