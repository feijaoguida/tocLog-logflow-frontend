# Logs de Erros e Auditoria Técnica

A tela de **Logs de Erro** (`/dashboard/settings/error-logs`) centraliza o monitoramento técnico de exceções, falhas de API, erros de validação e quebras de execução ocorridas nas camadas Frontend, Backend e Mobile do sistema TocLog.

---

## O que faz

- Coleta falhas operacionais em modo silencioso (*fire-and-forget*), garantindo overhead zero e sem interromper o fluxo da aplicação para o usuário final.
- Identifica a origem do erro: **FRONTEND**, **BACKEND** ou **MOBILE**.
- Registra detalhes forenses completos: rota da tela, ação disparada, código de status HTTP (400, 401, 404, 500), payload da requisição sanitizado (sem senhas ou tokens) e rastreamento completo de pilha (*stack trace*).
- Associa o registro ao usuário logado, empresa ativa, endereço IP e navegador (*User Agent*).
- Permite pesquisar, filtrar por módulo/período e copiar mensagens técnicas com um clique.
- Oferece rotina de expurgo automático (cron diário às 03:00) e botão de expurgo manual configurável por retenção em dias.

---

## Quando usar

- Quando um operador relatar um comportamento inesperado ou erro na tela e for necessário investigar a causa raiz.
- Durante homologações e novos deploys para verificar se novas rotas estão gerando exceções não tratadas.
- Para inspecionar requisições com falha de validação (ex: campos obrigatórios ausentes em formulários).
- Para executar limpeza preventiva de registros antigos na base de dados.

---

## Passo a passo

### 1. Inspecionar uma Falha Recente
1. Acesse: **Configurações** → **Logs de Erro** (`/dashboard/settings/error-logs`).
2. Utilize os filtros rápidos no cabeçalho:
   - Selecione a **Origem** (*Frontend*, *Backend* ou *Mobile*).
   - Filtre por **Status Code** (ex: *400* para validações, *500* para erros de servidor).
   - Digite um termo de busca (ex: nome do módulo, mensagem ou e-mail do usuário).
3. Na tabela, clique na linha do registro desejado para abrir a gaveta lateral de **Detalhes Técnicos**.
4. Examine as abas:
   - **Resumo**: mensagem traduzida, tela, ação e usuário afetado.
   - **Causa Raiz / Stack Trace**: rastreamento completo com linhas de código afetadas.
   - **Payload Sanitizado**: dados que foram enviados pelo formulário com senhas omitidas como `[REDACTED]`.

### 2. Executar Expurgo Manual de Registros Antigos
1. No topo da página, clique no botão **Limpar Registros Antigos**.
2. No modal de confirmação, defina a retenção em dias (ex: manter apenas os últimos 30 dias).
3. Clique em **Confirmar Expurgo**. O sistema removerá com segurança os logs anteriores ao período informado.

---

## Campos principais

| Campo | Descrição |
|---|---|
| **Origem (Source)** | Camada em que a falha se manifestou (`FRONTEND`, `BACKEND` ou `MOBILE`). |
| **Mensagem de Erro** | Resumo amigável ou mensagem do erro lançado pela aplicação. |
| **Status Code** | Código HTTP de resposta (ex: `400` Bad Request, `403` Forbidden, `500` Internal Error). |
| **Tela / Rota** | URL ou rota interna em que a tela se encontrava no momento da falha. |
| **Ação** | Nome do método ou evento que originou o erro (ex: `POST /fleet/resources`). |
| **Usuário e Empresa** | Identificação do operador logado e ID da empresa vinculada à sessão. |
| **Data e Hora** | Timestamp com precisão de segundos no fuso horário local. |

---

## Telas e Imagens

![Logs de Erro e Auditoria](/help-images/error-logs.png)

---

## Dicas e atalhos

- **Botão Copiar Detalhes**: Na gaveta lateral, utilize o botão "Copiar Causa Raiz" para colar a stack trace diretamente na conversa com o suporte técnico ou no chamado de TI.
- **Sanitização ativa**: O sistema descarta automaticamente campos sensíveis como `password`, `senha`, `token`, `secret`, `authorization` antes de persistir o log.
- **Auditoria de 400**: Erros de validação HTTP 400 agora também são salvos, permitindo descobrir exatamente qual campo causou rejeição no backend.

---

## Erros comuns

- **Confundir erro de validação com falha interna**: Status 400 indica que dados enviados pelo usuário violaram regras de negócio ou DTO; status 500 indica falha não tratada de código ou infraestrutura.
- **Permissão de acesso**: A tela de logs exige a permissão `SYSTEM.ERROR_LOGS_VIEW`. Apenas administradores e equipes de suporte possuem visibilidade.

---

## Boas práticas

- Estabeleça uma rotina semanal de revisão dos logs para identificar falhas silenciosas antes que os usuários as reportem.
- Mantenha a retenção padrão em 30 a 60 dias para economizar espaço em disco sem perder histórico relevante.
