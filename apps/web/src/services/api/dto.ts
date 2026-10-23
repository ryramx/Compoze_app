/**
 * Tipos como o backend os devolve — `snake_case`, enums em maiúsculas.
 *
 * Vêm direto dos schemas de `@compoze/contracts`, os mesmos que a API usa para
 * validar e serializar: se o contrato muda, o front deixa de compilar onde
 * precisa mudar junto. Só tipos são importados, então o zod não entra no
 * bundle.
 *
 * Eles vivem separados dos tipos de domínio em `src/types/` de propósito. O
 * contrato da API e o modelo que a interface usa divergem em vários pontos
 * (ver docs/backend/contrato-da-api.md), e misturar os dois espalharia a
 * tradução por todas as telas. Aqui e em `adapters.ts` é o único lugar que
 * conhece as duas formas.
 */
import type {
  AtualizarBloco,
  AtualizarCancao,
  AtualizarEu,
  AtualizarPasta,
  AtualizarProjeto,
  Bloco,
  Colaborador,
  DetalheDaCancao,
  DetalheDoProjeto,
  DivisaoDeCoautoria,
  EstiloDeProjeto,
  FaseDeProjeto,
  ItemDaLixeira,
  NovaCancao,
  NovaPasta,
  NovoBloco,
  NovoColaborador,
  NovoProjeto,
  PapelDeColaborador,
  ParDeTokens,
  Pasta,
  Projeto,
  ResumoDaCancao,
  ResumoDaVersao,
  RetratoDaCancao,
  StatusDaCancao,
  TipoDeBloco,
  TipoDeProjeto,
  UsuarioEu,
  UsuarioNoMapa,
  UsuarioPublico,
  Versao,
  Visibilidade,
} from "@compoze/contracts";

// Enums
export type ApiSongStatus = StatusDaCancao;
export type ApiVisibility = Visibilidade;
export type ApiBlockType = TipoDeBloco;
export type ApiCollaboratorRole = PapelDeColaborador;
export type ApiProjectType = TipoDeProjeto;
export type ApiProjectStatus = FaseDeProjeto;
export type ApiProjectStyle = EstiloDeProjeto;

// Respostas
export type ApiTokenPair = ParDeTokens;
export type ApiUserPublic = UsuarioPublico;
export type ApiUserMe = UsuarioEu;
export type ApiUserOnMap = UsuarioNoMapa;
export type ApiBlock = Bloco;
export type ApiCollaborator = Colaborador;
export type ApiSongSummary = ResumoDaCancao;
export type ApiSongDetail = DetalheDaCancao;
export type ApiTrashItem = ItemDaLixeira;
export type ApiFolder = Pasta;
export type ApiProject = Projeto;
export type ApiProjectDetail = DetalheDoProjeto;
export type ApiVersionSummary = ResumoDaVersao;
export type ApiVersion = Versao;
export type ApiSnapshot = RetratoDaCancao;

// Corpos de requisição
export type ApiNewSong = NovaCancao;
export type ApiSongPatch = AtualizarCancao;
export type ApiNewBlock = NovoBloco;
export type ApiBlockPatch = AtualizarBloco;
export type ApiNewCollaborator = NovoColaborador;
export type ApiContributions = DivisaoDeCoautoria;
export type ApiMePatch = AtualizarEu;
export type ApiNewFolder = NovaPasta;
export type ApiFolderPatch = AtualizarPasta;
export type ApiNewProject = NovoProjeto;
export type ApiProjectPatch = AtualizarProjeto;
