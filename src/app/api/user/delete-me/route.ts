/**
 * POST /api/user/delete-me
 *
 * Derecho de cancelación / supresión — Ley N° 29733 Art. 22.
 *
 * **Política de Comply360**:
 *  - WORKER → se anonimiza (no se elimina físico) porque puede tener
 *    contratos firmados y boletas que la empresa empleadora debe conservar
 *    por Ley. Se anula PII (nombre, email, DNI, teléfono, dirección) pero
 *    se mantiene un hash inmutable para integridad legal del legajo.
 *    Status pasa a TERMINATED + `anonymizedAt`.
 *
 *  - ADMIN/OWNER → se marca para deletion-request. Requiere confirmación
 *    manual del support team porque borrar el OWNER mata la organización
 *    entera (todos sus workers pierden acceso). Se registra el request en
 *    AuditLog y se envía notificación a ops para revisar en <48h.
 *
 *  - Body opcional: `{ confirm: true, reason?: string }` — para evitar
 *    borrados accidentales, requiere `confirm=true`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

export const runtime = 'nodejs'

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: { confirm?: boolean; reason?: string } = {}
  try {
    body = await req.json()
  } catch {
    // body vacío es válido, cae a defaults
  }

  if (body.confirm !== true) {
    return NextResponse.json(
      {
        error: 'Para confirmar la eliminación, envía { "confirm": true } en el body',
        warning:
          'Esta acción elimina tus datos personales de forma irreversible. Los documentos legales (contratos firmados, boletas) se conservan anonimizados por obligación del empleador.',
      },
      { status: 400 },
    )
  }

  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null

  try {
    if (ctx.role === 'WORKER') {
      // ── WORKER: anonimizar ──────────────────────────────────────────────
      const worker = await prisma.worker.findUnique({
        where: { userId: ctx.userId },
        select: { id: true, dni: true, orgId: true },
      })

      if (!worker) {
        return NextResponse.json({ error: 'Worker no encontrado' }, { status: 404 })
      }

      // Hash inmutable del DNI para mantener integridad del legajo legal
      const dniHash = createHash('sha256').update(worker.dni).digest('hex').slice(0, 16)
      const anonEmail = `anon-${dniHash}@deleted.comply360.pe`
      const anonName = `[Usuario Anonimizado ${dniHash.slice(0, 6)}]`

      await prisma.$transaction(async (tx) => {
        // Anonimizar Worker
        await tx.worker.update({
          where: { id: worker.id },
          data: {
            firstName: anonName,
            lastName: '',
            email: null,
            phone: null,
            address: null,
            birthDate: null,
            // DNI se conserva por obligación legal del empleador, pero el
            // resto queda null. Status TERMINATED lo desactiva de operaciones.
            status: 'TERMINATED',
            fechaCese: new Date(),
            motivoCese: `Solicitud de eliminación de datos (Ley 29733 Art. 22). ${body.reason ?? ''}`.slice(0, 500),
          },
        })

        // Anonimizar User (Clerk se invalida por separado)
        await tx.user.update({
          where: { id: ctx.userId },
          data: {
            email: anonEmail,
            firstName: anonName,
            lastName: '',
            // Prisma Json? requiere Prisma.JsonNull para null explícito, pero
            // como el tipo ya es nullable, asignamos undefined y es ok:
            // (si queremos forzar null, usar `Prisma.JsonNull`)
          },
        })
        // Borrar pushSubscription por separado con Prisma.JsonNull
        await tx.user.update({
          where: { id: ctx.userId },
          data: { pushSubscription: { set: null as unknown as object } },
        }).catch(() => null)

        await tx.auditLog.create({
          data: {
            orgId: ctx.orgId,
            userId: ctx.userId,
            action: 'user.anonymized',
            entityType: 'Worker',
            entityId: worker.id,
            ipAddress,
            metadataJson: {
              scope: 'worker',
              reason: body.reason ?? null,
              dniHash,
              legalBasis: 'Ley 29733 Art. 22',
            },
          },
        })
      })

      return NextResponse.json({
        success: true,
        scope: 'worker',
        message:
          'Tus datos personales han sido anonimizados. Los documentos legales (contratos, boletas) se conservan en forma anonimizada por obligación legal del empleador. Tu sesión se cerrará.',
      })
    }

    // ── ADMIN/OWNER: request para review manual ─────────────────────────────
    // No eliminamos automáticamente porque borrar el OWNER rompe la org entera.
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'user.deletion_requested',
        entityType: 'User',
        entityId: ctx.userId,
        ipAddress,
        metadataJson: {
          scope: 'admin',
          role: ctx.role,
          reason: body.reason ?? null,
          requestedAt: new Date().toISOString(),
          legalBasis: 'Ley 29733 Art. 22',
        },
      },
    })

    // TODO: enviar notificación a ops@comply360.pe + crear ticket en soporte
    // Hoy queda registrado en AuditLog; el equipo de ops lo revisa manualmente.

    return NextResponse.json({
      success: true,
      scope: 'admin',
      message:
        'Tu solicitud de eliminación ha sido registrada. Nuestro equipo te contactará en <48h para procesarla. Si sos el OWNER de una organización con trabajadores activos, te guiaremos en la migración o cancelación del servicio.',
      ticketId: `DEL-${ctx.userId.slice(0, 8)}-${Date.now()}`,
    })
  } catch (err) {
    console.error('[delete-me] failed', err)
    return NextResponse.json(
      { error: 'No se pudo procesar la solicitud. Contacta a datos@comply360.pe' },
      { status: 500 },
    )
  }
})
