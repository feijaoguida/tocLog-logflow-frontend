# Ordens de Compra e Emissão Multi-Fornecedor

Centraliza o acompanhamento e a gestão de entrega das Ordens de Compra (OC) geradas a partir das cotações aprovadas, suportando múltiplos fornecedores para uma mesma requisição de compras, rastreamento contábil e buffer de preços de catálogo.

---

## 1. O que esta funcionalidade faz

- **Relação 1:N com Requisições de Compra**: Uma única requisição pode gerar múltiplas Ordens de Compra independentes (uma para cada fornecedor vencedor homologado na Matriz Comparativa).
- **Linhas de Ordem (`PurchaseOrderLine`)**: Cada Ordem de Compra possui suas linhas específicas discriminando produtos, quantidades alocadas, preços unitários contratados e subtotais.
- **Acompanhamento do Ciclo de Vida da OC**: Estados operacionais padronizados (`OPEN`, `CONFIRMED`, `PARTIALLY_RECEIVED`, `CLOSED`, `CANCELLED`).
- **Número de Lançamento Contábil**: Badge visual (`Lanç: #...`) e busca indexada por número contábil gerado no ERP ou sistema financeiro.
- **Buffer Circular dos 3 Preços**: Ao emitir cada linha da Ordem de Compra, o sistema atualiza automaticamente o histórico do produto (`ProductPriceHistory`):
  - O valor unitário contratado vira a **Posição 1** (preço de referência para orçamentos futuros).
  - A antiga Posição 1 move-se para a Posição 2, e a Posição 2 para a Posição 3.
  - A Posição 3 mais antiga é descartada em modelo circular FIFO.
- **Débito Orçamentário Proporcional**:
  - A emissão da OC debita o valor exato contratado de cada linha no orçamento departamental da categoria.
  - O cancelamento da OC realiza o estorno transacional automático do valor ao saldo do ciclo vigente e restaura o saldo da requisição de compra.

---

## 2. Passo a Passo Operacional

### Passo 1: Localizar e Consultar Ordens de Compra
1. Acesse o menu `/dashboard/compras/ordens`.
2. Filtre por fornecedor, status da ordem, código da requisição de origem ou **Número de Lançamento Contábil**.
3. Caso um pedido tenha gerado mais de uma OC, você verá cada ordem listada separadamente com seu respectivo fornecedor e valor contratado.

### Passo 2: Acompanhar Entrega e Recebimento
1. Conforme as mercadorias forem entregues pelo fornecedor:
   - Clique em **Registrar Recebimento Parcial** caso a entrega ocorra em remessas fracionadas.
   - Clique em **Confirmar Recebimento Total** para homologar a entrega definitiva e encerrar a ordem de compra.

### Passo 3: Cancelamento de Ordem com Estorno de Saldo
1. Caso o fornecedor cancele o pedido ou não possa cumprir os prazos:
   - Clique na ação **Cancelar Ordem**.
   - Forneça a justificativa obrigatória do cancelamento.
   - Ao confirmar, o sistema debita/estorna o orçamento comprometido de volta para o centro de custo e reabre o saldo das quantidades na requisição de compra original para nova pesquisa de mercado.

---

## 3. Elementos da Tela

| Elemento | Explicação |
|---|---|
| **Número da Ordem** | Identificador sequencial único da OC (ex: `OC #1234`) |
| **Requisição de Origem** | Link para a requisição de compra mãe e cotação associada |
| **Lançamento Contábil** | Identificador financeiro/contábil informado na homologação |
| **Fornecedor** | Razão social e CNPJ do parceiro contratado para aquela OC |
| **Valor Total da Ordem** | Soma dos valores contratados dos itens da ordem, somados aos fretes proporcionais |
| **Linhas da Ordem** | Detalhamento dos materiais e serviços atribuídos exclusivamente a este fornecedor |

---

## 4. Telas e Imagens

![Ordens de Compra e Lançamento Contábil](/help-images/compras-ordens.png)
