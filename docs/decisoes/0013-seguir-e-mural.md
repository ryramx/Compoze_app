# 0013 · Seguir pessoas e mural

- Status: aceita
- Data: 2026-10-25
- Relacionadas: [0005](0005-mobile-e-offline.md) (o que exige rede),
  [0010](0010-convites.md) (busca de pessoas, "como numa rede social")

## Contexto

A Fase 4 ("Gente") traz a camada social que o protótipo antigo mostrava com
dados de exemplo: seguidores, mural e conversas. Este ADR cobre os dois
primeiros (Fase 4a); conversas vêm na 4b.

## Decisão

**1. Seguir não pede aceite.** Como numa rede social aberta: qualquer conta
segue qualquer outra, e deixa de seguir quando quiser. A tabela `follows` tem
a chave `(follower_id, followed_id)` e o banco recusa seguir a si mesma.
Seguir de novo não é erro (`PUT` idempotente). O perfil
(`GET /profiles/{username}`) traz quantos seguem, quantos a pessoa segue, se
eu sigo e se ela me segue.

**2. O mural é público para quem tem conta; a canção continua privada.** Uma
publicação é texto (até 1000 caracteres) e pode citar uma canção. Só cita quem
escreve a canção, e só se ela não for privada. Quem lê vê o título e o estágio,
nunca a letra; se a canção virar privada ou for para a lixeira, a citação some
da publicação. Abrir no editor continua exigindo ser coautora.

**3. O meu mural é o que eu e quem eu sigo publicamos.** `GET /feed` pagina
por cursor: o id da publicação (UUID v7, que cresce com o tempo) do último item
visto vai em `before`. Com `author_id`, o mural de uma pessoa, que aparece no
perfil dela.

**4. Curtir e comentar.** Curtida é uma por pessoa (`PUT`/`DELETE`
`/posts/{id}/like`, que devolvem a publicação atualizada). Comentários até 500
caracteres, apagados por quem comentou ou por quem publicou.

**5. Exige rede, sem fila offline.** O ADR 0005 já previa: mural, conversas e
busca de pessoas dependem do servidor. As telas leem com `useQuery`, não pelo
store do caderno, e os botões ficam desligados sem rede. Mesmo assim publicar
e comentar mandam um id gerado no aparelho, para que um reenvio não duplique.

**6. Sugestões de quem seguir:** quem escreve canções comigo e eu ainda não
sigo. Sem algoritmo de descoberta por enquanto.

## Alternativas

- **Seguir com aprovação (perfil fechado).** Mais controle, mais telas e mais
  estado. Fica para quando alguém pedir; nada no mural expõe o caderno.
- **Mural com eventos automáticos** ("finalizou uma canção", "atualizou um
  projeto"), como o protótipo mostrava. Exigiria decidir o que vira evento sem
  a pessoa pedir; por ora só aparece o que ela publica.
- **Imagem na publicação.** Depende do storage de arquivos (uploads da Fase 4).

## Consequências

- Os dados de exemplo de mural e seguidores saíram do store; o modo demo
  ganhou as mesmas rotas, com publicações de exemplo.
- Notificações (alguém me seguiu, curtiu, comentou) ficam para quando houver
  push ou uma central no app.
