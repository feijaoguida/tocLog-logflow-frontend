# Integrações

## O que esta funcionalidade faz

Centraliza as conexões técnicas por empresa, os eventos outbound/inbound e os logs sanitizados do módulo `integrations`.

## Quando usar

- Ao cadastrar ou revisar a conexão SSW da empresa.
- Ao acompanhar reprocessamentos e falhas técnicas.
- Ao validar se o despacho de `shipments` gerou o evento fiscal outbound esperado.
- Ao validar se ocorrência operacional do motorista gerou evento outbound esperado.
- Ao validar se o comprovante/POD da tarefa concluída gerou evento outbound esperado.
- Ao testar credencial da conexão e processar eventos pendentes em lote.

## Passo a passo de uso

1. Abra ` /dashboard/integrations `.
2. Cadastre a conexão SSW ou clique em `Editar` para revisar uma conexão já existente.
3. Ajuste nome, ambiente, status e parâmetros técnicos; se precisar trocar credenciais, preencha novamente token e código EDI.
4. Use `Testar` na conexão para validar token e código EDI antes de operar.
5. Use `Inativar` ou `Reativar` quando a empresa precisar congelar a integração sem apagar o cadastro.
6. Use a aba `Eventos` para acompanhar o status das publicações.
7. Se houver fila pendente, acione `Processar pendências`; se um evento específico falhar, use `Reprocessar`.
8. Use a aba `Logs` para revisar o histórico técnico sanitizado.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Conexões | Lista de providers configurados para a empresa |
| Editar | Carrega a conexão selecionada no formulário lateral para atualizar nome, ambiente, status e parâmetros técnicos |
| Inativar / Reativar | Alterna a participação da conexão na trilha operacional sem apagar o cadastro |
| Último sync | Momento do último teste ou envio bem-sucedido da conexão |
| Último teste da conexão | Card com status, protocolo, horário e mensagem sanitizada do provider após usar `Testar`, inclusive ao reabrir a conexão com base no último log registrado |
| Conexão ativa | Controle de status operacional da conexão técnica |
| Timeout do provider | Tempo máximo em milissegundos aguardado por chamada técnica da integração |
| Máximo de retentativas | Quantidade de novas tentativas automáticas permitidas para a conexão |
| Eventos | Fila operacional de integrações, incluindo o outbound fiscal de `shipments` |
| Registro | Identificador do recurso interno ligado ao evento |
| Documento fiscal outbound | Evento disparado quando a rota é despachada com carga fiscal pronta para a SSW |
| Ocorrência outbound | Evento disparado quando a operação local envia falha, devolução ou reagendamento para a SSW |
| Comprovante outbound | Evento disparado quando a conclusão da tarefa publica o POD/comprovante para a SSW |
| Tentativas | Quantidade de execuções já feitas para o evento |
| Provider | Status operacional retornado pela SSW, com protocolo, horário processado, fila/recibo quando existirem e mensagem sanitizada |
| Próxima tentativa | Janela prevista para retry ou mensagem de erro atual |
| Payload de sucesso | Resposta técnica sanitizada do provider com protocolo, status e horário processado |
| Logs | Histórico técnico sanitizado de chamadas ao provider |
| Falha de leitura | Estado explícito da tela quando a leitura inicial de conexões, eventos e logs não conseguir consultar o backend |
| Leitura parcial | Aviso exibido quando só uma parte da tela falhar, mantendo os blocos já carregados nas outras abas |
| Atualizar leitura | Retry visível na própria tela para recarregar conexões, eventos e logs sem depender apenas de toast |

## Dicas de uso

- O evento `SSW_NOTFIS_OUTBOUND` nasce quando uma rota de `shipments` é despachada com conexão SSW ativa.
- O evento `SSW_OCCURRENCE_OUTBOUND` nasce quando o motorista conclui, falha, reagenda ou devolve uma tarefa com ocorrência registrada na carga.
- O evento `SSW_POD_OUTBOUND` nasce quando a tarefa é concluída com `proofOfDelivery` salvo no domínio `shipments`.
- A aba `Eventos` agora traduz melhor essas operações no próprio grid, separando fiscal, ocorrência e comprovante com rótulos operacionais além do código técnico bruto.
- Quando a política permitir fallback assíncrono, falhas podem virar `RETRY_SCHEDULED` em vez de erro terminal imediato.
- Os sucessos da SSW passam a registrar `providerStatus`, `providerMessage`, `protocol` e `processedAt`, o que ajuda a separar aceite técnico do provider de erro de credencial ou timeout.
- Quando o provider devolver `queue` ou `receiptNumber`, a própria linha do evento passa a expor esses dados sem obrigar a leitura dos logs.
- Quando a SSW responder rejeição técnica, a tela passa a mostrar essa mensagem no mesmo lugar em que antes aparecia apenas um status genérico.
- Reprocesse eventos apenas depois de corrigir credencial, timeout ou dados fiscais ausentes.
- O reenfileiramento manual fica disponível apenas para eventos com `FAILED` ou `RETRY_SCHEDULED`; sucessos e itens ainda em processamento não devem ser reenviados manualmente.
- A própria tela já bloqueia criação da conexão sem nome, token e código EDI, então corrija esses campos no formulário antes de insistir no save.
- Ao editar uma conexão existente, token e código EDI ficam opcionais porque as credenciais antigas permanecem mascaradas; preencha os dois apenas quando quiser substituí-los.
- Depois de usar `Testar`, a própria tela passa a mostrar o retorno sanitizado do provider com status, protocolo, horário e mensagem, o que ajuda a revisar a conexão sem depender só do toast.
- Ao voltar para `Editar` uma conexão já testada, a tela reaproveita o último log de `SSW_CONNECTION_TEST` para manter esse contexto visível mesmo após refresh.
- Perfis com `integrations.view` entram em `Modo leitura`: conseguem revisar conexões, eventos e logs, mas não podem testar conexão, reenfileirar eventos, bootstrap de mapeamentos nem alterar credenciais.
- Se a leitura inicial falhar, use `Atualizar leitura` ou `Tentar novamente` na própria tela antes de concluir que a integração está indisponível.
- Se apenas `Conexões`, `Eventos` ou `Logs` falhar, a tela passa a mostrar `Leitura parcial` e preserva a última leitura válida dos outros blocos para não interromper a conferência inteira.
- Use esta tela como trilha de auditoria técnica, não como substituta do acompanhamento operacional da carga.
