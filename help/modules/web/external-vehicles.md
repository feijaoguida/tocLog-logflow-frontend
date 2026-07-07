# Veículos parceiros

## O que esta funcionalidade faz

Mantém a governança dos veículos de terceiros, separados da operação de cargas e rotas, com foco em capacidade e compliance documental.

## Quando usar

- Ao cadastrar um novo veículo parceiro.
- Ao aprovar ou bloquear um recurso externo.
- Ao consultar um recurso em modo leitura sem abrir manutenção.
- Ao revisar capacidade e vínculo com motorista parceiro.

## Passo a passo de uso

1. Abra ` /dashboard/external-fleet/vehicles `.
2. Use `Novo veículo` para abrir a página dedicada de cadastro, `Editar` para manutenção ou `Visualizar` para leitura completa do recurso.
3. Informe RENAVAM, carroceria, validade documental e observações quando houver.
4. Vincule um motorista parceiro ativo quando fizer sentido.
5. Aprove ou bloqueie o recurso conforme a governança da empresa.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Tipo | Categoria do veículo parceiro |
| Placa | Identificação principal, normalizada pelo sistema sem depender de hífen ou espaço |
| RENAVAM | Registro base do veículo |
| Carroceria | Tipo operacional usado na alocação |
| Validade documental | Sinal de bloqueio/alerta para rota |
| Capacidade de peso / volume | Base para elegibilidade em rotas |
| Motorista vinculado | Relacionamento principal com o parceiro, escolhido a partir das opções ativas da mesma empresa liberadas para a governança de veículos |
| Status | Situação do recurso para uso operacional |

## Dicas de uso

- Use esta tela como governança, não como centro da operação logística.
- Revise capacidade, validade documental e vínculo do parceiro antes de liberar alocação em rota.
- O vínculo do veículo usa opções próprias da governança de veículos e não depende de abrir a listagem geral de motoristas parceiros.
- O backend rejeita vínculo manual com motorista pendente, bloqueado ou de outra empresa, mesmo fora da UI.
- O backend também normaliza a placa antes de validar duplicidade, então `ABC-1234` e `ABC1234` representam o mesmo veículo.
- Como o formulário agora é dedicado, use a navegação nova para revisar dados operacionais e documentais com mais contexto antes de salvar.
- O modo leitura agora também consegue abrir uma página de detalhes do recurso sem depender do formulário de edição.
- Quando a listagem não conseguir consultar o backend, a própria tela mostra `Falha de leitura` com ação visível de `Tentar novamente`; o botão de toolbar `Atualizar leitura` continua disponível para refresh normal sem erro.
- As páginas dedicadas de `Visualizar` e `Editar` também mantêm o usuário no próprio fluxo quando a leitura falha, exibindo `Falha de leitura` com `Atualizar leitura` na própria tela e opção de voltar para a listagem.
- Se o catálogo de motoristas ativos falhar no formulário de veículo, a edição do recurso continua disponível: o vínculo atual é preservado quando existir, a tela explica a falha parcial e oferece retry só das opções de vínculo sem perder o restante da manutenção.

## Boas praticas

- Evite duplicidade por placa.
- Mantenha o vínculo com motorista consistente com a operação real.
