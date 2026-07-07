# Operação do Motorista

## O que esta funcionalidade faz

Resume o fluxo operacional real do motorista externo no app, agora centrado em `shipments` com uma home de `Operação`, abas dedicadas de `Minhas rotas` e `Tarefas`, disponibilidade, cadastro/veiculo, histórico próprio, ocorrências, comprovante e atualização de localização.

## Quando usar

- Para acompanhar a rota atribuída ao motorista no fluxo novo.
- Para atualizar a disponibilidade operacional antes de receber rota.
- Para abrir uma lista direta de tarefas sem depender apenas da navegação por rota.
- Para revisar cadastro, veículo principal e histórico próprio sem sair do app.
- Para iniciar rota, iniciar tarefa, concluir entrega/coleta ou registrar ocorrência.
- Para entender o que ainda é ponte de migração do legado.

## Passo a passo de uso

1. Abra o app do motorista externo.
2. Revise `Disponibilidade` e atualize seu status se necessário.
3. Abra `Perfil` para conferir cadastro, veículo e compliance antes de sair.
4. Abra `Operação` para revisar modo de campo, evidências exigidas e atalhos.
5. Abra `Tarefas` para localizar rapidamente o que está pendente, em andamento ou encerrado.
6. Entre em `Rotas`.
7. Abra a rota atribuída desejada ou toque na rota a partir da tarefa.
8. Inicie a rota quando estiver em campo.
9. Inicie a tarefa da parada correspondente.
10. Conclua a tarefa com comprovante ou registre ocorrência, devolução ou reagendamento.

## Campos e elementos da tela

| Elemento | Explicacao |
| --- | --- |
| Operação | Home-resumo do motorista com modo de campo, exigências de evidência e atalhos para rotas, tarefas, disponibilidade e perfil; ao voltar para a aba, o contexto é recarregado e a tela agora também mostra falha explícita de leitura quando o refresh não conseguir consultar o backend |
| Minhas rotas | Aba dedicada com a lista operacional puxada de `shipments/driver/me`, também recarregada ao voltar para ela e agora com estado explícito de falha de leitura quando a atualização não conseguir consultar o backend |
| Modo de campo | Card na home do motorista mostrando se a fila offline está habilitada e quais evidências continuam exigidas, inclusive foto, geolocalização e nome/documento do recebedor quando a empresa marcar isso nas políticas de entrega |
| Tarefas | Aba dedicada com as tarefas atribuídas ao motorista, separando itens em andamento, prontos para iniciar e encerrados; a lista também é recarregada ao ganhar foco |
| Disponibilidade | Tela do shell do motorista para marcar `AVAILABLE`, `BUSY` ou `UNAVAILABLE`, registrar observações e informar janela `disponível de / até`, com refresh automático do contexto ao retornar, validação local para datas inválidas ou janela final anterior à inicial e estado explícito de falha de leitura quando o refresh não conseguir consultar o backend |
| Perfil | Tela do shell do motorista com documento, contato, CNH, RNTRC, veículo principal e histórico próprio de rotas, também atualizada ao voltar para a aba e agora com refresh manual e estado explícito de falha de leitura quando o backend não responder |
| Retry local | O card `Falha de leitura` nas abas `Operação`, `Rotas`, `Tarefas`, `Disponibilidade` e `Perfil` agora já oferece retry explícito na própria mensagem, sem depender só do botão geral no fim da tela |
| Rota por id | Detalhe operacional em `routes/[id]` com tarefas, foto e geolocalização, recarregado ao retornar do fluxo, alinhado às políticas reais do tenant para barrar localmente foto obrigatória, dados do recebedor e GPS quando necessário, reaproveitando o mesmo fluxo amigável de câmera/galeria do helper compartilhado do app e sem bloquear início de rota/tarefa só por ausência momentânea de GPS |
| Ocorrência reagendável | Falha que vira nova tentativa com horário planejado e janela prometida, com bloqueio local para datas inválidas ou janela final anterior à inicial |
| Fila offline | Quando a empresa alinhar `Permitir baixa offline` + `Permitir fallback assíncrono`, o app assume a fila operacional normalmente; em QA/desenvolvimento ainda existe override local por `EXPO_PUBLIC_DRIVER_OFFLINE_QUEUE=true`, agora sinalizado de forma consistente tanto em `Operação` quanto no detalhe `routes/[id]` |
| Ponte do legado | `trips/[id]` agora virou uma ponte visual alinhada ao design system, explicando a migração e levando direto para `Minhas rotas` ou de volta para `Operação` |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `mobile-driver-home.png`.
> Adicionar `mobile-driver-availability.png`.
> Adicionar `mobile-driver-profile.png`.
> Adicionar `mobile-driver-routes.png`.
> Adicionar `mobile-driver-route-detail.png`.

## Pendente de validacao

- Validar manualmente em dispositivo o fluxo completo de iniciar rota, concluir tarefa com foto e recebedor conforme a política da empresa e registrar reagendamento com janela prometida.
- O detalhe da rota já valida localmente datas inválidas do reagendamento e também bloqueia janela prometida final anterior à inicial antes do envio ao backend.
- Quando o detalhe `routes/[id]` não conseguir ler a rota no backend, a própria tela agora mostra `Falha de leitura` com retry explícito, sem depender só de alerta nativo ou retorno para outra aba.
- Se a sincronização da fila offline falhar no detalhe `routes/[id]`, a rota continua aberta para leitura operacional e o erro passa a aparecer no card da própria fila, sem contaminar toda a leitura principal da rota.
- Validar manualmente em dispositivo a atualização da disponibilidade e se o novo status com janela `de / até` reflete corretamente no próprio shell e na leitura de alocação.
- A própria tela já valida datas inválidas e também bloqueia `disponível até` menor que `disponível a partir de`, evitando erro evitável antes do envio ao backend.
- Validar manualmente em dispositivo se `Operação` e `Perfil` também mostram `Falha de leitura` quando o refresh do contexto não conseguir consultar o backend.
- O `AuthContext` do motorista agora também propaga a falha do refresh interativo de `shipments/driver/me`; por isso `Operação`, `Rotas`, `Disponibilidade` e `Perfil` deixam de cair em estado vazio silencioso e passam a exibir o erro amigável mantendo o último contexto útil já carregado.
- Validar manualmente em dispositivo o comportamento da fila offline configurável, incluindo reenvio de ação pendente quando a rede voltar, leitura do último erro e descarte controlado de pendência da rota.
- Revisar se a ajuda deve ganhar prints reais das novas telas de disponibilidade/perfil e confirmar em ambiente de teste se comprovante, recebedor e ocorrência estão chegando corretamente à trilha de integrações SSW.
