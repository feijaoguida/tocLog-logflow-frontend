# Checklists

## O que esta funcionalidade faz

Organiza inspeções da frota interna e oferece um fluxo guiado para iniciar e concluir um checklist operacional por veículo.

## Quando usar

- Antes de liberar ou receber um veículo.
- Para registrar avarias, não conformidades e observações relevantes.
- Para manter histórico operacional que atualiza KM e status do ativo.

## Passo a passo de uso

1. Abra ` /dashboard/fleet/checklists `.
2. Consulte checklists anteriores ou entre em `Novo checklist`.
3. No passo 1, selecione o veículo e o tipo de inspeção.
4. No passo 2, revise KM, marque os itens como `OK` ou `NOK` e registre observações finais.
5. Finalize o checklist para registrar a trilha operacional do veículo.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Novo checklist | Inicia uma nova inspeção operacional |
| Atualizar leitura | Recarrega a listagem ou os veículos do fluxo sem sair da tela |
| Veículo | Alvo da inspeção |
| Tipo do checklist | Contexto operacional da inspeção |
| Itens do checklist | Verificações operacionais marcadas como `OK` ou `NOK` |
| Observações finais | Texto livre para dano, ressalva ou alerta |
| Falha de leitura | Exibe mensagem amigável e retry explícito |
| Atualização parcial do catálogo | Mantém a última lista válida de veículos no passo 1 quando um refresh falhar |
| Acesso restrito | Bloqueia histórico ou execução para perfis sem permissão |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `frotas-checklists-listagem.png`.
> Adicionar `frotas-checklists-novo.png`.

## Dicas de uso

- Preencha observação sempre que encontrar avaria ou ressalva relevante.
- Registre o checklist o mais perto possível da inspeção real.
- Revise a KM inicial sugerida pelo sistema antes de concluir a inspeção.
- Se a atualização do catálogo de veículos falhar depois da primeira carga, o passo 1 agora preserva a última lista válida para você não perder o contexto da inspeção.

## Boas praticas

- Não deixar checklist para depois da operação.
- Usar linguagem objetiva nas observações.
- Conferir no detalhe do veículo se a timeline refletiu KM e status após a conclusão.
