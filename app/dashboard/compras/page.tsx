'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/auth-context'
import { DashboardEngine } from '@/components/dashboard/dashboard-engine'
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"

export default function ProcurementDashboardPage() {
  const { user } = useAuth()
  const [views, setViews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.employeeId) {
       fetchViews(user.employeeId)
    } else if (user?.id && !loading) {
       // Fallback logic
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchViews = async (employeeId: string) => {
      try {
          // We can fetch mostly the same views, or filter by module if backend supported.
          // For now, we fetch user's views. Ideally we'd have a 'context=procurement' param.
          // Let's reuse the general endpoint.
          const { data } = await api.get(`/dashboard/views?employeeId=${employeeId}`)
          setViews(data)
      } catch (e) {
          console.error("Failed to fetch views", e)
      } finally {
          setLoading(false)
      }
  }

  const displayViews = useMemo(() => {
    return views.length > 0 ? views : [{
      id: 'default-procurement',
      name: 'Padrão Compras',
      configuration: [], // Ideally we would preload some procurement widgets here
      isDefault: true
    }]
  }, [views])

  if (loading) {
      return <div className="p-8">Carregando dashboard...</div>
  }

  return (
    <div className="container mx-auto max-w-7xl pt-4 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de Compras</h1>
        <DashboardEngine 
            initialViews={displayViews} 
            currentEmployeeId={user?.employeeId || ''} 
        />
    </div>
  )
}
