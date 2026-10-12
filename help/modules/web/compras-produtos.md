# Produtos e Catálogo de Compras

Mantém o catálogo unificado de materiais e serviços para compras, unificando códigos, categorias, unidades de medida e o histórico dos 3 últimos preços praticados.

## O que esta funcionalidade faz

- **Catálogo Unificado**: Cadastro de produtos com nome, descrição, categoria e unidade de medida.
- **Histórico dos 3 Últimos Preços**: Painel visual exibindo as 3 últimas compras realizadas para o produto:
  - **Posição 1 (Mais Recente)**: Preço de referência usado como valor sugerido na criação de novos pedidos.
  - **Posição 2**: Preço da penúltima compra realizada.
  - **Posição 3**: Preço da antepenúltima compra realizada.
  - Cada posição exibe o valor unitário, a data da transação e o número da Ordem de Compra de origem.
- **Vínculo com Eventos Orçamentários**: A categoria do produto determina qual evento orçamentário e teto de tolerância serão verificados durante a emissão dos pedidos.

## Passo a Passo de Uso

1. Acesse `/dashboard/compras/cadastros/produtos`.
2. Busque pelo nome do produto ou clique em **Novo Produto**.
3. Preencha nome, descrição, selecione a categoria de compras e a unidade de medida.
4. Ao clicar em um produto cadastrado, confira a aba/seção **Histórico de Preços**:
   - Os valores das posições 1, 2 e 3 são atualizados automaticamente pelo sistema sempre que uma Ordem de Compra para o produto é finalizada.

## Dicas e Boas Práticas

- Mantenha os produtos devidamente classificados em suas categorias corretas para garantir que as travas orçamentárias atuem no centro de custo adequado.
- Consulte a Posição 1 para validar se a cotação de mercado atual está condizente com as compras anteriores da empresa.

---

## Telas e Imagens

![Catálogo de Produtos e Histórico de Preços](/help-images/produtos-listagem.png)
