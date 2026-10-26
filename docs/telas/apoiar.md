# Apoiar um projeto por PIX

`/apoiar/:id` · `apps/web/src/pages/app/Apoiar.tsx`,
`services/api/apoioService.ts`, `apps/api/src/lib/pix.ts`

## Para que serve

É a página que a dona de um projeto divulga ("Copiar link de apoio" no
[detalhe do projeto](projetos.md)). Quem abre escolhe um valor e paga pelo
app do banco, **direto para a chave PIX da dona**, sem passar pelo Compoze e
sem taxa.

Quem apoia precisa ter conta no Compoze (o aviso de confirmação e o histórico
precisam saber quem foi), e ninguém apoia o próprio projeto. Sem sessão, o
link passa por Entrar ou Criar conta e volta para cá.

## O que dá para fazer

1. Ver o projeto: capa (ou o monograma da dona), nome, descrição, quanto já
   entrou ("R$ 620 de R$ 1.000 · 8 pessoas apoiaram") e a barra.
2. Escolher o valor: atalhos de R$ 10, 25, 50 e 100 ou um valor inteiro de R$ 1
   a R$ 100.000. **Gerar PIX**.
3. Pagar: um **QR Code** para apontar a câmera do app do banco e o **PIX
   copia e cola**, com "Copiar código" ("Cole no app do banco, em PIX → Copia
   e cola"). Dá para "Trocar o valor".
4. **Já paguei**: avisa a dona. "Quando o dinheiro aparecer na conta, a
   confirmação chega para você."
5. **Seus apoios a este projeto**: cada um com "esperando a confirmação",
   "chegou" ou "não chegou".

## Como foi feita

- A API monta o **BR Code** (o texto do PIX estático, padrão do Banco Central,
  com CRC16) em `lib/pix.ts`, com a chave, o nome, a cidade, o valor e um
  identificador único da transação (`txid`). O front só desenha o QR em SVG
  com a biblioteca `qrcode`.
- Cada "Gerar PIX" cria um apoio `PENDENTE` (`POST /support/{id}/contributions`); "Já paguei"
  marca `paid_claimed_at`. A dona vê esse apoio em "Para conferir no extrato" e
  marca `CONFIRMADO` ou `RECUSADO`. Só `CONFIRMADO` soma em
  `funding_current`.
- Avisos: a dona é avisada quando alguém diz que pagou; quem apoiou é avisado
  quando a dona confirma ([ADR 0016](../decisoes/0016-avisos-por-push.md)).
- Projeto sem chave, ou com o apoio pausado: "Este projeto não está recebendo
  apoio agora."

## Decisões e porquês

| Decisão | Por quê |
| --- | --- |
| PIX estático na chave da própria dona | Funciona hoje, de graça, sem conta em gateway nem cartão; o dinheiro nunca passa pelo Compoze, o que também evita obrigações de intermediar pagamento |
| Confirmação manual pela dona | PIX estático não avisa ninguém que foi pago. O `txid` no código ajuda a dona a achar o pagamento no extrato |
| Valor em reais inteiros | Simplifica o BR Code e a digitação no celular; centavos não fazem diferença em apoio |
| Mercado Pago ficou para depois | Pede conta e, para confirmar sozinho, um webhook. Se entrar, vira só outro caminho até `CONFIRMADO` ([ADR 0018](../decisoes/0018-apoio-por-pix.md), [futuro](../produto/futuro.md)) |

## Sem internet e na demonstração

Gerar o PIX e avisar que pagou pedem internet. Na demonstração a página só
explica que o apoio por PIX não funciona sem a conta de verdade.
