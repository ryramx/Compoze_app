import { createHash, randomBytes } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

const EMISSOR = "compoze";
const chave = (segredo: string) => new TextEncoder().encode(segredo);

/** Access token: JWT curto (HS256), só com o id da pessoa. */
export function emitirAcesso(usuarioId: string, segredo: string, minutos: number): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuarioId)
    .setIssuer(EMISSOR)
    .setIssuedAt()
    .setExpirationTime(`${minutos}m`)
    .sign(chave(segredo));
}

/** Devolve o id da pessoa, ou `null` se o token for inválido ou tiver vencido. */
export async function verificarAcesso(token: string, segredo: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, chave(segredo), { issuer: EMISSOR, algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Refresh token: 256 bits aleatórios. O banco guarda só o SHA-256 dele. */
export function novoRefresh(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashDoRefresh(token) };
}

export const hashDoRefresh = (token: string) => createHash("sha256").update(token).digest("hex");
