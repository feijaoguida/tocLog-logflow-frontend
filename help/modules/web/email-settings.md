# Configurações de Servidor de E-mail (SMTP)

A tela de **Configurações de E-mail** (`/dashboard/settings/email`) permite parametrizar o servidor SMTP corporativo responsável pelo envio de notificações automáticas, comunicados de aprovação de compras, alertas de manutenção e convites de novos usuários.

---

## O que faz

- Permite configurar o servidor de envio (Host SMTP, Porta, Criptografia TLS/SSL e Autenticação).
- Armazena credenciais corporativas com segurança e mascaramento de senha.
- Define o remetente oficial das mensagens do sistema (Nome de exibição e E-mail de resposta / *Reply-To*).
- Disponibiliza ferramenta de teste de envio em tempo real para verificar se as configurações estão corretas antes de entrar em produção.
- Registra histórico e status das tentativas de disparo de e-mails.

---

## Quando usar

- Ao implantar uma nova instância do sistema ou configurar o domínio institucional da empresa.
- Quando as credenciais de SMTP forem alteradas pela equipe de infraestrutura ou provedor de e-mail (Google Workspace, Microsoft 365, Amazon SES, SendGrid).
- Quando os colaboradores relatarem não estar recebendo notificações de chamados ou pedidos de compras.

---

## Passo a passo

### 1. Parametrizar o Servidor SMTP
1. Acesse: **Configurações** → **E-mail e Notificações** (`/dashboard/settings/email`).
2. Preencha os dados de conexão do servidor:
   - **Host SMTP** (ex: `smtp.office365.com`, `smtp.gmail.com` ou `email-smtp.us-east-1.amazonaws.com`).
   - **Porta** (`587` para STARTTLS ou `465` para SSL).
   - **Tipo de Segurança** (*TLS/STARTTLS* ou *SSL*).
   - **Usuário SMTP** (geralmente o endereço de e-mail completo do remetente).
   - **Senha SMTP** ou *Senha de Aplicativo*.
3. Defina as opções de remetente:
   - **Nome do Remetente** (ex: `TocLog - Notificações`).
   - **E-mail do Remetente** (ex: `notificacoes@suaempresa.com.br`).
4. Clique em **Salvar Configurações**.

### 2. Realizar Envio de Teste
1. No painel de teste de envio, informe um endereço de e-mail de destino válido (ex: seu e-mail corporativo).
2. Clique no botão **Enviar E-mail de Teste**.
3. Aguarde o retorno:
   - Se bem-sucedido, uma mensagem verde confirmará a entrega do teste.
   - Em caso de falha, o sistema apresentará o código de erro retornado pelo servidor SMTP para diagnóstico imediato.

---

## Campos principais

| Campo | Obrigatório | Descrição |
|---|---|---|
| **Host SMTP** | Sim | Endereço do servidor de correio eletrônico de saída. |
| **Porta** | Sim | Porta TCP de conexão (`587`, `465` ou `25`). |
| **Segurança (TLS/SSL)** | Sim | Protocolo de criptografia da camada de transporte. |
| **Usuário SMTP** | Sim | Conta utilizada para autenticação no servidor. |
| **Senha SMTP** | Sim | Senha ou token de aplicativo gerado no provedor. |
| **Nome do Remetente** | Sim | Nome visível na caixa de entrada do destinatário. |
| **E-mail do Remetente** | Sim | Endereço do remetente autenticado pelo servidor. |

---

## Telas e Imagens

![Configurações de E-mail](/api/help-images/email-settings.png)

---

## Dicas e atalhos

- **Senhas de Aplicativo**: Para provedores como Gmail ou Microsoft 365 com autenticação de dois fatores (2FA), utilize uma *Senha de Aplicativo* em vez da senha pessoal da conta.
- **Porta 587**: Recomendamos o uso da porta `587` com TLS/STARTTLS, pois a porta `25` é frequentemente bloqueada por provedores de internet.

---

## Erros comuns

- **Erro "535 Authentication Failed"**: Credenciais de usuário ou senha incorretas, ou autenticação básica desabilitada no provedor.
- **Erro "Connection Timeout"**: O endereço do Host SMTP ou a Porta informada está bloqueada pelo firewall de rede.

---

## Boas práticas

- Utilize sempre um endereço de e-mail com domínio próprio da empresa e registros SPF/DKIM configurados para evitar que os e-mails caiam na caixa de spam.
- Nunca utilize contas de e-mail de colaboradores individuais para o envio automatizado do sistema.
