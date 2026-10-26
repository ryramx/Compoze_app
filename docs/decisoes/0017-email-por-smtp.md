# 0017 · E-mail dos convites também por SMTP, para usar o Gmail sem domínio

- Status: aceita
- Data: 2026-10-25
- Relacionadas: [0010](0010-convites.md) (convites; e-mail desligado sem
  domínio)

## Contexto

O ADR 0010 deixou o e-mail dos convites pronto, mas desligado: o Resend só
entrega a terceiros com um domínio próprio verificado, e o Compoze não tem
domínio. Comprar um custa uns R$ 40 por ano. Ryan pediu (2026-10-25) para
resolver as pendências, e o Gmail da própria pessoa entrega por SMTP de graça,
até cerca de 500 mensagens por dia, com uma "senha de app".

## Decisão

**1. Um segundo remetente, por SMTP (`nodemailer`).** Liga com `SMTP_USER` e
`SMTP_PASS`; `SMTP_HOST` e `SMTP_PORT` vêm do Gmail (`smtp.gmail.com`, 465)
e servem para qualquer outro provedor. Porta 465 abre com TLS; qualquer outra
exige STARTTLS, nunca texto aberto.

**2. O Resend continua e tem preferência.** Com `RESEND_API_KEY`, vale ele.
Quando houver domínio, basta pôr a chave; o SMTP fica de reserva.

**3. O remetente padrão no SMTP é `Compoze <SMTP_USER>`.** O Gmail troca o
endereço do remetente pelo da conta de qualquer jeito, então quem recebe vê o
nome "Compoze" e o Gmail de quem configurou. `EMAIL_FROM` muda isso quando
houver outro provedor.

**4. Nada mais muda.** A fila do pg-boss, as novas tentativas, o texto do
e-mail e a regra de quem recebe são os do ADR 0010.

## Alternativas

- **Domínio próprio.** O remetente fica com cara de produto
  (`convites@...`), mas custa por ano, e a escolha foi do Ryan.
- **Outros serviços grátis (Brevo, Mailjet).** Também pedem domínio para não
  cair no spam: um remetente `@gmail.com` mandado por outro servidor falha no
  DMARC do Gmail. Pelo próprio Gmail, o e-mail sai assinado por ele.

## Consequências

- O Gmail de quem configurou aparece para quem recebe o convite.
- O limite diário do Gmail vale para o Compoze inteiro; para o staging, sobra.
- A senha de app vive só no Render. Revogar é em myaccount.google.com →
  Senhas de app, sem mexer na senha da conta.
