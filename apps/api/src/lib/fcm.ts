import type { Aviso } from "@compoze/contracts";
import { importPKCS8, SignJWT } from "jose";
import { createHash } from "node:crypto";

/**
 * Push no app Android pelo Firebase Cloud Messaging, API HTTP v1 (ADR 0016).
 * Sem o SDK `firebase-admin`: são duas chamadas HTTP, e o JWT da conta de
 * serviço sai do `jose`, que a API já usa.
 *
 * A conta de serviço é o JSON que o Firebase gera em "Contas de serviço"; vai
 * inteiro na variável `FIREBASE_SERVICE_ACCOUNT` do Render, nunca no repo.
 */

export interface ContaDeServico {
  project_id: string;
  client_email: string;
  private_key: string;
}

/** Entrega a um token do aparelho. Devolve o status; 404 quer dizer token morto. */
export type EntregarFcm = (token: string, aviso: Aviso) => Promise<number>;

const ESCOPO = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** O canal de notificação que o app cria ao abrir (Android 8+). */
export const CANAL_ANDROID = "avisos";
/** drawable/ic_aviso.xml do APK: a nota em branco, que o Android pinta com a cor. */
export const ICONE_ANDROID = "ic_aviso";
/** O vermelho-lápis da marca, o mesmo de values/avisos.xml. */
export const COR_ANDROID = "#B4412B";

export function criarFcm(conta: ContaDeServico, buscar: typeof fetch = fetch): EntregarFcm {
  let acesso: { valor: string; vence: number } | null = null;

  async function tokenDeAcesso(): Promise<string> {
    if (acesso && acesso.vence > Date.now()) return acesso.valor;
    const chave = await importPKCS8(conta.private_key, "RS256");
    const afirmacao = await new SignJWT({ scope: ESCOPO })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(conta.client_email)
      .setAudience(TOKEN_URL)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(chave);
    const r = await buscar(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: afirmacao }),
    });
    if (!r.ok) throw new Error(`Google recusou a conta de serviço (${r.status}).`);
    const { access_token, expires_in } = (await r.json()) as { access_token: string; expires_in: number };
    // Um minuto de folga, para não usar um token que vence no caminho.
    acesso = { valor: access_token, vence: Date.now() + (expires_in - 60) * 1000 };
    return access_token;
  }

  return async (token, aviso) => {
    // Mesma tag, mesmo aviso: o Android troca o anterior em vez de empilhar.
    const tag = createHash("sha256").update(aviso.tag).digest("base64url").slice(0, 32);
    const r = await buscar(`https://fcm.googleapis.com/v1/projects/${conta.project_id}/messages:send`, {
      method: "POST",
      headers: { authorization: `Bearer ${await tokenDeAcesso()}`, "content-type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: aviso.title, body: aviso.body },
          data: { url: aviso.url, tag: aviso.tag },
          android: {
            priority: "HIGH",
            ttl: "86400s",
            collapse_key: tag,
            // Ícone e cor também no manifest; aqui valem mesmo se o aparelho não ler o meta-data.
            notification: { tag, channel_id: CANAL_ANDROID, icon: ICONE_ANDROID, color: COR_ANDROID },
          },
        },
      }),
    });
    if (r.ok) return r.status;
    // Token desinstalado ou trocado: o FCM responde 404 UNREGISTERED.
    const erro = (await r.json().catch(() => null)) as { error?: { details?: { errorCode?: string }[] } } | null;
    if (erro?.error?.details?.some((d) => d.errorCode === "UNREGISTERED")) return 404;
    return r.status;
  };
}
