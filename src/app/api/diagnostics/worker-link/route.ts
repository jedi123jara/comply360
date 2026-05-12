/**
 * GET /api/diagnostics/worker-link?workerId=xxx
 *
 * Admin-only endpoint para diagnosticar por qué un worker no puede entrar
 * al portal /mi-portal. Reporta:
 *   - worker.email (lo que el admin ingresó)
 *   - worker.userId (vínculo actual)
 *   - User asociado al userId (si existe)
 *   - User encontrado por email match (si existe)
 *   - ¿Por qué no se vinculó?
 *
 * Casos típicos que detecta:
 *   1. Worker.email != User.email (typo del admin o user usó email diferente)
 *   2. Worker.userId apunta a un User que ya no existe (huérfano)
 *   3. User existe con role != WORKER (usuario se registró como owner por error)
 *   4. Múltiples Workers con mismo email (conflicto de vínculo)
 *
 * Auth: ADMIN+ de la org dueña del worker.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const workerId = searchParams.get('workerId')

  if (!workerId) {
    return NextResponse.json(
      { error: 'Falta query param ?workerId=xxx' },
      { status: 400 },
    )
  }

  const worker = await prisma.worker.findFirst({
    where: { id: workerId, orgId: ctx.orgId },
    select: {
      id: true, dni: true, firstName: true, lastName: true,
      email: true, userId: true, status: true, createdAt: true,
    },
  })

  if (!worker) {
    return NextResponse.json(
      { error: 'Worker no encontrado en tu organización' },
      { status: 404 },
    )
  }

  // 1. ¿Tiene userId asignado?
  let linkedUser: { id: string; email: string; role: string; clerkId: string; createdAt: Date } | null = null
  if (worker.userId) {
    linkedUser = await prisma.user.findUnique({
      where: { id: worker.userId },
      select: { id: true, email: true, role: true, clerkId: true, createdAt: true },
    })
  }

  // 2. ¿Hay un User con email coincidente (case-insensitive)?
  const usersByEmail = worker.email
    ? await prisma.user.findMany({
        where: { email: { equals: worker.email, mode: 'insensitive' } },
        select: { id: true, email: true, role: true, clerkId: true, orgId: true, createdAt: true },
      })
    : []

  // 3. ¿Hay otros Workers con el mismo email (conflicto)?
  const otherWorkersWithSameEmail = worker.email
    ? await prisma.worker.findMany({
        where: {
          email: { equals: worker.email, mode: 'insensitive' },
          id: { not: worker.id },
        },
        select: { id: true, firstName: true, lastName: true, orgId: true, userId: true },
      })
    : []

  // 4. Diagnóstico humano
  let diagnosis: string
  let suggestion: string

  if (!worker.email) {
    diagnosis = '❌ El worker no tiene email registrado.'
    suggestion = 'Edita el perfil del worker y agrega su email. Sin email no se puede vincular su cuenta.'
  } else if (linkedUser && linkedUser.role === 'WORKER') {
    diagnosis = `✅ Worker correctamente vinculado a User ${linkedUser.id} (${linkedUser.email}, role=WORKER).`
    suggestion = 'Si el worker sigue viendo errores, pídele cerrar sesión completamente y volver a iniciar (refresh de Clerk session claims).'
  } else if (linkedUser && linkedUser.role !== 'WORKER') {
    diagnosis = `⚠️ Worker vinculado a User ${linkedUser.id} pero ese User tiene role=${linkedUser.role} (no WORKER).`
    suggestion = 'Esto ocurre si el usuario se registró desde /sign-up del dashboard en lugar de /mi-portal/registrarse. Solución: forzar role=WORKER en ese User (necesita endpoint de fix manual).'
  } else if (worker.userId && !linkedUser) {
    diagnosis = `❌ Worker.userId apunta a un User huérfano (id=${worker.userId} ya no existe).`
    suggestion = 'El User fue eliminado pero el worker quedó con el FK. Limpiamos worker.userId y dejamos que se re-vincule cuando el usuario se loguee de nuevo.'
  } else if (usersByEmail.length === 0) {
    diagnosis = `🔍 Hay un Worker con email "${worker.email}" pero NINGÚN User en Clerk con ese email todavía.`
    suggestion = 'El worker NO se ha registrado todavía. Mándale (de nuevo) la invitación. Si dice que sí se registró: pídele que confirme con qué email exacto creó la cuenta — quizás usó otro distinto al que tú ingresaste aquí.'
  } else if (usersByEmail.length === 1) {
    const u = usersByEmail[0]
    diagnosis = `⚠️ Hay un User con email "${u.email}" (role=${u.role}, clerk=${u.clerkId.slice(0, 12)}...) pero el Worker.userId está NULL — el vínculo nunca se hizo.`
    if (u.role !== 'WORKER') {
      suggestion = `El usuario se registró pero como ${u.role}, no como WORKER. Probablemente entró por /sign-up del dashboard en lugar del link de invitación. Necesita re-registrarse desde /mi-portal/registrarse.`
    } else {
      suggestion = 'Bug residual del JIT. Llama a /api/diagnostics/worker-link/fix?workerId=' + workerId + ' (POST) para forzar el vínculo manualmente.'
    }
  } else {
    diagnosis = `⚠️ Hay ${usersByEmail.length} Users con el mismo email — situación rara, posible duplicado en Clerk.`
    suggestion = 'Revisa Clerk dashboard y elimina duplicados. Después puedes forzar vínculo manual.'
  }

  return NextResponse.json({
    worker: {
      id: worker.id,
      dni: worker.dni,
      fullName: `${worker.firstName} ${worker.lastName}`,
      emailRegistered: worker.email,
      userIdLinked: worker.userId,
      status: worker.status,
      createdAt: worker.createdAt,
    },
    linkedUser,
    usersFoundByEmail: usersByEmail,
    otherWorkersWithSameEmail,
    diagnosis,
    suggestion,
  })
})

/**
 * POST /api/diagnostics/worker-link?workerId=xxx
 *
 * Forzar vínculo Worker.userId = User.id donde User.email matchea
 * Worker.email. Útil cuando el JIT falló o el usuario se registró antes
 * que el fix self-healing estuviera desplegado.
 */
