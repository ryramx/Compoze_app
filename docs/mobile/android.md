# App Android

O Compoze para Android é o mesmo `apps/web` empacotado pelo Capacitor 8
(ADR 0011). O projeto nativo fica em `apps/web/android`. O APK é publicado nos
Releases do GitHub, sem loja.

Link fixo da versão mais nova (é o que vai no portfólio):

```
https://github.com/ryramx/Compoze_app/releases/latest/download/Compoze.apk
```

## Publicar uma versão

1. GitHub → **Actions** → **Android** → **Run workflow**.
2. Em "Versão", escreva a nova versão, maior que a anterior: `0.1.0`, depois
   `0.1.1`, `0.2.0`... (três números; o segundo e o terceiro vão até 99).
3. Em uns 5 minutos o Release `v0.1.0` aparece em **Releases**, com
   `Compoze-0.1.0.apk` e `Compoze.apk` (o mesmo arquivo; o segundo é o do link
   fixo).

Também dá para criar a tag na mão (`git tag v0.1.0 && git push origin v0.1.0`).

Em cada pull request que mexe no front, o workflow gera um APK de teste (com a
chave de debug) e deixa em **Artifacts** na página da execução.

## A chave de assinatura (uma vez só)

O Android só instala uma atualização por cima se ela vier assinada com a mesma
chave. Por isso a chave é criada uma vez, guardada com cuidado e nunca entra
no repositório nem em conversa.

### 1. Criar a chave

Precisa do Java instalado (o `keytool` vem com ele). No terminal:

```bash
keytool -genkeypair -v -keystore compoze.jks -alias compoze \
  -keyalg RSA -keysize 4096 -validity 36500
```

Ele pede uma senha (guarde num gerenciador de senhas) e nome, organização
etc. (pode preencher só o nome). Sai o arquivo `compoze.jks`.

**Guarde uma cópia do `compoze.jks` e da senha fora do computador** (Google
Drive, gerenciador de senhas). Se perder, quem já instalou o app vai ter que
desinstalar para instalar a versão nova.

### 2. Transformar o arquivo em texto

O secret do GitHub só aceita texto, então o arquivo vai em base64:

- Windows (PowerShell), já copia para a área de transferência:
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("compoze.jks")) | Set-Clipboard
  ```
- macOS: `base64 -i compoze.jks | pbcopy`
- Linux ou Codespace do GitHub: `base64 -w0 compoze.jks > /tmp/chave.txt && code /tmp/chave.txt`
  abre o texto num editor; copie com Ctrl+A e Ctrl+C. Copiar direto do
  terminal costuma levar junto pedaços do prompt.

Sem Java no computador, dá para fazer os passos 1 e 2 num Codespace do
`Compoze_app` (Code → Codespaces), dentro de `apps/web/android`, onde o git
ignora arquivos `.jks`. Baixe o `compoze.jks` (botão direito → Download) e
exclua o Codespace no fim.

### 3. Cadastrar os secrets

GitHub → `Compoze_app` → **Settings** → **Secrets and variables** →
**Actions** → **New repository secret**, um de cada vez:

| Nome | Valor |
| --- | --- |
| `COMPOZE_KEYSTORE_BASE64` | o texto do passo 2 |
| `COMPOZE_KEYSTORE_PASSWORD` | a senha da chave |
| `COMPOZE_KEY_ALIAS` | `compoze` |
| `COMPOZE_KEY_PASSWORD` | a mesma senha (o `keytool` usa uma só) |

Pronto. A primeira execução publicada mostra no log, no passo "Conferir a
assinatura", a impressão digital SHA-256 do certificado. Ela deve ser a mesma
em todas as versões.

### Se a publicação falhar no passo "Chave de assinatura"

O workflow confere a chave antes de compilar e diz qual secret está errado:

- "não é um texto base64 válido" ou "não é um arquivo .jks válido": refaça o
  passo 2 e atualize `COMPOZE_KEYSTORE_BASE64` (Update no secret).
- "A senha ... não abre a chave": confira `COMPOZE_KEYSTORE_PASSWORD`.
- "não tem o alias": `COMPOZE_KEY_ALIAS` deve ser `compoze`.

## Avisos por push (Firebase)

O Android só entrega push pelo Firebase Cloud Messaging (ADR 0016). O plano
grátis (Spark) basta e não pede cartão. **Situação:** já configurado (projeto
"compoze-app", em 26/10/2026); os APKs a partir da v0.2.0 recebem push. Os
passos abaixo servem para refazer do zero. Sem estes passos o APK continua
funcionando, só sem a opção de avisos em Ajustes.

1. Em [console.firebase.google.com](https://console.firebase.google.com),
   **Adicionar projeto** → nome "Compoze" → pode desligar o Google Analytics.
2. Na página do projeto, **Adicionar app → Android**. Nome do pacote:
   `io.github.ryramx.compoze` (tem que ser exatamente este). Apelido e SHA-1
   podem ficar vazios. Baixe o `google-services.json` e pule os passos de
   SDK: o projeto já está pronto.
3. Em ⚙️ **Configurações do projeto → Contas de serviço → Gerar nova chave
   privada**. Baixa outro JSON. Este é **secreto**: dá poder de mandar push
   como o Compoze.
4. No GitHub, **Settings → Secrets and variables → Actions → New repository
   secret**: nome `GOOGLE_SERVICES_JSON`, valor o conteúdo do
   `google-services.json` (abra no bloco de notas, copie tudo).
5. No Render, `compoze-api-staging` → **Environment** → **Add environment
   variable**: `FIREBASE_SERVICE_ACCOUNT`, valor o conteúdo inteiro do JSON da
   conta de serviço. Salvar reinicia a API.
6. Publique uma versão nova do APK (seção acima). O workflow confere se o
   `google-services.json` é deste app e liga o push no build.

Nenhum dos dois arquivos vai para o repositório nem para o chat. Depois de
cadastrar, pode apagar os dois do computador: o Firebase gera outros se
precisar (a chave antiga da conta de serviço se revoga em "Contas de serviço").

## Instalar no celular

1. Abrir o link do APK no celular e baixar.
2. Tocar no arquivo baixado. Na primeira vez, o Android pede para permitir que
   o navegador (ou o app de arquivos) instale apps; permita.
3. Para atualizar, baixe o APK novo e instale por cima. Os dados ficam.
   O app avisa sozinho quando sai versão nova (ver abaixo).

O Google Play Protect pode avisar que o app não é conhecido. É o aviso padrão
para qualquer app fora da loja: "Instalar mesmo assim".

## Como o app funciona por dentro

- O build do Vite vai dentro do APK. O app abre sem rede desde a primeira vez;
  não há service worker (`lib/pwa.ts` não registra no nativo).
- O app roda na origem `https://localhost`. A API de staging libera essa
  origem no `CORS_ORIGINS` (`render.yaml`).
