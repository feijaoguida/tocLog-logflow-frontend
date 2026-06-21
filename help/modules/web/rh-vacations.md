# Férias

## O que esta funcionalidade faz

Administra solicitacoes de ferias com escopo por colaborador, gestor e RH, incluindo aprovacao, rejeicao, cancelamento e historico.

## Quando usar

- Para solicitar ferias proprias.
- Para o gestor solicitar em nome de subordinados quando permitido.
- Para o RH aprovar, reprovar ou cancelar periodos com justificativa.

## Passo a passo de uso

1. Abra ` /dashboard/rh/vacations `.
2. Escolha a aba ou escopo correspondente ao seu perfil.
3. Inicie `Solicitar ferias` e selecione colaborador quando a permissao permitir.
4. Ao reprovar ou cancelar, informe a justificativa obrigatoria antes de confirmar.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Colaborador | Disponivel para gestor ou RH conforme permissao |
| Data inicial / final | Define o periodo solicitado |
| Observacao | Contexto adicional para analise |
| Justificativa | Obrigatoria em reprovar ou cancelar |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `ferias-listagem.png`.
> Adicionar `ferias-justificativa.png`.

## Dicas de uso

- Revise o periodo antes de enviar para evitar retrabalho.
- Explique sempre o motivo ao rejeitar ou cancelar.

## Erros ou duvidas comuns

- `Nao consigo escolher outro colaborador`: validar permissao do perfil.
- `A acao foi bloqueada`: conferir se a justificativa obrigatoria foi preenchida.

## Boas praticas

- Registrar contexto suficiente nas observacoes.
- Validar conflitos de agenda antes da aprovacao final.
