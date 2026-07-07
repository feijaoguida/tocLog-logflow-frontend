# Configurações de Cargas e Rotas

## O que esta funcionalidade faz

Centraliza a governança operacional do domínio `shipments` por empresa.

## Quando usar

- Ao ajustar bloqueios de alocação de rota.
- Ao revisar exigências de entrega, ocorrência e liberação documental da carga.
- Ao configurar parâmetros básicos de integração e fallback operacional.

## Passo a passo de uso

1. Abra ` /dashboard/shipments/settings `.
2. Navegue pelas abas de frota interna, frota externa, rotas, entrega e integração.
3. Ative ou desative as políticas desejadas.
4. Salve as configurações da empresa.

## Campos e elementos da tela

| Área | Explicacao |
| --- | --- |
| Frota interna | Checklist, manutenção e bloqueios de veículo próprio |
| Frota externa | Aprovação, disponibilidade, CNH/RNTRC de motoristas e validade documental de veículos parceiros |
| Rotas | Políticas de alocação, divergência, reagendamento operacional e exigência fiscal/documental antes do despacho |
| Entrega | Foto, recebedor, geolocalização, ocorrência e política de baixa offline |
| Integração | Retry, timeout, logs e fallback assíncrono |
| Falha de leitura | Estado explícito da tela quando a leitura inicial das políticas não conseguir consultar o backend |
| Atualizar leitura | Retry visível para recarregar as configurações sem depender apenas de toast |

## Dicas de uso

- Revise o impacto operacional antes de desativar bloqueios críticos.
- Use esta tela como fonte oficial de política por empresa para `shipments`.
- A fila offline do motorista depende da combinação entre `Permitir baixa offline` na aba de entrega e `Permitir fallback assíncrono` na aba de integração.
- A própria tela agora mostra o resultado dessa combinação com um resumo operacional: quando as duas políticas estiverem ligadas, a governança passa a indicar `Fila operacional ativa`; se uma delas estiver desligada, a tela explica qual lado ainda está faltando para liberar o replay offline do motorista.
- O próprio formulário já bloqueia raio máximo inválido, `maxRetries` negativo e `timeoutMs` não positivo antes do save, então ajuste esses números localmente antes de insistir na gravação.
- Se a leitura inicial falhar, use `Atualizar leitura` ou `Tentar novamente` no próprio card antes de concluir que a governança do tenant está indisponível.
- As regras de CNH e RNTRC passam a depender do cadastro de `Frota Externa > Motoristas`.
- A validade documental do veículo parceiro passa a depender do cadastro de `Frota Externa > Veículos`.
- As regras de documento fiscal e identificação do destinatário passam a depender do preenchimento da carga em `Cargas e Rotas > Cargas`.
