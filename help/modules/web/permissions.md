# Controle de Permissões

## O que esta funcionalidade faz

Gerencia perfis de acesso do sistema, incluindo busca, criacao, edicao e selecao agrupada de permissoes.

## Quando usar

- Ao montar um perfil para nova funcao.
- Ao revisar o acesso de um modulo especifico.
- Ao ajustar permissao sem editar usuario por usuario.

## Passo a passo de uso

1. Abra ` /dashboard/cadastros/permissions `.
2. Localize um perfil existente ou inicie um novo.
3. Marque ou desmarque permissoes por grupo.
4. Salve e depois valide o resultado com um usuario de teste.

## Campos e elementos da tela

| Elemento | Explicacao |
| --- | --- |
| Busca | Filtra perfis por nome ou descricao |
| Formulario do perfil | Define nome, descricao e conjunto de permissoes |
| Agrupadores | Organizam slugs por dominio |
| Marcar todos / Desmarcar todos | Aceleram manutencao de grupos grandes |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `permissoes-listagem.png`.
> Adicionar `permissoes-edicao.png`.

## Dicas de uso

- Teste perfis novos em ambiente controlado antes de publicar em massa.
- Revise permissoes proximas para evitar conceder acesso maior que o necessario.

## Erros ou duvidas comuns

- `Nao vejo um grupo esperado`: confirmar se a permissao existe no seed e no backend.
- `O usuario continua sem acesso`: verificar se ele realmente herdou o perfil atualizado.

## Boas praticas

- Criar perfis por funcao, nao por pessoa.
- Manter nomes de perfis claros e reutilizaveis.
