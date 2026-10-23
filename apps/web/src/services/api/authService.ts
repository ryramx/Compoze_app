import { api, ApiError, definirRenovador, getAccessToken, setAccessToken } from "@/lib/api";
import { apagarDocumentosLocais } from "@/lib/colaboracao";
import { usuarioDaApi } from "@/services/api/adapters";
import type { ApiTokenPair, ApiUserMe } from "@/services/api/dto";
import type { User } from "@/types";

const REFRESH_KEY = "compoze.refreshToken";

function guardarRefresh(token: string | null): void {
  try {
    if (token === null) localStorage.removeItem(REFRESH_KEY);
    else localStorage.setItem(REFRESH_KEY, token);
  } catch {
    // Sem storage a sessão não sobrevive ao reload, mas o app segue.
  }
}

export function lerRefresh(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function guardarPar(par: ApiTokenPair): void {
  setAccessToken(par.access_token);
  guardarRefresh(par.refresh_token);
}

export interface DadosCadastro {
  name: string;
  username: string;
  email: string;
  password: string;
}

export async function register(dados: DadosCadastro): Promise<User> {
  guardarPar(await api.post<ApiTokenPair>("/auth/register", dados));
  return me();
}

export async function login(email: string, password: string): Promise<User> {
  guardarPar(await api.post<ApiTokenPair>("/auth/login", { email, password }));
  return me();
}

const EU_KEY = "compoze.eu";

/** Quem está logada, guardada para abrir o app offline (ADR 0005, sessão offline). */
function lembrarEu(u: User | null): void {
  try {
    if (u) localStorage.setItem(EU_KEY, JSON.stringify(u));
    else localStorage.removeItem(EU_KEY);
  } catch {
    // Sem storage o app só não abre offline.
  }
}

function euLembrada(): User | null {
  try {
    return JSON.parse(localStorage.getItem(EU_KEY) ?? "null") as User | null;
  } catch {
    return null;
  }
}

export async function me(): Promise<User> {
  const u = usuarioDaApi(await api.get<ApiUserMe>("/users/me"));
  lembrarEu(u);
  return u;
}

export function logout(): void {
  setAccessToken(null);
  guardarRefresh(null);
  lembrarEu(null);
  // Quem usar o aparelho depois não vê as letras de quem saiu.
  void apagarDocumentosLocais();
}

/** `sem-rede`: não deu para falar com o servidor; a sessão continua guardada. */
type Renovacao = "ok" | "recusada" | "sem-rede";

let renovacaoEmAndamento: Promise<Renovacao> | null = null;

/**
 * Troca o refresh token guardado por um par novo.
 *
 * Chamadas simultâneas (StrictMode, duas telas montando juntas, uma requisição
 * que voltou 401 enquanto o editor reconectava) compartilham a mesma
 * requisição. O refresh é de uso único: enviá-lo duas vezes faria o servidor
 * ver o segundo envio como reuso e encerrar a sessão.
 */
export function renovarTokens(): Promise<Renovacao> {
  renovacaoEmAndamento ??= renovar().finally(() => {
    renovacaoEmAndamento = null;
  });
  return renovacaoEmAndamento;
}

async function renovar(): Promise<Renovacao> {
  const refresh = lerRefresh();
  if (!refresh) return "recusada";
  try {
    guardarPar(await api.post<ApiTokenPair>("/auth/refresh", { refresh_token: refresh }));
    return "ok";
  } catch (e) {
    // Sem rede não é motivo para sair: a sessão volta quando a rede voltar.
    if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) return "sem-rede";
    // Refresh expirado ou revogado: limpa tudo em vez de deixar credencial
    // morta no navegador.
    logout();
    return "recusada";
  }
}

// Requisição que volta 401 tenta renovar uma vez e repete (ver lib/api.ts).
definirRenovador(async () => (await renovarTokens()) === "ok");

/** Segundos até o access token vencer, lidos do próprio JWT. */
function segundosRestantes(token: string): number {
  try {
    const corpo = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return (corpo.exp ?? 0) - Date.now() / 1000;
  } catch {
    return 0;
  }
}

/**
 * Access token válido para abrir o editor em tempo real: renova antes se
 * faltar menos de um minuto, porque o WebSocket só manda o token ao conectar.
 */
export async function tokenValido(): Promise<string> {
  const atual = getAccessToken();
  if (atual && segundosRestantes(atual) > 60) return atual;
  await renovarTokens();
  return getAccessToken() ?? "";
}

/**
 * A última pessoa logada neste aparelho, se a sessão dela ainda estiver
 * guardada. Serve para abrir o app na hora, sem esperar o servidor.
 */
export function sessaoLembrada(): User | null {
  return lerRefresh() ? euLembrada() : null;
}

/**
 * Tenta restaurar a sessão a partir do refresh token guardado.
 *
 * Usado na abertura do app: o access token dura 30 minutos, então quem volta
 * depois disso tem um token expirado mas um refresh válido — e não deveria
 * precisar digitar a senha de novo.
 */
export async function restaurarSessao(): Promise<User | null> {
  const r = await renovarTokens();
  // Offline: abre com a última sessão conhecida. Escritas esperam na fila até
  // a rede (e a renovação do token) voltar.
  if (r === "sem-rede") return euLembrada();
  if (r === "recusada") return null;
  try {
    return await me();
  } catch {
    return euLembrada();
  }
}
