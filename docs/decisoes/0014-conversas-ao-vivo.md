# 0014 · Conversas a dois, com entrega ao vivo por SSE

- Status: aceita
- Data: 2026-10-25
- Relacionadas: [0013](0013-seguir-e-mural.md) (seguir e mural),
  [0005](0005-mobile-e-offline.md) (o que exige rede),
  [0007](0007-documento-yjs-da-cancao.md) (WebSocket do editor)

## Contexto

A tela de Conversas existia com dados de exemplo. A Fase 4 pede conversas de
verdade e em tempo real: quem compõe a dois combina a sessão, manda "subi a
base" e espera resposta na hora.

## Decisão

**1. Conversa a dois, uma por dupla.** `conversations` tem `direct_key`
único (os dois ids em ordem), então abrir a conversa dos dois lados ao mesmo
tempo dá na mesma. Os membros ficam em `conversation_members`, que já serve
para grupos quando vierem. Qualquer conta escreve para qualquer outra, como
no mural; quem não está na conversa recebe 404.

**2. Não lidas por "lido até".** Cada membro guarda `last_read_at`; não lida
é mensagem da outra pessoa depois disso. Abrir a conversa marca como lida
(`POST /conversations/{id}/read`), e escrever também.

**3. Ao vivo por Server-Sent Events, não WebSocket.** `GET /events` fica
aberto e manda `message` e `read` para todos os aparelhos da pessoa. SSE é
HTTP comum: passa pelo CORS e pelos proxies como qualquer rota, reconecta
fácil, e o servidor só precisa empurrar (enviar continua sendo `POST`). O app
abre com `fetch` em vez de `EventSource`, para mandar o token no cabeçalho.
Um comentário a cada 25 s mantém a conexão viva no proxy do Render.

O WebSocket do editor (Hocuspocus, ADR 0007) é outro caso: lá o tráfego é
nos dois sentidos e binário.

**4. Na memória do processo, por enquanto.** Quem está ouvindo fica num mapa
em memória (`lib/aoVivo.ts` da API). O staging roda uma instância; com mais
de uma, o mesmo `avisar` passa a publicar por `LISTEN/NOTIFY` do Postgres.

**5. Exige rede (ADR 0005).** Sem fila offline. Cada mensagem leva um id
gerado no aparelho: reenviar depois de uma queda não duplica. Ao reconectar,
o app relê a lista e as conversas, para cobrir o que chegou com a conexão
caída.

## Alternativas

- **Polling** (reler a cada poucos segundos): mais simples, mas atrasa a
  mensagem e mantém a API do Render acordada à toa.
- **WebSocket próprio** (`@fastify/websocket`): resolveria, mas seria um
  segundo protocolo de tempo real para manter, sem ganho para este caso.
- **Serviço de terceiros** (Pusher, Ably): conta, chave e custo a mais.

## Consequências

- No Render grátis, a API dorme sem tráfego; quem está com o app aberto
  mantém o fluxo, então ela fica acordada enquanto houver alguém conversando.
- Notificação com o app fechado depende de push (Firebase), que fica para
  quando houver conta.
- Bloquear ou silenciar alguém ainda não existe.
