import type { FastifyBaseLogger } from "fastify";
import type { PgBoss } from "pg-boss";

/**
 * E-mail que sai do Compoze (ADR 0010). Hoje só os convites por link usam.
 *
 * O envio passa pelo Resend (plano grátis) quando há `RESEND_API_KEY`. Sem a
 * chave, o e-mail fica desligado: `habilitado` é falso e o app mostra só o
 * link para copiar. Sem domínio próprio verificado no Resend, ele só entrega
 * para o e-mail da própria conta; ver docs/backend/deploy.md.
 */
export interface Email {
  para: string;
  assunto: string;
  texto: string;
  html: string;
}

/** Quem entrega de fato. Nos testes, um falso que só guarda o que recebeu. */
export interface Remetente {
  entregar(email: Email): Promise<void>;
}

export function remetenteResend(chave: string, de: string): Remetente {
  return {
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

export const FILA_DE_EMAIL = "enviar-email";

/**
 * O carteiro decide como o e-mail sai. Com a fila do pg-boss ligada (servidor
 * em produção), o e-mail vira job: a resposta da API não espera o Resend, e
 * uma falha é tentada de novo. Sem a fila (testes, `JOBS=off`), entrega na
 * hora, sem travar a resposta, e só registra se falhar.
 */
export interface Carteiro {
  readonly habilitado: boolean;
  enviar(email: Email): Promise<void>;
  usarFila(boss: PgBoss): Promise<void>;
}

export function criarCarteiro(remetente: Remetente | null, log: FastifyBaseLogger): Carteiro {
  let fila: PgBoss | null = null;
  return {
    habilitado: remetente !== null,
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
