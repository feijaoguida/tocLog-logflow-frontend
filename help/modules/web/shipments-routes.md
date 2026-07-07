# Rotas

## O que esta funcionalidade faz

Permite criar a rota operacional, registrar a alocação de motorista/veículo, revisar bloqueios e alertas retornados, vincular cargas reais e liberar o despacho dentro do novo domínio `shipments`.

Quando o perfil tiver apenas visualização, a mesma tela continua útil para leitura operacional da rota, mas sem expor ações de criar, alocar, vincular ou despachar.

## Quando usar

- Ao abrir uma nova rota.
- Ao revisar se a alocação da rota ainda possui bloqueios ou alertas.
- Ao vincular cargas conferidas antes da saída.
- Ao liberar ou barrar o despacho conforme as regras da empresa.
- Ao disparar o primeiro envio fiscal outbound para a SSW quando a conexão estiver ativa.
- Ao acompanhar reentregas ou novas coletas reagendadas pelo motorista com nova janela prometida.

## Passo a passo de uso

1. Abra ` /dashboard/shipments/routes `.
2. Cadastre código, origem e destino da rota.
3. Selecione a rota desejada na grade principal.
4. Registre a alocação do veículo e do motorista parceiro na própria workspace da rota.
5. Revise a leitura das alocações e confirme se não existem bloqueios ativos.
6. Vincule as cargas já conferidas na rota.
7. Se houver divergência ou avaria e a política exigir aprovação, marque a exceção e registre a justificativa.
8. Despache a rota.
9. Acompanhe em ` /dashboard/integrations ` se os eventos fiscais outbound da rota foram enviados ou ficaram pendentes para reprocesso.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Código | Identificador da rota |
| Origem / destino | Trecho principal da operação |
| Status | Situação operacional da rota |
| Tipo de veículo | Define se a alocação vai usar frota interna ou veículo parceiro |
| Motorista parceiro | Recurso operacional do motorista externo que seguirá na rota |
| Veículo da alocação | Recurso físico escolhido para a execução da rota |
| Alocações | Quantidade de vínculos já registrados para motorista e veículo |
| Bloqueios de alocação | Pendências que impedem o despacho enquanto não forem resolvidas |
| Alertas operacionais | Sinais não impeditivos que ainda merecem revisão antes da saída |
| Carga disponível | Lista de cargas que já saíram do rascunho e podem ser vinculadas |
| Modo leitura | Banner explícito para perfis só de visualização, mantendo revisão de rotas, bloqueios, cargas e paradas sem abrir ações de montagem/despacho |
| Prontidão para despacho | Leitura visual que mostra se a carga vinculável já está com base documental, status e conferência coerentes para seguir na saída |
| Justificativa da exceção | Motivo obrigatório quando a empresa exigir autorização para divergência ou avaria |
| Janela prometida da nova tentativa | Horário inicial/final que o motorista pode informar quando transformar a ocorrência em reagendamento |
| Paradas da rota | Ordem operacional da rota, com tentativa planejada, janela prometida e observações por parada |
| Evento fiscal outbound | Evento criado na trilha de integrações quando a rota sai com conexão SSW ativa |

## Dicas de uso

- Trate essa tela como ponto de montagem e liberação da rota, não como cadastro de parceiros.
- O despacho pode ser bloqueado por pendência na alocação, por volume sem conferência ou por carga divergente sem justificativa aprovada.
- A workspace já busca os recursos de alocação pelo próprio módulo `shipments`, então o operador de rota não depende de permissões de leitura cruzadas em `fleet` ou `external-fleet` para montar a saída.
- Se o perfil tiver apenas `shipments.routes.view`, a tela entra em modo leitura com banner explícito e mantém a revisão de rotas, cargas, bloqueios e paradas sem tentar abrir ações de operação que exigem `create` ou `assign`.
- Se a leitura inicial da workspace falhar, a própria tela exibe `Falha de leitura` com `Atualizar leitura`, sem depender só de toast para orientar a retomada.
- Se apenas a lista principal de `Rotas` ou a lista de `Cargas disponíveis` falhar, a workspace agora entra em `Leitura parcial`, preserva o último bloco válido e concentra o aviso no trecho afetado em vez de derrubar a operação inteira.
- Quando a rota selecionada sair do resultado após uma atualização, a workspace troca automaticamente para a primeira rota ainda disponível, evitando drill-down preso em um código que já não voltou na leitura nova.
- Se apenas o catálogo de recursos de alocação falhar, a workspace continua abrindo rotas, cargas e detalhe operacional; nesse caso o bloco `Registrar alocação` mostra um aviso próprio e um retry dedicado para recarregar só motoristas e veículos.
- O bloco `Vincular carga conferida` agora também antecipa a prontidão da carga: antes do vínculo e dentro das cargas já anexadas, a tela mostra se ainda faltam destinatário, documento do recebedor, base fiscal, volumes ou se existe divergência/avaria que pode travar o despacho depois.
- Se a leitura do detalhe da rota falhar depois de selecionar um item, o card operacional da rota também passa a mostrar erro explícito com retry dedicado para esse drill-down.
- Quando a rota precisar sair com exceção, registre uma justificativa objetiva para manter a trilha auditável; a própria tela agora separa o que pode seguir com override manual do que continua bloqueado por documentação, conferência ou alocação.
- A própria tela já bloqueia o despacho com exceção sem justificativa antes de chamar a API, então trate esse campo como obrigatório sempre que marcar a autorização manual.
- Quando a tentativa virar reagendamento, use a janela prometida para deixar explícito o novo compromisso combinado com o cliente.
- Revise a seção de paradas para confirmar se a nova tentativa foi criada no fim da rota com o horário prometido correto.
- Se a empresa usar SSW, o despacho passa a gerar evento outbound do documento fiscal da carga na área de integrações.
