import type { Aviso } from "@compoze/contracts";
import { pushSubscriptions, serverKeys, type Banco } from "@compoze/db";
import type { FastifyBaseLogger } from "fastify";
import { eq, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import webpush from "web-push";

import type { AoVivo } from "./aoVivo";
import type { EntregarFcm } from "./fcm";

/**
 * Avisos fora do app (Fase 3d, ADR 0016): mensagem nova, convite para
 * canção. Vão a cada aparelho inscrito de quem não está com o app aberto
 * agora (quem está já recebeu pelo fluxo ao vivo, ADR 0014): por Web Push ao
 * navegador e à PWA, pelo Firebase ao app Android, se houver conta de serviço.
 *
 * O par de chaves VAPID nasce no próprio servidor na primeira vez e fica em
 * `server_keys`: nada para configurar no Render.
 */

export interface Inscricao {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Entrega uma inscrição. Devolve o status HTTP do serviço de push. */
export type Entregar = (inscricao: Inscricao, aviso: Aviso, chaves: ChavesVapid) => Promise<number>;

export interface ChavesVapid {
  publicKey: string;
  privateKey: string;
}

// O serviço de push usa este contato se algo der errado com os envios.
const CONTATO = "https://github.com/ryramx/Compoze_app";

/**
 * O serviço de push troca um aviso ainda não entregue por outro do mesmo
 * tópico: quem fica sem rede recebe só o último de cada conversa. O tópico
 * aceita até 32 caracteres base64url, então vai o hash da tag.
 */
const topico = (tag: string) => createHash("sha256").update(tag).digest("base64url").slice(0, 32);

export const entregarPorWebPush: Entregar = async (i, aviso, chaves) => {
  try {
    const r = await webpush.sendNotification(
      { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
      JSON.stringify(aviso),
      { TTL: 24 * 3600, urgency: "high", topic: topico(aviso.tag), vapidDetails: { subject: CONTATO, ...chaves } },
    );
    return r.statusCode;
  } catch (e) {
    if (e instanceof webpush.WebPushError) return e.statusCode;
    throw e;
  }
};

export function criarAvisador({
  db,
  aoVivo,
  log,
  entregar = entregarPorWebPush,
  entregarFcm = null,
}: {
  db: Banco;
  aoVivo: AoVivo;
  log: FastifyBaseLogger;
  entregar?: Entregar;
  entregarFcm?: EntregarFcm | null;
}) {
  let chaves: Promise<ChavesVapid> | null = null;

  async function lerOuCriarChaves(): Promise<ChavesVapid> {
    const ler = async () => {
      const linhas = await db.select().from(serverKeys).where(inArray(serverKeys.name, ["vapid_public", "vapid_private"]));
      const publica = linhas.find((l) => l.name === "vapid_public")?.value;
      const privada = linhas.find((l) => l.name === "vapid_private")?.value;
      return publica && privada ? { publicKey: publica, privateKey: privada } : null;
    };
    const existentes = await ler();
    if (existentes) return existentes;
    const novas = webpush.generateVAPIDKeys();
    // Duas instâncias subindo juntas: a primeira grava, a outra lê a dela.
    await db.transaction(async (tx) => {
      await tx
        .insert(serverKeys)
        .values([
          { name: "vapid_public", value: novas.publicKey },
          { name: "vapid_private", value: novas.privateKey },
        ])
        .onConflictDoNothing();
    });
    return (await ler())!;
  }

  const obterChaves = () => {
    chaves ??= lerOuCriarChaves().catch((e) => {
      chaves = null;
      throw e;
    });
    return chaves;
  };

  async function enviar(userIds: string[], aviso: Aviso): Promise<void> {
    const fora = userIds.filter((id) => !aoVivo.conectado(id));
    if (fora.length === 0) return;
    const inscricoes = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, fora));
    const web = inscricoes.filter((i) => i.kind === "WEBPUSH" && i.p256dh && i.auth);
    const android = entregarFcm ? inscricoes.filter((i) => i.kind === "FCM") : [];
    if (web.length + android.length === 0) return;
    const ch = web.length > 0 ? await obterChaves() : null;
    await Promise.all(
      [...web, ...android].map(async (i) => {
        try {
          const status =
            i.kind === "FCM"
              ? await entregarFcm!(i.endpoint, aviso)
              : await entregar({ endpoint: i.endpoint, p256dh: i.p256dh!, auth: i.auth! }, aviso, ch!);
          // 404 e 410: o navegador desinscreveu ou a inscrição venceu.
          if (status === 404 || status === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, i.id));
          else if (status >= 400) log.warn({ status, kind: i.kind }, "push recusado");
        } catch (err) {
          log.warn({ err }, "push não saiu");
        }
      }),
    );
  }

  return {
    chavePublica: async () => (await obterChaves()).publicKey,
    /** Se o servidor tem a conta do Firebase, para o app Android saber se vale se inscrever. */
    androidLigado: entregarFcm !== null,
    /** Não espera nem falha: aviso é bônus, nunca segura a resposta da rota. */
    avisar(userIds: string[], aviso: Aviso): Promise<void> {
      return enviar(userIds, aviso).catch((err) => log.warn({ err }, "avisos não saíram"));
    },
    /** O mesmo, com o aviso ainda por montar (montar lê o banco). */
    avisarDepois(montar: Promise<{ para: string[]; aviso: Aviso } | null>): Promise<void> {
      return montar.then((a) => (a ? enviar(a.para, a.aviso) : undefined)).catch((err) => log.warn({ err }, "avisos não saíram"));
    },
  };
}

export type Avisador = ReturnType<typeof criarAvisador>;
