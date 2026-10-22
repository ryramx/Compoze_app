import { api, definirRenovador, getAccessToken, setAccessToken } from "@/lib/api";
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

export async function me(): Promise<User> {
  return usuarioDaApi(await api.get<ApiUserMe>("/users/me"));
}

export function logout(): void {
  setAccessToken(null);
  guardarRefresh(null);
  // Quem usar o aparelho depois não vê as letras de quem saiu.
  void apagarDocumentosLocais();
}

let renovacaoEmAndamento: Promise<boolean> | null = null;

/**
 * Troca o refresh token guardado por um par novo.
 *
 * Chamadas simultâneas (StrictMode, duas telas montando juntas, uma requisição
 * que voltou 401 enquanto o editor reconectava) compartilham a mesma
 * requisição. O refresh é de uso único: enviá-lo duas vezes faria o servidor
 * ver o segundo envio como reuso e encerrar a sessão.
 */
export function renovarTokens(): Promise<boolean> {
  renovacaoEmAndamento ??= renovar().finally(() => {
    renovacaoEmAndamento = null;
  });
  return renovacaoEmAndamento;
}

async function renovar(): Promise<boolean> {
  const refresh = lerRefresh();
  if (!refresh) return false;
  try {
    guardarPar(await api.post<ApiTokenPair>("/auth/refresh", { refresh_token: refresh }));
    return true;
  } catch {
    // Refresh expirado ou revogado: limpa tudo em vez de deixar credencial
    // morta no navegador.
    logout();
    return false;
  }
}

// Requisição que volta 401 tenta renovar uma vez e repete (ver lib/api.ts).
definirRenovador(renovarTokens);

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
 * Tenta restaurar a sessão a partir do refresh token guardado.
 *
 * Usado na abertura do app: o access token dura 30 minutos, então quem volta
 * depois disso tem um token expirado mas um refresh válido — e não deveria
 * precisar digitar a senha de novo.
 */
export async function restaurarSessao(): Promise<User | null> {
  if (!(await renovarTokens())) return null;
  try {
    return await me();
  } catch {
    return null;
  }
}
