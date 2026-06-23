import { PurchaseRequestForm } from '@/components/procurement/purchase-request-form'

type EditPurchaseRequestPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditPurchaseRequestPage({
  params,
}: EditPurchaseRequestPageProps) {
  const { id } = await params

  return <PurchaseRequestForm mode="edit" requestId={id} />
}
