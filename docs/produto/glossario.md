# Glossário

As palavras do Compoze, na interface e no código. O código é escrito em
português, então muitos nomes de arquivo e função são as próprias palavras
abaixo.

| Termo | O que é | No código |
| --- | --- | --- |
| **Caderno** | Tudo o que a pessoa tem: canções, pastas, projetos e as pessoas que aparecem nelas. Também o nome do design system | `compozeStore`, `copiaLocal` |
| **Mesa** | A tela inicial | `pages/app/Dashboard.tsx` |
| **Canção / obra** | A unidade do caderno: título, ficha técnica, blocos, coautores | `songs`, `Song` |
| **Folha** | A área do editor onde ficam os blocos | `data-folha` |
| **Bloco** | Um pedaço da canção: seção, cifra, verso ou nota | `song_blocks`, `SECTION`, `CHORD`, `LYRIC`, `NOTE` |
| **Seção** | Bloco que dá nome a uma parte (Verso, Refrão, Ponte) | `section` |
| **Cifra** | Linha de acordes, em vermelho, acima do verso | `chord-line` |
| **Nota** | Anotação para quem escreve junto, que não é letra | `note` |
| **Marginália** | O nome de quem escreveu, na margem, e o fio na cor dela | `Bloco.tsx`, `lib/autoria.ts` |
| **Cor de autor** | Uma de cinco cores dessaturadas, fixa por pessoa | `autor-1…5`, `corDoAutor` |
| **Ficha técnica** | A margem direita do editor: estágio, tom, compasso, andamento, pasta, visibilidade, tags, coautoria | `FichaTecnica.tsx` |
| **Estágio** | Onde a obra está: Ideia, Escrita, Revisão, Finalizada, Registrada, Gravada | `status`, `ESTAGIOS` |
| **Esteira** | A fileira de estágios na Mesa, com quantas obras há em cada | `Dashboard.tsx` |
| **Coautoria / divisão** | Quanto da obra é de cada pessoa, em percentual | `song_collaborators.contribution_percent` |
| **Fechar a divisão** | Confirmar que a divisão soma 100% (RN05) | `contributions_confirmed` |
| **Dona** | Quem criou a canção ou o projeto. O texto usa o feminino ("a dona") por convenção, para qualquer pessoa | `owner_id`, `OWNER` |
| **Papel** | O que um coautor faz: Composição, Letra, Arranjo e instrumentos, Produção, Só leitura | `COMPOSER`, `LYRICIST`, `MUSICIAN`, `PRODUCER`, `VIEWER` |
| **Convite** | Chamado para escrever uma canção, pela conta ou por link | `song_invites`, `Convidar.tsx` |
| **Versão** | Retrato imutável da canção, com hash | `song_versions` |
| **Registro** | A versão que afirma a autoria; exige a divisão fechada | `POST /songs/{id}/register`, `REGISTRO` |
| **Memo** | Gravação de voz presa a uma canção | `song_memos`, `Memos.tsx` |
| **Pasta** | Organização opcional, com subpastas | `folders` |
| **Projeto** | Single, EP ou álbum que reúne canções como faixas | `projects`, `project_songs` |
| **Fase** (do projeto) | Planejamento, Produção, Mixagem, Lançado | `FASES_DE_PROJETO` |
| **Capa tipográfica** | A capa feita de nome, ano e pauta para projeto sem imagem | `Capa.tsx` |
| **Apoio** | Uma contribuição por PIX a um projeto | `project_contributions` |
| **Lixeira** | Onde a canção excluída espera 30 dias | `deleted_at`, `Trash.tsx` |
| **Mural** | Publicações de quem a pessoa segue | `posts`, `Feed.tsx` |
| **Na roda** | As três publicações mais novas, na Mesa | `["mural","roda"]` |
| **Monograma** | As iniciais em serifa itálica, no lugar da foto | `Monograma.tsx` |
| **Trilho** | O menu lateral | `AppLayout.tsx` |
| **Lápis** | O vermelho, único acento de cor | `lapis` |
| **Papel / Noite** | Os temas claro e escuro | `lib/tema.ts` |
| **Fila** | As mudanças feitas offline, esperando para subir | `lib/fila.ts` |
| **Cópia local** | O caderno guardado no aparelho | `lib/copiaLocal.ts` |
| **Documento** | O conteúdo Yjs de uma canção | `packages/documento`, `song_documents` |
| **Ao vivo** | O fluxo de eventos do servidor (mensagens, leituras) | `GET /events`, `lib/aoVivo.ts` |
| **Avisos** | Notificações do sistema (push) e os toasts do app | `lib/avisos.ts`, `avisador.ts` |
| **Modo demonstração** | O app rodando sem servidor, com dados de exemplo | `VITE_API_URL=demo`, `demo/` |
| **RN05, RN07, RN08, RN11** | Regras de negócio com código, do PRD original | ver [visão geral](visao-geral.md#regras-de-negócio) |
| **ADR** | Registro de decisão de arquitetura | [decisoes/](../decisoes/README.md) |
