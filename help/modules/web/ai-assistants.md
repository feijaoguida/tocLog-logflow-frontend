# Catálogo de Assistentes de Inteligência Artificial

A tela de **Assistentes de IA** (`/dashboard/settings/ai/assistants`) permite criar, parametrizar e publicar agentes inteligentes especializados com personas customizadas, instruções de sistema, ferramentas acopladas e bases de conhecimento dedicadas.

---

## O que faz

- Cadastra assistentes especializados para setores específicos (ex: Assistente de Compras, Copiloto de Portaria, Analista de Frota).
- Gerencia o histórico de revisões com controle de versionamento semântico (v1, v2, v3).
- Vincula ferramentas operacionais seguras registradas no catálogo do sistema (ex: `buscar_conhecimento`, `consultar_pedidos_compras`, `verificar_status_frota`).
- Associa acervos de normas e bases de conhecimento para respostas com fundamentação e citações oficiais.
- Suporta status de ciclo de vida: **Rascunho (Draft)**, **Publicado (Published)** e **Arquivado (Archived)**.

---

## Quando usar

- Para criar um assistente especializado em tirar dúvidas de compras, políticas de helpdesk ou regras de viagens.
- Quando precisar ajustar as instruções de sistema (*system prompt*) ou persona de um assistente existente.
- Para habilitar ou revogar ferramentas de execução que a IA pode invocar de forma autônoma.
- Para publicar uma nova versão homologada de um assistente em produção.

---

## Passo a passo

### 1. Criar um Novo Assistente
1. Acesse: **Configurações** → **IA** → **Assistentes** (`/dashboard/settings/ai/assistants`).
2. Clique no botão **Novo Assistente**.
3. Na aba **Identificação**:
   - Defina um identificador único (*Chave do Assistente*, ex: `compras_especialista`).
   - Preencha o nome de exibição e a descrição do papel do agente.
   - Selecione o módulo correspondente (*Compras*, *Helpdesk*, *Frotas*, *Portaria* ou *Geral*).
4. Na aba **Instruções e Persona**:
   - Redija as diretrizes de comportamento do assistente.
   - Defina o tom de voz, regras de validação e restrições éticas/operacionais.
5. Na aba **Ferramentas e Conhecimento**:
   - Marque as ferramentas que o agente tem permissão para acionar.
   - Selecione os documentos de conhecimento autorizados para consulta via RAG.
6. Escolha entre salvar como **Rascunho** ou marcar **Publicar Imediatamente**.
7. Clique em **Salvar Assistente**.

### 2. Versionar e Atualizar um Assistente
1. Na listagem de assistentes, clique em **Editar** no card ou linha do assistente.
2. Modifique as instruções, ferramentas ou bases vinculadas.
3. Ao salvar com uma nova revisão, o sistema incrementa a versão automaticamente e mantém a rastreabilidade do histórico.

---

## Campos principais

| Campo | Obrigatório | Descrição |
|---|---|---|
| **Chave (Key)** | Sim | Identificador técnico imutável do assistente (letras minúsculas e underscores). |
| **Nome** | Sim | Nome amigável apresentado nos chats e seletores de agente. |
| **Módulo** | Sim | Módulo canônico do sistema ao qual o assistente pertence. |
| **Instruções (System Prompt)** | Sim | Diretrizes detalhadas que orientam as respostas e limites do assistente. |
| **Ferramentas Habilitadas** | Não | Funções executáveis permitidas para o agente (ex: consulta documental, busca de dados). |
| **Bases de Conhecimento** | Não | Identificadores de documentos publicados para grounding com RAG. |
| **Versão / Status** | Sim | Versão ativa (`v1`, `v2`...) e estado (`DRAFT`, `PUBLISHED`, `ARCHIVED`). |

---

## Telas e Imagens

![Catálogo de Assistentes de IA](/api/help-images/ai-assistants.png)

---

## Dicas e atalhos

- **Instruções estruturadas**: Inicie o prompt com a missão ("Você é o assistente técnico de frotas da empresa..."), seguido de restrições claras ("Nunca invente números de odômetro") e formato da resposta.
- **Princípio do Menor Privilégio**: Conceda ao assistente apenas as ferramentas estritamente necessárias para a sua função para evitar chamadas indevidas.
- **Restauração de versão**: Caso uma alteração de instruções gere alucinações, você pode reverter facilmente para a revisão anterior visualizando o histórico.

---

## Erros comuns

- **Instruções vagas**: prompts genéricos como "Ajude o usuário" fazem a IA fugir do escopo e fornecer respostas imprecisas.
- **Ferramentas sem permissão**: se o usuário logado não possuir permissão RBAC para a ação (ex: compras), o assistente respeitará as credenciais e bloqueará a chamada com segurança.

---

## Boas práticas

- Teste o assistente no chat interno em modo Rascunho antes de publicar para toda a equipe.
- Vincule sempre a ferramenta `buscar_conhecimento` para que o assistente cite fontes verificadas ao responder sobre procedimentos internos.
