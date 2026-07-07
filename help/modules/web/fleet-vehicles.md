# Veículos

## O que esta funcionalidade faz

Lista a frota interna por tenant e permite abrir o detalhe operacional de cada veículo com timeline, contexto de filial/departamento e atalhos para checklist e manutenção.

## Quando usar

- Para consultar status e contexto operacional da frota interna.
- Para localizar um veículo por placa, modelo, categoria ou filial.
- Para abrir o detalhe do ativo antes de validar checklist, manutenção ou elegibilidade em alocações.

## Passo a passo de uso

1. Acesse ` /dashboard/fleet `.
2. Use a busca para filtrar por placa, modelo, categoria ou filial.
3. Revise os cards de resumo da frota e os status operacionais.
4. Abra `Ver detalhe` no veículo desejado.
5. No detalhe, acompanhe a timeline e use os atalhos para `Novo checklist` ou `Manutenções` quando necessário.

## Campos e elementos da tela

| Elemento | Explicacao |
| --- | --- |
| Atualizar leitura | Recarrega a frota sem sair da tela |
| Busca | Localiza veículos por placa, modelo, categoria ou filial |
| Cards de resumo | Mostram volume da frota, disponibilidade, itens com atenção e KM consolidada |
| Lista de veículos | Resume contexto, quilometragem e status da frota visível no tenant |
| Ver detalhe | Abre timeline, dados técnicos e resumo operacional do item |
| Falha de leitura | Exibe mensagem amigável e retry explícito quando a API não responder |
| Acesso restrito | Bloqueia a área para perfis sem permissão de visualizar a frota |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `frotas-veiculos-listagem.png`.
> Adicionar `frotas-veiculos-detalhe.png`.

## Dicas de uso

- Prefira buscar pela placa quando o modelo for repetido.
- Use o detalhe para validar contexto, filial e histórico antes de agir.
- Se o perfil estiver em modo leitura, acompanhe a frota por aqui e faça a manutenção estrutural com um perfil de gestão apropriado.

## Boas praticas

- Validar status, checklist e manutenção antes de qualquer vínculo operacional em `shipments`.
- Usar a leitura por tenant para evitar conferência cruzada entre empresas diferentes.
