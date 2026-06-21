# Departamentos

## O que esta funcionalidade faz

Organiza setores por filial e gestor responsavel, com busca e manutencao administrativa.

## Quando usar

- Ao criar um novo departamento.
- Ao ajustar o gestor ou a filial de um setor.
- Ao revisar a estrutura organizacional ativa.

## Passo a passo de uso

1. Acesse ` /dashboard/rh/departments `.
2. Pesquise um departamento existente ou abra o formulario novo.
3. Informe nome, filial e gestor responsavel.
4. Salve e valide se o registro ficou ativo na listagem.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Nome | Identifica o setor |
| Filial | Contexto organizacional do departamento |
| Gestor | Usa o contrato `headManagerId` no backend |
| Busca | Filtra setores cadastrados |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `departamentos-listagem.png`.
> Adicionar `departamentos-formulario.png`.

## Dicas de uso

- Crie a filial antes de abrir novos departamentos.
- Revise o gestor selecionado para evitar vinculo errado.

## Erros ou duvidas comuns

- `Nao consigo excluir`: a tela usa inativacao logica e pode bloquear quando houver vinculos relacionados.
- `O gestor nao aparece`: conferir permissao e dados do colaborador disponiveis para selecao.

## Boas praticas

- Manter apenas departamentos ativos na operacao corrente.
- Revisar impacto organizacional antes de inativar um setor.
