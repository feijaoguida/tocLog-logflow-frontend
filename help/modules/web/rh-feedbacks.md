# Feedbacks Web

## O que esta funcionalidade faz

Centraliza a caixa operacional do modulo de feedback no dashboard web.

Ela concentra:

- feedback para empresa
- feedback da empresa para colaborador
- feedback 1 para 1
- sinalizacao de privacidade e visibilidade do RH
- atalhos para configuracoes e dashboard do RH

## Quando usar

- Quando o colaborador ou gestor precisa registrar um feedback estruturado.
- Quando o RH precisa acompanhar threads abertas e identificar denuncias.
- Quando for necessario confirmar visualmente se um feedback 1 para 1 tambem esta visivel para RH.

## Passo a passo de uso

1. Abra `Recursos Humanos > Feedbacks`.
2. Revise os cards de resumo da caixa.
3. Abra uma thread para ver status, tipo, categoria e metadados.
4. Use `Novo feedback` para abrir o composer.
5. Se precisar governar o roteamento, acesse `Recursos Humanos > Configuracoes`.

## Campos e elementos da tela

| Elemento | Explicacao |
| --- | --- |
| Status | Mostra se o feedback esta aberto, em analise, respondido ou concluido |
| Destinatario | Seleciona o colaborador da mesma empresa quando o feedback for `1 para 1` ou corporativo |
| Label de visibilidade | Indica se um feedback 1 para 1 tambem esta visivel para RH |
| Tipo | Separa feedback para empresa, da empresa para colaborador e 1 para 1 |
| Categoria | Classifica sugestao, reclamacao, elogio, ideia de melhoria ou denuncia |
| Confirmacao de leitura | Pode ser exigida quando a empresa envia feedback para colaborador |

## Regras importantes

> [!IMPORTANT]
> Feedback 1 para 1 so fica visivel para RH em denuncias ou quando houver autorizacao explicita de override.

> [!NOTE]
> O autor anonimo continua vinculado internamente para auditoria, mas nao deve aparecer para usuarios comuns.

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `feedbacks-listagem.png`.
> Adicionar `feedbacks-detalhe-conversa.png`.

## Dicas de uso

- Use o label de visibilidade antes de compartilhar uma thread com o RH.
- Em denuncias, registre contexto suficiente para facilitar a triagem.
- Em feedback da empresa para colaborador, valide se a confirmacao de leitura precisa ser obrigatoria.
- No composer, selecione o destinatario apenas entre colaboradores da mesma empresa.

## Possiveis erros ou duvidas comuns

### Nao encontrei o nome do autor

O feedback pode ter sido enviado anonimamente. Nesse caso o sistema preserva o vinculo apenas para auditoria interna.

### RH nao consegue ver um 1 para 1

Isso e esperado quando a thread nao e denuncia e nao recebeu autorizacao explicita de visibilidade.

## Boas praticas

- Escolha o tipo correto antes de iniciar a thread.
- Nao use `ONE_TO_ONE` para demandas que dependem de tratamento institucional imediato sem classificar o caso adequadamente.
- Ao registrar denuncia, deixe fatos e impacto o mais objetivos possivel.

## Pendente de validacao

- Fluxo real de anexos no composer.
- Matriz completa de permissoes por perfil no backend.
- Persistencia tenant-aware das configuracoes de RH.
