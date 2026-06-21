# Analytics de RH

## O que esta funcionalidade faz

Apresenta indicadores como headcount, ferias pendentes, turnover e metricas gerenciais em visao analitica.

## Quando usar

- Em reunioes de acompanhamento de RH.
- Para identificar gargalos de equipe e pendencias operacionais.
- Para acompanhar evolucao de metricas de pessoas.

## Passo a passo de uso

1. Abra ` /dashboard/rh/analytics `.
2. Revise os cards principais de indicadores.
3. Analise graficos e blocos gerenciais disponiveis.
4. Cruce os numeros com as telas operacionais quando precisar agir.

## Campos e elementos da tela

| Elemento | Explicacao |
| --- | --- |
| Headcount | Total de colaboradores considerados pela analise |
| Ferias pendentes | Quantidade de solicitacoes ainda abertas |
| Turnover | Indicador percentual da rotatividade |
| Metricas gerenciais | Blocos comparativos por lideranca |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `rh-analytics-dashboard.png`.
> Adicionar `rh-analytics-graficos.png`.

## Dicas de uso

- Use a analise para priorizar follow-up, nao como unica fonte de decisao.
- Compare periodos e equipes antes de tirar conclusoes.

## Erros ou duvidas comuns

- `Um card parece zerado`: validar se a API `hr-analytics/dashboard-metrics` retornou dados.
- `Nao entendi a metrica`: confirmar definicao com o time de RH antes de divulgar.

## Boas praticas

- Registrar contexto da leitura dos indicadores.
- Revisar dados operacionais que alimentam o dashboard.
