
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/auth-context'
import { DashboardEngine } from '@/components/dashboard/dashboard-engine'
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"

export default function DashboardPage() {
  const { user } = useAuth()
  const [views, setViews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.employeeId) {
       fetchViews(user.employeeId)
    } else if (user?.id) {
       setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchViews = async (employeeId: string) => {
      try {
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
      id: 'default-temp',
      name: 'Padrão (Não Salvo)',
      configuration: [], // Empty
      isDefault: true
    }]
  }, [views])

  if (!user) return <div className="p-8">Carregando usuário...</div>
  if (!user.employeeId) {
      return (
          <div className="container mx-auto max-w-3xl pt-8">
              <div className="rounded-xl border bg-white p-8 shadow-sm">
                  <h1 className="text-2xl font-bold tracking-tight">
                      {user.accessType === 'SAAS_ADMIN' ? 'Backoffice SaaS' : 'Acesso externo'}
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                      {user.accessType === 'SAAS_ADMIN'
                          ? 'Use a área de Usuários para a administração global. As demais telas de backoffice serão adicionadas em ciclos próprios.'
                          : 'O acesso do motorista externo é realizado pelo aplicativo mobile e limitado às rotas atribuídas.'}
                  </p>
              </div>
          </div>
      )
  }
  
  if (loading) {
      return (
          <div className="container mx-auto max-w-7xl pt-4 space-y-6">
              <div className="flex justify-between">
                  <Skeleton className="h-10 w-[200px]" />
                  <Skeleton className="h-10 w-[100px]" />
              </div>
              <div className="grid grid-cols-3 gap-6">
                  <Skeleton className="h-40 col-span-1" />
                  <Skeleton className="h-40 col-span-1" />
                  <Skeleton className="h-40 col-span-1" />
              </div>
          </div>
      )
  }

  return (
    <div className="container mx-auto max-w-7xl pt-4 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <DashboardEngine 
            initialViews={displayViews} 
            currentEmployeeId={user.employeeId || ''} 
            onViewsChanged={() => user.employeeId && fetchViews(user.employeeId)}
        />
    </div>
  )
}
