/**
 * Logger silencioso para fallos no-críticos del módulo Organigrama v2.
 *
 * Reemplaza los `.catch(() => {})` que perdían errores de audit logs y otras
 * operaciones secundarias. Ahora los errores van a Sentry con tags y context
 * útiles para diagnóstico, pero no rompen la operación principal del usuario.
 *
 * Uso típico:
 *
 *   await prisma.auditLog.create({ ... })
 *     .catch(silentLog('orgchart.copilot.audit_log_failed', { orgId }))
 *
 * Si Sentry no está configurado (dev local), cae a console.error.
 */
import { captureError } from '@/lib/sentry'

export interface SilentLogContext {
  orgId?: string
  userId?: string | null
  [key: string]: unknown
}

/**
 * Devuelve un handler `.catch` que loguea a Sentry sin re-throw.
 *
 * @param tag identifier corto del callsite (ej. 'orgchart.copilot.audit_failed')
 * @param context datos adicionales para Sentry (orgId, etc.)
 */
export function silentLog(
  tag: string,
  context?: SilentLogContext,
): (err: unknown) => void {
  return (err: unknown) => {
    captureError(err, {
      module: 'orgchart-v2',
      tag,
      ...context,
    })
  }
}
