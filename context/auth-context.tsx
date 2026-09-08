'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export interface User {
  id: string
  name: string
  email: string
  role: { name: string } | string
  accessType: 'EMPLOYEE' | 'EXTERNAL_DRIVER' | 'COMPANY_ADMIN' | 'SAAS_ADMIN'
  companyId?: string | null
  groupId?: string | null
  allowedCompanyIds?: string[] | null
  employeeId?: string | null
  externalDriverId?: string | null
  roleId?: string | null
  permissions: string[]
  inheritedPermissions?: string[]
  directPermissions?: string[]
  avatarUrl?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, userData: User) => void
  logout: () => void
  hasPermission: (permission: string) => boolean
  refreshProfile: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('token')
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
                setUser(JSON.parse(storedUser))
            }
            if (token) {
              const { data } = await api.get<User>('/auth/profile')
              localStorage.setItem('user', JSON.stringify(data))
              setUser(data)
            }
        } catch (error) {
            console.error("Auth check failed", error)
            localStorage.removeItem('user')
            localStorage.removeItem('token')
            setUser(null)
        } finally {
            setIsLoading(false)
        }
    }
    checkAuth()
  }, [])

  const login = (token: string, userData: User) => {
    document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Strict`
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    router.push(
      userData.accessType === 'SAAS_ADMIN'
        ? '/dashboard/users'
        : '/dashboard',
    )
  }

  const logout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
    router.push('/login')
  }

  const refreshProfile = async () => {
    try {
      const { data } = await api.get<User>('/auth/profile')
      localStorage.setItem('user', JSON.stringify(data))
      setUser(data)
      return data
    } catch {
      logout()
      return null
    }
  }

  const hasPermission = (permission: string) => {
      if (!user) return false
      
      const permissions = user.permissions || []
      return permissions.includes(permission)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasPermission, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
