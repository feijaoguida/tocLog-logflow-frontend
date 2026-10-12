# Configurações de Compras

Concentra as regras operacionais, governança de aprovação e parametrização financeira orçamentária do módulo de compras por empresa.

## Quando usar

- Para decidir o fluxo de aprovação inicial (gestor do departamento ou aprovador delegado).
- Para configurar o escalonamento por faixas de valor financeiro.
- Para definir a quantidade mínima esperada de cotações por processo.
- Para habilitar e parametrizar a **Gestão Orçamentária por Eventos**, definindo nível de governança, ciclo temporal e travas de itens livres.

## Como acessar

1. Acesse `/dashboard/compras/configuracoes`.
2. Navegue entre as abas: `Aprovação`, `Cotações`, `Gestão Orçamentária` e `Departamentos`.
3. Ajuste os parâmetros da empresa.
4. Clique em `Salvar alterações`.

## Estrutura de Abas e Parâmetros

| **Aprovação** | Modo Base | Hierarquia direta pelo gestor ou aprovador fixo delegado |
| | Escalonamento | Valor limite a partir do qual a aprovação sobe na hierarquia da empresa |
| **Cotações** | Mínimo de Cotações | Quantidade mínima de propostas exigidas para definir cotação vencedora |
| | Notificação de Negativa | *(Configurado em Configurações do Sistema -> Compras)* Envia e-mail ao solicitante em caso de cotação recusada |
| **Gestão Orçamentária** | Ativar Orçamento | Habilita ou desativa travas financeiras na criação de pedidos |
| | Nível Orçamentário | Escopo da dotação: `Empresa`, `Filial` ou `Departamento` |
| | Periodicidade | Ciclo de renovação: Semanal, Mensal, Bimestral, Trimestral, Semestral ou Anual |
| | Bloquear Itens Livres | Exige que todos os itens do pedido sejam produtos cadastrados no catálogo |
| **Departamentos** | Sobrescrita Local | Permite a um departamento ter aprovador ou política orçamentária customizada |

## Gestão Orçamentária por Eventos

O controle orçamentário atua diretamente no momento em que as requisições são abertas:
- Cada categoria de produto possui **Eventos Orçamentários** (`ProcurementBudgetEvent`) associados ao escopo configurado (Filial, Empresa ou Departamento).
- O orçamento possui um **teto com tolerância percentual (+X%)**.
- Se a soma dos itens do pedido ultrapassar o saldo disponível acrescido da tolerância, a criação do pedido é bloqueada reativamente no formulário.
- Na virada do ciclo temporal (ex: início do mês), o saldo de gastos é reiniciado automaticamente pelo sistema.

## Observações importantes

- As configurações são salvas por empresa com isolamento multi-tenant.
- Departamentos com gestor cadastrado ganham auto-aprovação direta quando o próprio gestor abre o pedido.
- O histórico de auditoria registra qualquer alteração nas configurações de compras.

---

## Telas e Imagens

![Configurações de Compras e Gestão Orçamentária](/help-images/compras-configuracoes.png)
