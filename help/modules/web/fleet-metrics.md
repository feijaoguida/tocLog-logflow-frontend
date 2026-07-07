# Dashboard de Frotas

## O que esta funcionalidade faz

Resume status da frota interna por tenant, manutenções ativas e próximas intervenções operacionais da agenda.

## Quando usar

- Para acompanhar disponibilidade da frota interna.
- Para enxergar gargalos de manutenção e bloqueios operacionais.
- Para priorizar liberação, agenda de oficina ou investigação de indisponibilidade.

## Passo a passo de uso

1. Abra ` /dashboard/fleet/metrics `.
2. Revise totais, disponibilidade, manutenção ativa e veículos em uso.
3. Consulte a lista de próximas manutenções dos próximos 7 dias.
4. Use os atalhos para abrir `Veículos` ou `Manutenções` quando precisar aprofundar a leitura.

## Campos e elementos da tela

| Elemento | Explicacao |
| --- | --- |
| Atualizar leitura | Recarrega os indicadores sem sair da tela |
| Total da frota | Quantidade geral de veículos visíveis no tenant |
| Disponíveis / em uso / manutenção | Distribuição operacional do status |
| Próximas manutenções | Lista de alertas futuros com veículo, serviço e data |
| Falha de leitura | Exibe mensagem amigável e retry explícito |
| Acesso restrito | Bloqueia a tela para perfis sem permissão de dashboard |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `frotas-dashboard.png`.

## Dicas de uso

- Use a tela como painel de acompanhamento diário.
- Entre no módulo de manutenção quando surgir exceção ou concentração de ativos em oficina.
- Se algum indicador parecer estranho, compare com `Veículos` e `Manutenções` para validar o detalhe.

## Boas praticas

- Cruzar a leitura com a agenda de manutenção real.
- Validar disponibilidade antes de prometer uso do veículo.
- Revisar o dashboard junto do widget de manutenção quando houver pico de indisponibilidade.
