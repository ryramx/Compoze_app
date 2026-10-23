import {
  ESTILOS_DE_PROJETO,
  FASES_DE_PROJETO,
  MOTIVOS_DE_VERSAO,
  PAPEIS_DE_COLABORADOR,
  STATUS_DA_CANCAO,
  TIPOS_DE_BLOCO,
  TIPOS_DE_PROJETO,
  VISIBILIDADES,
} from "@compoze/contracts";
import { pgEnum } from "drizzle-orm/pg-core";

// Os rótulos vêm do contrato: API e banco falam exatamente os mesmos valores.
export const songStatus = pgEnum("song_status", STATUS_DA_CANCAO);
export const visibility = pgEnum("visibility", VISIBILIDADES);
export const blockType = pgEnum("block_type", TIPOS_DE_BLOCO);
export const collaboratorRole = pgEnum("collaborator_role", PAPEIS_DE_COLABORADOR);
export const projectType = pgEnum("project_type", TIPOS_DE_PROJETO);
export const projectStatus = pgEnum("project_status", FASES_DE_PROJETO);
export const projectStyle = pgEnum("project_style", ESTILOS_DE_PROJETO);
export const versionReason = pgEnum("version_reason", MOTIVOS_DE_VERSAO);
