# Dashboard Principal

## O que esta funcionalidade faz

Reune widgets configuraveis para dar uma visao executiva do ambiente autenticado, com atalhos e indicadores de modulos como RH, compras, helpdesk, logistica e frota.

## Quando usar

- Ao iniciar o dia e precisar de uma visao rapida das operacoes.
- Para acompanhar indicadores resumidos sem entrar em cada modulo.
- Para reorganizar a composicao visual do proprio painel.

## Passo a passo de uso

1. Acesse a rota ` /dashboard ` apos o login.
2. Revise os widgets disponiveis para o seu perfil.
3. Use os cards como ponto de entrada para os modulos que exigem acao.
4. Ajuste a ordem ou a leitura do painel conforme a necessidade operacional.

## Campos e elementos da tela

| Elemento | Explicacao |
| --- | --- |
| Widgets | Blocos com contagens, listas recentes ou atalhos por dominio |
| Cards de indicador | Resumem numeros e status principais |
| Acesso contextual | Leva o usuario ao modulo correspondente |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `dashboard-visao-geral.png`.
> Adicionar `dashboard-widgets.png`.

## Dicas de uso

- Comece pelos widgets com maior volume de pendencias.
- Use o dashboard como triagem e abra o modulo detalhado para executar a acao.

## Erros ou duvidas comuns

- `Nao vejo um widget esperado`: confirmar permissao do usuario e o registro do widget no dashboard.
- `O numero parece desatualizado`: validar se o modulo correspondente atualizou os dados de origem.

## Boas praticas

- Evitar tomar decisao final apenas pelo resumo do widget.
- Validar detalhes dentro do modulo antes de aprovar, excluir ou encerrar algo.
