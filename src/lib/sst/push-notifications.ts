/**
 * Push notifications para alertas SST CRITICAL/HIGH.
 *
 * El SST tiene plazos legales no negociables — un IPERC vencido, un EMO
 * fuera de plazo, una notificación SAT a punto de vencer. Email + dashboard
 * no son suficientes; necesitamos push push push.
 *
 * Reglas:
 *   - Solo se envía push para severidad CRITICAL o HIGH (no spam)
 *   - El destinatario es:
 *       1. El admin SST de la org (Worker con userId + role ADMIN/OWNER)
 *       2. Si no hay admin con cuenta worker, todos los OWNER/ADMIN de la org
 *   - Idempotente: usa `tag` único por alerta para que el mismo aviso no
 *     dispare múltiples notificaciones acumuladas
 *   - Falla silenciosa: si VAPID no está configurado, simplemente no envía
 *
 * Mensajes específicos por tipo (en español peruano neutro):
 *   IPERC_VENCIDO       → "Tu matriz IPERC venció — actualízala antes de seguir trabajando"
 *   EMO_VENCIDO         → "Trabajador X tiene EMO vencido"
 *   SAT_PLAZO_PROXIMO   → "Plazo SAT vence en X horas — notifica al SUNAFIL"
 *   SAT_PLAZO_VENCIDO   → "Plazo SAT VENCIDO — multa potencial S/ XXX"
 *   COMITE_REUNION_PENDIENTE → "Reunión mensual del Comité SST pendiente"
 */

import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/notifications/web-push-server'
import {
  Prisma,
  type WorkerAlertType,
  type AlertSeverity,
} from '@/generated/prisma/client'

interface NotifyArgs {
  alertId: string
  orgId: string
  workerId: string | null
  type: WorkerAlertType
  severity: AlertSeverity
  title: string
  description?: string | null
}

interface PushTemplate {
  title: string
  body: (args: NotifyArgs) => string
  url: string
}

/**
 * Mapeo de WorkerAlertType → texto humano del push.
 * Solo incluimos los SST. Los demás (CONTRATO_*, CTS_*, etc.) los maneja el
 * push-handler genérico de los eventos.
 */
const SST_TEMPLATES: Partial<Record<WorkerAlertType, PushTemplate>> = {
  IPERC_VENCIDO: {
    title: '⚠️ IPERC vencido',
    body: () =>
      'Tu matriz IPERC venció. Actualízala antes de seguir trabajando — Ley 29783 obliga.',
    url: '/dashboard/sst/iperc-bases',
  },
  EMO_VENCIDO: {
    title: '⚠️ EMO vencido',
    body: (a) => a.title || 'Hay un examen médico ocupacional vencido.',
    url: '/dashboard/sst/emo',
  },
  EMO_PROXIMO: {
    title: 'EMO próximo a vencer',
    body: (a) => a.title || 'Hay un examen médico próximo a vencerse.',
    url: '/dashboard/sst/emo',
  },
  SAT_PLAZO_PROXIMO: {
    title: '⏰ Plazo SAT próximo',
    body: (a) =>
      a.description ||
      'Recuerda notificar al SUNAFIL antes del plazo legal (D.S. 006-2022-TR).',
    url: '/dashboard/sst/accidentes',
  },
  SAT_PLAZO_VENCIDO: {
    title: '🚨 Plazo SAT VENCIDO',
    body: (a) =>
      a.description ||
      'No notificaste al SUNAFIL en plazo. Multa potencial. Acción urgente.',
    url: '/dashboard/sst/accidentes',
  },
  COMITE_REUNION_PENDIENTE: {
    title: 'Reunión Comité SST pendiente',
    body: () => 'El Comité SST debe reunirse mensualmente (R.M. 245-2021-TR).',
    url: '/dashboard/sst/comite',
  },
  COMITE_MANDATO_VENCE: {
    title: 'Mandato del Comité por vencer',
    body: () => 'El mandato del Comité SST vence pronto. Programa elecciones.',
    url: '/dashboard/sst/comite',
  },
  SIMULACRO_PENDIENTE: {
    title: 'Simulacro pendiente',
    body: () =>
      'Toca programar el simulacro de evacuación (Defensa Civil + Ley 29664).',
    url: '/dashboard/sst/plan-anual',
  },
}

/**
 * Determina los User.id que deben recibir el push para una alerta SST.
 * Retorna lista vacía si nadie tiene perfil + push activado.
 */
async function resolveRecipients(orgId: string): Promise<string[]> {
  // Owners + Admins con suscripción de push válida
  const candidates = await prisma.user.findMany({
    where: {
      orgId,
      role: { in: ['OWNER', 'ADMIN'] },
      pushSubscription: { not: Prisma.DbNull },
    },
    select: { id: true },
    take: 5, // No envías a los 50 admins de una multi-tenant
  })
  return candidates.map((u) => u.id)
}

/**
 * Envía push push para una alerta SST recién creada. Solo se ejecuta para
 * severidad CRITICAL o HIGH; las demás se quedan en email + dashboard.
 *
 * Diseñado para llamarse fire-and-forget: no lanza excepciones, log + return.
 */
export async function notifySstAlert(args: NotifyArgs): Promise<void> {
  // Filtro: solo CRITICAL y HIGH
  if (args.severity !== 'CRITICAL' && args.severity !== 'HIGH') return

  const tpl = SST_TEMPLATES[args.type]
  if (!tpl) return // tipo no SST o no tiene template

  try {
    const recipients = await resolveRecipients(args.orgId)
    if (recipients.length === 0) return

    const tag = `sst-alert-${args.alertId}`
    const body = tpl.body(args)

    await Promise.allSettled(
      recipients.map((userId) =>
        sendPushToUser(userId, {
          title: tpl.title,
          body,
          url: tpl.url,
          severity: args.severity,
          tag,
        }),
      ),
    )
  } catch (err) {
    console.error('[notifySstAlert] failed', {
      alertId: args.alertId,
      type: args.type,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}
