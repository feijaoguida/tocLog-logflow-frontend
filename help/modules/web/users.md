# Usuários

## O que esta funcionalidade faz

Centraliza a gestao de contas de acesso, com vinculo de filial e perfil de permissao para cada usuario.

## Quando usar

- Ao criar um novo acesso ao sistema.
- Ao ajustar o perfil de um usuario que mudou de funcao.
- Ao revisar contas existentes por busca.

## Passo a passo de uso

1. Abra ` /dashboard/users `.
2. Use a busca para localizar o usuario desejado ou inicie um cadastro novo.
3. Informe dados basicos, filial e perfil de acesso.
4. Salve e valide se o usuario ficou associado ao perfil correto.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Nome / email | Identificacao da conta |
| Filial | Define o contexto operacional principal |
| Perfil | Controla o conjunto de permissoes herdadas |
| Busca | Filtra usuarios ja cadastrados |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `usuarios-listagem.png`.
> Adicionar `usuarios-criar.png`.

## Dicas de uso

- Revise sempre o perfil antes de salvar.
- Use a busca para evitar cadastros duplicados.

## Erros ou duvidas comuns

- `Nao encontro a filial esperada`: validar se o cadastro de filiais esta atualizado.
- `O usuario entrou mas nao ve a tela`: revisar o perfil de permissao associado.

## Boas praticas

- Padronizar nome e email antes de criar a conta.
- Alinhar perfil com a funcao real do colaborador.

## Pendente de validacao

- O codigo desta tela indica comentario sobre logica de `branches endpoint`; validar o fluxo completo em navegador antes de usar este artigo como material final.
