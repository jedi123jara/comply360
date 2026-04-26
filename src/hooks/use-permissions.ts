'use client'

import { useUser } from '@clerk/nextjs'
import { useMemo } from 'react'

/**
 * Jerarquía de roles — debe coincidir EXACTAMENTE con `src/lib/api-auth.ts`.
 * Si modificas acá, sincroniza ahí (idealmente importar el mismo objeto, pero
 * api-auth importa server-only deps que rompen client builds).
 */
const ROLE_HIERARCHY: Record<string, number> = {
  WORKER: -1, // Solo portal del trabajador, no dashboard
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
  SUPER_ADMIN: 4, // Dueños de plataforma
}

export type Role = keyof typeof ROLE_HIERARCHY

function hasMinRole(userRole: string | undefined, minRole: string): boolean {
  if (!userRole) return false
  return (ROLE_HIERARCHY[userRole] ?? -99) >= (ROLE_HIERARCHY[minRole] ?? 999)
}

/**
 * Hook client-side para checks de permisos en UI.
 *
 * Lee el rol desde Clerk `user.publicMetadata.role` (set durante onboarding o
 * por admin). Fallback 'MEMBER' si no está seteado (degradación segura — el
 * server-side decide la verdad final).
 *
 * Helpers:
 *   - `is{Role}` booleans: matchea rol exacto o superior por jerarquía
 *   - `can(minRole)`: equivalente a `hasMinRole`
 *   - `canAny([roles])`: true si el user tiene AL MENOS uno de los roles indicados
 *   - `canAll([roles])`: true si el user tiene TODOS los roles indicados (raramente útil; existe por completitud)
 *   - `isWorker`: el user es WORKER (acceso solo a /mi-portal)
 *   - `isSuperAdmin`: el user es SUPER_ADMIN (acceso a /admin)
 *
 * IMPORTANTE: este hook es solo para UX (mostrar/ocultar botones). El check
 * de seguridad real ocurre server-side en `withRole(...)` en cada API route.
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
    // Booleans por rol exacto/superior (jerarquía)
    isSuperAdmin: role === 'SUPER_ADMIN',
    isOwner: hasMinRole(role, 'OWNER'),
    isAdmin: hasMinRole(role, 'ADMIN'),
    isMember: hasMinRole(role, 'MEMBER'),
    isViewer: hasMinRole(role, 'VIEWER'),
    isWorker: role === 'WORKER',
    // Composables
    can: (minRole: string) => hasMinRole(role, minRole),
    canAny: (roles: string[]) => roles.some(r => hasMinRole(role, r)),
    canAll: (roles: string[]) => roles.every(r => hasMinRole(role, r)),
  }
}
