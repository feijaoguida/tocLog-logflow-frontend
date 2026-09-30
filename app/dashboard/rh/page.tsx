'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Profile, EmployeeOption } from './components/feed-types'
import { IntranetProfile } from './components/intranet-profile'
import { IntranetFeed } from './components/intranet-feed'
import { IntranetWidgets } from './components/intranet-widgets'

export default function HRPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userRes, empRes] = await Promise.all([
          api.get('/auth/profile'),
          api.get('/employees'),
        ])

        const me = empRes.data.find((e: any) => e.userId === userRes.data.userId)
        if (me) setProfile(me)
        setEmployees(empRes.data.filter((e: any) => e.status === 'ACTIVE'))
      } catch (e) {
        console.error('Failed to load intranet data', e)
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Standard Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Intranet Corporativa
            </h1>
            <Badge variant="outline" className="border-border/60 bg-muted/40 text-xs font-normal">
              RH Social
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Comunicação interna, atualizações da equipe e mural da empresa.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 items-start">
          <Skeleton className="h-64 rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 items-start">
          {/* Left Column - Profile */}
          <div className="hidden lg:block sticky top-20">
            <IntranetProfile profile={profile} employeesCount={employees.length} />
          </div>

          {/* Center Column - Feed */}
          <div className="min-w-0">
            <IntranetFeed profile={profile} employees={employees} />
          </div>

          {/* Right Column - Widgets */}
          <div className="hidden lg:block sticky top-20 space-y-6">
            <IntranetWidgets />
          </div>
        </div>
      )}
    </div>
  )
}
