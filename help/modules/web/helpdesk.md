# Chamados de Helpdesk

## O que esta funcionalidade faz

Permite abrir chamados, consultar a lista de tickets e acompanhar conversas dentro do detalhe de cada chamado.

## Quando usar

- Para registrar um problema de suporte.
- Para acompanhar andamento de atendimento.
- Para responder dentro de um ticket ja aberto.

## Passo a passo de uso

1. Acesse ` /dashboard/helpdesk `.
2. Consulte a lista ou clique em `Novo chamado`.
3. Preencha titulo, categoria e descricao.
4. Abra o ticket para acompanhar respostas e enviar novas mensagens.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Titulo | Resumo curto do problema |
| Categoria | Classificacao do chamado |
| Descricao | Contexto detalhado do incidente |
| Mensagens | Conversa dentro do ticket |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `helpdesk-listagem.png`.
> Adicionar `helpdesk-novo.png`.

## Dicas de uso

- Dê um titulo especifico para agilizar triagem.
- Use o detalhe do ticket para manter todo o historico no mesmo lugar.

## Erros ou duvidas comuns

- `Nao vejo categorias`: validar se a API de categorias esta respondendo.
- `Nao encontro um ticket`: revisar se o chamado pertence ao escopo do usuario.

## Boas praticas

- Abrir um ticket por problema.
- Descrever sintomas, impacto e contexto na abertura.
