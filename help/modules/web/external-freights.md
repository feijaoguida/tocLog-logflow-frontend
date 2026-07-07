# Fretes legados da Frota Externa

## O que esta funcionalidade faz hoje

Esta página agora funciona como ponte de migração. A gestão operacional de fretes saiu da Frota Externa e foi substituída pelo domínio `Cargas e Rotas`.

## Quando usar

- Quando um usuário abrir um link antigo salvo para fretes.
- Ao explicar a separação entre governança de parceiros e operação logística.
- Ao redirecionar a equipe para o módulo novo sem reabrir o fluxo legado.

## Passo a passo de uso

1. Abra ` /dashboard/external-fleet/freights `.
2. Leia o aviso de migração mostrado na tela.
3. Se o seu perfil tiver permissão, use os atalhos exibidos para ` /dashboard/shipments `, ` /dashboard/shipments/routes `, ` /dashboard/external-fleet/drivers ` ou ` /dashboard/external-fleet/vehicles `.
4. Se a tela mostrar `Acesso restrito`, solicite o perfil correto antes de tentar operar a área nova.

## O que mudou

| Antes | Agora |
| --- | --- |
| Fretes operados dentro da Frota Externa | Cargas e rotas operadas em `shipments` |
| Parceiro e operação na mesma trilha | Governança em `external-fleet` e execução em `shipments` |
| Atalho antigo sem contexto de acesso | Ponte de migração com CTAs coerentes com a permissão do perfil |
| Permissão implícita nos botões | Resumo explícito do que está disponível ou indisponível para o perfil antes dos atalhos |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `frota-externa-fretes.png`.

## Dicas de uso

- Use esta página apenas como referência de migração, nunca como retorno ao fluxo antigo.
- Se o perfil não puder abrir `Cargas` ou `Rotas`, a ponte não mostrará atalhos indevidos.
- Use o bloco `Atalhos liberados para este perfil` para confirmar rapidamente se o recorte de permissão do usuário está coerente antes de testar os botões.
- Oriente o time a tratar `Frota Externa` como governança de terceiros, e `Cargas e Rotas` como operação.

## Pendente de validacao

- Validar manualmente no navegador se o estado `Acesso restrito` aparece corretamente para perfis sem acesso aos módulos novos.
