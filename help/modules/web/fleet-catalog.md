# Catálogo Geral e Conjunto de Frotas

A tela de **Gestão Geral de Frota** (`/dashboard/fleet`) unifica o controle operacional e a visão de catálogo conjunto de todos os recursos de transporte da empresa, combinando tanto veículos próprios (*Frota Interna*) quanto parceiros contratados (*Frota Terceira*).

---

## O que faz

- Apresenta um inventário consolidado de veículos em uma única tabela interativa.
- Permite filtrar por tipo de recurso (**TODOS**, **FROTA PRÓPRIA** ou **FROTA PARCEIRA**).
- Exibe status operacional em tempo real: *Disponível*, *Em Uso*, *Em Manutenção*, *Bloqueado*, *Pendente de Aprovação* ou *Suspenso*.
- Mostra indicadores de alerta: quantidade de bloqueios ativos, alertas de manutenção preventiva/corretiva, documentos e multas.
- Permite atualizar o odômetro (quilometragem atual) com validação de monotonicidade (o novo KM não pode ser menor que o anterior).
- Permite o cadastro rápido de veículos de parceiros terceirizados diretamente pelo operador da frota.

---

## Quando usar

- Ao planejar viagens ou alocar veículos para rotas de transporte.
- Quando for necessário verificar se um caminhão está bloqueado por manutenção ou documentação vencida.
- Ao atualizar o odômetro após a conclusão de uma rota.
- Para registrar novos veículos terceiros que prestarão serviços eventuais ou contínuos.

---

## Passo a passo

### 1. Consultar e Filtrar Recursos
1. Acesse: **Gestão de Frotas** → **Catálogo Geral** (`/dashboard/fleet`).
2. Utilize o botão de filtro de **Origem** no topo para alternar entre *Frota Própria* e *Parceiros Terceiros*.
3. No campo de busca rápida, digite a placa, marca, modelo ou nome do motorista.
4. Observe os cards de KPIs no cabeçalho informando o total de recursos, disponíveis, bloqueados e em manutenção.

### 2. Atualizar Odômetro (Quilometragem)
1. Localize o veículo desejado na tabela.
2. Na coluna **KM Atual**, clique no botão com ícone de velocímetro ou selecione **Atualizar KM**.
3. No modal que abrir, informe a nova leitura do odômetro.
   > **Atenção:** O novo valor deve ser estritamente maior ou igual ao KM registrado atualmente.
4. Clique em **Confirmar Atualização**. O registro é persistido e reflete imediatamente no histórico.

### 3. Cadastrar Veículo Parceiro (Frota Terceira)
1. No cabeçalho da página, clique em **+ Veículo Parceiro**.
2. Preencha o formulário:
   - **Placa** (ex: `ABC1D23` ou formato tradicional).
   - **Tipo do Veículo** (*Truck*, *Toco*, *Carreta*, *VUC* ou *Van*).
   - **Marca, Modelo, Ano e Cor**.
   - **Capacidade de Carga** (em Kg e Volume m³).
3. Clique em **Salvar Veículo**.
   - Se o operador possuir a permissão `external-fleet.vehicles.approve`, o veículo já é cadastrado com status **Ativo**.
   - Caso contrário, o veículo entrará com status **Pendente de Aprovação**.

---

## Campos principais

| Campo | Obrigatório | Descrição |
|---|---|---|
| **Placa** | Sim | Identificador alfanumérico único do veículo. |
| **Origem** | Sim | Categoria do recurso (`INTERNAL` para frota própria, `EXTERNAL` para parceiros). |
| **Categoria / Tipo** | Sim | Classificação física da carroceria (ex: *Cavalo Mecânico*, *Baú*, *Sider*). |
| **Status Operacional** | Sim | Estado atual de prontidão do recurso para viagens. |
| **Quilometragem (KM)** | Sim | Leitura atual do odômetro do veículo. |
| **Bloqueios e Alertas** | Indicador | Badges indicando pendências impeditivas de manutenção ou documentos. |

---

## Telas e Imagens

![Catálogo Geral de Frotas](/help-images/fleet-catalog.png)

---

## Dicas e atalhos

- **Monotonicidade de KM**: O sistema bloqueia regressão de quilometragem para garantir integridade contábil e de manutenção. Em caso de troca de velocímetro físico, utilize o fluxo de ajuste autorizado em configurações.
- **Bloqueios Automáticos**: Veículos com revisões atrasadas ou documentos obrigatórios vencidos exibem badge vermelha e ficam indisponíveis para despacho.

---

## Erros comuns

- **Erro "A quilometragem deve ser maior ou igual"**: Certifique-se de digitar a quilometragem total acumulada do hodômetro e não a distância parcial da viagem.
- **Placa já cadastrada**: O sistema impede duplicidade de placas ativas para a mesma empresa.

---

## Boas práticas

- Realize o apontamento do odômetro sempre no momento do encerramento das viagens ou no retorno à base operacional.
- Monitore a coluna de alertas para providenciar a regularização de documentos antes do vencimento legal.
