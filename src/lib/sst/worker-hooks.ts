/**
 * Hooks SST que se disparan al crear / actualizar un Worker.
 *
 * Cuando un trabajador entra al sistema con flags relevantes (SCTR, sin EMO,
 * puesto con peligros), el módulo SST genera tareas automáticas:
 *
 *   1. Si requiere SCTR Anexo 5 → alerta `REGISTRO_INCOMPLETO` hasta que se
 *      registre póliza SCTR vigente.
 *   2. Si no tiene EMO previo → alerta `EMO_PROXIMO` con plazo 30 días para
 *      programar el examen pre-empleo (R.M. 312-2011-MINSA).
 *   3. Si su puesto/sede no tiene IPERC vigente → alerta `IPERC_VENCIDO`
 *      al admin SST de la org (Ley 29783 Art. 19).
 *
 * Función fire-and-forget: nunca bloquea la creación del Worker. Errores se
 * registran en console y se reintentan en el cron diario sst-daily.
 */

import { prisma } from '@/lib/prisma'
import { notifySstAlert } from './push-notifications'

interface WorkerHookInput {
  workerId: string
  orgId: string
}

const FP_PREFIX = '[sst-fp:'
const FP_SUFFIX = ']'
function wrapDescription(description: string, fingerprint: string): string {
  return `${FP_PREFIX}${fingerprint}${FP_SUFFIX} ${description}`
}

/**
 * Genera alertas SST para un Worker recién creado o actualizado.
 * Idempotente: usa fingerprint en `description` para no duplicar alertas
 * si se llama varias veces (ej: actualización del puesto).
 */
export async function runWorkerSstHook(input: WorkerHookInput): Promise<{
  alertasCreadas: number
  alertasReusadas: number
}> {
  const { workerId, orgId } = input
  let alertasCreadas = 0
  let alertasReusadas = 0

  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: {
      id: true,
      orgId: true,
      firstName: true,
      lastName: true,
      sctr: true,
      sctrRiesgoNivel: true,
      discapacidad: true,
      status: true,
    },
  })

  if (!worker || worker.orgId !== orgId || worker.status !== 'ACTIVE') {
    return { alertasCreadas, alertasReusadas }
  }

  // ── 1. SCTR pendiente de registro de póliza ─────────────────────────────
  if (worker.sctr) {
    const fp = `WORKER_SCTR_PENDIENTE:${worker.id}`
    const exists = await prisma.workerAlert.findFirst({
      where: {
        orgId,
        workerId: worker.id,
        type: 'REGISTRO_INCOMPLETO',
        resolvedAt: null,
        description: { startsWith: `${FP_PREFIX}${fp}${FP_SUFFIX}` },
      },
      select: { id: true },
    })
    if (!exists) {
      const created = await prisma.workerAlert.create({
        data: {
          orgId,
          workerId: worker.id,
          type: 'REGISTRO_INCOMPLETO',
          severity: 'HIGH',
          title: 'SCTR pendiente de registro de póliza',
          description: wrapDescription(
            `${worker.firstName} ${worker.lastName} requiere SCTR (Anexo 5 D.S. 009-97-SA). Registra la póliza vigente con la aseguradora antes del primer día efectivo de trabajo.`,
            fp,
          ),
          dueDate: null,
        },
      })
      alertasCreadas++
      // Push fire-and-forget para alertas HIGH/CRITICAL
      notifySstAlert({
        alertId: created.id,
        orgId,
        workerId: worker.id,
        type: created.type,
        severity: created.severity,
        title: created.title,
        description: created.description,
      }).catch(() => undefined)
    } else {
      alertasReusadas++
    }
  }

  // ── 2. EMO pre-empleo no registrado ─────────────────────────────────────
  const emoCount = await prisma.eMO.count({
    where: { orgId, workerId: worker.id },
  })
  if (emoCount === 0) {
    const fp = `WORKER_EMO_PRE_EMPLEO:${worker.id}`
    const exists = await prisma.workerAlert.findFirst({
      where: {
        orgId,
        workerId: worker.id,
        type: 'EMO_PROXIMO',
        resolvedAt: null,
        description: { startsWith: `${FP_PREFIX}${fp}${FP_SUFFIX}` },
      },
      select: { id: true },
    })
    if (!exists) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)
      await prisma.workerAlert.create({
        data: {
          orgId,
          workerId: worker.id,
          type: 'EMO_PROXIMO',
          severity: 'MEDIUM',
          title: 'Programar EMO pre-empleo',
          description: wrapDescription(
            `${worker.firstName} ${worker.lastName} no tiene EMO registrado. R.M. 312-2011-MINSA exige EMO pre-empleo. Programa cita con centro DIGESA (plazo 30 días).`,
            fp,
          ),
          dueDate,
        },
      })
      alertasCreadas++
    } else {
      alertasReusadas++
    }
  }

  // ── 3. Sin IPERC vigente en NINGUNA sede de la org ──────────────────────
  // (alerta a nivel org, anclada al worker para que sea visible en su perfil)
  const sedesConIpercVigente = await prisma.iPERCBase.count({
    where: { orgId, estado: 'VIGENTE' },
  })
  if (sedesConIpercVigente === 0) {
    const fp = `ORG_SIN_IPERC_VIGENTE:${orgId}`
    const exists = await prisma.workerAlert.findFirst({
      where: {
        orgId,
        type: 'IPERC_VENCIDO',
        resolvedAt: null,
        description: { startsWith: `${FP_PREFIX}${fp}${FP_SUFFIX}` },
      },
      select: { id: true },
    })
    if (!exists) {
      const created = await prisma.workerAlert.create({
        data: {
          orgId,
          workerId: worker.id, // anchor al worker recién creado
          type: 'IPERC_VENCIDO',
          severity: 'HIGH',
          title: 'Empresa sin IPERC vigente',
          description: wrapDescription(
            `Tu organización no tiene una matriz IPERC en estado VIGENTE. Ley 29783 Art. 19 obliga a evaluar riesgos antes de incorporar trabajadores. Crea o aprueba un IPERC en /dashboard/sst/sedes.`,
            fp,
          ),
          dueDate: null,
        },
      })
      alertasCreadas++
      notifySstAlert({
        alertId: created.id,
        orgId,
        workerId: worker.id,
        type: created.type,
        severity: created.severity,
        title: created.title,
        description: created.description,
      }).catch(() => undefined)
    } else {
      alertasReusadas++
    }
  }

  return { alertasCreadas, alertasReusadas }
}
