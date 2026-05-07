/**
 * Helper RLS — Row-Level Security via session variable `app.current_org_id`.
 *
 * Diseño:
 *   1. La migración `20260424100000_add_rls_policies` crea las políticas
 *      pero NO habilita RLS en las tablas. Eso queda como switch manual.
 *   2. Cuando RLS está activo, cada request debe abrir una transacción y
 *      ejecutar `SET LOCAL app.current_org_id = '<orgId>'` antes de hacer
 *      queries. Si falta, las policies bloquean todo y devuelven 0 filas.
 *   3. Este helper centraliza ese patrón.
 *
 * Uso típico en un handler API:
 *
 *     export const GET = withAuth(async (_req, ctx) => {
 *       const workers = await runWithOrgScope(ctx.orgId, (tx) =>
 *         tx.worker.findMany({ where: { status: 'ACTIVE' } }),
 *       )
 *       return NextResponse.json(workers)
 *     })
 *
 * Para crons / SUPER_ADMIN / webhooks que LEGÍTIMAMENTE operan cross-org:
 *
 *     await runUnsafeBypass({ reason: 'cron:morning-briefing' }, () =>
 *       prisma.organization.findMany(...),
 *     )
 *
 * Cualquier llamada a `runUnsafeBypass` queda registrada en AuditLog para
 * trazabilidad.
 *
 * Feature flag: `RLS_ENFORCED` env var.
 *   - "true" en producción una vez que las tablas tienen RLS habilitado.
 *   - "false" (default) en dev / staging mientras se valida.
 *
 * Cuando `RLS_ENFORCED=false`, el helper funciona pero el `SET LOCAL` es
 * un no-op a nivel BD (las policies no están armadas), por lo que sigue
 * siendo seguro llamar en cualquier momento.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@/generated/prisma/client'

type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

const RLS_ENFORCED = process.env.RLS_ENFORCED === 'true'

/**
 * Ejecuta `fn` dentro de una transacción con el `app.current_org_id` seteado
 * al `orgId` dado. Las queries hechas con el `tx` cliente respetan las RLS
 * policies — sólo verán filas de esa org.
 *
 * @throws Error si `orgId` es vacío o no string. Esto previene bypasses
 *               accidentales por `undefined` que postgres acepta como vacío.
 */
export async function runWithOrgScope<T>(
  orgId: string,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  if (typeof orgId !== 'string' || orgId.length === 0) {
    throw new Error('runWithOrgScope: orgId requerido y no vacío')
  }

  return prisma.$transaction(async (tx) => {
    // FIX #1.B: cambiamos $executeRawUnsafe por set_config(), que SÍ acepta
    // parámetros bind. Antes interpolábamos orgId en string crudo (con sanity
    // regex como única defensa). Ahora la firma es:
    //   SELECT set_config('app.current_org_id', $1, true)
    // donde el `true` lo hace LOCAL (solo afecta la tx actual). Defense in
    // depth: la regex de validación se mantiene aunque ya no es necesaria.
    if (RLS_ENFORCED) {
      if (!/^[A-Za-z0-9_-]+$/.test(orgId)) {
        throw new Error(`runWithOrgScope: orgId con caracteres inválidos: ${orgId}`)
      }
      await tx.$queryRaw`SELECT set_config('app.current_org_id', ${orgId}, true)`
    }
    return fn(tx)
  })
}

/**
 * Ejecuta `fn` SIN scope de org. Sólo para crons, webhooks, super-admin y
 * operaciones del founder console que legítimamente cruzan orgs.
 *
 * Cada llamada deja un AuditLog (`action='rls.bypass'`) con la razón.
 *
 * El nombre `runUnsafeBypass` es deliberadamente alarmante: si necesitas
 * llamarlo, justifica el uso en code review.
 */
export async function runUnsafeBypass<T>(
  meta: { reason: string; userId?: string | null; orgId?: string | null },
  fn: (client: PrismaClient) => Promise<T>,
): Promise<T> {
  // Audit fire-and-forget — no bloquear si falla.
  prisma.auditLog
    .create({
      data: {
        orgId: meta.orgId ?? 'system',
        userId: meta.userId ?? null,
        action: 'rls.bypass',
        entityType: 'System',
        entityId: 'rls',
        metadataJson: { reason: meta.reason, at: new Date().toISOString() },
      },
    })
    .catch((err) => {
      console.error('[runUnsafeBypass] audit log failed:', err)
    })

  return fn(prisma as PrismaClient)
}

/**
 * Indica si RLS está enforced en este entorno.
 * UI / health endpoints pueden mostrar este estado.
 */
export function isRlsEnforced(): boolean {
  return RLS_ENFORCED
}
