# Ordens de Compra

Centraliza o acompanhamento e a gestão de entrega das Ordens de Compra (OC) geradas a partir das cotações aprovadas, integrando controle financeiro contábil, atualização de preços de catálogo e baixa orçamentária.

## O que esta funcionalidade faz

- **Acompanhamento do Ciclo da OC**: Controle de estados (`Pendente`, `Aprovada`, `Em Entrega`, `Recebimento Parcial`, `Recebida`, `Cancelada`).
- **Número de Lançamento Contábil**: Exibição em badge (`Lanç: #...`) e barra de pesquisa textual rápida por número de lançamento do ERP/Contabilidade.
- **Buffer Circular dos 3 Preços**: Ao aprovar/emitir a Ordem de Compra, o sistema rotaciona os preços do produto automaticamente:
  - O valor da compra atual torna-se a **Posição 1** (preço de referência para futuros pedidos).
  - A antiga Posição 1 vira Posição 2, e a Posição 2 vira Posição 3.
  - A Posição 3 mais antiga é arquivada.
- **Débito e Estorno Orçamentário**:
  - A emissão da OC debita o valor no evento orçamentário da categoria.
  - O cancelamento da OC realiza o estorno transacional automático do valor ao saldo do ciclo vigente.

## Passo a Passo de Uso

1. Acesse `/dashboard/compras/ordens`.
2. Utilize os filtros de busca por fornecedor, número da ordem ou **Número de Lançamento Contábil**.
3. Acompanhe a entrega com o fornecedor.
4. Conforme o material ou serviço for entregue, clique nas ações da ordem para:
   - Registrar recebimento parcial.
   - Confirmar recebimento total (finalizando a ordem).
   - Cancelar ordem (caso necessário, informando justificativa obrigatória e liberando o estorno do orçamento).

## Campos e Elementos da Tela

| Elemento | Explicação |
|---|---|
| **Número da Ordem** | Identificador sequencial interno da OC |
| **Lançamento Contábil** | Identificador de lançamento financeiro/contábil informado na aprovação |
| **Fornecedor** | Razão social e dados do fornecedor vencedor da cotação |
| **Valores Financeiros** | Valor total contratado e valor já recebido/entregue |
| **Ações de Status** | Botões com validação por permissão RBAC (`ORDERS_APPROVE`, `ORDERS_RECEIVE`, `ORDERS_CANCEL`) |

## Boas Práticas

- Mantenha o número de lançamento contábil preenchido para facilitar conciliações com o time financeiro e fiscal.
- Cancele ordens apenas com justificativa plausível para auditoria e conferência do saldo orçamentário estornado.

---

## Telas e Imagens

![Ordens de Compra e Lançamento Contábil](/help-images/compras-ordens.png)
