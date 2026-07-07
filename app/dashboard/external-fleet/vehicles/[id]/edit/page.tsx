import { ExternalVehicleForm } from '@/components/external-fleet/external-vehicle-form'

type EditExternalVehiclePageProps = {
  params: Promise<{ id: string }>
}

export default async function EditExternalVehiclePage({
  params,
}: EditExternalVehiclePageProps) {
  const { id } = await params

  return <ExternalVehicleForm mode="edit" vehicleId={id} />
}
