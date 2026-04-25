/**
 * Helper de idempotencia para crons Vercel.
 *
 * Vercel a veces reintenta crons (timeout, redeploy mid-run) o el mismo
 * cron puede dispararse manualmente con `curl`. Sin guardia, los efectos
 * laterales se duplican: emails extra, alertas duplicadas, contadores mal.
 *
 * Patrón:
 *
 *     export async function GET(req: NextRequest) {
 *       if (!authorizedCron(req)) return unauthorized()
 *
 *       const claim = await claimCronRun('morning-briefing')
 *       if (!claim.acquired) {
 *         return NextResponse.json({ duplicate: true, reason: claim.reason })
 *       }
 *
 *       try {
 *         const result = await doWork()
 *         await completeCronRun(claim.runId, { ok: true, ...result })
 *         return NextResponse.json(result)
 *       } catch (err) {
 *         await failCronRun(claim.runId, err)
 *         throw err
 *       }
 *     }
 */

import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export type CronClaim =
  | { acquired: true; runId: string; bucket: string }
  | { acquired: false; reason: 'duplicate' | 'error'; bucket: string }

export interface ClaimOptions {
  /**
   * Tamaño del bucket en minutos. Default 1 (un bucket = un minuto).
   * Si tu cron corre cada hora, usa 60 para que retries dentro de la misma
   * hora se deduplican naturalmente.
   */
  bucketMinutes?: number
  /** Override del "now" para tests. */
  now?: Date
}

/**
 * Calcula el bucket determinístico para un instante dado.
 * Formato: `YYYYMMDDHHmm` truncado a múltiplos de `bucketMinutes`.
 */
export function computeBucket(now: Date, bucketMinutes: number): string {
  const minutes = Math.floor(now.getUTCMinutes() / bucketMinutes) * bucketMinutes
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${now.getUTCFullYear()}` +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    pad(now.getUTCHours()) +
    pad(minutes)
  )
}

/**
 * Intenta reclamar la ejecución de un cron en el bucket actual.
 * Devuelve `{acquired: true, runId}` si soy el primero, o
 * `{acquired: false, reason: 'duplicate'}` si otra invocación ya está corriendo.
 */
export async function claimCronRun(
  cronName: string,
  options: ClaimOptions = {},
): Promise<CronClaim> {
  const bucketMinutes = options.bucketMinutes ?? 1
  const now = options.now ?? new Date()
  const bucket = computeBucket(now, bucketMinutes)

  try {
    const row = await prisma.cronRun.create({
      data: { cronName, bucket, status: 'RUNNING', startedAt: now },
      select: { id: true },
    })
    return { acquired: true, runId: row.id, bucket }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { acquired: false, reason: 'duplicate', bucket }
    }
    console.error('[cron/idempotency] claim falló', err)
    return { acquired: false, reason: 'error', bucket }
  }
}

/**
 * Marca la corrida como completada con el resultado opcional.
 * Fire-and-forget: si falla, se logea pero no se relanza (la corrida real
 * ya tuvo éxito).
 */
export async function completeCronRun(
  runId: string,
  result?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.cronRun.update({
      where: { id: runId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: result === undefined ? Prisma.JsonNull : (result as Prisma.InputJsonValue),
      },
    })
  } catch (err) {
    console.error('[cron/idempotency] complete falló', err)
  }
}

/** Marca la corrida como fallida con el error. */
export async function failCronRun(runId: string, err: unknown): Promise<void> {
  try {
    await prisma.cronRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500),
      },
    })
  } catch (e) {
    console.error('[cron/idempotency] fail falló', e)
  }
}
