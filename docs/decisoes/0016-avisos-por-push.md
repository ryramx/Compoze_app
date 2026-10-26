# 0016 · Avisos fora do app por Web Push, com chaves geradas pelo servidor

- Status: aceita
- Data: 2026-10-25
- Relacionadas: [0014](0014-conversas-ao-vivo.md) (entrega ao vivo com o app
  aberto), [0011](0011-app-android-fora-da-loja.md) (app Android),
  [0005](0005-mobile-e-offline.md) (previa push na Fase 3)

## Contexto

Mensagem nova e convite para canção só apareciam com o Compoze aberto
(ADR 0014). A Fase 3 previa notificações push. Ryan pediu (2026-10-25) para
resolver as pendências por partes, sem pagar loja.

Há dois caminhos de push. O navegador e a PWA instalada usam **Web Push**, um
padrão aberto: o servidor assina cada envio com um par de chaves VAPID e não
precisa de conta em lugar nenhum. O app Android (WebView do Capacitor) não tem
Web Push; lá o único caminho é o **Firebase Cloud Messaging**, que pede um
projeto no Firebase (grátis) criado pelo Ryan.

## Decisão

**1. Primeiro o Web Push, sem conta.** Chrome, Edge, Firefox e Android pelo
navegador recebem já. No iPhone, só com o Compoze instalado na tela de início
(iOS 16.4 ou mais novo). O FCM para o APK vem depois, sobre a mesma tabela
(`kind = FCM`) e o mesmo avisador.

**2. O servidor gera o par VAPID na primeira vez e guarda em `server_keys`.**
Nada para configurar no Render. Trocar o par invalidaria todas as inscrições,
por isso ele não pode nascer a cada deploy; no banco, sobrevive a qualquer
deploy e a mais de uma instância (a segunda lê o que a primeira gravou).

**3. Uma inscrição por aparelho, em `push_subscriptions`.** `PUT` com o que
`PushManager.subscribe()` devolve; o mesmo endpoint em outra conta passa para
ela. O app manda a inscrição de novo a cada abertura (o navegador pode
trocá-la). Sair da conta desinscreve o aparelho, para quem entrar depois não
receber avisos de quem saiu. Resposta 404 ou 410 do serviço de push apaga a
inscrição.

**4. Push só para quem não está com o app aberto.** Quem tem um fluxo
`/events` aberto já viu a mensagem chegar ao vivo. Consequência aceita: com o
Compoze aberto no computador, o celular não apita.

*Ajuste em 2026-10-26:* "aberto" passou a ser "na tela". O fluxo `/events`
fecha quando o app vai para segundo plano (`visibilitychange`) e reabre ao
voltar. Antes, no celular, o navegador mantinha a conexão viva por minutos
depois de a pessoa sair do app, o servidor achava que ela estava olhando e o
push nunca saía.

**5. O envio nunca segura a rota.** Mensagem e convite respondem na hora; o
aviso sai depois, e falha só vira log. Avisos da mesma conversa usam o mesmo
tópico (hash da tag): o serviço de push guarda só o último para quem está sem
rede, e o sistema mostra um aviso por conversa.

**6. O que avisa, por enquanto:** mensagem nova (título = quem escreveu, texto
= começo da mensagem, abre a conversa) e convite pela conta (abre a Mesa, onde
se aceita). Curtida e comentário não avisam: seriam barulho antes de haver
uma tela de preferências. *Desde 2026-10-26, a pedido do Ryan:* nova pessoa
seguindo também avisa (abre o perfil de quem seguiu; seguir de novo não
repete o aviso).

**7. Quando pedir a permissão.** *Mudança em 2026-10-26, a pedido do Ryan:*
o app pede a permissão de avisos assim que abre, já dentro da conta (no
`AppLayout`), uma vez por abertura. Não pede de novo quem desligou em Ajustes
(fica guardado no aparelho) nem quem já respondeu ao pedido. No APK, o pedido
é o do Android. Safari e Firefox só mostram o pedido depois de um toque; ali
aparece uma nota com o botão "Ligar avisos". Antes, ligar ficava só em
Ajustes → Avisos, e quase ninguém chegava lá.

## Alternativas

- **Chaves VAPID por variável de ambiente.** O padrão da biblioteca, mas
  exigiria gerar e colar segredo no Render, e um erro de cópia derrubaria todas
  as inscrições. As variáveis podem entrar depois, por cima do banco.
- **Serviço pronto (OneSignal, Firebase também na web).** Uma conta a mais e
  dados de uso indo para terceiros, para algo que o padrão resolve.
- **Fila do pg-boss para os envios.** Daria novas tentativas, mas o serviço de
  push já guarda o aviso por 24 h (TTL) para aparelho sem rede. Fica para
  quando houver volume.

**7. No Android, Firebase pela API HTTP v1, sem o SDK `firebase-admin`.** São
duas chamadas (o token de acesso, assinado com a conta de serviço pelo `jose`
que a API já usa, e o envio). A conta vem de `FIREBASE_SERVICE_ACCOUNT`; o
APK só liga o push quando foi feito com o `google-services.json`
(`VITE_PUSH_NATIVO`), porque chamar o Firebase sem ele derruba o app. O app
cria o canal "Mensagens e convites", e o aviso usa um ícone de um traço só,
como o Android pede.

## Consequências

- Push precisa do service worker: só funciona no build (`vite build` +
  `preview`) e em produção, não no `pnpm dev`, como a PWA.
- No modo demonstração não há push (não há servidor).
- A chave privada VAPID mora no banco, junto dos hashes de senha. Quem tem o
  banco poderia mandar push como o Compoze; nada além disso.