export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const workerId = searchParams.get('workerId')

  if (!workerId) {
    return NextResponse.json(
      { error: 'Falta query param ?workerId=xxx' },
      { status: 400 },
    )
  }

  const worker = await prisma.worker.findFirst({
    where: { id: workerId, orgId: ctx.orgId },
    select: { id: true, email: true, userId: true, orgId: true },
  })

  if (!worker) {
    return NextResponse.json(
      { error: 'Worker no encontrado en tu organización' },
      { status: 404 },
    )
  }

  if (!worker.email) {
    return NextResponse.json(
      { error: 'Worker sin email — agrega su email primero' },
      { status: 400 },
    )
  }

  if (worker.userId) {
    return NextResponse.json(
      { ok: true, message: 'El worker ya estaba vinculado', userId: worker.userId },
    )
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: worker.email, mode: 'insensitive' } },
    select: { id: true, role: true, orgId: true, clerkId: true },
  })

  if (!user) {
    return NextResponse.json(
      {
        error: 'No hay User registrado con ese email todavía. Pide al worker que se registre primero desde el link de invitación.',
      },
      { status: 404 },
    )
  }

  // Vincular: worker.userId = user.id
  await prisma.worker.update({
    where: { id: worker.id },
    data: { userId: user.id },
  })

  // CRÍTICO: SIEMPRE actualizar User.orgId al orgId del Worker.
  // Antes solo lo hacía si user.orgId era null. Pero si el User se registró
  // mal (ej. sign-up genérico) tiene orgId='org-xxx-dummy' (org dummy del
  // JIT) y endpoints /api/mi-portal/* buscan Worker en esa org dummy → 404.
  // El orgId correcto es siempre el del Worker pre-existente que la empresa
  // creó. Overwrite intencional (el admin tomó decisión consciente).
  let orgIdChanged = false
  const oldOrgId: string | null = user.orgId
  if (user.orgId !== worker.orgId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { orgId: worker.orgId },
    })
    orgIdChanged = true
  }

  // Si el User no tiene role=WORKER, promoverlo (overwrite intencional —
  // el admin tomó decisión consciente al hacer click "Vincular cuenta")
  let rolePromoted = false
  if (user.role !== 'WORKER') {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'WORKER' },
    })
    rolePromoted = true
  }

  // Limpiar org dummy huérfana: si User estaba en una org dummy que se
  // creó automáticamente cuando se registró mal (formato 'org-xxx-gmail-com'
  // con onboardingCompleted=false), y ya no tiene Users vinculados, eliminar
  // la org dummy para no dejar basura en DB.
  let dummyOrgCleaned = false
  if (orgIdChanged && oldOrgId && oldOrgId.startsWith('org-') && oldOrgId.includes('-')) {
    try {
      const remainingUsers = await prisma.user.count({ where: { orgId: oldOrgId } })
      if (remainingUsers === 0) {
        const oldOrg = await prisma.organization.findUnique({
          where: { id: oldOrgId },
          select: { onboardingCompleted: true, name: true },
        })
        if (oldOrg && !oldOrg.onboardingCompleted) {
          await prisma.organization.delete({ where: { id: oldOrgId } })
          dummyOrgCleaned = true
          console.log(`[worker-link/fix] Org dummy eliminada: ${oldOrgId}`)
        }
      }
    } catch (cleanupErr) {
      console.error('[worker-link/fix] dummy org cleanup failed (non-fatal):', cleanupErr)
    }
  }

  // CRÍTICO: sincronizar el rol a Clerk publicMetadata. Sin esto, el
  // middleware Edge sigue leyendo el role viejo (OWNER) desde session
  // claims y redirige al worker a /dashboard. El cambio en Prisma solo
  // afecta queries server-side, NO al middleware.
  try {
    const { clerkClient } = await import('@clerk/nextjs/server')
    const client = await clerkClient()
    await client.users.updateUserMetadata(user.clerkId, {
      publicMetadata: { role: 'WORKER' },
    })
  } catch (clerkErr) {
    console.error('[worker-link/fix] syncRoleToClerk failed:', clerkErr)
    // No-fatal: el cambio en Prisma sigue valiendo. El worker debe re-loguear
    // (token refresh) para que el middleware lea el nuevo rol.
  }

  return NextResponse.json({
    ok: true,
    message: 'Vínculo creado',
    workerId: worker.id,
    userId: user.id,
    rolePromoted,
    orgIdChanged,
    oldOrgId: orgIdChanged ? oldOrgId : null,
    newOrgId: orgIdChanged ? worker.orgId : null,
    dummyOrgCleaned,
    note: (rolePromoted || orgIdChanged)
      ? 'El User tenía role=' + (rolePromoted ? 'OWNER y/o ' : '') + 'orgId distintos (probablemente por registro mal). Corregidos en Prisma + Clerk publicMetadata. CRÍTICO: el worker DEBE cerrar sesión completamente y volver a iniciar — sin re-login, su JWT sigue cacheando los valores viejos.'
      : 'Pídele que cierre sesión y vuelva a iniciar para refrescar la sesión de Clerk.',
  })
})
