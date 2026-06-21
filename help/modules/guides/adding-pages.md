# Como Adicionar Novas Páginas

## O que este guia faz

Explica como expandir a central de ajuda sem alterar a estrutura base da feature.

## Quando usar

- Ao criar uma funcionalidade nova no sistema.
- Ao dividir uma funcionalidade antiga em mais de um artigo.
- Ao anexar prints reais depois da primeira versao da documentacao.

## Passo a passo

1. Crie um novo arquivo `.md` em `frontend/help/modules/`.
2. Siga o padrao minimo: titulo, o que faz, quando usar, passo a passo, campos, prints, dicas, erros comuns e boas praticas.
3. Se houver imagem real, salve o arquivo em `frontend/help/images/`.
4. Adicione um item novo em `frontend/help/help-menu.json` com `title`, `slug`, `file`, `summary`, `route`, `platform` e `status`.
5. Abra `/dashboard/help` e valide se o artigo aparece na busca e no menu lateral.

## Modelo minimo recomendado

| Campo | Uso |
| --- | --- |
| `title` | Nome exibido no menu |
| `slug` | Caminho amigavel da pagina, por exemplo `web/rh/nova-area` |
| `file` | Caminho relativo do Markdown, por exemplo `modules/web/rh-nova-area.md` |
| `summary` | Resumo curto mostrado no topo e na busca |
| `route` | Rota da funcionalidade no produto |
| `platform` | `shared`, `web` ou `mobile` |
| `status` | `ready` ou `pending-validation` |

## Como referenciar prints

1. Salve a imagem em `frontend/help/images/`.
2. Use o caminho `![Legenda](/api/help-images/nome-do-arquivo.png)` no Markdown.
3. Se a imagem ainda nao existir, registre um placeholder com o nome esperado.

## Dicas de manutencao

- Prefira um artigo por funcionalidade navegavel.
- Atualize o artigo no mesmo ciclo em que a tela mudar de forma permanente.
- Se o comportamento estiver ambiguo no codigo, escreva a secao `Pendente de validacao`.

## Boas praticas

- Manter nomes de arquivo consistentes com a funcionalidade.
- Reaproveitar nomenclatura da navegacao real do sistema.
- Evitar documentar comportamento especulativo.
