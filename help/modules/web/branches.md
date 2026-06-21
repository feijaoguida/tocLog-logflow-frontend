# Filiais

## O que esta funcionalidade faz

Permite cadastrar e consultar filiais, usando busca, paginacao e formulario administrativo.

## Quando usar

- Ao abrir uma nova unidade.
- Ao corrigir codigo ou nome de uma filial.
- Ao revisar a base organizacional do grupo.

## Passo a passo de uso

1. Acesse ` /dashboard/cadastros/branches `.
2. Use a busca para localizar uma filial existente.
3. Abra o formulario de criacao ou edicao.
4. Informe os dados da unidade e salve.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Codigo | Identificador curto da filial |
| Nome | Nome exibido na base administrativa |
| Busca | Filtra registros ja cadastrados |
| Paginacao | Controla a visualizacao da lista |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `filiais-listagem.png`.
> Adicionar `filiais-formulario.png`.

## Dicas de uso

- Mantenha o codigo padronizado desde o inicio.
- Revise duplicidades antes de incluir nova unidade.

## Erros ou duvidas comuns

- `Nao consigo encontrar a filial`: limpar busca e revisar a pagina atual.
- `Codigo rejeitado`: confirmar se ja existe outra filial com o mesmo identificador.

## Boas praticas

- Cadastrar primeiro a estrutura basica da filial antes de vincular usuarios e departamentos.
- Validar o nome exibido com a convencao oficial da empresa.
