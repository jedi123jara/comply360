/**
 * Handler que envía Web Push al trabajador destinatario sobre eventos
 * relevantes para su vida diaria en la empresa.
 *
 * Eventos manejados:
 *  - `payslip.accepted` — (no envía push; el trabajador ya aceptó, no hay
 *    novedad que comunicarle). Lo dejamos fuera.
 *  - `contract.signed` — push solo al admin (fuera de scope de este handler)
 *  - `worker_request.cancelled` — silencioso (el mismo trabajador la canceló)
 *  - `training.due` — **al worker** "Tienes capacitación pendiente"
 *  - `training.completed` — **al worker** "¡Felicidades! Completaste X"
 *  - `document.expired` — **al worker** "Tu documento venció"
 *
 * Para eventos iniciados por el admin que deben llegar al worker (como
 * `payslip.created`, `contract.signed` disparado por admin, etc), lo
 * manejamos acá. El event bus tiene el orgId y el workerId en el payload.
 *
 * Falla silenciosa: si web-push no está configurado (VAPID), los pushes
 * se loggean pero no fallan — el handler siempre retorna.
 */

import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/notifications/web-push-server'
import type { DomainEvent, EventName } from '../catalog'

export async function pushHandler<K extends EventName>(event: DomainEvent<K>): Promise<void> {
  try {
    await dispatchByEvent(event)
  } catch (err) {
    console.error('[push-handler] falló', {
      event: event.name,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}

async function dispatchByEvent<K extends EventName>(event: DomainEvent<K>): Promise<void> {
  switch (event.name) {
    case 'training.due': {
      const p = event.payload as {
        workerId: string
        courseName?: string
        dueDate?: string
      }
      const userId = await resolveUserIdForWorker(p.workerId)
      if (!userId) return
      await sendPushToUser(userId, {
        title: 'Capacitación pendiente',
        body: p.courseName
          ? `Tienes pendiente: ${p.courseName}`
          : 'Tienes capacitaciones obligatorias pendientes.',
        url: '/mi-portal/capacitaciones',
        severity: 'MEDIUM',
        tag: `training-${p.workerId}`,
      })
      return
    }

    case 'training.completed': {
      const p = event.payload as {
        workerId: string
        score: number
        courseCategory?: string
      }
      const userId = await resolveUserIdForWorker(p.workerId)
      if (!userId) return
      await sendPushToUser(userId, {
        title: '¡Capacitación completada!',
        body: `Felicidades, aprobaste con nota ${p.score}/100. Tu certificado está listo.`,
        url: '/mi-portal/capacitaciones',
        severity: 'LOW',
        tag: `training-done-${p.workerId}`,
      })
      return
    }

    case 'document.expired': {
      const p = event.payload as {
        workerId: string
        documentType: string
        expiryDate: string
      }
      const userId = await resolveUserIdForWorker(p.workerId)
      if (!userId) return
      await sendPushToUser(userId, {
        title: 'Documento vencido',
        body: `Tu ${p.documentType.replaceAll('_', ' ')} venció el ${new Date(p.expiryDate).toLocaleDateString('es-PE')}. Subí uno nuevo desde el portal.`,
        url: '/mi-portal/documentos',
        severity: 'HIGH',
        tag: `doc-exp-${p.workerId}`,
      })
      return
    }

    case 'contract.expiring': {
      const p = event.payload as {
        contractId: string
        daysToExpiry: number
      }
      // contract.expiring no lleva workerId directo — necesitamos resolverlo
      const link = await prisma.workerContract.findFirst({
        where: { contractId: p.contractId },
        select: { workerId: true },
      })
      if (!link) return
      const userId = await resolveUserIdForWorker(link.workerId)
      if (!userId) return
      await sendPushToUser(userId, {
        title: 'Tu contrato vence pronto',
        body: `Vence en ${p.daysToExpiry} día${p.daysToExpiry === 1 ? '' : 's'}. Consultá con RRHH.`,
        url: '/mi-portal/contratos',
        severity: 'HIGH',
        tag: `contract-exp-${link.workerId}`,
      })
      return
    }

    default:
      // Muchos eventos del catálogo no generan push al worker (son admin-facing).
      return
  }
}

/**
 * Resuelve el User.id que corresponde al Worker (relación 1-1 cuando el
 * trabajador activó su portal). Si el worker no tiene User asociado, no hay
 * a quién mandarle push — retornamos null.
 */
async function resolveUserIdForWorker(workerId: string): Promise<string | null> {
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: { userId: true },
  })
  return worker?.userId ?? null
}
