# Cotações de Compra e Matriz Comparativa Multi-Fornecedor

O módulo de Cotações gerencia a pesquisa de mercado, a análise comparativa de propostas entre múltiplos fornecedores, a premiação individual ou fracionada por item, a simulação financeira de cenários em tempo real e a emissão atômica de Ordens de Compra.

---

## 1. O que esta funcionalidade faz

- **Fila de Cotações**: Lista todas as requisições aprovadas que aguardam cotação de mercado ou que possuem saldo remanescente a ser adquirido.
- **Matriz Comparativa TocLog**: Visualização tabular cruzando todos os itens solicitados nas linhas com todos os fornecedores participantes nas colunas.
- **Destaque Automático de Menor Preço**: Células com a melhor oferta unitária recebem badge verde `Menor Preço` de forma instantânea.
- **Alerta de Sobrepreço Orçamentário**: Destaque visual em vermelho com badge `⚠️ Acima do orçado (+X%)` quando o preço cotado superar a estimativa inicial aprovada.
- **Premiação Multi-Fornecedor por Item**: Permite homologar fornecedores distintos para cada item da requisição (ex: Pneus no Fornecedor A e Lubrificantes no Fornecedor B).
- **Alocação e Fracionamento de Quantidades**: Distribuição da quantidade demandada entre dois ou mais parceiros quando houver restrições de estoque ou conveniência logística (ex: 60 unidades no Fornecedor A e 40 no Fornecedor B).
- **Painel de Cenários de Compra**: Resumo dinâmico lateral/inferior calculando o custo total da compra, total de fretes rateados, quantidade de Ordens de Compra a emitir e validação de sobrealocação.
- **Emissão em Lote de Ordens de Compra**: Modal de confirmação que emite atomicamente todas as OCs necessárias com campos individuais ou em lote para o **Número de Lançamento Contábil**.
- **Gestão de Saldos e Encerramento**: Acompanhamento de itens com compra parcial (`orderedQuantity`) e encerramento justificado de saldos não adquiridos (`closedQuantity`), liberando orçamentos pendentes.

---

## 2. Passo a Passo Operacional

### Passo 1: Acessar a Cotação e Cadastrar Propostas
1. Acesse o menu `/dashboard/compras/cotacoes`.
2. Selecione a requisição desejada na fila operacional.
3. Na aba **Propostas Individuais**, utilize o botão **Adicionar Fornecedor** para cadastrar as propostas recebidas (fornecedor, preços unitários dos itens, prazo de entrega, valor de frete e condição de pagamento).

### Passo 2: Analisar a Matriz Comparativa
1. Alterne para a aba **Matriz Comparativa**.
2. No cabeçalho, compare as informações gerais de cada parceiro (prazo médio de entrega, frete total e subtotal).
3. Nas linhas da tabela, avalie cada item solicitado:
   - Verifique a célula com badge verde `Menor Preço`.
   - Caso o valor supere a estimativa, verifique o badge vermelho de alerta de sobrepreço.
   - Utilize a opção **Selecionar Menor Preço** no topo para preencher automaticamente o melhor cenário econômico.

### Passo 3: Fracionar Quantidades entre Fornecedores (Se Aplicável)
1. Para dividir a demanda de um item entre múltiplos fornecedores, utilize o campo numérico na célula de cada fornecedor.
2. Defina a quantidade que cada parceiro fornecerá (ex: 60 no Fornecedor A e 40 no Fornecedor B para uma demanda de 100).
3. O sistema valida instantaneamente que a soma alocada não ultrapassa a quantidade demandada, exibindo alerta caso haja sobrealocação.

### Passo 4: Simular Custo no Painel de Cenários e Emitir Ordens
1. Acompanhe no **Painel de Cenários** o resumo financeiro atualizado:
   - Fornecedores premiados e total contratado por parceiro.
   - Rateio de frete e quantidade total de Ordens de Compra que serão geradas.
   - Saldo de demanda restante que ainda não foi alocado.
2. Com o cenário validado, clique no botão **Revisar e Emitir Ordens em Lote**.
3. No modal de confirmação:
   - Confira o espelho de cada Ordem de Compra que será emitida.
   - Preencha o **Número de Lançamento Contábil** padrão ou individual por ordem (para integração com o ERP/Contabilidade).
4. Clique em **Emitir Ordens de Compra**. O sistema gera todas as OCs atomicamente e redireciona para a listagem de ordens.

### Passo 5: Gerenciar Compras Parciais e Encerramento de Saldo
1. Caso apenas parte da demanda tenha sido comprada (ex: compra emergencial de 60 de 100 caixas), a requisição permanecerá em status `IN_QUOTATION` para permitir nova cotação do saldo restante (40 caixas).
2. Se a empresa decidir **não comprar** o saldo restante:
   - Na linha do item, clique em **Encerrar Saldo**.
   - Informe a justificativa obrigatória do encerramento (ex: "Demanda suprida por estoque excedente da filial").
   - O saldo não comprado é descartado com sucesso e a reserva orçamentária correspondente é estornada.

---

## 3. Dicas e Boas Práticas

- **Avalie o Frete Global**: Às vezes, concentrar itens em um único fornecedor pode ser mais vantajoso do que pulverizar as ordens, devido ao custo de múltiplos fretes individuais. O Painel de Cenários calcula esse trade-off em tempo real.
- **Rastreabilidade Contábil**: Informe sempre os números de lançamento do ERP ao emitir as ordens para garantir auditoria transparente entre suprimentos e controladoria.
- **Governança de Saldos**: Nunca deixe saldos pendentes indefinidamente em pedidos antigos; utilize o encerramento justificado para liberar limites de orçamento para outras áreas.

---

## 4. Telas e Imagens

![Matriz Comparativa de Cotações TocLog DS](/help-images/compras-cotacoes-listagem.png)
