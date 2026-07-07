# Planejamento legado da Frota Externa

## O que esta funcionalidade faz hoje

Esta rota foi mantida como ponte de migração. O planejamento operacional saiu da Frota Externa e foi movido para o módulo `Cargas e Rotas`.

## Quando usar

- Ao acessar um link antigo salvo nos favoritos.
- Ao orientar equipes que ainda conhecem o nome anterior da funcionalidade.
- Ao redirecionar a operação para o módulo novo.

## Passo a passo de uso

1. Acesse ` /dashboard/external-fleet/planning `.
2. Leia o aviso de migração exibido na tela.
3. Se o seu perfil tiver permissão, use os atalhos exibidos para ` /dashboard/shipments `, ` /dashboard/shipments/routes `, ` /dashboard/external-fleet/drivers ` ou ` /dashboard/external-fleet/vehicles `.
4. Se a tela mostrar `Acesso restrito`, solicite o perfil correto antes de tentar operar o módulo novo.

## O que mudou

| Antes | Agora |
| --- | --- |
| Mercadorias e fretes na Frota Externa | Cargas e rotas em `shipments` |
| Mistura de parceiro com operação | Separação entre governança e logística |
| Planejamento na área de terceiros | Planejamento em `Cargas e Rotas` |
| Ponte com atalhos fixos | Ponte com CTAs condicionados à permissão do perfil |
| Permissão implícita nos botões | Resumo explícito do que está disponível ou indisponível para o perfil antes dos atalhos |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `frota-externa-planejamento.png`.

## Dicas de uso

- Use `Frota Externa` apenas para cadastro, homologação e gestão de parceiros.
- Use `Cargas e Rotas` para operação logística, alocação e execução.
- Use o bloco `Atalhos liberados para este perfil` para conferir rapidamente se os CTAs novos respeitam o recorte real do usuário antes de navegar.
- Se o perfil não tiver acesso aos módulos novos, a página deve mostrar apenas `Acesso restrito`, sem abrir atalhos indevidos.

## Boas praticas

- Não volte a abrir novas operações na rota antiga.
- Atualize treinamentos internos para apontar o módulo novo.
