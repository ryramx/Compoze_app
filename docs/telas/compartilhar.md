# Compartilhar para o Compoze

`/compartilhar?title=&text=&url=` · `apps/web/src/pages/app/Compartilhar.tsx`,
`lib/compartilhar.ts`, `lib/nativo.ts`,
`apps/web/android/.../CompartilharPlugin.java`

## Para que serve

Guardar uma ideia que nasceu em outro app. Uma letra escrita nas notas do
celular, um verso mandado no WhatsApp: no menu **Compartilhar** do Android,
escolhe-se **Compoze** e o texto vira uma canção nova no estágio **Ideia**,
aberta no editor.

Não é uma tela que se visita: ela mostra "Guardando a ideia…" por um instante
e leva ao editor.

## Como foi feita

- **No APK**, o plugin nativo `CompartilharPlugin.java` (do próprio app,
  registrado no `MainActivity`) recebe o texto do Android e emite o evento
  `recebido`; a casca (`App.tsx`) leva para `/compartilhar`.
- **Na PWA instalada**, o manifesto declara `share_target`, e o Android manda
  o texto direto para o mesmo endereço.
- `lerCompartilhado` (`lib/compartilhar.ts`) separa o título (se veio) e
  quebra o texto em estrofes, uma por bloco de verso. `createSong` cria a
  canção com essas estrofes e abre o editor com `replace`, para que voltar não
  crie outra.
- Sem sessão, o guarda de rota guarda o endereço com o texto e devolve depois
  do login.

## Decisões e porquês

| Decisão | Por quê |
| --- | --- |
| Entra como Ideia | É o que uma ideia de fora é: ainda não é escrita; a esteira da Mesa mostra que ela está lá esperando |
| Funciona offline | É justamente quando a ideia aparece no ônibus, sem sinal, que o atalho mais importa ([ADR 0008](../decisoes/0008-fila-offline-sobre-o-rest.md)) |
| Plugin próprio em vez de uma biblioteca | O plugin é pequeno, faz só isto e não traz dependência a mais para o APK ([ADR 0011](../decisoes/0011-app-android-fora-da-loja.md)) |
