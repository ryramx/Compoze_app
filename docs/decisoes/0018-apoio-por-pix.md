# 0018 · Apoio a projetos por PIX, direto na chave da dona

- Status: aceita
- Data: 2026-10-25
- Relacionadas: [0016](0016-avisos-por-push.md) (avisos), plano da Fase 4

## Contexto

O financiamento de projetos (meta e "arrecadado") existia só como número
digitado. O plano previa o PIX pelo Mercado Pago, que pede conta de vendedor,
cobra taxa por PIX recebido (cerca de 1%) e exige um webhook com domínio. Ryan
pediu (2026-10-25) para resolver as pendências por partes, sem gastar.

O PIX tem um formato aberto do Banco Central, o BR Code ("PIX copia e cola"):
qualquer app de banco paga um código estático com chave, nome, cidade, valor e
um identificador, sem intermediário.

## Decisão

**1. O dinheiro vai direto para a chave PIX da dona do projeto.** Ela cadastra
a chave (CPF, CNPJ, celular, e-mail ou aleatória), o nome que o banco mostra
(até 25 letras) e a cidade (até 15). O Compoze nunca toca no dinheiro e não
cobra nada.

**2. O servidor gera o BR Code estático** (`apps/api/src/lib/pix.ts`): campos
EMV do manual do BC, CRC16-CCITT no fim, texto sem acento e em maiúsculas no
nome e na cidade. Cada apoio leva o próprio identificador (`txid`, `CPZ` +
22 caracteres), que aparece no extrato de quem recebe. O front desenha o QR.

**3. A confirmação é da dona, à mão.** Sem banco integrado, ninguém sabe se o
PIX caiu. O fluxo é:
1. quem apoia escolhe o valor e recebe o QR e o copia e cola (apoio
   `PENDENTE`);
2. paga no banco e toca em "Já paguei"; a dona recebe um aviso (ADR 0016);
3. a dona confere no extrato e marca "Chegou" (`CONFIRMADO`) ou "Não chegou"
   (`RECUSADO`); quem apoiou recebe um aviso.

Só o confirmado soma em `funding_current`, na mesma transação. Decidir de novo
dá `409`.

**4. Link de apoio.** `/apoiar/{id}` mostra o projeto, quanto já entrou, a
quem o PIX vai e os apoios da própria pessoa. Pede conta: o aviso e o
histórico precisam saber quem apoiou. Não se apoia o próprio projeto.

**5. Pausar e parar.** A dona pode pausar ("aceitando apoio agora") ou parar
de receber, o que apaga a chave. Os apoios anotados ficam.

## Alternativas

- **Mercado Pago (ou outro PSP).** Confirma sozinho pelo webhook e aceita
  cartão, mas cobra por transação, pede conta de vendedor e um domínio para o
  webhook. Continua possível: a tabela de apoios já tem `status` e `txid`, e
  o PSP entraria como outro jeito de chegar ao `CONFIRMADO`.
- **PIX dinâmico pela API Pix de um banco.** Pede certificado e conta PJ.
- **Guardar o arrecadado só como número livre.** Era o que havia; não deixa
  quem apoia acompanhar nem a dona conferir.

## Consequências

- Quem paga vê a chave e o nome da dona, como em qualquer PIX. A tela
  recomenda chave aleatória ou e-mail em vez de CPF.
- Um apoio que a dona nunca confere fica `PENDENTE` para sempre e não conta.
- Sem custo e sem conta externa; o dinheiro cai na hora na conta dela.
- Não há estorno pelo Compoze: devolver é um PIX da dona para quem apoiou.
