# Configuracoes de RH

## O que esta funcionalidade faz

Cria uma area de governanca dentro de `Recursos Humanos` para concentrar decisoes operacionais configuraveis.

Nesta etapa a tela ja prepara:

- roteamento do feedback para empresa
- controle de override explicito para 1 para 1
- sinalizacao visual de visibilidade do RH
- espaco para futuras regras do RH

## Quando usar

- Quando o RH precisar revisar quem recebe primeiro um feedback para empresa.
- Quando for necessario formalizar a politica de visibilidade do modulo.
- Quando novas regras configuraveis forem incorporadas ao RH.

## Passo a passo de uso

1. Abra `Recursos Humanos > Configuracoes`.
2. Entre na aba `Feedbacks`.
3. Revise o destino inicial do feedback para empresa.
4. Revise as chaves de governanca do 1 para 1.
5. Salve as configuracoes para persistir a governanca por empresa.

## Campos e elementos da tela

| Campo | Explicacao |
| --- | --- |
| Destino inicial | Decide se o feedback para empresa vai primeiro para responsavel da filial, RH geral ou ambos |
| Permitir override explicito | Mantem a possibilidade de o RH visualizar 1 para 1 somente quando houver autorizacao formal |
| Exibir label de visibilidade | Controla a exibicao do aviso de que RH tambem acompanha a thread |

## Regras importantes

> [!IMPORTANT]
> A politica funcional atual continua fixa: RH so enxerga 1 para 1 em denuncias e casos explicitamente autorizados.

## Prints sugeridos

> [!IMPORTANT] Capturas pendentes
> Adicionar `feedbacks-configuracoes-rh.png`.

## Dicas de uso

- Use essa area como ponto unico para decisoes configuraveis do RH.
- Registre a politica de override junto com a governanca interna da empresa.

## Pendente de validacao

- Inclusao de novas chaves alem do modulo de feedback.
- Uso automatico do roteamento salvo para definir responsavel primario do feedback para empresa.
