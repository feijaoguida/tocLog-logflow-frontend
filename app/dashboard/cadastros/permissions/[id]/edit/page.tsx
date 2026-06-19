'use client'

import { useParams } from 'next/navigation'
import { RoleForm } from '@/components/permissions/role-form'

export default function EditPermissionProfilePage() {
  const params = useParams()
  const roleId = params.id as string

  return <RoleForm mode="edit" roleId={roleId} />
}
