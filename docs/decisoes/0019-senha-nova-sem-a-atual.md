# 0019 · Senha nova em Ajustes, sem pedir a atual

- Status: aceita
- Data: 2026-10-26
- Relacionadas: [0006](0006-autenticacao-propria.md) (autenticação própria),
  [0017](0017-email-por-smtp.md) (e-mail por SMTP)

## Contexto

Ryan não lembrava a senha da própria conta: o login recusava, mas o app
instalado no celular continuava dentro, porque guarda a sessão. O Compoze não
tinha nenhum jeito de trocar senha, e o "esqueci a senha" clássico depende de
mandar um link por e-mail, que só funciona com o SMTP configurado. Ryan pediu
(2026-10-26) um "Redefinir senha" em Ajustes.

## Decisão

**1. `POST /auth/password` com `{ new_password }`, para quem está dentro.**
Não pede a senha atual: o caso que motivou é justamente quem a esqueceu e
ainda tem uma sessão aberta. Mesma regra de tamanho do cadastro (8 a 200) e o
mesmo limite de tentativas das rotas de `/auth`.

**2. Toda sessão cai, menos a deste aparelho.** Na mesma transação da troca,
todos os refresh tokens da pessoa são revogados; a resposta é um par novo para
o aparelho que pediu. Nos outros, o access token ainda vale até vencer (30
minutos) e depois a pessoa precisa entrar com a senha nova.

**3. Em Ajustes → Senha, fora do modo demonstração.** Senha nova e repetição,
conferidas no aparelho antes de mandar.

## Alternativas

- **Pedir a senha atual.** É o mais comum e protege contra quem pega um
  aparelho desbloqueado, mas deixaria Ryan (e qualquer um que esqueceu) sem
  saída enquanto não houver e-mail.
- **Só "esqueci a senha" por e-mail.** Fica para quando o SMTP estiver ligado
  (ADR 0017); as duas coisas convivem.

## Consequências

- Quem tem um aparelho com o Compoze aberto consegue trocar a senha. O risco
  é de quem pega um celular desbloqueado; o mesmo aparelho já dava acesso a
  todo o caderno.
- Trocar a senha também serve para expulsar uma sessão esquecida em outro
  aparelho.
- Quando houver e-mail, vale avisar a pessoa por e-mail a cada troca.
