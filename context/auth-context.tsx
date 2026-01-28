'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'


interface User {
  id: string
  name: string
  email: string
  role: { name: string } | string
  companyId?: string
  employeeId?: string
  permissions?: string[]
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, userData: User) => void
  logout: () => void
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
        try {
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
                setUser(JSON.parse(storedUser))
            }
        } catch (error) {
            console.error("Auth check failed", error)
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
    router.push('/dashboard')
  }

  const logout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
    router.push('/login')
  }

  const hasPermission = (permission: string) => {
      if (!user) return false
      
      // Admin bypass
      const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
      if (roleName === 'ADMIN') return true;

      return user.permissions?.includes(permission) || false
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasPermission }}>
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

