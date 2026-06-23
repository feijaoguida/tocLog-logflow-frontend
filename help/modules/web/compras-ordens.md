# Ordens de Compra

## O que esta funcionalidade faz

Lista ordens de compra geradas a partir das cotações vencedoras e permite acompanhar envio, recebimento parcial, recebimento total, encerramento e cancelamento com rastreabilidade.

## Quando usar

- Para consultar ordens emitidas.
- Para acompanhar avancos do pedido apos a cotacao.
- Para atualizar o estado da ordem conforme a operacao.

## Passo a passo de uso

1. Abra ` /dashboard/compras/ordens `.
2. Revise os KPIs e a fila de ordens.
3. Localize a ordem desejada e ajuste o status para `Enviar`, `Registrar parcial`, `Receber total`, `Encerrar` ou `Cancelar` quando permitido.

## Campos e elementos da tela

| Elemento | Explicacao |
| --- | --- |
| Lista de ordens | Registros emitidos a partir das cotacoes |
| Prioridade / data desejada | Contexto herdado da requisicao para triagem operacional |
| Financeiro | Total da ordem e valor ja recebido |
| Status | Situação atual da ordem |
| Estado vazio | Informa quando nenhuma ordem foi gerada |
| Acoes operacionais | Botoes de envio, recebimento parcial, recebimento total, encerramento e cancelamento conforme a etapa |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `compras-ordens.png`.

## Dicas de uso

- Revise a origem da ordem antes de atualizar o status.
- Em ordens urgentes, confira a data desejada antes de registrar entrega parcial ou total.
- Use esta tela para acompanhamento, nao para reabrir a decisao comercial.
- Confirme o envio, o recebimento parcial e o encerramento apenas quando a operacao real acontecer.

## Boas praticas

- Manter o status sincronizado com a operacao real.
- Cruzar a ordem com a cotacao original quando houver duvida.
- Evitar cancelar ordens com recebimento registrado ou encerrar sem conferir a trilha do processo.
