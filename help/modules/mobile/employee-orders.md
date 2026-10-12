# Pedidos de Compra Mobile

Permite abrir solicitações de compra pelo aplicativo do colaborador através de um fluxo guiado em 3 etapas, com verificação de orçamento, preço sugerido e acompanhamento detalhado de itens e cotações.

## O que esta funcionalidade faz

- **Wizard em 3 Etapas**: Criação progressiva adaptada para telas de toque:
  - **Etapa 1 (Dados Gerais e Departamento)**: Seleção do departamento solicitante com busca e detecção automática de gestor para **Auto-Aprovação Direta**.
  - **Etapa 2 (Itens, Preço Sugerido e Trava Orçamentária)**: Seleção de produtos do catálogo com carregamento instantâneo do preço sugerido (Posição 1), campos para links de e-commerce e contatos WhatsApp, além de trava bloqueante em caso de estouro do orçamento (+X% de tolerância).
  - **Etapa 3 (Conferência e Envio)**: Espelho de conferência do pedido antes da submissão final.
- **Rastreabilidade de Itens Negados**: Alerta destacado em vermelho para itens que foram recusados na cotação com exibição do motivo da recusa.
- **Ações Rápidas de Compra**: Botões touch para abrir link de e-commerce diretamente no navegador, discar para a loja ou abrir conversa no WhatsApp.
- **Número de Lançamento Contábil**: Exibição do número de lançamento no resumo operacional quando a ordem é finalizada.

## Passo a Passo: Criando um Pedido pelo App

1. Abra a aba **Mais** e toque em **Pedidos**.
2. Toque no botão de **Novo Pedido**.
3. **Etapa 1 - Contexto**:
   - Toque para selecionar o departamento solicitante.
   - Caso você seja gestor do departamento ou diretor, um banner verde confirmará a **Auto-Aprovação Ativa**.
   - Preencha justificativa, prioridade e data desejada. Toque em **Avançar: Itens do Pedido**.
4. **Etapa 2 - Itens**:
   - Toque em **Produto Cadastrado** para escolher um item pelo nome.
   - O preço estimado sugerido da Posição 1 será preenchido automaticamente.
   - Adicione links da loja e telefone/WhatsApp se tiver.
   - *Atenção à Trava Orçamentária*: Se o total superar o teto com tolerância do departamento, um card vermelho bloqueará o avanço até o ajuste do valor ou quantidade.
   - Toque em **Revisar Pedido**.
5. **Etapa 3 - Conferência**:
   - Revise o espelho do pedido e o total consolidado.
   - Toque em **Confirmar e Enviar**.

## Detalhes do Pedido no Mobile

Na lista de pedidos, toque em qualquer solicitação para ver:
- Status atual do pedido e data de abertura.
- Se houver itens recusados na cotação, um banner indicará a recusa e cada item mostrará o motivo detalhado informado pelo comprador.
- Toque em **Ver no e-commerce** para abrir o site do produto ou **WhatsApp** / **Ligar** para contatar a loja diretamente.
- Número de Lançamento Contábil ERP quando a ordem tiver sido emitida.
- Trilha de eventos completa com auditoria de cada etapa do processo.
