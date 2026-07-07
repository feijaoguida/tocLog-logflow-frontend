'use client'

import { ExternalLegacyBridge } from '@/components/external-fleet/external-legacy-bridge'

export default function ExternalFleetPlanningLegacyPage() {
  return (
    <ExternalLegacyBridge
      title="Frota Externa > Planejamento legado"
      description="O planejamento operacional de cargas e rotas saiu da Frota Externa e passou para o novo domínio de Cargas e Rotas."
      statusBadgeLabel="Fluxo movido"
      restrictedDescription="Este perfil não possui permissão para visualizar a ponte de migração do planejamento legado nem as áreas novas relacionadas."
      cardTitle="Planejamento migrado para Cargas e Rotas"
      paragraphs={[
        <>
          Esta rota antiga foi mantida apenas como ponte de migração. A operação de montagem de carga, alocação e
          execução agora acontece no domínio novo de <strong className="text-foreground">Cargas e Rotas</strong>.
        </>,
        <>
          A área de <strong className="text-foreground">Frota Externa</strong> continua responsável pelo cadastro,
          homologação e governança dos parceiros, sem misturar isso com a operação logística.
        </>,
      ]}
      hint="Os botões abaixo seguem exatamente esse recorte de permissão para a ponte legada continuar só como referência de migração, sem abrir módulos indevidos."
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
