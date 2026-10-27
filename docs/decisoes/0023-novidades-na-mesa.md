# 0023 · Novidades na Mesa

- Status: aceita
- Data: 2026-10-27
- Relacionadas: [0013](0013-seguir-e-mural.md) (seguir e mural),
  [0014](0014-conversas-ao-vivo.md) (conversas), [0016](0016-avisos-por-push.md)
  (push), [0010](0010-convites.md) (convites), [0018](0018-apoio-por-pix.md) (PIX)

## Contexto

O Ryan pediu (2026-10-27) "um campo de notificações visível nessa primeira
tela, onde mostre as mensagens que o usuário recebeu, os comentários que teve
em seus posts, e outras coisas pertinentes, assim como em uma rede social". Até
aqui, o que acontecia com a pessoa só aparecia espalhado: o número em
Conversas, os convites no alto da Mesa e o push, que some depois de tocado.
Comentário e curtida não chegavam a lugar nenhum.

## Decisão

**1. Montadas na hora, sem tabela de notificações.** `GET /notifications`
junta, com um `UNION ALL`, o que já está gravado: a mensagem mais nova de outra
pessoa em cada conversa, comentários e curtidas nas minhas publicações, quem
começou a me seguir, convites pela conta esperando resposta, convites que eu
mandei e foram aceitos, PIX que alguém diz ter mandado ao meu projeto e apoio
meu que a dona confirmou. Não há nada a gravar quando algo acontece, então:
descurtir, apagar um comentário ou responder um convite já tira a novidade;
quem abre a lista pela primeira vez vê o que aconteceu antes dela existir; e
nenhuma rota precisa lembrar de "criar a notificação".

**2. "Nova" é o que chegou depois da última olhada.** A tabela
`notification_marks` guarda, por pessoa, até quando ela já viu
(`PUT /notifications/seen`). Fica fora de `users` para não mexer no
`updated_at` da conta, que a sincronização usa. Mensagem é exceção: ela conta
como nova enquanto a conversa tem mensagem não lida (`last_read_at`, ADR 0014),
como no contador de Conversas, porque se lê na conversa e não na lista.

**3. Marcar como visto ao sair da tela.** A Mesa e a tela de Novidades marcam
tudo como visto quando a pessoa sai delas, não ao abrir: enquanto olha, o
destaque fica; na próxima visita, some. É o comportamento das redes sociais.

**4. Onde aparece.** Na Mesa, logo abaixo da saudação (e dos convites), as
cinco mais novas, com "Ver todas". No menu, "Novidades" em Gente com o número
de novas; no celular, um sino na barra de cima. A tela `/novidades` pagina por
data (`before` = `at` do último item). Cada novidade leva a um lugar: conversa,
publicação (tela nova `/posts/:id`, com os comentários abertos), perfil,
canção, projeto ou apoio.

**5. Push de comentário.** Comentário na minha publicação agora também vira
push (mesma lógica do ADR 0016, `tag` por publicação). Curtida não: seria
barulho demais para o celular, e ela já aparece nas novidades.

**6. Atualização.** A lista relê a cada minuto com o app aberto, e na hora
quando chega ou é lida uma mensagem pelo fluxo ao vivo. Não há evento ao vivo
novo: o APK antigo não conhece tipos novos de evento e trataria qualquer um
como mensagem.

## Consequências

- O custo é uma consulta com oito partes a cada leitura. Cada parte usa um
  índice que já existia (autora do post, seguido, convidada, membros da
  conversa, projeto). No volume do Compoze, é pouco; se um dia pesar, a mesma
  rota pode passar a ler de uma tabela alimentada por gatilhos, sem mudar o
  contrato.
- Curtidas não se agrupam ("Bia e mais 3 curtiram"): uma linha por curtida.
  Dá para agrupar depois, no mesmo lugar.
- Mesa e Novidades exigem rede, como o resto da parte social (ADR 0005).
