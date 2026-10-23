# 0011 · App Android pelo Capacitor, distribuído fora da loja

- Status: aceita
- Data: 2026-10-23
- Relacionadas: [0005](0005-mobile-e-offline.md) (mobile e offline; previa
  Capacitor na Fase 3)

## Contexto

O ADR 0005 previa o Compoze nas lojas pelo Capacitor na Fase 3. As lojas
cobram: a Google Play, US$ 25 uma vez; a Apple, US$ 99 por ano. Por enquanto
o Compoze não tem usuários que justifiquem o gasto, e o objetivo imediato é
outro: ter o app para baixar a partir do portfólio do Ryan.

A PWA (Fase 2c) já instala no Android e no iPhone e abre sem internet. Faltava
um app de verdade, um arquivo que a pessoa baixa e instala.

## Decisão

**1. Capacitor sobre o mesmo `apps/web`.** O projeto Android fica em
`apps/web/android` e é gerado pelo Capacitor 8. O app carrega o build do
Vite de dentro do APK, então abre sem rede desde a primeira vez, sem service
worker.

**2. Distribuição pelo GitHub Releases, sem loja.** O APK é publicado nos
Releases do `Compoze_app`. O arquivo `Compoze.apk` tem sempre o mesmo nome,
então o link `.../releases/latest/download/Compoze.apk` aponta sempre para a
versão mais nova. É o link do portfólio. Quem instala precisa permitir "instalar
apps desconhecidos"; o próprio Android pede isso na hora.

**3. Assinatura com uma chave só, guardada nos secrets do GitHub.** O Android
só instala uma atualização por cima se ela vier assinada com a mesma chave.
A chave (`.jks`) é criada uma vez pelo Ryan, fica guardada com ele e nos
secrets `COMPOZE_KEYSTORE_*`, e nunca entra no repositório. O CI decodifica
a chave num arquivo temporário, assina e apaga.

**4. Identidade do app: `io.github.ryramx.compoze`.** Sem domínio próprio,
o `appId` usa o domínio do GitHub do dono. Ele não muda nunca mais: outro
`appId` é outro app para o Android e para as lojas.

**5. Versão pela tag.** `v1.2.3` vira `versionName 1.2.3` e
`versionCode 10203`. O `versionCode` precisa crescer a cada versão, senão o
Android recusa a atualização.

**6. O APK fala com o staging.** É o único backend que existe. Para a API,
o app é a origem `https://localhost`, que entrou no `CORS_ORIGINS`. Os links
que outras pessoas abrem (convite, canção) usam `VITE_WEB_URL`, o endereço do
site, e não a origem do app.

## Alternativas

- **Google Play.** US$ 25 e revisão a cada versão. Fica para quando houver
  gente usando; o mesmo projeto Android serve, trocando o APK por AAB.
- **iPhone.** Sem os US$ 99 da Apple não há como distribuir app nativo. No
  iPhone, o caminho continua sendo a PWA.
- **TWA (Trusted Web Activity / Bubblewrap).** Empacota o site como app, mas
  exige o site num domínio com `assetlinks.json` e depende da rede para abrir
  a primeira vez. O Capacitor era o plano desde o ADR 0005 e abre o app sem
  rede.
- **APK no próprio repositório do portfólio.** Cada versão incharia o
  histórico do git do portfólio. O Releases guarda as versões fora do git.

## Consequências

- O `Compoze_app` precisa ser público para o link de download funcionar para
  quem não tem acesso ao repositório (arquivos de Releases de repositório
  privado só baixam para quem tem acesso).
- Perder a chave significa que quem já instalou precisa desinstalar e
  instalar de novo, perdendo o que estiver só no aparelho. A chave tem cópia
  de segurança fora do GitHub.
- Atualizar não é automático: a pessoa baixa o APK novo. Um aviso "há versão
  nova" no app fica para depois.
- Tokens continuam no `localStorage` do WebView. Levar para o Keystore do
  Android (ADR 0005) fica para quando o app for para a loja.
- Abrir links do Compoze direto no app (App Links) exige domínio próprio; por
  enquanto eles abrem no navegador.
