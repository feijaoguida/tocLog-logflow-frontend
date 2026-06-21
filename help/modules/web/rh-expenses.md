# Prestação de Contas

## O que esta funcionalidade faz

Controla lancamentos de despesas do colaborador com filtro por periodo, anexo de comprovante, edicao e exclusao do registro.

## Quando usar

- Para registrar gasto reembolsavel.
- Para revisar despesas do mes atual.
- Para corrigir ou excluir um lancamento.

## Passo a passo de uso

1. Acesse ` /dashboard/rh/expenses `.
2. Ajuste o filtro de periodo, se necessario.
3. Clique em `Nova despesa` e preencha origem, local, valor, data e descricao.
4. Anexe o comprovante e salve.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Origem | Tipo da despesa, como refeicao ou combustivel |
| Local | Onde o gasto ocorreu |
| Valor | Quantia informada em moeda local |
| Comprovante | Arquivo enviado para conferencia |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `prestacao-listagem.png`.
> Adicionar `prestacao-comprovante-popup.png`.

## Dicas de uso

- Use o filtro padrao do mes atual para conferencia rapida.
- Abra o comprovante antes de concluir a analise do gasto.

## Erros ou duvidas comuns

- `O anexo nao subiu`: validar formato e tamanho do arquivo.
- `Nao vejo o popup`: conferir se o registro realmente possui `receiptUrl`.

## Boas praticas

- Preencher local e descricao com contexto suficiente para aprovacao.
- Evitar lancamentos acumulados sem comprovante.
