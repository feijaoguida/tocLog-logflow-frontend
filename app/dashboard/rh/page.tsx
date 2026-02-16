'use client'

import { useState, useEffect } from 'react'
import { api } from "@/lib/api"
import { Profile, EmployeeOption, FeedPost } from './components/feed-types' // Ensuring types exist
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
                     api.get('/employees')
                 ])
                 
                 const me = empRes.data.find((e: any) => e.userId === userRes.data.userId)
                 if(me) setProfile(me)
                 setEmployees(empRes.data.filter((e: any) => e.status === 'ACTIVE'))
                 
             } catch(e) { console.error(e) }
             finally { setLoading(false) }
        }
        loadData()
    }, [])

    if (loading) return null // Or a skeleton

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-muted/30 p-6 animate-fade-in">
             <div className="mx-auto max-w-[1400px]">
                 <h1 className="text-2xl font-bold mb-6 text-foreground">Intranet</h1>
                 
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
             </div>
        </div>
    )
}
