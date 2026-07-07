import { ExternalDriverDetails } from '@/components/external-fleet/external-driver-details'

type ExternalDriverDetailsPageProps = {
  params: Promise<{ id: string }>
}

export default async function ExternalDriverDetailsPage({
  params,
}: ExternalDriverDetailsPageProps) {
  const { id } = await params

  return <ExternalDriverDetails driverId={id} />
}
