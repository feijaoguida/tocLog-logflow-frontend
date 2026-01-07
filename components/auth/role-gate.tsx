'use client'

import { useAuth } from "@/context/auth-context"

interface RoleGateProps {
  children: React.ReactNode
  allowedRoles: string[]
}

export function RoleGate({ children, allowedRoles }: RoleGateProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    // Optionally render a skeleton or spinner if critical
    // For a gate, usually we just don't render until satisfied
    return null 
  }

  if (!user) {
    return null
  }

  const userRole = typeof user.role === 'string' ? user.role : user.role?.name;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return null // or return <UnauthorizedMessage />
  }

  return <>{children}</>
}
