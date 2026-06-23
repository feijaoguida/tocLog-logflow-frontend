# Cotações

## O que esta funcionalidade faz

Organiza a fila de requisições aprovadas para compras, permite abrir fornecedores, comparar propostas e transformar a cotacao vencedora em ordem de compra.

## Quando usar

- Ao receber propostas de fornecedores.
- Para comparar alternativas antes da compra.
- Para transformar a cotacao vencedora em ordem.

## Passo a passo de uso

1. Acesse ` /dashboard/compras/cotacoes `.
2. Escolha uma requisição da fila operacional e abra o processo.
3. Adicione o fornecedor, preencha preços, prazo, frete e pagamento.
4. Compare as propostas, selecione a vencedora e gere a ordem quando aplicável.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Fornecedor | Origem da proposta |
| Preco unitario | Valor por item cotado |
| Prazo de entrega | Tempo previsto para atendimento |
| Condicao de pagamento | Regra financeira associada |
| Fila operacional | Requisicoes aguardando abertura ou ja em cotacao |
| Cotacao vencedora | Proposta escolhida para gerar a ordem |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `compras-cotacoes-listagem.png`.
> Adicionar `compras-cotacoes-detalhe.png`.

## Dicas de uso

- Compare custo, prazo e pagamento em conjunto.
- Revise itens antes de gerar a ordem final.
- Use a fila de cotações para priorizar o que ainda está aprovado sem fornecedor aberto.

## Erros ou duvidas comuns

- `Nao consigo gerar ordem`: validar se a cotacao esta completa.
- `Valores divergentes`: confirmar se o item editado foi salvo corretamente.
- `Nao encontro a requisição`: confirmar se o pedido já foi aprovado e liberado para compras.

## Boas praticas

- Manter historico das propostas relevantes.
- Justificar internamente a escolha do fornecedor quando necessario.
- Evitar definir vencedora antes de revisar o total, o frete e as condicoes de pagamento.
