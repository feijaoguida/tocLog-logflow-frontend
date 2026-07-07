# Manutenções

## O que esta funcionalidade faz

Controla a agenda e o histórico de manutenções da frota interna, com leitura por tenant, estados explícitos de erro e abertura guiada de manutenção preventiva ou corretiva.

## Quando usar

- Ao abrir manutenção programada ou corretiva para um veículo interno.
- Para consultar histórico e agenda da frota visível no tenant.
- Para acompanhar intervenções que podem bloquear o veículo na operação.

## Passo a passo de uso

1. Acesse ` /dashboard/fleet/maintenance `.
2. Se o perfil tiver permissão de gestão, clique em `Nova manutenção`.
3. Escolha o veículo, informe tipo, origem, descrição, data e custo estimado.
4. Salve para registrar a manutenção.
5. Use `Atualizar leitura` quando precisar recarregar a agenda sem sair da tela.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Nova manutenção | Abre o formulário de agendamento |
| Atualizar leitura | Recarrega a agenda na própria tela |
| Veículo | Item que receberá o serviço |
| Tipo | Preventiva ou corretiva |
| Origem | Interna ou externa |
| Data agendada | Momento planejado da manutenção |
| Descrição | O que foi executado ou precisa ser feito |
| Falha de leitura | Exibe mensagem amigável e retry explícito |
| Leitura parcial | Mantém a agenda ou o cadastro de nova manutenção utilizável quando só um dos blocos falhar |
| Acesso restrito | Bloqueia a área para perfis sem permissão de visualização |

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `frotas-manutencoes.png`.

## Dicas de uso

- Descreva o serviço de forma rastreável.
- Revise o veículo selecionado antes de salvar.
- Em manutenção corretiva, acompanhe se o impacto operacional já apareceu na frota e na elegibilidade de alocação.
- Se apenas a agenda ou apenas a lista de veículos elegíveis falhar, a tela agora preserva o bloco válido e mostra `Leitura parcial` para evitar que toda a área fique indisponível ao mesmo tempo.

## Boas praticas

- Manter a manutenção preventiva em dia.
- Registrar manutenção corretiva assim que ela ocorrer.
- Usar esta agenda junto do detalhe do veículo para entender o histórico completo do ativo.
