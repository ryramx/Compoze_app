# @compoze/documento

O formato do documento Yjs de cada canção, compartilhado entre o editor
(`apps/web`) e o servidor (`apps/api`). Ver ADR 0007.

```
Y.Doc  (nome "song:<id>")
└── "blocos": Y.Array<Y.Map>
      id         string   UUID v7, gerado por quem cria o bloco
      type       "SECTION" | "LYRIC" | "CHORD" | "NOTE"
      label      string | null   nome da seção; última escrita vence
      content    Y.Text          letra, cifra ou nota; edições se fundem
      author_id  string | null   quem criou o bloco
```

Só as funções daqui mexem na estrutura. Tela e servidor nunca acessam o
`Y.Map` diretamente: assim os dois lados não divergem sobre o formato.
