'use client'

import { ExternalLegacyBridge } from '@/components/external-fleet/external-legacy-bridge'

export default function ExternalFleetFreightsLegacyPage() {
  return (
    <ExternalLegacyBridge
      title="Frota Externa > Fretes legados"
      description="A gestão operacional de fretes foi substituída pelo novo contexto de Cargas e Rotas."
      statusBadgeLabel="Legado"
      restrictedDescription="Este perfil não possui permissão para visualizar a ponte de migração da Frota Externa nem os módulos novos relacionados."
      cardTitle="Gestão de fretes movida para Cargas e Rotas"
      paragraphs={[
        <>
          Esta rota antiga não deve mais ser usada como centro da operação. O cadastro de terceiros continua em{' '}
          <strong className="text-foreground">Frota Externa</strong>, mas a carga, a rota e a execução operacional
          agora vivem em <strong className="text-foreground">Cargas e Rotas</strong>.
        </>,
      ]}
      hint="Os botões abaixo seguem exatamente esse recorte de permissão para a ponte legada não virar um atalho aberto para módulos fora do seu escopo."
      destinations={[
        {
          buttonLabel: 'Abrir Cargas',
          href: '/dashboard/shipments',
          permission: 'shipments.cargo.view',
          summaryLabel: 'Cargas',
        },
        {
          buttonLabel: 'Abrir Rotas',
          href: '/dashboard/shipments/routes',
          permission: 'shipments.routes.view',
          summaryLabel: 'Rotas',
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
