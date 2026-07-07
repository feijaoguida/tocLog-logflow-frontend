# Rastreamento legado da Frota Externa

## O que esta funcionalidade faz hoje

Esta página agora funciona como aviso de migração. O rastreamento operacional antigo saiu da Frota Externa e foi substituído pelo fluxo de rotas e tarefas do módulo `Cargas e Rotas`.

## Quando usar

- Quando um usuário abrir um atalho antigo do rastreamento.
- Para explicar a mudança entre o fluxo legado e o novo domínio.

## Passo a passo de uso

1. Abra ` /dashboard/external-fleet/tracking `.
2. Leia o aviso de migração da tela.
3. Se o seu perfil tiver permissão, use os atalhos exibidos para abrir ` /dashboard/shipments/tracking `, ` /dashboard/shipments `, ` /dashboard/external-fleet/drivers ` ou ` /dashboard/external-fleet/vehicles `.
4. Se a tela mostrar `Acesso restrito`, solicite o perfil correto antes de tentar seguir para a operação nova.

## O que mudou

| Antes | Agora |
| --- | --- |
| Viagens/fretes em andamento | Rotas e tarefas em `shipments` |
| Checkpoints da Frota Externa | Ocorrências, POD e localização em rotas/tarefas |
| Rastreamento misturado ao parceiro | Rastreamento ligado à operação logística |
| Ponte com redirecionamento genérico | Ponte com CTAs condicionados à permissão do perfil |
| Permissão implícita nos botões | Resumo explícito do que está disponível ou indisponível para o perfil antes dos atalhos |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `frota-externa-rastreamento.png`.

## Dicas de uso

- Oriente o time a usar o módulo novo para monitorar a execução real.
- Se houver link antigo em documentação interna, atualize para `Cargas e Rotas > Rastreamento`.
- Use o bloco `Atalhos liberados para este perfil` para validar rapidamente se o recorte de acesso mostrado bate com os botões disponíveis na ponte.
- O CTA principal desta ponte deve levar direto para ` /dashboard/shipments/tracking `, deixando `Rotas` como fluxo operacional separado.
- Se o perfil não tiver acesso ao módulo novo, a própria ponte deve bloquear o atalho e mostrar `Acesso restrito`.

## Pendente de validacao

- Validar manualmente no navegador se todos os atalhos internos já apontam para ` /dashboard/shipments/tracking ` em vez do fluxo legado.
