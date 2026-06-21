# Movimentação do Colaborador

## O que esta funcionalidade faz

Exibe o ledger central de mudancas importantes ligadas ao colaborador, como salario, ferias, cargo, gestor, departamento e status.

## Quando usar

- Para auditar alteracoes organizacionais.
- Para acompanhar eventos de ferias ligados ao historico do colaborador.
- Para buscar quem fez determinada mudanca e quando ela ocorreu.

## Passo a passo de uso

1. Abra ` /dashboard/rh/movements `.
2. Use busca textual e filtro por tipo.
3. Revise origem, destino, autor e justificativa de cada movimento.
4. Cruze a leitura com a ficha do colaborador quando houver divergencia.

## Campos e elementos da tela

| Elemento | Explicacao |
| --- | --- |
| Busca | Filtra por salario, ferias, pessoa ou transferencia |
| Tipo | Isola eventos por categoria de movimento |
| Origem e destino | Mostram antes e depois da alteracao |
| Autor / motivo | Apoiam auditoria e rastreabilidade |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `movimentacao-listagem.png`.
> Adicionar `movimentacao-filtro-tipo.png`.

## Dicas de uso

- Comece pela busca do colaborador quando o historico for longo.
- Use filtro por tipo para investigações pontuais.

## Erros ou duvidas comuns

- `Nao encontro uma mudanca esperada`: validar se a alteracao foi feita por uma tela integrada ao ledger.
- `Os textos de origem e destino parecem iguais`: conferir se o backend gravou valor anterior e novo valor corretamente.

## Boas praticas

- Tratar esta tela como trilha oficial de auditoria do RH.
- Revisar movimentos apos alteracoes sensiveis de ficha ou ferias.
