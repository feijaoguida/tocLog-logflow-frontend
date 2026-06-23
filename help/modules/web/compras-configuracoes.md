# Configuracoes de Compras

Concentra as regras operacionais configuraveis do modulo de compras por empresa, sem depender de ajuste em codigo para cada mudanca de governanca.

## Quando usar

- Para decidir se a aprovacao inicial vai para o gestor ou para um aprovador delegado.
- Para ajustar a faixa de valor que sobe na hierarquia.
- Para definir a quantidade minima esperada de cotacoes por processo.

## Como acessar

1. Abra ` /dashboard/compras/configuracoes `.
2. Entre na aba `Aprovacao` ou `Cotacoes`.
3. Ajuste os parametros da empresa.
4. Clique em `Salvar configuracoes`.

## O que esta disponivel agora

| Bloco | O que controla |
|---|---|
| Aprovacao | Modo base de aprovacao e aprovador delegado |
| Escalonamento | Valor a partir do qual a aprovacao pode subir na hierarquia |
| Cotacoes | Quantidade minima de cotacoes para definir vencedora |
| Departamentos | Override local acima da regra global da empresa |

## Observacoes importantes

- As configuracoes sao persistidas por empresa.
- Quando necessario, o departamento pode sobrescrever a regra global e operar com seu proprio aprovador/politica.
- O modo de aprovacao ja influencia o envio da requisicao.
- A quantidade minima de cotacoes ja influencia a definicao da vencedora.
- O tratamento especial de urgencia foi aberto nesta area como parametro de governanca e pode ganhar enforcement adicional nas proximas ondas.

## Placeholder de imagem

> Adicionar `compras-configuracoes.png`.
