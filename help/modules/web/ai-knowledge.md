# Base de Conhecimento e Acervo Documental de IA

A tela de **Bases de Conhecimento** (`/dashboard/settings/ai/knowledge`) gerencia o acervo corporativo de normas, manuais, procedimentos operacionais padrão (POPs) e regulamentos utilizados pelos assistentes de IA para fundamentar respostas com citações e zero alucinação.

---

## O que faz

- Permite cadastrar, editar, versionar e publicar documentos corporativos em formato Markdown.
- Fatiamento automático em trechos coesos (*chunks*) com sobreposição semântica para indexação de busca textual e vetorial.
- Controle de ciclo de vida documental: **Rascunho (Draft)**, **Publicado (Published)** e **Arquivado (Archived)**.
- Rastreamento completo de revisões, data de publicação e contagem de trechos indexados.
- **Sincronização com a Central de Ajuda**: Botão dedicado para importar e sincronizar em tempo real todos os manuais da Central de Ajuda com a IA.
- Integração nativa com a ferramenta `buscar_conhecimento` usada pelos assistentes de IA.

---

## Quando usar

- Ao publicar novas políticas da empresa (ex: manual de reembolso, procedimento de check-in na portaria).
- Quando os manuais operacionais forem alterados e a IA precisar aprender as novas regras imediatamente.
- Para consultar o histórico de revisões de um documento e verificar quais trechos estão sendo consultados pela IA.
- Para forçar a sincronização de artigos da Central de Ajuda após edição de documentação técnica.

---

## Passo a passo

### 1. Criar um Novo Documento de Conhecimento
1. Acesse: **Configurações** → **IA** → **Base de Conhecimento** (`/dashboard/settings/ai/knowledge`).
2. Clique no botão **Novo Documento**.
3. Preencha o **Título do Documento** e selecione o **Módulo** de domínio.
4. Escreva o conteúdo em formato Markdown no editor integrado (ou cole o texto de um regulamento existente).
5. Alterne para a aba **Pré-visualização** para validar a formatação.
6. Se o documento já estiver revisado, marque a opção **Publicar Imediatamente**.
7. Clique em **Salvar Documento**. O sistema fatiará o conteúdo em *chunks* automaticamente.

### 2. Sincronizar Manuais da Central de Ajuda
1. No cabeçalho da página de Conhecimento, clique no botão **Sincronizar Manuais da Ajuda**.
2. O sistema varre os manuais Markdown da Central de Ajuda, verifica alterações por hash e atualiza o acervo corporativo da IA automaticamente.
3. Um alerta de sucesso informará quantos documentos foram criados, atualizados ou mantidos.

---

## Campos principais

| Campo | Obrigatório | Descrição |
|---|---|---|
| **Título** | Sim | Nome oficial do documento (ex: *Política de Reembolso de Despesas*). |
| **Módulo** | Sim | Módulo canônico para filtros direcionados (*Compras*, *Frotas*, *Helpdesk*, *RH*, *Portaria* ou *Geral*). |
| **Conteúdo Markdown** | Sim | Texto integral do documento, suportando títulos, tabelas, listas e blocos de código. |
| **Status** | Sim | Define a disponibilidade para os assistentes (`PUBLISHED` fica ativo para buscas imediatas). |
| **Versão** | Sistema | Número sequencial incrementado a cada nova revisão do documento. |
| **Trechos Indexados** | Sistema | Quantidade de fragmentos (*chunks*) gerados para consulta pelo motor de RAG. |

---

## Telas e Imagens

![Base de Conhecimento de IA](/help-images/ai-knowledge.png)

---

## Dicas e atalhos

- **Organização com cabeçalhos**: Documentos bem estruturados com títulos `#`, `##` e `###` produzem chunks mais focados e facilitam para a IA localizar a resposta exata.
- **Auto-sync contínuo**: O sistema monitora alterações na pasta de manuais da Central de Ajuda em tempo real. Edições salvas nos arquivos `.md` são sincronizadas automaticamente sem necessidade de intervenção manual.
- **Isolamento de dados**: O acervo corporativo de cada empresa é totalmente isolado. Documentos de uma organização nunca são retornados nas consultas de outra empresa.

---

## Erros comuns

- **Documentos em Rascunho**: Se um documento estiver como `DRAFT`, os assistentes de IA não conseguirão localizá-lo. Certifique-se de publicá-lo para habilitar a busca.
- **Conteúdo excessivamente curto**: Textos com poucas palavras podem não conter termos suficientes para os algoritmos de relevância localizarem a resposta.

---

## Boas práticas

- Mantenha os títulos dos procedimentos claros e específicos (ex: *Procedimento para Troca de Pneus da Frota* em vez de *Pneus*).
- Revise periodicamente documentos com versões antigas para desindexar regras que não estejam mais em vigor.
