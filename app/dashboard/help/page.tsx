'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const helpArticles = [
  {
    title: 'Registro de Atividades',
    path: 'Recursos Humanos > Atividades',
    description:
      'Use esta tela para registrar o que foi executado no dia, consultar o historico proprio ou da equipe e manter o catalogo de atividades organizado.',
    rules: [
      'A edicao de registros segue o controle de permissao configurado no perfil.',
      'O catalogo de atividades deve ser mantido apenas por quem pode administrar RH.',
      'Gestores visualizam o proprio time; RH e administradores conseguem auditar o conjunto completo conforme permissao.',
    ],
    howTo: [
      'Abra a aba correta: meus registros, time ou catalogo.',
      'Escolha a atividade cadastrada, informe data, horario e observacoes.',
      'Para corrigir um registro, use a acao de editar no card correspondente.',
    ],
    examples: [
      'Exemplo: registrar visita tecnica, treinamento interno e suporte operacional.',
      'Print sugerido: formulario de novo registro e aba Catalogo de Atividades.',
    ],
  },
  {
    title: 'Prestacao de Contas',
    path: 'Recursos Humanos > Prestacao de Contas',
    description:
      'Centraliza os lancamentos de despesas do colaborador e padroniza a consulta por periodo com presets reutilizaveis do design system.',
    rules: [
      'O filtro padrao e Mes Atual.',
      'A visualizacao do comprovante acontece em popup sem sair da tela.',
      'A edicao de registros respeita o mesmo controle de permissao definido no backend.',
    ],
    howTo: [
      'Selecione um preset de periodo ou use o modo Personalizado.',
      'Cadastre valor, categoria, descricao e anexe o comprovante.',
      'Abra o popup para validar o anexo antes de aprovar ou corrigir o registro.',
    ],
    examples: [
      'Exemplo: reembolso de combustivel nos Ultimos 7 dias.',
      'Print sugerido: filtro por periodo e popup de comprovante aberto.',
    ],
  },
  {
    title: 'Ferias',
    path: 'Recursos Humanos > Ferias',
    description:
      'Organiza solicitacoes, aprovacoes e cancelamentos com escopo por gestor, RH e administracao, sempre registrando justificativas quando a decisao reprova ou cancela.',
    rules: [
      'Gestor pode solicitar para subordinados quando tiver permissao para isso.',
      'RH pode solicitar, aprovar, reprovar ou cancelar para qualquer colaborador dentro do seu escopo.',
      'Reprovacao e cancelamento exigem justificativa obrigatoria para rastreabilidade.',
    ],
    howTo: [
      'Abra Nova solicitacao e escolha o colaborador quando a permissao permitir.',
      'Use a aba correspondente ao seu escopo: minhas solicitacoes, time ou RH.',
      'Ao rejeitar ou cancelar, preencha o motivo antes de confirmar a acao.',
    ],
    examples: [
      'Exemplo: gestor solicitando ferias para um subordinado em periodo futuro.',
      'Print sugerido: dialogo de justificativa de reprovacao e lista do RH.',
    ],
  },
  {
    title: 'Movimentacao do Colaborador',
    path: 'Recursos Humanos > Movimentacao do Colaborador',
    description:
      'Exibe o ledger unico de alteracoes de salario, departamento, cargo, gestor, status e eventos de ferias, inclusive quando a alteracao nasce direto na ficha do colaborador.',
    rules: [
      'Toda alteracao relevante deve gerar um registro com origem, destino, data e autor.',
      'Mudancas feitas na ficha do colaborador precisam refletir automaticamente no ledger.',
      'O acesso a leitura e gestao segue as permissoes especificas de movimentacao.',
    ],
    howTo: [
      'Use a busca para localizar o colaborador, autor ou motivo.',
      'Aplique o filtro por tipo para isolar salario, ferias ou movimentacoes organizacionais.',
      'Revise origem, destino e justificativa antes de auditar ou continuar o fluxo.',
    ],
    examples: [
      'Exemplo: mudanca salarial seguida de transferencia de departamento.',
      'Print sugerido: cards de historico com origem, destino e responsavel.',
    ],
  },
]

export default function HelpPage() {
  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="space-y-2">
          <p className="app-kicker">Ajuda Operacional</p>
          <h1 className="app-title">Central de Ajuda do ciclo RH</h1>
          <p className="app-subtitle">
            Reuna aqui os caminhos de acesso, regras de uso e exemplos visuais das funcionalidades
            entregues neste ciclo para facilitar treinamento, suporte e retomada.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="app-section-card md:col-span-4">
          <CardContent className="grid gap-3 px-0 py-0 md:grid-cols-4">
            {helpArticles.map((article) => (
              <a
                key={article.title}
                href={`#${article.title.toLocaleLowerCase('pt-BR').replace(/\s+/g, '-')}`}
                className="rounded-3xl border border-border/70 bg-background px-4 py-4 text-sm transition hover:border-primary/40 hover:bg-primary/5"
              >
                <p className="font-semibold text-foreground">{article.title}</p>
                <p className="mt-1 text-muted-foreground">{article.path}</p>
              </a>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        {helpArticles.map((article) => (
          <Card
            key={article.title}
            id={article.title.toLocaleLowerCase('pt-BR').replace(/\s+/g, '-')}
            className="app-section-card"
          >
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle>{article.title}</CardTitle>
                <Badge variant="outline">{article.path}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{article.description}</p>
            </CardHeader>
            <CardContent className="grid gap-4 px-0 pb-0 lg:grid-cols-3">
              <section className="rounded-3xl border border-border/70 bg-muted/25 p-4">
                <h2 className="text-sm font-semibold text-foreground">Regras</h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {article.rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </section>
              <section className="rounded-3xl border border-border/70 bg-muted/25 p-4">
                <h2 className="text-sm font-semibold text-foreground">Como usar</h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {article.howTo.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </section>
              <section className="rounded-3xl border border-border/70 bg-muted/25 p-4">
                <h2 className="text-sm font-semibold text-foreground">Exemplos e prints</h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {article.examples.map((example) => (
                    <li key={example}>{example}</li>
                  ))}
                </ul>
              </section>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
