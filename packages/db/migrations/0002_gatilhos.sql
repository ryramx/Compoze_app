-- Regras que o banco garante sozinho, qualquer que seja o caminho da escrita.

-- 1. Relógio e versão do servidor (ADR 0005).
-- Toda alteração carimba `updated_at` com a hora do servidor e, nas tabelas
-- que sincronizam, sobe `version`. O cliente nunca define esses campos: é
-- assim que o delta (`GET /sync/changes`) sabe o que mudou desde o cursor.
CREATE FUNCTION compoze_tocar() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_ARGV[0] = 'versionada' THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER users_tocar BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION compoze_tocar();--> statement-breakpoint
CREATE TRIGGER song_documents_tocar BEFORE UPDATE ON song_documents
  FOR EACH ROW EXECUTE FUNCTION compoze_tocar();--> statement-breakpoint
CREATE TRIGGER folders_tocar BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION compoze_tocar('versionada');--> statement-breakpoint
CREATE TRIGGER songs_tocar BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION compoze_tocar('versionada');--> statement-breakpoint
CREATE TRIGGER song_blocks_tocar BEFORE UPDATE ON song_blocks
  FOR EACH ROW EXECUTE FUNCTION compoze_tocar('versionada');--> statement-breakpoint
CREATE TRIGGER song_collaborators_tocar BEFORE UPDATE ON song_collaborators
  FOR EACH ROW EXECUTE FUNCTION compoze_tocar('versionada');--> statement-breakpoint
CREATE TRIGGER projects_tocar BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION compoze_tocar('versionada');--> statement-breakpoint
CREATE TRIGGER project_songs_tocar BEFORE UPDATE ON project_songs
  FOR EACH ROW EXECUTE FUNCTION compoze_tocar('versionada');--> statement-breakpoint

-- 2. Posição única por canção, verificada só no fim da transação, para que
-- reordenar blocos (trocar 1 com 2) não esbarre em duplicata no meio do caminho.
ALTER TABLE song_blocks
  ADD CONSTRAINT song_blocks_song_position_key UNIQUE (song_id, position)
  DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint

-- 3. Pasta sem ciclo: a nova mãe não pode ser a própria pasta nem uma descendente.
CREATE FUNCTION compoze_pasta_sem_ciclo() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    WITH RECURSIVE acima(id) AS (
      SELECT NEW.parent_id
      UNION
      SELECT f.parent_id FROM folders f JOIN acima a ON f.id = a.id
      WHERE f.parent_id IS NOT NULL
    )
    SELECT 1 FROM acima WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Uma pasta não pode ficar dentro de si mesma.'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'folders_sem_ciclo';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER folders_sem_ciclo BEFORE INSERT OR UPDATE OF parent_id ON folders
  FOR EACH ROW EXECUTE FUNCTION compoze_pasta_sem_ciclo();--> statement-breakpoint

-- 4. Versões de canção são imutáveis: são a prova de autoria.
CREATE FUNCTION compoze_imutavel() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Versões registradas não podem ser alteradas.'
    USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint

CREATE TRIGGER song_versions_imutavel BEFORE UPDATE ON song_versions
  FOR EACH ROW EXECUTE FUNCTION compoze_imutavel();
