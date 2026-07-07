import { ExternalVehicleDetails } from '@/components/external-fleet/external-vehicle-details'

type ExternalVehicleDetailsPageProps = {
  params: Promise<{ id: string }>
}

export default async function ExternalVehicleDetailsPage({
  params,
}: ExternalVehicleDetailsPageProps) {
  const { id } = await params

  return <ExternalVehicleDetails vehicleId={id} />
}
