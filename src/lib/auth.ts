import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * Sincroniza el rol del User al publicMetadata de Clerk. Best-effort.
 *
 * IMPORTANTE: el middleware Edge (proxy.ts) lee el rol desde session claims
 * (Clerk publicMetadata), no desde Prisma. Si el rol vive solo en Prisma, el
 * middleware NO sabe que el user es WORKER → lo deja entrar a /dashboard
 * cuando debería redirigir a /mi-portal. Este helper cierra ese gap.
 *
 * El cambio NO es inmediato: la session claim se refresca en próxima auth
 * (~60s o re-login). Para uso urgente, el código que llama puede pedir
 * `auth.protect({ refresh: true })` o forzar logout.
 */
async function syncRoleToClerk(clerkId: string, role: string): Promise<void> {
  try {
    const client = await clerkClient()
    await client.users.updateUserMetadata(clerkId, {
      publicMetadata: { role },
    })
  } catch (err) {
    // No-fatal: el rol vive en Prisma. El middleware fallará en redirect
    // hasta que sincronice en próximo session refresh, pero el user puede
    // navegar a /mi-portal directamente.
    console.error(`[auth] syncRoleToClerk failed (clerkId=${clerkId}, role=${role}):`, err)
  }
}

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
  if (!clerkId) {
    if (process.env.NODE_ENV === 'development') {
      clerkId = 'demo-clerk-id'
    } else {
      return null
    }
  }

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

      // ─── Worker self-serve registration ───────────────────────────────
      // Si el signup vino desde /mi-portal/registrarse, Clerk guarda en
      // unsafeMetadata.signupAs = 'WORKER'. En ese caso NO creamos
      // Organization y el User queda con role=WORKER + orgId=null.
      // Cuando una empresa lo agregue después (mismo DNI/email), se
      // auto-vincula via el endpoint /api/workers que detecta User.
      const signupAs = clerkUser?.unsafeMetadata?.signupAs as string | undefined
      const isWorkerSelfSignup = signupAs === 'WORKER'

      if (isWorkerSelfSignup) {
        try {
          const seeded = await prisma.user.create({
            data: {
              clerkId,
              orgId: null, // Worker libre — sin empresa todavía
              email,
              firstName,
              lastName,
              role: 'WORKER',
            },
            select: { id: true, clerkId: true, orgId: true, email: true, role: true },
          })

          // ─── Auto-vinculación con Worker pre-existente ──────────────────
          // Si la empresa YA agregó este trabajador antes (con su email),
          // el Worker existe en DB con userId=null. Lo vinculamos AHORA para
          // que /mi-portal pueda cargar su perfil sin "No se encontró un
          // perfil de trabajador asociado". Esto cubre el caso típico:
          //   1. Admin crea worker JOSELIN con email josy@gmail.com
          //   2. Sistema manda invitación por email
          //   3. JOSELIN hace click → /mi-portal/registrarse → Clerk signup
          //   4. JIT corre AHORA → encuentra Worker.email=josy@gmail.com → vincula
          // El User queda con orgId del primer Worker (defensa: si la persona
          // trabaja en N empresas, le asignamos el orgId de la PRIMERA — los
          // endpoints /mi-portal validan workerId, no orgId).
          let resolvedOrgId = ''
          try {
            const matchingWorker = await prisma.worker.findFirst({
              // mode: 'insensitive' para que matchee aunque el admin haya
              // guardado el email con mayúsculas distintas (Josy@Gmail vs josy@gmail)
              where: { email: { equals: email, mode: 'insensitive' }, userId: null },
              select: { id: true, orgId: true },
              orderBy: { createdAt: 'asc' },
            })
            if (matchingWorker) {
              await prisma.worker.update({
                where: { id: matchingWorker.id },
                data: { userId: seeded.id },
              })
              // Asignar orgId al User para que getAuthContext devuelva contexto válido
              await prisma.user.update({
                where: { id: seeded.id },
                data: { orgId: matchingWorker.orgId },
              })
              resolvedOrgId = matchingWorker.orgId
              console.log(
                `[auth] Auto-vinculado Worker ${matchingWorker.id} (org=${matchingWorker.orgId}) → User ${seeded.id} (email=${email})`,
              )
            }
          } catch (linkErr) {
            // No-fatal: el User existe, solo que sin Worker vinculado. El admin
            // puede vincular manualmente desde el dashboard si esto falla.
            console.error('[auth] Auto-vinculación Worker→User falló (no fatal):', linkErr)
          }

          // Sincronizar rol a Clerk para que el middleware Edge lo lea desde session claims
          await syncRoleToClerk(clerkId, 'WORKER')

          console.log(
            `[auth] Worker self-serve registrado: clerkId=${clerkId} email=${email} orgId=${resolvedOrgId || '(libre)'}`,
          )
          return {
            userId: seeded.id,
            clerkId: seeded.clerkId,
            orgId: resolvedOrgId, // empty if no matching worker — caller debe verificar role
            email: seeded.email,
            role: seeded.role,
          }
        } catch (workerErr) {
          console.error('[auth] Worker self-serve provisioning failed:', workerErr)
          return null
        }
      }

      // Org id derivado de email para aislar tenants (cada usuario tiene su org)
      const orgId = `org-${email.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}`

      // Dev default: PRO para desbloquear features durante desarrollo.
      // Prod default: FREE — el usuario DEBE elegir un plan en
      // /onboarding/elegir-plan antes de acceder al dashboard. Esto evita
      // el revenue leak previo donde todos quedaban en STARTER "regalado".
      const defaultPlan = process.env.NODE_ENV === 'development' ? 'PRO' : 'FREE'

      // Founder safelist: emails en FOUNDER_EMAILS (coma-separados) reciben
      // SUPER_ADMIN automáticamente en su primer signup. Útil para que los
      // founders puedan entrar al console sin tocar SQL.
      const founderEmails = (process.env.FOUNDER_EMAILS ?? process.env.FOUNDER_EMAIL ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
      const isFounderByEnv = founderEmails.includes(email.toLowerCase())

      // Pending admin: alguien con SUPER_ADMIN existente invitó este email
      // desde /admin/admins antes de que existiera la cuenta. Al registrarse,
      // la convertimos en SUPER_ADMIN automáticamente.
      const pendingInvite = await prisma.auditLog.findFirst({
        where: {
          action: 'ADMIN_PENDING',
          entityType: 'User',
          entityId: email.toLowerCase(),
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, metadataJson: true },
      })
      const isPendingAdmin = !!pendingInvite

      const isFounder = isFounderByEnv || isPendingAdmin
      const defaultRole = isFounder ? 'SUPER_ADMIN' : 'OWNER'

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
      // ─── Re-vinculación por email cuando cambia el clerkId ────────────
      // Caso típico: el usuario tiene su User row creado con un clerkId de
      // una instance Clerk (ej. prod), pero el login actual viene de OTRA
      // instance (ej. dev keys en localhost). Como el clerkId no matchea,
      // entramos a JIT provisioning, pero el email YA existe → UNIQUE
      // constraint failed loop. Detectamos ese caso y re-vinculamos
      // actualizando el clerkId del User existente al de la sesión actual.
      // Seguro porque Clerk ya autenticó la identidad por email.
      // Usamos mode: 'insensitive' para evitar duplicados si Clerk envía
      // el email con mayúsculas/minúsculas distintas a la base de datos.
      const existingByEmail = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, clerkId: true, orgId: true, email: true, role: true },
        orderBy: { createdAt: 'asc' },
      })
      let seeded
      if (existingByEmail && existingByEmail.clerkId !== clerkId) {
        seeded = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            clerkId,
            ...(isFounder ? { role: 'SUPER_ADMIN' } : {}),
          },
          select: { id: true, clerkId: true, orgId: true, email: true, role: true },
        })
        console.log(
          `[auth] Re-vinculado User ${seeded.id} (email=${email}) a nuevo clerkId=${clerkId} ` +
            `(antes=${existingByEmail.clerkId}). Esto suele pasar al cambiar de instance Clerk dev↔prod.`,
        )
      } else {
        seeded = await prisma.user.upsert({
          where: { clerkId },
          create: {
            clerkId,
            orgId,
            email,
            firstName,
            lastName,
            role: defaultRole,
          },
          // For existing users, if they're in the founder safelist but don't
          // yet have SUPER_ADMIN (e.g. created before env var was set), promote
          // them. We never demote here — existing SUPER_ADMIN stays.
          update: isFounder ? { role: 'SUPER_ADMIN' } : {},
          select: { id: true, clerkId: true, orgId: true, email: true, role: true },
        })
      }

      // Si fue pending invite, consumimos el marker y loggeamos la promoción
      // contra la org del user recién creado (ADMIN_PROMOTED) para auditoría.
      if (isPendingAdmin && pendingInvite) {
        try {
          await prisma.auditLog.create({
            data: {
              orgId,
              userId: seeded.id,
              action: 'ADMIN_PROMOTED',
              entityType: 'User',
              entityId: seeded.id,
              metadataJson: {
                email,
                promotedVia: 'pending_invite',
                originalInviteAuditLogId: pendingInvite.id,
                pendingMeta: pendingInvite.metadataJson,
              },
            },
          })
        } catch (logErr) {
          console.error('[auth] Failed to log ADMIN_PROMOTED for pending invite:', logErr)
        }
      }

      // Sincronizar rol a Clerk publicMetadata para el middleware Edge
      await syncRoleToClerk(clerkId, seeded.role)

      console.log(
        `[auth] JIT-provisioned User+Org for clerkId=${clerkId} email=${email} ` +
          `plan=${defaultPlan} role=${defaultRole}${isFounder ? ' (founder)' : ''}`,
      )

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
    // ─── Worker recovery: User existe + role=WORKER + sin orgId ─────────
    // Caso típico: trabajador se registró antes que el fix de auto-vincular
    // estuviera vivo (o el JIT falló en vincular). Lo recuperamos AQUÍ
    // buscando Worker pre-existente con su email y vinculando ahora.
    // Sin esto, /mi-portal devuelve 401/404 indefinidamente.
    if (user.role === 'WORKER') {
      try {
        const matchingWorker = await prisma.worker.findFirst({
          // mode: 'insensitive' por si el email del Worker fue ingresado con caps distintos
          where: { email: { equals: user.email, mode: 'insensitive' }, userId: null },
          select: { id: true, orgId: true },
          orderBy: { createdAt: 'asc' },
        })
        if (matchingWorker) {
          await prisma.worker.update({
            where: { id: matchingWorker.id },
            data: { userId: user.id },
          })
          await prisma.user.update({
            where: { id: user.id },
            data: { orgId: matchingWorker.orgId },
          })
          // Sincronizar rol a Clerk (idempotente — si ya estaba, no rompe)
          await syncRoleToClerk(user.clerkId, 'WORKER')
          console.log(
            `[auth] Recuperado Worker ${matchingWorker.id} (org=${matchingWorker.orgId}) → User ${user.id} (email=${user.email}) en lazy lookup`,
          )
          return {
            userId: user.id,
            clerkId: user.clerkId,
            orgId: matchingWorker.orgId,
            email: user.email,
            role: user.role,
          }
        }
        // No hay Worker pre-existente — el trabajador es self-serve sin empresa.
        // Devolvemos contexto con orgId vacío. Los endpoints /mi-portal validan
        // workerId, no orgId, así que esto es OK para flujos compatibles.
        await syncRoleToClerk(user.clerkId, 'WORKER')
        return {
          userId: user.id,
          clerkId: user.clerkId,
          orgId: '',
          email: user.email,
          role: user.role,
        }
      } catch (recoverErr) {
        console.error('[auth] Worker recovery failed:', recoverErr)
        // Caemos al return null para que el portal muestre error claro
      }
    }

    // User exists but has no org — might be mid-onboarding or legacy user
    try {
      const userEmail = user.email || 'user@comply360.pe'
      const userOrgId = `org-${userEmail.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}`
      const defaultPlan = process.env.NODE_ENV === 'development' ? 'PRO' : 'FREE'
      
      await prisma.organization.upsert({
        where: { id: userOrgId },
        create: {
          id: userOrgId,
          name: `Empresa de ${userEmail.split('@')[0]}`,
          plan: defaultPlan,
          alertEmail: userEmail,
          onboardingCompleted: false,
        },
        update: {},
      })
      await prisma.user.update({
        where: { id: user.id },
        data: { orgId: userOrgId },
      })
      
      console.log(`[auth] Recovered legacy user ${user.id} by creating org ${userOrgId}`)
      
      return {
        userId: user.id,
        clerkId: user.clerkId,
        orgId: userOrgId,
        email: user.email,
        role: user.role,
      }
    } catch (seedErr) {
      console.error('[auth] Failed to assign org to user during recovery:', seedErr)
      return null
    }
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
