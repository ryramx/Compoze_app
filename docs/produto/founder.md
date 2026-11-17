# Skills de founder (testar o negócio do Compoze)

As 11 skills em `.claude/skills/founder-*` vêm do pacote aberto
[Jakeschincariol/founder-skill](https://github.com/Jakeschincariol/founder-skill)
(MIT, licença em `.claude/skills/FOUNDER-LICENSE`), copiadas sem alteração do
commit `fd9385b` (6 out. 2026). Elas testam um negócio antes de gastar dinheiro:
um conselho com três lentes (oferta, monopólio, produto), mapa de concorrentes,
um painel de 100 compradores simulados, preço, oferta, CFO, marketing, marca,
operação, lançamento e o plano de negócio final.

Numa sessão do Claude Code neste repositório elas aparecem como `/founder-board`,
`/founder-consumer` e assim por diante. Ordem sugerida:

```
board -> competitors -> consumer -> pricing -> offer -> cfo -> marketing -> brand -> ops -> launch -> plan
```

Tudo o que elas escrevem vai para a pasta `founder/` na raiz do repositório. As
ferramentas são Python 3.8+ só com a biblioteca padrão, sem rede.

Para o Compoze, o ponto de partida é rodar `/founder-board` descrevendo o app
(público: compositores e bandas; preço e modelo de receita a definir, hoje há
apoio por PIX). Depois `/founder-consumer --quick` (20 compradores) antes da
rodada completa de 100.

Limites ditos pelo próprio pacote: o painel são compradores simulados, não
clientes reais (leia a taxa de compra como teto), e os números são projeções.
Não é conselho financeiro, jurídico ou fiscal.

## Primeira rodada (17 nov. 2026)

O pacote completo rodou sobre o Compoze. Resultado em [`founder/business-plan.md`](../../founder/business-plan.md)
e o resumo em [`founder/summary.md`](../../founder/summary.md). Veredito calculado: **Ainda não**
(20% de compra simulada, barra de 25%). A assinatura mensal deu 0% em duas rodadas; pagar por canção
(folha de divisão) deu 20%, com 80% entre compositores de mercado. Próximo passo: teste real com PIX.
