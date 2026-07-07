'use client'

import { ExternalLegacyBridge } from '@/components/external-fleet/external-legacy-bridge'

export default function ExternalFleetTrackingLegacyPage() {
  return (
    <ExternalLegacyBridge
      title="Frota Externa > Rastreamento legado"
      description="O rastreamento operacional antigo de viagens saiu da Frota Externa e foi reencaminhado para o novo fluxo de rotas e tarefas."
      statusBadgeLabel="Fluxo movido"
      restrictedDescription="Este perfil não possui permissão para visualizar a ponte de migração do rastreamento legado nem os módulos novos relacionados."
      cardTitle="Rastreamento antigo descontinuado"
      paragraphs={[
        <>
          O acompanhamento operacional deixou de usar a trilha antiga baseada em fretes da Frota Externa. As novas
          rotas são executadas em <strong className="text-foreground">Cargas e Rotas</strong>, com tarefas,
          ocorrências, comprovantes e localização ligados ao domínio <strong className="text-foreground">shipments</strong>.
        </>,
        <>Use esta página apenas como referência de migração. Para operação atual, acesse o módulo novo.</>,
      ]}
      hint="Os atalhos abaixo seguem esse mesmo recorte para deixar claro quais módulos novos ainda podem ser abertos a partir desta ponte de migração."
      destinations={[
        {
          buttonLabel: 'Abrir Rastreamento',
          href: '/dashboard/shipments/tracking',
          permission: 'shipments.routes.view',
          summaryLabel: 'Rastreamento',
        },
        {
          buttonLabel: 'Abrir Cargas',
          href: '/dashboard/shipments',
          permission: 'shipments.cargo.view',
          summaryLabel: 'Cargas',
          buttonVariant: 'outline',
        },
        {
          buttonLabel: 'Ir para Motoristas',
          href: '/dashboard/external-fleet/drivers',
          permission: 'external-fleet.drivers.view',
          summaryLabel: 'Motoristas',
          buttonVariant: 'ghost',
        },
        {
          buttonLabel: 'Ir para Veículos',
          href: '/dashboard/external-fleet/vehicles',
          permission: 'external-fleet.vehicles.view',
          summaryLabel: 'Veículos',
          buttonVariant: 'ghost',
        },
      ]}
    />
  )
}
