# Funcionalidades futuras

O que ainda não existe, por que não existe agora e o que é preciso para
existir. Nada aqui está decidido em definitivo: cada item vira um ADR quando
for feito, como todo o resto.

Uma regra atravessa a lista: **até aqui, nada no Compoze custa dinheiro para
manter.** Vários itens abaixo dependem justamente de pagar alguma coisa
(conta em loja, domínio, armazenamento, plano pago), e por isso esperam uma
decisão do dono do projeto.

## Situação por item

| Item | Situação | Depende de |
| --- | --- | --- |
| [E-mail dos convites pelo Gmail](#e-mail-dos-convites) | Código pronto, desligado | Senha de app do Gmail no Render (grátis) |
| ["Esqueci a senha" por e-mail](#esqueci-a-senha-por-e-mail) | Não começado | E-mail ligado |
| [Aparecer no mapa](#aparecer-no-mapa) | API pronta, falta a tela | Só trabalho |
| [Google Play Store](#lojas-de-aplicativos) | Não começado | Conta de desenvolvedor (US$ 25, uma vez) |
| [App Store (iPhone)](#lojas-de-aplicativos) | Não começado | Conta Apple (US$ 99/ano) e um Mac para compilar |
| [Assinaturas Free, Plus e Pro](#assinaturas-free-plus-e-pro) | Proposta, não decidida | Decisão de produto; meio de pagamento |
| [Mercado Pago](#mercado-pago) | Não começado | Conta de vendedor; decisão sobre taxa |
| [Armazenamento de arquivos (R2/S3)](#armazenamento-de-arquivos) | Não começado | Cartão de crédito; volume que justifique |
| [Sem espera ao abrir (API sempre ligada)](#sem-espera-ao-abrir) | Não começado | Plano pago no Render e no Neon |
| [Domínio próprio](#domínio-próprio) | Não começado | ~R$ 40/ano |
| [Outras ideias](#outras-ideias) | Anotadas | — |

## E-mail dos convites

O envio do link de convite por e-mail já está escrito
([ADR 0010](../decisoes/0010-convites.md),
[ADR 0017](../decisoes/0017-email-por-smtp.md)). Há dois caminhos:

- **Gmail, sem domínio (recomendado agora):** criar uma senha de app no Google
  e pôr `SMTP_USER` e `SMTP_PASS` no Render. Grátis, até umas 500 mensagens
  por dia; quem recebe vê o endereço do Gmail como remetente. Passo a passo em
  [deploy.md](../backend/deploy.md#pelo-gmail-sem-domínio-adr-0017).
- **Resend, com domínio próprio:** remetente com o nome do Compoze. Pede o
  domínio (abaixo).

Assim que um dos dois estiver ligado, o campo de e-mail aparece sozinho no
diálogo de convite.

## "Esqueci a senha" por e-mail

Hoje, quem esquece a senha só a troca se ainda estiver logado em algum
aparelho (Ajustes → Senha, [ADR 0019](../decisoes/0019-senha-nova-sem-a-atual.md)).
Com o e-mail ligado, o próximo passo é o fluxo clássico: pedir o link na tela
de entrada, receber um token de uso único por e-mail, escolher a senha nova.
Junto, vale avisar por e-mail a cada troca de senha e verificar o e-mail no
cadastro. O [ADR 0006](../decisoes/0006-autenticacao-propria.md) lista também
entrar com Google e Apple e uma lista de sessões ativas para revogar; nessa
hora o Better Auth volta a ser avaliado.

## Aparecer no mapa

A tela do mapa e a rota `GET /map/people` existem, e a API já aceita
`show_on_map`, `latitude` e `longitude` em `PATCH /users/me`. Falta em Ajustes:

- uma chave "Aparecer no mapa", desligada por padrão (RN11);
- um jeito de marcar a posição sem expor o endereço: pela cidade (centro da
  cidade) ou um ponto arredondado, nunca a localização exata do GPS.

## Lojas de aplicativos

Hoje o app Android é um APK baixado dos Releases do GitHub
([ADR 0011](../decisoes/0011-app-android-fora-da-loja.md)), e no iPhone o
Compoze é a PWA instalada na tela de início.

- **Google Play:** conta de desenvolvedor de US$ 25 (uma vez), ficha da loja,
  política de privacidade, revisão a cada versão. O projeto Capacitor já está
  pronto; o workflow ganharia um passo para gerar o AAB e subir na loja. Com a
  loja vêm também os itens que o ADR 0005 deixou para ela: tokens no Keystore
  do Android em vez do armazenamento do WebView e, se o caderno ficar grande,
  SQLite nativo.
- **App Store:** conta Apple de US$ 99 por ano e um Mac (ou um serviço de
  build na nuvem) para compilar e assinar. O mesmo projeto Capacitor ganha a
  pasta `ios`.
- **Atenção às assinaturas:** se o app estiver na loja e vender assinatura
  dentro dele, a Google e a Apple exigem o sistema de pagamento delas (Google
  Play Billing e In-App Purchase), com taxa de 15% a 30%. Fora da loja (web e
  APK), o pagamento pode ser outro.

## Assinaturas Free, Plus e Pro

**Proposta, não decidida e não implementada.** A ideia é nunca cobrar pelo que
faz o Compoze crescer (escrever, escrever junto, offline, social) e cobrar
pelo que custa dinheiro para manter (armazenamento de áudio e imagem,
histórico) e pelas ferramentas de quem lança.

| | Free | Plus | Pro |
| --- | --- | --- | --- |
| Preço sugerido | R$ 0 | R$ 9,90/mês ou R$ 99/ano | R$ 24,90/mês ou R$ 249/ano |
| Para quem | Quem está começando | Quem compõe com frequência | Quem lança |
| Canções, escrita junto, offline, mural, conversas | Ilimitado | Ilimitado | Ilimitado |
| Memos de voz | ~30 min no total | Ilimitado (ou ~5 GB) | Ilimitado |
| Histórico de versões | 30 dias | Completo | Completo |
| Registro com hash | 3 por mês | Ilimitado | Ilimitado |
| Projetos | 1 | Vários | Ilimitados, com apoio por PIX |
| Extras | — | Exportar PDF e cifra, capa nas canções | Certificado de registro em PDF com a divisão, estatísticas do mural, espaço de banda ou equipe |

Pontos em aberto:

- **Como cobrar.** Na web e no APK, Mercado Pago Assinaturas (o checkout é
  deles, então não precisa de domínio próprio). Para quem prefere PIX, o plano
  anual pago de uma vez é o mais simples. Na Play Store, o Google Play Billing
  é obrigatório.
- **Taxa no apoio por PIX.** Hoje o apoio vai direto para a chave da dona, sem
  taxa e sem passar pelo Compoze ([ADR 0018](../decisoes/0018-apoio-por-pix.md)).
  Cobrar uma porcentagem exigiria o dinheiro passar por um intermediário
  (Mercado Pago), o que muda o modelo; uma alternativa é deixar o apoio
  sempre sem taxa e cobrar só pelo plano.
- **Nota fiscal.** Um MEI resolve a emissão.
- **Limites técnicos.** Os planos pagos vão passar dos 0,5 GB do Neon grátis;
  a primeira receita pagaria o armazenamento de arquivos (abaixo) e um plano
  sem espera.
- **Lançamento.** Um preço de "fundador", travado para quem assinar primeiro.

Por dentro, seria preciso: uma tabela de assinaturas com o plano e a
validade, os limites conferidos na API (não só escondidos na tela), o webhook
do meio de pagamento e uma tela de plano em Ajustes.

## Mercado Pago

Dois usos possíveis, independentes:

1. **Confirmar o apoio por PIX sozinho.** Hoje a dona confere no extrato. Com
   o Mercado Pago gerando o PIX, o webhook avisaria o pagamento e o apoio
   passaria a `CONFIRMADO` sem ninguém clicar. A tabela já tem `status` e
   `txid` para isso; seria só outro caminho até o mesmo estado. Custa uma taxa
   por transação e uma conta de vendedor.
2. **Cobrar as assinaturas** (acima).

## Armazenamento de arquivos

Memos de voz e imagens ficam no próprio Postgres, porque o Cloudflare R2 e o
S3 pedem cartão ([ADR 0012](../decisoes/0012-memos-de-voz.md),
[ADR 0015](../decisoes/0015-imagens-no-postgres.md)). Funciona bem com pouca
gente, mas o Neon grátis guarda 0,5 GB e os backups crescem junto. Quando o
volume pedir, os arquivos vão para o R2 (sem custo de saída) com URLs
pré-assinadas; a troca mexe só nos módulos `memos` e `imagens` da API, e as
rotas que o app usa continuam as mesmas.

## Sem espera ao abrir

No plano grátis do Render, a API dorme depois de 15 minutos sem uso e leva
até um minuto para acordar. O app esconde isso o quanto dá (abre com a cópia
local, a fila espera, as telas de entrada acordam a API), mas a espera ainda
aparece para quem entra pela primeira vez ou depois de muito tempo.

**Por que não um "ping" para manter acordada:** a API acordada consulta o
banco o tempo todo (a fila do pg-boss), e o Neon grátis dá 100 horas de
computação por mês; ligado direto, o banco gastaria umas 180 e seria
suspenso no meio do mês. Tirar a espera de vez pede plano pago nos dois:
Render "Starter" para a API e um plano do Neon que aguente ficar acordado
(detalhes em [deploy.md](../backend/deploy.md)).

## Domínio próprio

Um domínio (`compoze.app`, `compoze.com.br` ou outro, perto de R$ 40 por ano)
melhoraria três coisas: o endereço do site e dos links de convite, o
remetente dos e-mails pelo Resend e a confiança de quem recebe um link.
Com ele, `CORS_ORIGINS`, `VITE_WEB_URL` e `WEB_URL` mudam para o domínio novo.

## Outras ideias

Anotadas ao longo dos ADRs, sem prioridade definida:

- **Exportar** a canção em PDF e em texto de cifra.
- **Carimbo de tempo externo** (RFC 3161) ou âncora pública para o hash do
  registro, para a prova valer fora do Compoze
  ([ADR 0009](../decisoes/0009-versoes-e-registro.md)).
- **Memo de voz no registro**, para o hash provar também a melodia
  ([ADR 0012](../decisoes/0012-memos-de-voz.md)).
- **Gravar em segundo plano** no Android (hoje a gravação para quando a tela
  bloqueia), com um plugin nativo.
- **Conversas em grupo**, por canção ou por projeto
  ([ADR 0014](../decisoes/0014-conversas-ao-vivo.md)).
- **Perfil fechado** (seguir com aprovação) e avisos de curtida e comentário
  ([ADR 0013](../decisoes/0013-seguir-e-mural.md)).
- **Recortar a imagem** antes de subir a foto ou a capa
  ([ADR 0015](../decisoes/0015-imagens-no-postgres.md)).
- **Sincronização por diferença** (`/sync/changes`) quando os cadernos forem
  grandes, e paginação nas listagens
  ([ADR 0008](../decisoes/0008-fila-offline-sobre-o-rest.md)).
- **Mais de uma instância da API**: o hub das conversas ao vivo passaria a
  usar Postgres `LISTEN/NOTIFY` ou Redis entre as instâncias.
