# Portaria e Controle de Acesso

A tela de **Portaria** (`/dashboard/portaria`) gerencia o fluxo operacional de entrada e saída de veículos, motoristas, colaboradores, prestadores de serviço e visitantes nas instalações físicas e centros de distribuição da empresa.

---

## O que faz

- Controla o acesso físico através de registros de **Check-in** e **Check-out** com data e hora precisa.
- Realiza identificação por crachás físicos, leitura de código de barras / QR Code ou digitação de documento (CPF/CNH/Placa).
- Registra evidências fotográficas na entrada e saída (foto do motorista, odômetro, lacre e estado da carga).
- Exibe o status da permanência no pátio com contagem regressiva ou tempo total de estadia.
- Suporta fluxo de autorização prévia para visitantes e prestadores de serviço com validação de documento de integração de segurança.
- Permite vincular veículos aos motoristas no momento do acesso.

---

## Quando usar

- Na guarita ou portaria de qualquer unidade operacional no momento em que um veículo ou visitante chega.
- Ao liberar a saída de caminhões após carregamento/descarregamento.
- Para verificar a lista de pessoas e veículos atualmente presentes dentro da planta industrial.
- Durante auditorias de segurança para inspecionar fotos de entrada e horários de movimentação.

---

## Passo a passo

### 1. Registrar Entrada (Check-in)
1. Acesse: **Operacional** → **Portaria** (`/dashboard/portaria`).
2. Clique no botão de ação rápida **+ Registrar Entrada (Check-in)**.
3. Selecione o tipo de fluxo:
   - **Veículo Operacional** (caminhões próprios ou de terceiros com carga).
   - **Visitante / Prestador de Serviços**.
   - **Colaborador**.
4. Informe os dados de identificação:
   - Placa do veículo ou CPF do indivíduo.
   - Nome completo e empresa de origem.
   - Número do crachá de visitante entregue na portaria.
5. Registre os dados da carga (se aplicável): número do lacre, odômetro de entrada e nota fiscal.
6. Se a câmera estiver habilitada, capture a foto do motorista e da placa.
7. Clique em **Confirmar Entrada**. O registro passará para o estado **No Pátio**.

### 2. Registrar Saída (Check-out)
1. Na lista de movimentações ativas (**Presentes no Pátio**), localize o registro pela placa ou nome.
2. Clique em **Registrar Saída (Check-out)**.
3. Confira a conferência de saída: odômetro final, número do lacre de saída e devolução do crachá físico.
4. Clique em **Confirmar Saída**. O status será atualizado para **Finalizado**.

---

## Campos principais

| Campo | Obrigatório | Descrição |
|---|---|---|
| **Tipo de Acesso** | Sim | Categoria da movimentação (*VEICULO*, *VISITANTE*, *PRESTADOR*). |
| **Placa / Identificador** | Sim | Placa do caminhão ou número do documento principal do visitante. |
| **Nome Completo** | Sim | Nome do motorista ou passageiro. |
| **Número do Crachá** | Sim | Identificação física do crachá temporário fornecido na portaria. |
| **Motivo da Visita / Carga** | Não | Descrição da ordem de serviço, doca de entrega ou departamento de destino. |
| **KM e Lacre (Entrada/Saída)**| Condicional| Dados de conferência física para transporte de mercadorias. |
| **Evidências Fotográficas** | Opcional | Fotos de segurança capturadas no totem ou câmera web da portaria. |

---

## Telas e Imagens

![Portaria e Controle de Acesso](/api/help-images/portaria.png)

---

## Dicas e atalhos

- **Pesquisa Rápida**: Digite apenas os números da placa para filtrar rapidamente sem traços ou espaços.
- **Alertas de Permanência**: Registros com tempo de pátio superior a 4 horas recebem destaque em amarelo/vermelho para alertar sobre possíveis atrasos na doca.
- **Devolução de Crachás**: O sistema não permite finalizar a saída sem marcar a devolução do crachá temporário.

---

## Erros comuns

- **Tentar dar entrada em veículo já presente**: Se um veículo estiver registrado como "No Pátio", o sistema exigirá que a saída anterior seja encerrada antes de uma nova entrada.
- **Crachá já em uso**: O número do crachá temporário deve ser único para as pessoas atualmente presentes no pátio.

---

## Boas práticas

- Realize a inspeção visual do lacre de segurança no momento exato da abertura do portão.
- Registre sempre a observação em caso de irregularidades físicas na carroceria no momento da entrada.
