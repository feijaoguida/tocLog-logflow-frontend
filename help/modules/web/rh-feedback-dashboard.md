# Dashboard de Feedbacks do RH

## O que esta funcionalidade faz

Entrega uma visao consolidada do modulo de feedback dentro de `Recursos Humanos`.

O dashboard foi pensado para reunir:

- total por status
- volume de denuncias com visibilidade RH
- tempo medio de resposta
- surveys internas
- atalhos para caixa operacional e configuracoes

## Quando usar

- Ao priorizar triagem e resposta do RH.
- Para acompanhar o comportamento do canal de denuncias.
- Para cruzar feedbacks e surveys em uma leitura executiva.

## Passo a passo de uso

1. Abra `Recursos Humanos > Dashboard de Feedbacks`.
2. Revise os indicadores principais do topo.
3. Veja a lista das threads mais relevantes.
4. Abra a caixa operacional quando precisar agir em uma conversa especifica.
5. Acesse `Configuracoes` se precisar revisar a governanca do modulo.

## Campos e elementos da tela

| Elemento | Explicacao |
| --- | --- |
| Abertos | Quantidade de feedbacks aguardando triagem |
| Em analise | Threads atualmente tratadas pelo RH |
| Denuncias com visibilidade RH | Casos 1 para 1 que escalaram para o RH |
| Tempo medio de resposta | Indicador operacional do atendimento |
| Pesquisas e governanca | Resumo das surveys e observacoes de configuracao |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `feedbacks-dashboard-rh.png`.

## Dicas de uso

- Use o dashboard como leitura gerencial e a caixa de feedback como camada operacional.
- Revise o mix entre denuncias e feedbacks comuns para ajustar SLA e distribuicao.

## Possiveis erros ou duvidas comuns

### O dashboard mostra poucos dados

Na fase atual a tela esta preparada para o contrato final do backend. Alguns indicadores seguem em validacao.

## Boas praticas

- Monitore denuncias e tempo medio de resposta em conjunto.
- Nao use a visao consolidada para expor identidade de feedback anonimo.

## Pendente de validacao

- Consolidacao final dos KPIs via backend.
- Regras definitivas de filtros por filial, gestor e escopo.
