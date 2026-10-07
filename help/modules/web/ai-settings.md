# Configurações de Inteligência Artificial

A tela de **Configurações de IA** permite gerenciar provedores de modelos de linguagem, chaves de API com criptografia segura (AES-256-GCM), cotas de consumo, políticas operacionais e governança do uso de inteligência artificial em toda a empresa.

---

## O que faz

- Permite cadastrar e ativar provedores de IA suportados: **OpenAI**, **Google Gemini**, **Anthropic Claude** e **OpenRouter**.
- Criptografa todas as chaves e segredos em repouso com chave mestra segura no backend.
- Define limites de gastos e cotas operacionais por colaborador e por módulo (Compras, Helpdesk, Frotas, RH, Portaria).
- Permite alternar modelos ativos (ex: `gpt-4o`, `gemini-1.5-pro`, `claude-3-5-sonnet`) e ajustar políticas de fallback.
- Exibe métricas de uso de tokens, chamadas realizadas e custos consolidados.

---

## Quando usar

- Ao implantar um novo assistente ou ativar funcionalidades de IA no sistema TocLog.
- Quando for necessário cadastrar ou renovar as chaves de API dos provedores.
- Para restringir ou liberar o uso de IA por perfil de colaborador ou setor.
- Ao monitorar os custos de IA e definir limites mensais de orçamento.

---

## Passo a passo

### 1. Cadastrar ou Editar uma Conexão de Provedor
1. Acesse o menu lateral: **Configurações** → **Inteligência Artificial** (`/dashboard/settings/ai`).
2. Localize a seção **Provedores de Conexão**.
3. Clique em **Conectar Provedor** ou selecione o provedor desejado (ex: *OpenAI*, *Google Gemini*).
4. Informe o nome da conexão, a chave secreta de API (`API Key`) e selecione a organização (quando aplicável).
5. Clique em **Testar Conexão** para validar a comunicação e a cota do provedor.
6. Clique em **Salvar Conexão**.

### 2. Configurar Modelo Padrão e Limites
1. Na aba **Parâmetros e Cotas**, defina o modelo primário para respostas gerais.
2. Configure o teto de tokens por requisição (ex: 4.000 tokens) e a temperatura de resposta recomendada (0.2 a 0.7).
3. Ative as travas de moderação e auditoria de prompts sensíveis.
4. Clique em **Salvar Parâmetros**.

---

## Campos principais

| Campo | Obrigatório | Descrição |
|---|---|---|
| **Provedor** | Sim | Provedor de LLM homologado (*OPENAI*, *GEMINI*, *ANTHROPIC*, *OPENROUTER*). |
| **Nome da Conexão** | Sim | Rótulo descritivo para identificar a credencial. |
| **Chave Secreta (API Key)** | Sim | Token secreto fornecido pelo provedor, mascarado após o salvamento. |
| **Modelo Padrão** | Sim | Identificador oficial do modelo (ex: `gemini-1.5-pro`, `gpt-4o-mini`). |
| **Limite Mensal ($ / Tokens)** | Não | Limite financeiro ou de tokens para bloqueio automático após esgotamento. |
| **Status da Conexão** | Sim | Define se o provedor está ativo para requisições imediatas. |

---

## Telas e Imagens

![Configurações de Inteligência Artificial](/api/help-images/ai-settings.png)

---

## Dicas e atalhos

- **Criptografia em repouso**: Nenhuma chave de IA é salva em texto puro no banco de dados. O backend aplica cifra autenticada AES-256-GCM.
- **Isolamento Multi-tenant**: As conexões cadastradas são exclusivas da sua empresa; nenhum outro cliente possui visibilidade dos seus segredos ou histórico de prompts.
- **Modo Econômico**: Para tarefas rotineiras de classificação, utilize modelos leves como `gemini-1.5-flash` ou `gpt-4o-mini` para reduzir custos.

---

## Erros comuns

- **Erro de conexão inválida (401 / Unauthorized)**: Verifique se a chave de API expirou ou se possui restrições de IP no painel do provedor.
- **Limite de cota excedido (Quota Exceeded)**: Ocorre quando o saldo da conta no provedor (OpenAI/Google) foi esgotado ou quando o limite interno da empresa foi atingido.
- **Modelo não suportado**: Verifique se o nome do modelo está escrito exatamente como suportado pelo provedor.

---

## Boas práticas

- Realize periodicamente o rodízio das chaves de API (pelo menos a cada 90 dias).
- Nunca compartilhe a chave mestra de criptografia no código ou em mensagens.
- Acompanhe semanalmente o painel de métricas de uso para antecipar renovações de créditos.
