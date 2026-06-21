# Funcionários

## O que esta funcionalidade faz

Centraliza listagem, cadastro, ficha, visualizacao e edicao de colaboradores.

## Quando usar

- Ao admitir um novo colaborador.
- Ao atualizar dados cadastrais, cargo, departamento ou gestor.
- Ao consultar a ficha individual de uma pessoa.

## Passo a passo de uso

1. Abra ` /dashboard/rh/employees `.
2. Use a busca para localizar por nome, email, CPF ou cargo.
3. Entre em `Novo colaborador`, `Visualizar` ou `Editar`.
4. Revise o formulario antes de salvar para manter o historico coerente.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Busca principal | Filtra colaboradores por identificadores e funcao |
| Cadastro / edicao | Reune dados pessoais, organizacionais e operacionais |
| Ficha individual | Resume informacoes e historico visivel do colaborador |
| Skills | Catalogo reutilizavel para competencias declaradas |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `funcionarios-listagem.png`.
> Adicionar `funcionarios-editar.png`.

## Dicas de uso

- Valide CPF e datas quando o formulario sinalizar inconsistencias.
- Revise impacto em departamento, gestor e cargo antes de salvar alteracoes estruturais.

## Erros ou duvidas comuns

- `Falha ao salvar`: revisar mensagem real de API exibida na tela.
- `Nao encontro o colaborador`: limpar filtros e conferir permissao de visualizacao.

## Boas praticas

- Manter dados cadastrais completos e consistentes.
- Usar a ficha do colaborador como ponto oficial de manutencao do registro.
