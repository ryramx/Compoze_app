# 0010 · Convites: pela conta, por link e (quando houver domínio) por e-mail

- Status: aceita
- Data: 2026-10-23
- Relacionadas: [0006](0006-autenticacao-propria.md) (contas e sessão),
  [0009](0009-versoes-e-registro.md) (a coautoria entra no registro)

## Contexto

Até aqui, "Convidar" na ficha da canção punha a pessoa direto como coautora,
sem perguntar. A busca também só encontrava quem já escrevia com a dona, então
não havia como chamar alguém novo. Para quem não tinha conta, não havia
caminho nenhum.

O plano previa convites por e-mail com o Resend. A conta no Resend existe, mas
não há domínio próprio. Sem domínio verificado, o Resend só entrega para o
e-mail da própria conta, o que serve para teste e não para convidar ninguém.
Um domínio `.com.br` custa cerca de R$ 40 por ano e ainda não foi aprovado.

## Decisão

**1. Entrar numa canção é sempre um aceite de quem entra.** A rota
`POST /songs/{id}/collaborators` deixou de existir. A dona cria um convite, e
a pessoa só vira coautora quando aceita. Remover coautor e acertar a divisão
continuam como antes.

**2. Convite pela conta, como numa rede social.** A dona busca por nome ou @
em todo o Compoze (`GET /users?q=`). A busca ignora acento e caixa, devolve
até 10 pessoas e não inclui quem busca. A pessoa convidada vê o convite no
alto da Mesa e aceita ou recusa. Esse convite vale 30 dias. Convidar a mesma
pessoa de novo substitui o convite aberto.

**3. Convite por link, para quem ainda não tem conta.**
- O link leva a `/convite/{token}` no app. Quem não está logado passa pelo
  login ou cadastro e volta para o convite.
- O link vale uma vez e por 7 dias.
- O token tem 32 bytes aleatórios. O banco guarda só o SHA-256 dele, então o
  link aparece uma vez, na criação, e quem lê o banco não consegue usá-lo.
- Quem já escreve na canção pode abrir o link sem gastá-lo.
- O id de um convite por link não serve para aceitar: só o token vale.

**4. E-mail pronto, mas desligado.**
- Sem `RESEND_API_KEY`, o servidor não manda e-mail. A resposta da listagem
  traz `email_enabled: false`, e o app nem mostra o campo de e-mail.
- Com a chave, o diálogo do link ganha um campo de e-mail opcional. O link
  sai por e-mail num job do pg-boss, com até 5 novas tentativas se o Resend
  falhar.
- Para ligar, basta verificar um domínio no Resend e pôr a chave e o
  remetente (`EMAIL_FROM`) no Render. Nenhum código muda.

**5. Uma tabela só, `song_invites`.** Ela guarda as duas formas de convite. Um
`CHECK` garante que cada convite é pela conta ou por link, nunca os dois. Um
convite está aberto enquanto não foi aceito, recusado nem cancelado, e não
venceu. O que já passou fica guardado como histórico, porque mostra quem
chamou quem.

## Consequências

- Ninguém é posto numa canção sem querer, e a dona consegue chamar qualquer
  pessoa do Compoze.
- Convidar e aceitar precisam de rede: o convite só existe depois que o
  servidor sabe dele (como remover coautor, ADR 0005).
- Um link vazado dá acesso a quem o tiver, por isso vale uma vez e vence em 7
  dias. A dona pode cancelar o link na lista "Esperando resposta".
- A busca por pessoas expõe nome e @ de qualquer conta para quem está logado.
  Isso já acontecia no perfil público (`/users/{username}`). E-mail e posição
  continuam fora.
- Ainda não há notificação fora do app. A pessoa vê o convite ao abrir a Mesa.
  Notificações por push ficam para quando houver o app nas lojas.
