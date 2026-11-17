# Operações

Um negócio digital de uma pessoa só. O que precisa rodar todo dia é pouco; o risco está em o fundador ser o único ponto de falha.

## O ciclo de cada dia (★ = o cliente vê)

1. Conferir o `/health` da API e o painel do Render/Neon (2 min).
2. ★ Responder mensagens e e-mails de suporte (meta: até 24 h).
3. ★ Conferir pagamentos do dia no Mercado Pago; folhas pagas e não geradas viram prioridade.
4. ★ Publicar o conteúdo do dia (calendário em [marketing.md](marketing.md)).
5. Ler os três números (canções com 2+ coautores, % de canções finalizadas com folha paga, convites aceitos).
6. Trabalho de produto (o resto do tempo).

## Fornecedores

| o quê | fornecedor | preço público | observação |
| --- | --- | --- | --- |
| Pagamento (PIX e cartão) | **Mercado Pago** (Checkout) | PIX 0,99%, cartão 4,98% na hora ([fonte](https://www.mercadopago.com.br/ferramentas-para-vender/check-out)) | precisa de conta de vendedor; o webhook confirma o pagamento e libera a folha |
| | Alternativas: Asaas, Pagar.me, Efí (Gerencianet) | ver páginas de cada um | conferir tarifa de PIX; algumas cobram valor fixo por PIX, o que pesa em R$ 14,90 |
| API | **Render** | grátis hoje; Starter US$ 7/mês | o grátis dorme e acorda devagar; para cobrar, a espera de ~30 s no primeiro acesso atrapalha a venda |
| Banco | **Neon** | grátis até 0,5 GB | a folha ocupa pouco; memos e imagens é que enchem |
| Push | Firebase | grátis | já configurado |
| App na loja | **Google Play Console** | US$ 25, uma vez | vender a folha **dentro** do app da loja exige Google Play Billing (15%); vender pela web/link evita a taxa, conferir as regras atuais da Play para conteúdo digital |
| Domínio | Registro.br | R$ 40/ano (.com.br) | necessário para e-mail próprio e para enviar convites por e-mail |
| E-mail | Gmail com senha de app (já usado) / Resend com domínio | grátis no volume inicial | |

Nenhum custo real diferiu do que está em [numbers.json](numbers.json); o CFO não precisa rodar de novo. Ponto aberto: **cotação da tarifa de PIX** na conta do Mercado Pago (pode ser diferente do Checkout público).

## Pessoas

| papel | quem | horas | custo |
| --- | --- | --- | --- |
| Produto, código, suporte, marketing | Ryan | fim de semana + noites (estimativa: 10–15 h/semana) | R$ 0 no modelo (o tempo do fundador **não** é pago) |
| Contador | a contratar quando faturar | — | MEI dispensa contador obrigatório; consultoria pontual: orçar |

Primeiro mês (lento): 70% do tempo em produto (a folha, o aceite pelo link), 30% em comunidades. Depois do lançamento: 50/50.

## Rotinas (uma página cada)

**Gerar e entregar uma folha**
1. Coautor clica "Gerar a folha desta canção" na canção finalizada.
2. O app confere: divisão em 100%, todos os coautores com aceite. Se faltar alguém, mostra quem e reenvia o link.
3. Pagamento (PIX/cartão) pelo Mercado Pago.
4. Webhook confirma → a API gera o PDF, grava o código de integridade e marca a versão como imutável.
5. Todos os coautores recebem o PDF (push + e-mail).
6. Se o webhook falhar em 10 min: conferir manualmente no Mercado Pago e liberar.

**Reclamação**
1. Responder em até 24 h, em nome próprio.
2. Se for a folha recusada por associação/editora/distribuidora: devolver na hora (garantia) e pedir, se a pessoa quiser, o motivo da recusa.
3. Registrar o motivo numa planilha; três recusas pelo mesmo motivo → mudar a folha.

**Revisão semanal (segunda, 30 min)**
1. Os três números.
2. Pagamentos vs. folhas geradas (bater).
3. Uso do Neon (GB) e horas do Render.
4. Ler todas as mensagens de suporte da semana.
5. Escolher uma coisa para mudar.

## Ferramentas

Mercado Pago (pagamento), Render + Neon + Firebase (já em uso), GitHub (código e releases do APK), uma planilha (suporte e recusas), o próprio Compoze para notas internas. Nenhuma ferramenta nova paga.

## Licenças, registro e impostos (Brasil)

- [ ] **MEI** pelo [Portal do Empreendedor](https://www.gov.br/empresas-e-negocios/pt-br/empreendedor). Conferir se a atividade de software/serviço digital é permitida no MEI (algumas atividades de TI não são) e o limite anual de faturamento. **Confirmar com um contador.**
- [ ] **Nota fiscal de serviço** (NFS-e nacional para MEI) a cada venda, ou conforme a regra da prefeitura.
- [ ] **Termos de uso e política de privacidade** de acordo com a **LGPD** (letras inéditas são dado pessoal sensível para o usuário; dizer onde ficam, quem acessa e como apagar). Referência: [ANPD](https://www.gov.br/anpd).
- [ ] **Código de Defesa do Consumidor:** direito de arrependimento de 7 dias em compras pela internet (a garantia de 60 dias já cobre).
- [ ] **Marca no INPI** (ver [brand.md](brand.md)).
- Regras mudam e variam por cidade. Não é aconselhamento jurídico.

## Riscos

| risco | chance | impacto | plano |
| --- | --- | --- | --- |
| Associações dizem que não aceitam a folha | média | alto | publicar a resposta mesmo assim; reposicionar como "acordo entre coautores" (que vale entre as partes) e manter a garantia |
| Ryan fica sem tempo (trabalho, faculdade, saúde) | alta | alto | o grátis continua rodando sozinho; congelar features, manter só suporte e pagamentos |
| API dorme no Render grátis na hora da compra | alta | médio | pagar o Starter (R$ 40) só quando houver vendas |
| Neon passa de 0,5 GB | média | médio | limitar memos no grátis; mover áudio para o R2 quando houver cartão |
| Webhook do pagamento falha | baixa | médio | rotina manual de 10 min |
| Songcraft lança divisão em português | baixa | alto | o fosso é local: PIX, R$, guia de registro BR, comunidade |
| Cifra Club lança modo "compor" | baixa | alto | foco no que eles não fazem: divisão e aceite |
| Vazamento de letra inédita | baixa | muito alto | revisão de acesso (só coautores), logs, plano de aviso em 72 h (LGPD) |
| Parceiro contesta a folha depois | média | médio | folha imutável; mudança só por nova versão aceita por todos |
| Mês fraco de vendas | alta | baixo | custo fixo baixo; o negócio aguenta meses parados |
