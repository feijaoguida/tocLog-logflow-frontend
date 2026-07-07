import { ExternalDriverForm } from '@/components/external-fleet/external-driver-form'

type EditExternalDriverPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditExternalDriverPage({
  params,
}: EditExternalDriverPageProps) {
  const { id } = await params

  return <ExternalDriverForm mode="edit" driverId={id} />
}
