import type { Email } from "../../lib/correio";

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** O e-mail do convite por link: curto, em texto e num HTML simples, no tom do caderno. */
export function emailDeConvite(p: { para: string; quemConvida: string; titulo: string; link: string; validoAte: Date }): Email {
  const ate = p.validoAte.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
  const assunto = `${p.quemConvida} te chamou para escrever “${p.titulo}”`;
  const texto = [
    `${p.quemConvida} te chamou para escrever “${p.titulo}” junto no Compoze.`,
    "",
    `Para aceitar, abra o link (vale até ${ate}):`,
    p.link,
    "",
    "Se você não tem conta, dá para criar uma na hora. Se não esperava este convite, é só ignorar.",
  ].join("\n");
  const html = `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#1f1d1a;max-width:520px">
<p>${escapar(p.quemConvida)} te chamou para escrever <em>“${escapar(p.titulo)}”</em> junto no Compoze.</p>
<p><a href="${escapar(p.link)}" style="color:#2f4a7a">Aceitar o convite</a> <span style="color:#6b665d">(vale até ${escapar(ate)})</span></p>
<p style="color:#6b665d;font-size:14px">Se você não tem conta, dá para criar uma na hora. Se não esperava este convite, é só ignorar.</p>
</div>`;
  return { para: p.para, assunto, texto, html };
}