- Links que outras pessoas abrem (convite, canção) usam `VITE_WEB_URL`, o
  endereço do site. Ver `lib/nativo.ts`.
- O botão voltar do Android volta uma tela; na primeira, manda o app para o
  fundo (`@capacitor/app`).
- `appId`: `io.github.ryramx.compoze`. Não muda nunca mais.
- **Aviso de versão nova** (`lib/atualizacao.ts`): uma vez por dia, ao abrir,
  o app pergunta à API do GitHub qual é o último Release e compara com a
  versão instalada. Se houver mais nova, um aviso oferece "Baixar", que abre o
  link do APK no navegador do celular. Em Ajustes → Aplicativo dá para ver a
  versão instalada e procurar na hora.
- **Compartilhar para o Compoze**: o app aparece no menu "Compartilhar" do
  Android para texto. O `CompartilharPlugin.java` (plugin do próprio app,
  registrado no `MainActivity`) recebe o texto e emite o evento `recebido`;
  o `App.tsx` leva para `/compartilhar`, que cria uma canção no estágio
  "ideia" com o texto como letra (uma estrofe por bloco) e abre no editor.
  Funciona offline. A PWA instalada faz o mesmo pelo `share_target` do
  manifesto.
- **Memos de voz** (ADR 0012): gravados pelo `MediaRecorder` do WebView. O
  manifesto declara `RECORD_AUDIO`; o Capacitor pede a permissão na primeira
  gravação. A gravação para se a tela bloquear.
- Ícone e tela de abertura foram gerados do `favicon.svg` com
  `@capacitor/assets` (fundo tinta, nota em lápis vermelho; abertura clara e
  escura conforme o tema do sistema).

## Rodar no seu computador

Precisa do Android Studio (ele traz o SDK e o Java 21).

```bash
cd apps/web
VITE_API_URL=https://compoze-api-staging.onrender.com \
VITE_WEB_URL=https://compoze-web-staging.onrender.com pnpm build
pnpm exec cap sync android
pnpm exec cap open android   # abre no Android Studio; ▶ roda no emulador
```

`cap sync` copia o build para dentro do projeto Android e regenera os
arquivos marcados "DO NOT EDIT". Rode depois de cada build.
