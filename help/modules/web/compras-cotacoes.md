# Cotações de Compra

Gerencia a cotação de propostas entre múltiplos fornecedores, análise comparativa de preços com alerta de sobrepreço, negativa total/parcial de itens e transformação em Ordem de Compra com rastreamento contábil.

## O que esta funcionalidade faz

- **Fila de Cotações**: Lista requisições aprovadas prontas para pesquisa de mercado.
- **Comparativo Multi-Fornecedor**: Registro de propostas de múltiplos parceiros com preços unitários, prazos, fretes e condições de pagamento.
- **Alerta de Sobrepreço Orçamentário**: Destaque visual em vermelho com badge `⚠️ Acima do orçado (+X%)` quando o preço cotado pelo fornecedor for superior à estimativa aprovada no pedido.
- **Negativa Total ou Parcial com Devolução**: Recusa de propostas inadequadas ou itens específicos, com registro obrigatório de justificativa e devolução do item ao solicitante.
- **Notificações por E-mail**: Disparo automático de e-mail ao solicitante e envolvidos informando sobre cotações negadas e motivos da recusa.
- **Definição de Vencedora & Lançamento Contábil**: Escolha da proposta vencedora e emissão da Ordem de Compra solicitando o campo opcional **Número de Lançamento Contábil**.

## Passo a Passo Operacional

### 1. Inserir Propostas de Fornecedores
1. Acesse `/dashboard/compras/cotacoes`.
2. Selecione a requisição na fila e abra os detalhes.
3. Clique em **Adicionar Fornecedor** e informe:
   - Fornecedor cadastrado
   - Preço unitário por item
   - Prazo de entrega (dias)
   - Valor do frete e condição de pagamento
4. Observe os destaques: itens que ultrapassarem o valor estimado original serão sinalizados com badge de alerta para atenção do comprador.

### 2. Negativa Total ou Parcial da Cotação
Caso o fornecedor não atenda às exigências ou os valores estejam inviáveis:
1. Clique no botão **Negar Cotação / Devolver Itens**.
2. No modal interativo:
   - Escolha entre **Negar toda a cotação** ou **Negar itens específicos** (selecionando os itens da lista).
   - Preencha obrigatoriamente o **Motivo da recusa**.
   - Marque a opção **Devolver itens rejeitados de volta ao solicitante**.
3. Confirme a ação: os itens devolvidos recebem status `Cancelado` no pedido com o motivo da recusa gravado e um e-mail é disparado ao solicitante.

### 3. Seleção de Vencedora e Geração de Ordem
1. Após comparar as opções (respeitando o mínimo de cotações parametrizado), clique em **Selecionar como Vencedora**.
2. No modal de confirmação, informe o **Número de Lançamento Contábil** (se aplicável ao ERP/Contabilidade).
3. O sistema gera a Ordem de Compra vinculada e bloqueia a cotação contra edições posteriores (trava anti-fraude).

## Dicas e Boas Práticas

- Sempre verifique o alerta de sobrepreço antes de bater o martelo da compra.
- Ao negar uma cotação, forneça um motivo claro para orientar o solicitante ou gestor do centro de custo.
- Utilize o número de lançamento contábil para cruzar as compras do sistema com o extrato financeiro ou lançamentos do ERP.

---

## Telas e Imagens

![Fila Operacional de Cotações](/help-images/compras-cotacoes-listagem.png)
