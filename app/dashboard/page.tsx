
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/auth-context'
import { DashboardEngine } from '@/components/dashboard/dashboard-engine'
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const { user } = useAuth()
  const [views, setViews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.employeeId) {
       fetchViews(user.employeeId)
    } else if (user?.id && !loading) {
       // Fallback if employeeId isn't on user object directly (depends on AuthContext)
       // Usually we might need to fetch employee profile first.
       // For now assuming existing flow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchViews = async (employeeId: string) => {
      try {
          const token = localStorage.getItem('token')
          const res = await fetch(`http://localhost:3000/dashboard/views?employeeId=${employeeId}`, {
               headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) {
              const data = await res.json()
              setViews(data)
          }
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
  // User might not have employeeId if they are just User. Adjust logic if needed.
  // Assuming user context has basic info.
  
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
        />
    </div>
  )
}
