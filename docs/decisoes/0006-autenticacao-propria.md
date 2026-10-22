# 0006 · Autenticação própria no contrato v1 (Better Auth adiado)

- Status: aceita
- Data: 2026-10-22
- Substitui, em parte: [0004](0004-stack-do-backend.md) (só o item "Better Auth")

## Contexto

O ADR 0004 escolheu o Better Auth para não escrever autenticação à mão. Na hora
de implementar a Fase 1, três coisas pesaram contra usá-lo agora:

1. **O contrato já existe e o front já fala com ele.** `POST /auth/register`,
   `/auth/login` e `/auth/refresh` devolvem `{ access_token, refresh_token }`;
   o front guarda o par e renova sozinho. O Better Auth tem rotas, formatos e
   modelo de sessão próprios (`/api/auth/sign-in/email`, sessão por cookie ou
   token opaco deslizante). Adotá-lo obrigaria a reescrever a camada de
   autenticação do front ou a embrulhar a biblioteca para imitar o contrato.
2. **O uso offline (ADR 0005) pede exatamente o par curto + longo.** Um access
   token curto que o app usa enquanto há rede e um refresh longo, de uso único,
   que o aparelho troca quando volta a ter sinal.
3. **O que o Better Auth traria de mais valioso** (verificação de e-mail, reset
   de senha, OAuth com Google e Apple) depende de e-mail transacional e das
   contas nas lojas, que só chegam nas Fases 2 e 3.

## Decisão

Autenticação própria, pequena, sobre bibliotecas consagradas. Nenhuma
criptografia é escrita à mão:

| Peça | Como |
| --- | --- |
| Senha | argon2id (`@node-rs/argon2`), parâmetros da OWASP (19 MiB, t=2) |
| Access token | JWT HS256 (`jose`), 30 min, só com o id da pessoa |
| Refresh token | 256 bits aleatórios, 30 dias, **uso único**; o banco guarda só o SHA-256 |
| Rotação | Cada renovação gasta o token e emite o próximo da mesma "família" |
| Reuso | Token já gasto reapresentado depois de 10 s derruba a família inteira (sinal de cópia). Dentro de 10 s é tratado como corrida entre abas: o segundo envio só perde |
| Força bruta | 10 tentativas por minuto por IP em `/auth/*` (`@fastify/rate-limit`) |
| Enumeração de contas | Login com e-mail inexistente faz o mesmo trabalho de hash e devolve a mesma mensagem |

Tudo cabe em `apps/api/src/modules/auth/` (cerca de 150 linhas) e é coberto por
testes contra o Postgres real.

## Consequências

- O front não muda: o contrato de autenticação é o mesmo.
- Fica para depois, com o Better Auth reavaliado nessa hora: verificação de
  e-mail, "esqueci minha senha", OAuth, lista de sessões ativas para revogar.
  Se adotarmos a biblioteca, as tabelas `users.password_hash` e
  `refresh_tokens` migram para as dela.
- `JWT_SECRET` passa a ser obrigatório (mínimo 32 caracteres). No Render ele é
  gerado pelo Blueprint e nunca aparece no repositório.
