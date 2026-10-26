# Convite por link

`/convite/:token` · `apps/web/src/pages/app/Convite.tsx`,
`apps/api/src/modules/convites/`

## Para que serve

É o destino do link de convite que a dona de uma canção cria no editor para
quem **ainda não tem conta** (ou para mandar por WhatsApp, e-mail, onde
quiser). Quem abre vê quem convidou e entra na canção com um toque.

## Como funciona, do ponto de vista de quem recebe

1. Abre o link. Sem sessão, vai para Entrar; o subtítulo explica "Entre para
   aceitar o convite. Se ainda não tem conta, crie uma: leva um minuto." Depois
   de entrar ou criar a conta, volta para cá sozinho.
2. Vê "**Maya Costa te chamou para escrever 'Café da madrugada'.**" e o papel:
   "Sua parte: composição. Na divisão, você começa com 0% até vocês
   acertarem." Se o convite for só de leitura: "O convite é para ler a canção,
   sem editar."
3. **Aceitar e abrir a canção** ou **Agora não**. Quem já escreve nela vê
   "Você já escreve nesta canção." e "Abrir a canção".

Erros dizem o que houve: "Este convite não existe. Confira se o link veio
inteiro.", convite vencido, já usado ou cancelado.

## Como foi feita

- `GET /invites/link/{token}` mostra o convite; `POST
  /invites/link/{token}/accept` aceita e devolve a canção completa, que entra
  no caderno na hora (`receberMusica`), sem esperar a próxima leitura.
- O token tem 256 bits aleatórios; o banco guarda **só o SHA-256** dele. Por
  isso o link aparece uma vez só para a dona.
- O link vale **uma vez, por 7 dias**.

## Decisões e porquês

| Decisão | Por quê |
| --- | --- |
| Sempre aceitar antes de entrar | Ninguém vira coautor de algo sem saber, nem recebe uma canção que não quer ([ADR 0010](../decisoes/0010-convites.md)) |
| Link de uso único e com prazo | Um link encaminhado sem querer não deixa um grupo inteiro entrar na canção |
| Volta ao convite depois do cadastro | Quem chega por um convite quer a canção, não um tour pelo app |
| Começa com 0% | A divisão é acertada entre as pessoas, na ficha; o app não presume nada |

## Sem internet

Precisa de internet para abrir e aceitar.
