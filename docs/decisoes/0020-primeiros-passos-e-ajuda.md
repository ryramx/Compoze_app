# 0020 — Primeiros passos e ajuda de cada tela

- **Status:** Aceita
- **Data:** 2026-10-26

## Contexto

Quem entra no Compoze pela primeira vez cai na Mesa sem saber para que servem
Canções, Pastas, Projetos, o Mural ou a divisão de coautoria. Ryan pediu um
tutorial de primeiro acesso, mostrando para que o app serve, e um botão de
ajuda nas telas.

## Decisão

1. **Primeiros passos:** sete folhas num diálogo (tela inteira no celular,
   página no meio do computador): boas-vindas, a folha em blocos, parceria e
   coautoria, estágios, organizar, gente e onde fica a ajuda. Cada folha se
   explica com um pedaço do próprio produto (cifra, verso, marginália de
   autoria, marcador de estágio), como a tela de entrada, e não com ilustração.
   Anda com Próxima/Voltar, setas do teclado e deslize no celular.
2. **Abre sozinho uma vez por conta, neste aparelho.** O "já viu" fica no
   `localStorage` (`compoze.primeirosPassos.<id>`). Fechar de qualquer jeito
   (Pular, Esc, tocar fora, Começar) conta como visto. Não abre em
   `/convite`, `/apoiar` e `/compartilhar`: quem chegou por esses links veio
   fazer uma coisa só, e o tour espera a próxima tela.
3. **Ajuda da tela:** um painel que entra pela direita com o que a tela aberta
   faz, item por item, e links para a ajuda das outras telas. Abre pelo botão
   de ajuda (ícone no topo, no celular; "Ajuda desta tela" no menu, no
   computador), pela tecla `?` fora de campos de texto e pela busca (⌘K).
4. **Um lugar só para o texto:** `apps/web/src/lib/ajuda.ts` guarda os tópicos
   e o mapa rota → tópico. Assim a ajuda de uma tela pode ser lida de outra e
   muda num lugar só quando um rótulo muda.
5. Reabrir: Ajustes → Ajuda, o rodapé do painel de ajuda e a busca.

## Alternativas

- **Guardar o "já viu" no servidor** (coluna em `users`). Evitaria rever o tour
  em cada aparelho novo, mas pede migração, rota e contrato para algo que se
  pula com um toque. Fica para quando houver preferências da conta no servidor.
- **Tour com balões apontando para os botões** (coach marks). Quebra com o
  layout que muda entre celular e computador, com o editor que esconde as abas
  e com telas que carregam depois; e tem cara de produto genérico.
- **Botão de ajuda dentro de cada página.** Várias telas não usam o mesmo
  cabeçalho (Mesa, Perfil, editor, projeto); um botão no chrome do app fica no
  mesmo lugar em todas.

## Consequências

- Quem usa o app em dois aparelhos vê o tour uma vez em cada um.
- Mudou o nome de um botão ou uma tela nova? Atualize `lib/ajuda.ts`; o teste
  `ajuda.test.ts` cobre o mapa de rotas e exige ajuda para toda tela do menu.
