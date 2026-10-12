# Pedidos de Compra

Permite abrir, acompanhar, gerenciar o fluxo de aprovação e imprimir solicitações de compras com controle orçamentário em tempo real e auto-aprovação hierárquica.

## O que esta funcionalidade faz

- **Wizard em 3 Etapas**: Processo guiado de criação dividido em Dados Gerais, Itens com Verificação Orçamentária e Relatório de Conferência.
- **Validação Orçamentária Reativa**: Bloqueia inclusão de itens que excedam a dotação do ciclo (+X% de tolerância).
- **Preço Estimado Sugerido**: Preenchimento automático do valor unitário de referência com base na Posição 1 do histórico de compras do produto.
- **Auto-Aprovação para Gestores**: Pedidos criados por gestores de departamento ou diretores são aprovados instantaneamente sem fila de espera.
- **Rastreabilidade de Recusa**: Exibição destacada de itens rejeitados na etapa de cotação com o motivo da recusa.
- **Espelho e Impressão**: Geração de documento formal formatado para impressão ou exportação em PDF.

## Fluxo do Wizard de Criação (3 Etapas)

### Etapa 1: Dados Gerais e Contexto
1. **Departamento Solicitante**: Selecione a área responsável pela compra.
   - *Nota de Auto-Aprovação*: Se o solicitante for o gestor titular do departamento ou perfil diretor, um aviso em verde confirmará que o pedido será aprovado imediatamente após o envio.
2. **Justificativa**: Explicação detalhada da necessidade operacional.
3. **Prioridade**: Baixa, Normal, Alta ou Urgente.
4. **Data Desejada**: Previsão limite para atendimento da necessidade.
5. **Observações**: Instruções complementares de entrega ou particularidades.

### Etapa 2: Itens, Preço Sugerido e Trava Orçamentária
1. **Produto do Catálogo**: Selecione o produto cadastrado (ou descrição livre se autorizado).
2. **Preço Estimado Sugerido**: O sistema carrega automaticamente o valor da **Posição 1** (último preço praticado em ordens anteriores). O solicitante pode ajustar se necessário.
3. **Painel de Saldo Orçamentário**: Apresenta em tempo real o saldo disponível do evento orçamentário da categoria e a tolerância permitida.
4. **Trava Bloqueante**: Caso o item supere o limite `Saldo Disponível × (1 + Tolerância%)`, um alerta em vermelho bloqueia o avanço até o ajuste do valor ou quantidade.
5. **Links e Contatos**: Campos para informar link de e-commerce, telefone da loja ou WhatsApp para agilizar a cotação pelo comprador.

### Etapa 3: Relatório de Conferência (Espelho do Pedido)
1. Resumo formal de todos os dados do pedido e status da validação orçamentária.
2. Conferência dos itens, quantidades, valores estimados e total consolidado.
3. Clique em **Enviar Pedido** para submeter ao fluxo.

## Tela de Detalhes do Pedido

- **Status Operacional**: `Rascunho`, `Aguardando Aprovação`, `Aprovado`, `Em Cotação`, `Ordem Gerada`, `Finalizado` ou `Cancelado`.
- **Itens Recusados na Cotação**: Se o comprador rejeitar um item durante a cotação e devolvê-lo ao solicitante, o item é sinalizado em vermelho como `Cancelado / Recusado`, com a exibição do box com o **motivo da recusa na cotação**.
- **Ações Rápidas de Links**: Links de e-commerce e botões de contato informados na solicitação ficam clicáveis na listagem de itens.
- **Trilha de Auditoria (Timeline)**: Linha do tempo completa registrando quem criou, aprovou, cotou ou negou cada etapa.
- **Impressão**: Botão `Imprimir` para gerar espelho com carimbos auditáveis.

## Dicas e Boas Práticas

- Sempre consulte o preço sugerido (Posição 1) para ter uma base realista do custo de mercado.
- Inclua links de produtos na internet ou contato direto de fornecedores conhecidos para acelerar o processo de cotação.
- Caso o orçamento esteja bloqueado, converse com a liderança para realocação de saldo orçamentário entre eventos da categoria.

---

## Telas e Imagens

![Listagem de Pedidos de Compra](/help-images/compras-pedidos-listagem.png)

![Wizard de Criação de Novo Pedido em 3 Etapas](/help-images/compras-pedidos-formulario.png)
