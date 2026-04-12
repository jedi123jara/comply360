'use client'

import { useUser } from '@clerk/nextjs'
import { useMemo } from 'react'

const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
}

function hasMinRole(userRole: string | undefined, minRole: string): boolean {
  if (!userRole) return false
  return (ROLE_HIERARCHY[userRole] ?? -1) >= (ROLE_HIERARCHY[minRole] ?? 999)
}

/**
 * Client-side permissions hook.
 * Reads role from Clerk's publicMetadata (set during onboarding or user creation).
 * Falls back to 'MEMBER' if not set.
 */
export function usePermissions() {
  const { user, isLoaded } = useUser()

  const role = useMemo(() => {
    if (!user) return 'MEMBER'
    return (user.publicMetadata?.role as string) ?? 'MEMBER'
  }, [user])

  return {
    role,
    isLoaded,
    isOwner: hasMinRole(role, 'OWNER'),
    isAdmin: hasMinRole(role, 'ADMIN'),
    isMember: hasMinRole(role, 'MEMBER'),
    isViewer: hasMinRole(role, 'VIEWER'),
    can: (minRole: string) => hasMinRole(role, minRole),
  }
}
