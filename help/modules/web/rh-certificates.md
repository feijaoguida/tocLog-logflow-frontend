# Atestados

## O que esta funcionalidade faz

Gerencia atestados medicos e suas decisoes operacionais dentro do modulo de RH.

## Quando usar

- Para registrar um novo atestado.
- Para revisar afastamentos e justificativas.
- Para aprovar, rejeitar ou tratar pendencias ligadas ao documento.

## Passo a passo de uso

1. Acesse ` /dashboard/rh/certificates `.
2. Abra o fluxo de novo registro ou selecione um item existente.
3. Informe datas, descricao e anexo do documento.
4. Registre a decisao e justificativa quando o fluxo solicitar.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Periodo | Janela coberta pelo atestado |
| Descricao / justificativa | Contexto do afastamento ou da decisao |
| Anexo | Documento comprobatório |
| Status | Situação atual do registro |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `atestados-listagem.png`.
> Adicionar `atestados-decisao.png`.

## Dicas de uso

- Valide se o arquivo anexo corresponde ao periodo informado.
- Registre justificativas objetivas ao tomar uma decisao.

## Erros ou duvidas comuns

- `Nao consigo concluir a analise`: confirmar se a justificativa obrigatoria foi preenchida.
- `O anexo nao abriu`: conferir upload e permissao de acesso ao arquivo.

## Boas praticas

- Guardar contexto suficiente para futuras auditorias.
- Evitar registros sem documento comprobatório.
