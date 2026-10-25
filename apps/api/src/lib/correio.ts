import type { FastifyBaseLogger } from "fastify";
import { createTransport } from "nodemailer";
import type { PgBoss } from "pg-boss";

/**
 * E-mail que sai do Compoze (ADR 0010). Hoje só os convites por link usam.
 *
 * O envio passa pelo Resend quando há `RESEND_API_KEY` (pede domínio próprio
 * verificado) ou por SMTP quando há `SMTP_USER` e `SMTP_PASS` (o Gmail com
 * uma senha de app, ADR 0017). Sem nenhum dos dois, o e-mail fica desligado:
 * `habilitado` é falso e o app mostra só o link para copiar. Ver
 * docs/backend/deploy.md.
 */
export interface Email {
  para: string;
  assunto: string;
  texto: string;
  html: string;
}

/** Quem entrega de fato. Nos testes, um falso que só guarda o que recebeu. */
export interface Remetente {
  /** Para o log da subida: "Resend", "SMTP (smtp.gmail.com)". */
  readonly nome?: string;
  entregar(email: Email): Promise<void>;
}

export function remetenteResend(chave: string, de: string): Remetente {
  return {
    nome: "Resend",
    async entregar(e) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${chave}`, "content-type": "application/json" },
        body: JSON.stringify({ from: de, to: [e.para], subject: e.assunto, text: e.texto, html: e.html }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) throw new Error(`Resend respondeu ${r.status}: ${(await r.text()).slice(0, 300)}`);
    },
  };
}

/**
 * SMTP com TLS desde o começo (porta 465) ou STARTTLS (587). No Gmail, a
 * senha é a "senha de app" de 16 letras, não a senha da conta.
 */
export function remetenteSmtp(o: { host: string; porta: number; usuario: string; senha: string; de: string }): Remetente {
  const transporte = createTransport({
    host: o.host,
    port: o.porta,
    secure: o.porta === 465,
    requireTLS: o.porta !== 465,
    auth: { user: o.usuario, pass: o.senha },
    connectionTimeout: 15_000,
    socketTimeout: 20_000,
  });
  return {
    nome: `SMTP (${o.host})`,
    async entregar(e) {
      await transporte.sendMail({ from: o.de, to: e.para, subject: e.assunto, text: e.texto, html: e.html });
    },
  };
}

/** O remetente que a configuração pede, ou null se o e-mail fica desligado. */
export function remetenteDaConfig(c: {
  RESEND_API_KEY?: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  EMAIL_FROM: string;
}): Remetente | null {
  if (c.RESEND_API_KEY) return remetenteResend(c.RESEND_API_KEY, c.EMAIL_FROM);
  if (c.SMTP_USER && c.SMTP_PASS) {
    return remetenteSmtp({ host: c.SMTP_HOST, porta: c.SMTP_PORT, usuario: c.SMTP_USER, senha: c.SMTP_PASS, de: c.EMAIL_FROM });
  }
  return null;
}

export const FILA_DE_EMAIL = "enviar-email";

/**
 * O carteiro decide como o e-mail sai. Com a fila do pg-boss ligada (servidor
 * em produção), o e-mail vira job: a resposta da API não espera o Resend, e
 * uma falha é tentada de novo. Sem a fila (testes, `JOBS=off`), entrega na
 * hora, sem travar a resposta, e só registra se falhar.
 */
export interface Carteiro {
  readonly habilitado: boolean;
  /** Por onde sai, para o log da subida. */
  readonly via: string | null;
  enviar(email: Email): Promise<void>;
  usarFila(boss: PgBoss): Promise<void>;
}

export function criarCarteiro(remetente: Remetente | null, log: FastifyBaseLogger): Carteiro {
  let fila: PgBoss | null = null;
  return {
    habilitado: remetente !== null,
    via: remetente ? (remetente.nome ?? "outro") : null,
    async enviar(email) {
      if (!remetente) return;
      if (fila) {
        await fila.send(FILA_DE_EMAIL, email, { retryLimit: 5, retryDelay: 60, retryBackoff: true });
        return;
      }
      void remetente.entregar(email).catch((err) => log.error({ err }, "e-mail não saiu"));
    },
    async usarFila(boss) {
      if (!remetente) return;
      await boss.createQueue(FILA_DE_EMAIL);
      await boss.work<Email>(FILA_DE_EMAIL, async ([job]) => {
        await remetente.entregar(job!.data);
      });
      fila = boss;
    },
  };
}
