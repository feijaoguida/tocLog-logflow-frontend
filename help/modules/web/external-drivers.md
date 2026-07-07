# Motoristas

## O que esta funcionalidade faz

Mantém o cadastro e a governança de motoristas da frota externa com documento, contato, sinais de compliance e status operacional.

## Quando usar

- Ao incluir novo motorista terceirizado.
- Ao atualizar dados de contato.
- Ao consultar um parceiro em modo leitura sem abrir edição.
- Ao aprovar, bloquear ou revisar a base de parceiros externos.

## Passo a passo de uso

1. Abra ` /dashboard/external-fleet/drivers `.
2. Use `Novo motorista` para abrir a página dedicada de cadastro, `Editar` para manutenção ou `Visualizar` para leitura completa do parceiro.
3. Informe nome, documento, telefone e email.
4. Preencha CNH, situação do RNTRC e observações internas quando houver.
5. Salve e confirme a situação do parceiro na base.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Nome | Identificacao do motorista |
| Documento | Registro principal do condutor |
| Telefone / email | Contatos operacionais |
| CNH | Numero, categoria e validade para apoiar a alocacao |
| RNTRC | Codigo, situacao e validade do registro do transportador |
| Observacoes | Notas internas de homologacao e operacao |
| Status | Situação do parceiro para uso em rotas futuras |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `frota-externa-motoristas.png`.

## Dicas de uso

- Valide documento antes de confirmar cadastro.
- Mantenha telefone, validade da CNH e RNTRC atualizados.
- Use esta tela para governança; a operação logística acontece em `Cargas e Rotas`.
- Como o formulário agora é dedicado, aproveite a navegação separada para revisar dados longos sem depender de modal.
- O modo leitura agora também pode abrir uma página de detalhes sem receber ações de edição indevidas.
- Quando a listagem não conseguir consultar o backend, a própria tela mostra `Falha de leitura` com ação visível de `Tentar novamente`; o botão de toolbar `Atualizar leitura` continua disponível para refresh normal sem erro.
- As páginas dedicadas de `Visualizar` e `Editar` também mantêm o usuário no próprio fluxo quando a leitura falha, exibindo `Falha de leitura` com `Atualizar leitura` na própria tela e opção de voltar para a listagem.

## Boas praticas

- Evitar cadastros duplicados do mesmo condutor.
- Revisar contato antes de escalar viagem.
