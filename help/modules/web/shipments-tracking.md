# Rastreamento de rotas

## O que esta funcionalidade faz

Exibe as rotas ativas do domínio `shipments` com último ping de localização, drill-down operacional da execução e consulta pontual do tracking da SSW por carga.

## Quando usar

- Para acompanhar rotas em andamento.
- Para verificar o último ping do motorista.
- Para validar rapidamente o contexto operacional antes de intervir.
- Para consultar o retorno da SSW de uma carga específica sem sair do contexto da rota.

## Passo a passo de uso

1. Abra ` /dashboard/shipments/tracking `.
2. Revise a lista de rotas ativas.
3. Consulte o último ping de localização e o status operacional.
4. Use o mapa para localizar rapidamente as rotas com sinal recente.
5. No drill-down da rota, acione `Consultar tracking SSW` na carga desejada quando precisar conferir a leitura do provider.

## Campos e elementos da tela

| Elemento | Explicacao |
| --- | --- |
| Rotas em andamento | Lista das rotas com status operacional |
| Último ping | Latitude, longitude e horário do último envio |
| Tarefas / cargas | Resumo rápido da execução |
| Mapa operacional | Visualização dos últimos pontos conhecidos |
| Falha de leitura | Estado explícito da tela quando a listagem inicial de rotas não conseguir consultar o backend |
| Atualizar leitura | Refresh manual da listagem principal quando a tela já está estável e o operador quer sincronizar novamente a leitura |
| Tentar novamente | Retry visível no card de `Falha de leitura` ou no detalhe da rota quando a consulta ao backend quebrar |
| Consultar tracking SSW | Lookup operacional por carga usando a chave fiscal registrada em `shipments`; a ação fica desabilitada quando a carga ainda não tem essa chave |
| Lookup SSW indisponível | Aviso inline no card da carga explicando que a consulta depende primeiro do preenchimento da chave fiscal em `Cargas`, em vez de sugerir falha técnica da integração |
| Estágio / localização / previsão | Leitura retornada pelo provider para apoiar a operação |

## Dicas de uso

- Use esta visão como acompanhamento rápido da operação.
- Cruce o status da rota com tarefas e ocorrências quando houver divergência.
- O drill-down da rota agora usa os horários reais de início, falha e conclusão das tarefas, evitando confundir a auditoria com timestamps gerados apenas no navegador.
- Quando a carga tiver chave fiscal válida e conexão SSW ativa, use o lookup para comparar a trilha interna com a leitura do provider.
- Se o botão estiver desabilitado, use o aviso `Lookup SSW indisponível` do próprio card para confirmar se a pendência ainda está no cadastro da carga, em vez de tratar o caso como falha da integração.
- Se a lista inicial ou o drill-down da rota falharem, a própria tela agora mostra `Falha de leitura` com `Tentar novamente`; fora desse estado, o refresh normal segue no botão `Atualizar leitura`.
- Quando a rota antes selecionada não aparecer mais após uma atualização, a tela reposiciona automaticamente o drill-down para a primeira rota ainda ativa retornada no refresh.
