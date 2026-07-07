# Visão Geral do Sistema

## O que esta central faz

Esta area organiza a ajuda operacional do LogFlow2 em paginas separadas por funcionalidade. O menu lateral cobre as rotas web e mobile confirmadas na varredura do projeto, e cada artigo foi escrito a partir do que realmente existe no codigo hoje.

## Quando usar

- Para treinar usuarios novos no sistema.
- Para apoiar atendimento interno quando surgir duvida de fluxo.
- Para registrar o que ja esta implementado e o que ainda precisa de validacao.
- Para evoluir a documentacao sem voltar ao arquivo da pagina toda vez.

## Cobertura atual

| Area | Cobertura inicial |
| --- | --- |
| Web | Dashboard, RH, Compras, Frotas, Helpdesk, Logistica, Frota Externa, Cargas e Rotas e Administracao |
| Mobile | App do colaborador e rotas localizadas do app do motorista |
| Ajuda | Guia de manutencao da base e placeholders de prints |

## Como navegar

1. Use a busca do menu lateral para localizar uma funcionalidade.
2. Abra o artigo desejado pela area do produto.
3. Consulte rota, passo a passo, campos da tela, erros comuns e boas praticas.
4. Quando houver badge `Pendente`, trate o artigo como base inicial e valide o comportamento no ambiente.

## Regras desta documentacao

- Nenhuma funcionalidade foi inventada fora das rotas e componentes encontrados.
- Areas com implementacao parcial, rota ausente ou sinais de TODO foram marcadas como `Pendente de validacao`.
- Prints ainda nao capturados foram registrados com nomes sugeridos para facilitar preenchimento futuro.

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `help-visao-geral.png` com a central aberta e o menu lateral visivel.
> Adicionar `help-busca-funcionalidade.png` mostrando a busca filtrando artigos.

## Pendente de validacao

- O menu lateral do dashboard referencia itens como `Org. Chart`, `Helpdesk > Atendimento` e `Helpdesk > Dashboard`, mas essas rotas nao apareceram como paginas implementadas na varredura atual.
- O app do motorista tem sinais de estrutura parcial e deve ser validado em simulador antes de virar material final de treinamento.
