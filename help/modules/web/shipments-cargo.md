# Cargas

## O que esta funcionalidade faz

Centraliza o cadastro, a conferência e a leitura das divergências das cargas operacionais no domínio `shipments`, incluindo a base fiscal/documental necessária antes do despacho.

## Quando usar

- Ao registrar uma carga manual.
- Ao acompanhar status, volumes e ocorrências da operação.
- Ao conferir entrada, registrar divergência/avaria e preparar cargas para montagem de rota.
- Ao preencher destinatário, documento fiscal e chave usados na liberação da saída.

## Passo a passo de uso

1. Abra ` /dashboard/shipments `.
2. Cadastre código, origem, referência, destinatário e os dados fiscais/documentais da carga.
3. Selecione a carga para cadastrar volumes.
4. Confira cada volume como `CONFERRED`, `DIVERGENT` ou `DAMAGED`.
5. Registre observações gerais e libere a carga para rota quando aplicável.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Código | Identificador operacional da carga |
| Origem | Canal de entrada da informação |
| Referência | Pedido, NF-e ou vínculo externo |
| Cliente / destinatário | Contexto operacional da entrega |
| Documento do destinatário | Identificação mínima para a entrega e para o despacho quando a política exigir |
| Tipo / número / chave fiscal | Dados usados para rastreabilidade documental e bloqueio pré-saída |
| Prontidão documental | Resumo visual mostrando se destinatário e base fiscal mínima já estão completos para políticas de despacho |
| Status | Situação atual da carga |
| Volumes | Itens físicos usados na conferência |
| Conferência | Resultado por volume, com divergência ou avaria |
| Ocorrências | Histórico operacional criado pela conferência e também pelas ações do motorista em rota |
| Modo leitura | Banner explícito para perfis sem gestão, mantendo revisão de cargas, volumes e ocorrências, mas sem sugerir criação ou alteração de conferência |
| Falha de leitura | Estado explícito da tela quando a listagem inicial de cargas não conseguir consultar o backend |
| Atualizar leitura | Retry visível na própria tela para recarregar a workspace sem depender apenas de toast |

## Dicas de uso

- Padronize o código para facilitar rastreabilidade.
- Cadastre todos os volumes antes de concluir a conferência.
- A própria tela já valida código da carga, código do volume e peso/cubagem maiores ou iguais a zero antes do envio, então corrija o formulário local antes de insistir no save.
- Se a leitura inicial falhar, use `Atualizar leitura` ou `Tentar novamente` no próprio card antes de concluir que a workspace está indisponível.
- Quando a lista for atualizada e a carga antes selecionada deixar de existir no resultado novo, a tela reposiciona automaticamente a seleção para a primeira carga disponível, evitando detalhe vazio preso em um registro antigo.
- Em perfis de `Modo leitura`, a própria workspace agora abre um banner explicando que a revisão continua disponível, mas os campos de volume e conferência ficam travados para não sugerir manutenção indevida.
- Preencha documento do destinatário e documento fiscal antes de vincular a carga à rota se a empresa usar bloqueio pré-saída.
- A própria workspace agora também resume a prontidão documental na listagem e no detalhe da carga, destacando pendências de destinatário, documento de recepção e base fiscal antes do despacho.
- Revise ocorrências e status antes de liberar a carga para rota.
- Quando a empresa operar com SSW ativa, trate as ocorrências do motorista como parte da trilha técnica auditável em `Integrações`.
