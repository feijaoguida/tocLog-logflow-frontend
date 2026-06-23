# Pedidos

## O que esta funcionalidade faz

Permite criar, consultar, editar rascunhos, detalhar pedidos de compra e gerar um documento de impressao/PDF com os dados auditaveis do processo.

## Quando usar

- Para abrir uma nova necessidade de compra.
- Para acompanhar pedidos ja enviados.
- Para revisar o pedido antes da aprovacao, da cotacao ou da impressao final.

## Passo a passo de uso

1. Acesse ` /dashboard/compras/pedidos `.
2. Clique em `Novo pedido` para abrir a tela dedicada de criacao ou entre em um pedido existente.
3. Informe justificativa, prioridade, data desejada, observacao e os itens da solicitacao.
4. Salve o rascunho, envie para aprovacao e acompanhe o fluxo pela listagem ou pela tela de detalhes.
5. Na tela de detalhes, use `Imprimir` para abrir a versao pronta para impressao ou salvamento em PDF.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Justificativa | Motivo principal da compra |
| Prioridade | Nivel operacional da solicitacao para triagem e aprovacao |
| Data desejada | Data alvo esperada pelo solicitante para atendimento da compra |
| Observacao | Instrucoes adicionais |
| Produto / descricao | Item solicitado e complemento |
| Quantidade / unidade | Volume e medida do pedido |
| Resumo operacional | Departamento, valor estimado, itens e aprovador |
| Trilha de eventos | Timeline auditavel do pedido |
| Imprimir | Abre um documento com solicitante, aprovador, cotacoes e ordem vinculada |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `compras-pedidos-listagem.png`.
> Adicionar `compras-pedidos-formulario.png`.
> Adicionar `compras-pedidos-detalhe.png`.
> Adicionar `compras-pedidos-impressao.png`.

## Dicas de uso

- Detalhe bem os itens quando o produto nao estiver fechado no catalogo.
- Use `Prioridade` e `Data desejada` para dar contexto real de prazo ao aprovador e ao comprador.
- Revise unidade e quantidade antes de enviar.
- Use a tela de detalhes para validar aprovador, trilha e cotações antes de imprimir.

## Erros ou duvidas comuns

- `Nao achei o produto`: verificar catalogo ou usar descricao complementar.
- `Nao consigo gerar ordem`: confirmar se a etapa de cotacao foi concluida e se existe cotacao vencedora.
- `A impressao nao abriu`: liberar pop-up/nova aba no navegador e tentar novamente.

## Boas praticas

- Criar um pedido por necessidade clara.
- Evitar observacoes vagas em compras sensiveis.
- Imprimir ou salvar em PDF apenas depois de revisar aprovador, cotacoes e status atual do pedido.
