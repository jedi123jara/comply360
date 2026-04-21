import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export interface AuthContext {
  userId: string
  clerkId: string
  orgId: string
  email: string
  role: string
}

/**
 * Get the current authenticated user's info.
 * Returns null if not authenticated.
 * In development, returns a demo fallback if Clerk is unavailable.
 */
export async function getCurrentUser() {
  try {
    const user = await currentUser()
    if (!user) return null

    return {
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.imageUrl,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[auth] Clerk unavailable, using demo user fallback:', error)
      return {
        clerkId: 'demo-clerk-id',
        email: 'demo@comply360.pe',
        firstName: 'Demo',
        lastName: 'User',
        avatarUrl: '',
      }
    }
    return null
  }
}

/**
 * Require authentication - throws if not authenticated.
 * Returns the Clerk userId.
 * In development, returns a demo userId if Clerk is unavailable.
 */
export async function requireAuth() {
  try {
    const { userId } = await auth()
    if (!userId) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[auth] Clerk unavailable in dev, using demo userId')
        return 'demo-clerk-id'
      }
      throw new Error('Unauthorized')
    }
    return userId
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[auth] Clerk unavailable in dev, using demo userId:', error)
      return 'demo-clerk-id'
    }
    throw error
  }
}

/**
 * Get the current user's organization from the database.
 * Resolves Clerk userId → DB User → Organization.
 * Returns org data or null if not found.
 */
export async function getCurrentOrg() {
  let clerkId: string | null = null
  try {
    const result = await auth()
    clerkId = result.userId
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[auth] Clerk unavailable in dev for getCurrentOrg:', error)
      clerkId = 'demo-clerk-id'
    } else {
      return null
    }
  }
  if (!clerkId) return null

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { organization: true },
  })

  if (!user?.organization) return null

  return {
    id: user.organization.id,
    name: user.organization.name,
    plan: user.organization.plan,
    ruc: user.organization.ruc,
    razonSocial: user.organization.razonSocial,
    sector: user.organization.sector,
    sizeRange: user.organization.sizeRange,
    regimenPrincipal: user.organization.regimenPrincipal,
  }
}

/**
 * Full auth context for API routes.
 * Returns userId, orgId, and related info.
 * Returns null if not authenticated or no org assigned.
 * Falls back to 'org-demo' ONLY in development when no user/org exists.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  let clerkId: string | null = null
  try {
    const result = await auth()
    clerkId = result.userId
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[auth] Clerk unavailable in dev for getAuthContext:', error)
      clerkId = 'demo-clerk-id'
    } else {
      return null
    }
  }
  if (!clerkId) return null

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, clerkId: true, orgId: true, email: true, role: true },
  })

  // JIT provisioning: si el User no existe en nuestra DB pero Clerk lo autenticó,
  // crear User+Organization en el primer hit. Funciona en dev Y prod — es la
  // ruta oficial de "signup completado". No depende de webhooks Clerk
  // (que pueden fallar silenciosamente). Un Clerk-auth válido garantiza
  // identidad; el defaulted plan es STARTER en prod (el user puede upgrade
  // después con Culqi).
  if (!user) {
    try {
      const clerkUser = await currentUser()
      const email = clerkUser?.emailAddresses[0]?.emailAddress
        || (process.env.NODE_ENV === 'development' ? 'dev@comply360.pe' : null)

      // En prod, si por alguna razón Clerk no devuelve email, rechazar.
      // Sin email no podemos asociar al trabajador en el legajo, crear alertas, etc.
      if (!email) {
        console.error(`[SECURITY] JIT provisioning bloqueado: Clerk no devolvió email (clerkId=${clerkId})`)
        return null
      }

      const firstName = clerkUser?.firstName
        || (process.env.NODE_ENV === 'development' ? 'Dev' : '')
      const lastName = clerkUser?.lastName
        || (process.env.NODE_ENV === 'development' ? 'User' : '')

      // Org id derivado de email para aislar tenants (cada usuario tiene su org)
      const orgId = `org-${email.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}`

      // Dev default: PRO para desbloquear features. Prod default: STARTER.
      const defaultPlan = process.env.NODE_ENV === 'development' ? 'PRO' : 'STARTER'

      // 1. Create org for THIS user (if not exists)
      await prisma.organization.upsert({
        where: { id: orgId },
        create: {
          id: orgId,
          name: firstName || lastName ? `Empresa de ${firstName} ${lastName}`.trim() : 'Mi empresa',
          plan: defaultPlan,
          alertEmail: email,
          onboardingCompleted: false,
        },
        update: {},
      })
      // 2. Create user linked to THEIR org
      const seeded = await prisma.user.upsert({
        where: { clerkId },
        create: {
          clerkId,
          orgId,
          email,
          firstName,
          lastName,
          role: 'OWNER',
        },
        update: {}, // DON'T override orgId on existing users
        select: { id: true, clerkId: true, orgId: true, email: true, role: true },
      })

      console.log(`[auth] JIT-provisioned User+Org for clerkId=${clerkId} email=${email} plan=${defaultPlan}`)

      return {
        userId: seeded.id,
        clerkId: seeded.clerkId,
        orgId: seeded.orgId ?? orgId,
        email: seeded.email,
        role: seeded.role,
      }
    } catch (seedErr) {
      console.error('[auth] JIT provisioning failed:', seedErr)
      return null
    }
  }

  if (!user.orgId) {
    // User exists but has no org — might be mid-onboarding
    if (process.env.NODE_ENV === 'development') {
      try {
        // Create ISOLATED org for this user based on their email
        const userEmail = user.email || 'dev@comply360.pe'
        const userOrgId = `org-${userEmail.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}`
        await prisma.organization.upsert({
          where: { id: userOrgId },
          create: {
            id: userOrgId,
            name: `Empresa de ${userEmail.split('@')[0]}`,
            plan: 'PRO',
            alertEmail: userEmail,
            onboardingCompleted: false,
          },
          update: {},
        })
        await prisma.user.update({
          where: { id: user.id },
          data: { orgId: userOrgId },
        })
      } catch (seedErr) {
        console.error('[auth] Failed to assign org to user:', seedErr)
      }
      const userOrgId = `org-${(user.email || 'dev').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}`
      return {
        userId: user.id,
        clerkId: user.clerkId,
        orgId: userOrgId,
        email: user.email,
        role: user.role,
      }
    }
    return null
  }

  return {
    userId: user.id,
    clerkId: user.clerkId,
    orgId: user.orgId,
    email: user.email,
    role: user.role,
  }
}

/**
 * Require auth context — returns AuthContext or throws.
 * Use in protected API routes.
 */
export async function requireOrgAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx) {
    throw new Error('Unauthorized')
  }
  return ctx
}
