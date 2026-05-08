import { prisma } from '@/lib/prisma'
import { REQUIRED_DOC_TYPES } from '@/lib/compliance/legajo-config'

interface WorkerData {
  id: string
  orgId: string
  dni: string
  firstName: string
  lastName: string
  regimenLaboral: string
  tipoContrato: string
  tipoAporte: string
  afpNombre: string | null
  fechaIngreso: Date
  fechaCese: Date | null
  sueldoBruto: number
  sctr: boolean
  essaludVida: boolean
  status: string
  legajoScore: number | null
  // Ola 1 — flag de cumplimiento operacional
  flagTRegistroPresentado: boolean
  documents: { documentType: string; status: string; expiresAt: Date | null }[]
  workerContracts: { contract: { expiresAt: Date | null; status: string } }[]
  vacations: { diasPendientes: number; esDoble: boolean; periodoFin: Date }[]
}

type AlertInput = {
  type: string
  severity: string
  title: string
  description: string
  dueDate?: Date
  multaEstimada?: number
}

/**
 * Generate alerts for a single worker based on current state.
 * Clears existing unresolved alerts and recalculates.
 */
export async function generateWorkerAlerts(workerId: string): Promise<number> {
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    include: {
      documents: {
        select: { documentType: true, status: true, expiresAt: true },
      },
      workerContracts: {
        include: {
          contract: { select: { expiresAt: true, status: true } },
        },
      },
      vacations: {
        select: { diasPendientes: true, esDoble: true, periodoFin: true },
      },
    },
  })

  // worker now includes tipoAporte, afpNombre, sctr, essaludVida, flagTRegistroPresentado

  if (!worker || worker.status === 'TERMINATED' || worker.deletedAt) return 0

  const workerData: WorkerData = {
    ...worker,
    sueldoBruto: Number(worker.sueldoBruto),
    tipoAporte: worker.tipoAporte ?? 'AFP',
    afpNombre: worker.afpNombre ?? null,
    sctr: worker.sctr ?? false,
    essaludVida: worker.essaludVida ?? false,
    flagTRegistroPresentado: worker.flagTRegistroPresentado ?? false,
  }

  const alerts = computeAlerts(workerData)

  // FIX #6.B: deleteMany + createMany dentro de la MISMA transacción.
  // Antes corrían en pasos separados, abriendo race condition: si dos
  // triggers (PUT worker + cron daily-alerts) se ejecutaban en paralelo,
  // ambos borraban las alertas y ambos creaban → duplicados o pérdida de
  // `resolvedAt` en alertas que el otro acababa de resolver.
  await prisma.$transaction([
    prisma.workerAlert.deleteMany({
      where: { workerId, resolvedAt: null },
    }),
    ...(alerts.length > 0
      ? [
          prisma.workerAlert.createMany({
            data: alerts.map(a => ({
              workerId,
              orgId: worker.orgId,
              type: a.type as 'CONTRATO_POR_VENCER',
              severity: a.severity as 'CRITICAL',
              title: a.title,
              description: a.description,
              dueDate: a.dueDate ?? null,
              multaEstimada: a.multaEstimada ?? null,
            })),
          }),
        ]
      : []),
  ])

  return alerts.length
}

/**
 * Generate alerts for ALL active workers in an organization.
 * Excluye soft-deleted (deletedAt != null).
 *
 * FIX #6.C: paralelización con cap de concurrencia (8 workers a la vez).
 * Antes el loop era totalmente secuencial → 500 workers × ~5 queries cada uno
 * = 2,500+ queries serializadas; el cron daily-alerts tardaba minutos en
 * orgs medianas. Con concurrencia 8, el tiempo wallclock baja ~8x sin
 * agotar el connection pool de Postgres (Supabase free-tier).
 *
 * La versión batch (1 query findMany con includes + procesamiento en memoria
 * + 1 transaction grande) requiere refactor mayor del shape de WorkerData
 * y queda como mejora futura.
 */
export async function generateOrgAlerts(orgId: string): Promise<{ total: number; workers: number }> {
  const workers = await prisma.worker.findMany({
    where: { orgId, status: { not: 'TERMINATED' }, deletedAt: null },
    select: { id: true },
  })

  const CONCURRENCY = 8
  let total = 0
  for (let i = 0; i < workers.length; i += CONCURRENCY) {
    const batch = workers.slice(i, i + CONCURRENCY)
    const counts = await Promise.all(
      batch.map((w) => generateWorkerAlerts(w.id).catch((err) => {
        console.error(`[alert-engine] worker ${w.id} failed:`, err)
        return 0
      }))
    )
    total += counts.reduce((a, b) => a + b, 0)
  }

  return { total, workers: workers.length }
}

function computeAlerts(w: WorkerData): AlertInput[] {
  const alerts: AlertInput[] = []
  const now = new Date()
  const UIT = 5500 // 2026

  // --- Contract expiration ---
  for (const wc of w.workerContracts) {
    const exp = wc.contract.expiresAt
    if (!exp || wc.contract.status === 'EXPIRED' || wc.contract.status === 'ARCHIVED') continue

    const daysLeft = Math.ceil((new Date(exp).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) {
      alerts.push({
        type: 'CONTRATO_VENCIDO',
        severity: 'CRITICAL',
        title: `Contrato vencido de ${w.firstName} ${w.lastName}`,
        description: `El contrato vencio hace ${Math.abs(daysLeft)} dias. Riesgo de desnaturalizacion a plazo indeterminado.`,
        multaEstimada: UIT * 0.5, // Infraccion grave
      })
    } else if (daysLeft <= 30) {
      alerts.push({
        type: 'CONTRATO_POR_VENCER',
        severity: daysLeft <= 7 ? 'HIGH' : 'MEDIUM',
        title: `Contrato por vencer en ${daysLeft} dias`,
        description: `El contrato de ${w.firstName} ${w.lastName} vence el ${new Date(exp).toLocaleDateString('es-PE')}. Renovar o liquidar.`,
        dueDate: new Date(exp),
      })
    }
  }

  // --- Vacation accumulation ---
  const pendingVacations = w.vacations.filter(v => v.diasPendientes > 0)
  if (pendingVacations.length >= 2) {
    const hasDoble = pendingVacations.some(v => v.esDoble)
    alerts.push({
      type: hasDoble ? 'VACACIONES_DOBLE_PERIODO' : 'VACACIONES_ACUMULADAS',
      severity: hasDoble ? 'CRITICAL' : 'HIGH',
      title: hasDoble
        ? `Triple vacacional para ${w.firstName} ${w.lastName}`
        : `${pendingVacations.length} periodos de vacaciones acumulados`,
      description: hasDoble
        ? 'El trabajador tiene 2+ periodos sin goce. Debe pagar triple vacacional (D.Leg. 713 Art. 23).'
        : `Tiene ${pendingVacations.length} periodos pendientes. Riesgo de triple vacacional si acumula otro.`,
      multaEstimada: hasDoble ? w.sueldoBruto * 3 : undefined,
    })
  }

  // --- Missing required documents (uses canonical 18-doc list from legajo-config) ---
  const uploadedTypes = w.documents.filter(d => d.status !== 'MISSING').map(d => d.documentType)
  const missing = REQUIRED_DOC_TYPES.filter(d => !uploadedTypes.includes(d))

  if (missing.length > 0) {
    alerts.push({
      type: 'DOCUMENTO_FALTANTE',
      severity: missing.length >= 5 ? 'HIGH' : 'MEDIUM',
      title: `${missing.length} documento${missing.length > 1 ? 's' : ''} obligatorio${missing.length > 1 ? 's' : ''} faltante${missing.length > 1 ? 's' : ''}`,
      description: `Faltan: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}. Infraccion grave ante SUNAFIL.`,
      multaEstimada: UIT * 0.23 * missing.length, // Leve por cada documento
    })
  }

  // --- Expired documents ---
  const expiredDocs = w.documents.filter(d => d.expiresAt && new Date(d.expiresAt) < now && d.status !== 'EXPIRED')
  if (expiredDocs.length > 0) {
    alerts.push({
      type: 'DOCUMENTO_VENCIDO',
      severity: 'HIGH',
      title: `${expiredDocs.length} documento${expiredDocs.length > 1 ? 's' : ''} vencido${expiredDocs.length > 1 ? 's' : ''}`,
      description: `Documentos vencidos: ${expiredDocs.map(d => d.documentType).join(', ')}`,
    })
  }

  // --- Expired medical exam (SCTR) ---
  const sctrDoc = w.documents.find(d => d.documentType === 'examen_medico_periodico')
  if (sctrDoc?.expiresAt && new Date(sctrDoc.expiresAt) < now) {
    alerts.push({
      type: 'EXAMEN_MEDICO_VENCIDO',
      severity: 'CRITICAL',
      title: 'Examen medico ocupacional vencido',
      description: `El examen medico periodico de ${w.firstName} ${w.lastName} esta vencido. Obligatorio por Ley 29783.`,
      multaEstimada: UIT * 1.57, // Infraccion grave SST
    })
  }

  // --- Incomplete legajo ---
  if (w.legajoScore !== null && w.legajoScore < 70) {
    alerts.push({
      type: 'REGISTRO_INCOMPLETO',
      severity: w.legajoScore < 30 ? 'HIGH' : 'MEDIUM',
      title: `Legajo incompleto (${w.legajoScore}%)`,
      description: `El legajo de ${w.firstName} ${w.lastName} tiene solo ${w.legajoScore}% de completitud. Riesgo ante inspeccion SUNAFIL.`,
    })
  }

  // ─── CALENDAR-BASED ALERTS ───────────────────────────────────────────────
  // Full 30-obligation compliance calendar for Peruvian labor law
  const month = now.getMonth() + 1 // 1-12
  const day = now.getDate()
  const year = now.getFullYear()

  // Helper: days until a target date
  const daysUntil = (targetMonth: number, targetDay: number, targetYear = year): number =>
    Math.ceil((new Date(targetYear, targetMonth - 1, targetDay).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Helper: alert if within ALERT_DAYS_BEFORE days of due date
  const ALERT_WINDOW = 30  // days before due date to start alerting

  // ─── 1. CTS — 15 mayo y 15 noviembre ────────────────────────────────────
  // Regimenes con CTS: GENERAL, MYPE_PEQUENA, CONSTRUCCION_CIVIL, PESQUERO, MINERO, TELETRABAJO
  const REGIMENES_CON_CTS = ['GENERAL', 'MYPE_PEQUENA', 'CONSTRUCCION_CIVIL', 'PESQUERO', 'MINERO', 'TEXTIL_EXPORTACION', 'TELETRABAJO', 'DOMESTICO']
  if (REGIMENES_CON_CTS.includes(w.regimenLaboral)) {
    // Mayo
    const dtsMayo = daysUntil(5, 15)
    if (dtsMayo >= 0 && dtsMayo <= ALERT_WINDOW) {
      alerts.push({
        type: 'CTS_PENDIENTE',
        severity: dtsMayo <= 7 ? 'CRITICAL' : 'HIGH',
        title: `Deposito CTS mayo en ${dtsMayo} dias`,
        description: `Fecha limite: 15 de mayo (periodo nov-abr). Base legal: D.S. 001-97-TR. Multa grave si incumple.`,
        dueDate: new Date(year, 4, 15),
        multaEstimada: UIT * 1.57,
      })
    }
    // Noviembre
    const dtsNov = daysUntil(11, 15)
    if (dtsNov >= 0 && dtsNov <= ALERT_WINDOW) {
      alerts.push({
        type: 'CTS_PENDIENTE',
        severity: dtsNov <= 7 ? 'CRITICAL' : 'HIGH',
        title: `Deposito CTS noviembre en ${dtsNov} dias`,
        description: `Fecha limite: 15 de noviembre (periodo may-oct). Base legal: D.S. 001-97-TR.`,
        dueDate: new Date(year, 10, 15),
        multaEstimada: UIT * 1.57,
      })
    }
  }

  // ─── 2. Gratificaciones — 15 julio y 15 diciembre ───────────────────────
  const REGIMENES_CON_GRAT = ['GENERAL', 'MYPE_PEQUENA', 'CONSTRUCCION_CIVIL', 'PESQUERO', 'MINERO', 'TEXTIL_EXPORTACION', 'TELETRABAJO', 'DOMESTICO', 'CAS']
  if (REGIMENES_CON_GRAT.includes(w.regimenLaboral)) {
    const dtsJul = daysUntil(7, 15)
    if (dtsJul >= 0 && dtsJul <= ALERT_WINDOW) {
      alerts.push({
        type: 'GRATIFICACION_PENDIENTE',
        severity: dtsJul <= 7 ? 'CRITICAL' : 'HIGH',
        title: `Gratificacion Fiestas Patrias en ${dtsJul} dias`,
        description: `Fecha limite: 15 de julio. 1 remuneracion mensual + 9% BE. Base: Ley 27735.`,
        dueDate: new Date(year, 6, 15),
        multaEstimada: UIT * 1.57,
      })
    }
    const dtsDic = daysUntil(12, 15)
    if (dtsDic >= 0 && dtsDic <= ALERT_WINDOW) {
      alerts.push({
        type: 'GRATIFICACION_PENDIENTE',
        severity: dtsDic <= 7 ? 'CRITICAL' : 'HIGH',
        title: `Gratificacion Navidad en ${dtsDic} dias`,
        description: `Fecha limite: 15 de diciembre. 1 remuneracion mensual + 9% BE. Base: Ley 27735.`,
        dueDate: new Date(year, 11, 15),
        multaEstimada: UIT * 1.57,
      })
    }
  }

  // ─── 3. AFP — días 1-5 de cada mes ──────────────────────────────────────
  // Alerta si hoy es 26+ del mes anterior o días 1-5 del mes actual
  if ((day >= 26 || day <= 5) && w.tipoAporte === 'AFP') {
    const afpDue = day >= 26
      ? new Date(year, month - 1 + 1, 5)  // next month day 5
      : new Date(year, month - 1, 5)       // this month day 5
    const dtsAfp = Math.ceil((afpDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (dtsAfp >= 0 && dtsAfp <= 10) {
      alerts.push({
        type: 'AFP_EN_MORA',
        severity: dtsAfp <= 2 ? 'CRITICAL' : 'HIGH',
        title: `Aporte AFP vence en ${dtsAfp} dias`,
        description: `Fecha limite: dias 1-5 del mes segun ultimo digito RUC (cronograma SUNAT). AFP: ${w.afpNombre ?? 'AFP registrada'}. Mora: tasa TAMN diaria.`,
        dueDate: afpDue,
        multaEstimada: w.sueldoBruto * 0.10 * 0.02, // 2% del aporte en mora aprox.
      })
    }
  }

  // ─── 4. Utilidades — 30 días después de DJ anual (aprox. abril) ─────────
  // DJ anual se presenta en marzo; utilidades vencen en abril
  const dtsUtil = daysUntil(4, 30)
  if (dtsUtil >= 0 && dtsUtil <= ALERT_WINDOW && ['GENERAL', 'MYPE_PEQUENA'].includes(w.regimenLaboral)) {
    alerts.push({
      type: 'CTS_PENDIENTE', // reutilizamos el tipo más cercano
      severity: dtsUtil <= 10 ? 'HIGH' : 'MEDIUM',
      title: `Pago de utilidades vence aprox. en ${dtsUtil} dias`,
      description: `Las utilidades deben pagarse dentro de los 30 dias siguientes a la DJ anual del IR. Base: D.Leg. 892.`,
      dueDate: new Date(year, 3, 30),
      multaEstimada: UIT * 2.63,
    })
  }

  // ─── 5. Seguro de Vida Ley — 4 años de antiguedad ───────────────────────
  const antiguedadAnos = (now.getTime() - new Date(w.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  if (antiguedadAnos >= 4 && !w.essaludVida) {
    // Si cumplió 4 años y no tiene Seguro Vida Ley registrado
    alerts.push({
      type: 'DOCUMENTO_FALTANTE',
      severity: 'HIGH',
      title: `Seguro de Vida Ley obligatorio — ${w.firstName} ${w.lastName}`,
      description: `El trabajador tiene ${Math.floor(antiguedadAnos)} anios de antiguedad. Seguro de Vida Ley obligatorio desde el 4to anio (D.Leg. 688). Contratar poliza con aseguradora.`,
      multaEstimada: UIT * 1.57,
    })
  } else if (antiguedadAnos >= 0.25 && antiguedadAnos < 4 && !w.essaludVida) {
    // Entre 3 meses y 4 años — facultativo pero recomendable
    if (antiguedadAnos >= 3) {
      const ingresoDate = new Date(w.fechaIngreso)
      const dtsCumple4 = Math.ceil((new Date(ingresoDate.getFullYear() + 4, ingresoDate.getMonth(), ingresoDate.getDate()).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (dtsCumple4 <= 60) {
        alerts.push({
          type: 'DOCUMENTO_FALTANTE',
          severity: 'MEDIUM',
          title: `Seguro Vida Ley — ${w.firstName} cumple 4 años en ${dtsCumple4} dias`,
          description: `En ${dtsCumple4} dias el Seguro de Vida Ley pasará de facultativo a obligatorio (D.Leg. 688). Preparar contratacion de poliza.`,
        })
      }
    }
  }

  // ─── 6. Examen médico ocupacional periódico ──────────────────────────────
  // Cada 2 años para trabajadores en general (Ley 29783 / R.M. 571-2014-MINSA)
  const emoDoc = w.documents.find(d => d.documentType === 'examen_medico_periodico' || d.documentType === 'examen_medico_ingreso')
  if (emoDoc?.expiresAt) {
    const dtsEmo = Math.ceil((new Date(emoDoc.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (dtsEmo < 0) {
      // Already handled in expiredDocs block above
    } else if (dtsEmo <= 60) {
      alerts.push({
        type: 'EXAMEN_MEDICO_VENCIDO',
        severity: dtsEmo <= 30 ? 'HIGH' : 'MEDIUM',
        title: `Examen medico ocupacional vence en ${dtsEmo} dias`,
        description: `Programar renovacion del examen medico periodico antes del vencimiento. Obligatorio por Ley 29783 / R.M. 571-2014-MINSA.`,
        dueDate: new Date(emoDoc.expiresAt),
        multaEstimada: UIT * 1.57,
      })
    }
  } else if (antiguedadAnos >= 2) {
    // No tiene EMO registrado y tiene 2+ años
    alerts.push({
      type: 'EXAMEN_MEDICO_VENCIDO',
      severity: 'HIGH',
      title: `Examen medico periodico sin registrar — ${w.firstName} ${w.lastName}`,
      description: `El trabajador tiene ${Math.floor(antiguedadAnos)} anios sin examen medico ocupacional periodico registrado. Obligatorio cada 2 anios (Ley 29783).`,
      multaEstimada: UIT * 1.57,
    })
  }

  // ─── 7. SCTR — verificar vigencia ───────────────────────────────────────
  if (w.sctr) {
    const sctrDoc2 = w.documents.find(d => d.documentType === 'sctr')
    if (sctrDoc2?.expiresAt) {
      const dtsSctr = Math.ceil((new Date(sctrDoc2.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (dtsSctr >= 0 && dtsSctr <= 30) {
        alerts.push({
          type: 'DOCUMENTO_VENCIDO',
          severity: dtsSctr <= 10 ? 'CRITICAL' : 'HIGH',
          title: `SCTR vence en ${dtsSctr} dias — ${w.firstName} ${w.lastName}`,
          description: `Renovar SCTR (Seguro Complementario de Trabajo de Riesgo). Obligatorio Ley 29783 para trabajos de riesgo.`,
          dueDate: new Date(sctrDoc2.expiresAt as Date),
          multaEstimada: UIT * 2.63,
        })
      }
    }
  }

  // ─── 8. RMV — Remuneración por debajo del mínimo vital ──────────────────
  // Aplica a trabajadores a tiempo completo. Exento: MYPE_MICRO, MODALIDAD_FORMATIVA
  const regimenExentoRmv = ['MYPE_MICRO', 'MODALIDAD_FORMATIVA'].includes(w.regimenLaboral)
  const esTiempoCompleto = true // campo no disponible aún, asumimos TC
  const RMV = 1130 // 2026
  if (!regimenExentoRmv && esTiempoCompleto && w.sueldoBruto < RMV) {
    alerts.push({
      type: 'REGISTRO_INCOMPLETO',
      severity: 'CRITICAL',
      title: `Sueldo por debajo de la RMV — ${w.firstName} ${w.lastName}`,
      description: `Sueldo actual S/ ${w.sueldoBruto.toFixed(2)} está por debajo de la RMV S/ ${RMV}. Infracción GRAVE (DS019 Art. 24.4). Ajustar inmediatamente.`,
      multaEstimada: UIT * 1.57,
    })
  }

  // ─── 9. Contrato a plazo fijo sin constancia de registro MTPE ───────────
  const tienePlazFijo = w.workerContracts.some(wc =>
    wc.contract.status !== 'ARCHIVED' && wc.contract.expiresAt !== null
  )
  if (tienePlazFijo) {
    const tieneRegistroMtpe = w.documents.some(d =>
      d.documentType === 'registro_contrato_mtpe' && d.status !== 'MISSING'
    )
    if (!tieneRegistroMtpe) {
      alerts.push({
        type: 'DOCUMENTO_FALTANTE',
        severity: 'HIGH',
        title: `Contrato a plazo fijo sin registro MTPE — ${w.firstName} ${w.lastName}`,
        description: `Los contratos a modalidad deben registrarse ante el MTPE dentro de 15 días hábiles de suscritos (D.S. 003-97-TR Art. 72). Sin registro puede ser impugnado.`,
        multaEstimada: UIT * 1.57,
      })
    }
  }

  // ─── 10. EsSalud — sin constancia de afiliación ─────────────────────────
  const tieneEssalud = w.documents.some(d =>
    d.documentType === 'essalud_registro' && d.status !== 'MISSING'
  )
  if (!tieneEssalud) {
    alerts.push({
      type: 'DOCUMENTO_FALTANTE',
      severity: 'CRITICAL',
      title: `Sin constancia EsSalud — ${w.firstName} ${w.lastName}`,
      description: `No se registra afiliación a EsSalud en el legajo. Obligatorio para todos los trabajadores (Ley 26790). Multa MUY GRAVE (DS019 Art. 26.1).`,
      multaEstimada: UIT * 2.63,
    })
  }

  // ─── 11. Inducción SST de ingreso ───────────────────────────────────────
  const tieneInduccion = w.documents.some(d =>
    d.documentType === 'induccion_sst' && d.status !== 'MISSING'
  )
  if (!tieneInduccion) {
    const diasIngreso = Math.floor((now.getTime() - new Date(w.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24))
    if (diasIngreso >= 7) { // Solo alertar si tiene más de 7 días de ingresado
      alerts.push({
        type: 'CAPACITACION_PENDIENTE',
        severity: diasIngreso >= 30 ? 'HIGH' : 'MEDIUM',
        title: `Inducción SST pendiente — ${w.firstName} ${w.lastName}`,
        description: `Sin registro de inducción SST de ingreso. Obligatorio antes de que el trabajador inicie sus labores (Ley 29783 Art. 35). Multa GRAVE.`,
        multaEstimada: UIT * 1.57,
      })
    }
  }

  // ─── 12. T-REGISTRO no presentado (Ola 1 — compliance SUNAFIL) ──────────
  // SUNAT exige registrar al trabajador dentro de 1 día hábil del ingreso
  // (D.S. 003-97-TR Art. 60). Sin marca → multa 2.35 UIT.
  if (w.status === 'ACTIVE' && !w.flagTRegistroPresentado) {
    const diasDesdeIngreso = Math.floor(
      (now.getTime() - new Date(w.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24),
    )
    // Aproximación: 1 día hábil se cumple si ya pasaron al menos 2 días calendario
    if (diasDesdeIngreso >= 2) {
      alerts.push({
        type: 'T_REGISTRO_NO_PRESENTADO',
        severity: diasDesdeIngreso >= 7 ? 'CRITICAL' : 'HIGH',
        title: `T-REGISTRO no presentado — ${w.firstName} ${w.lastName}`,
        description: `Han pasado ${diasDesdeIngreso} días desde el ingreso sin registro en T-REGISTRO SUNAT. Plazo legal: 1 día hábil. Multa SUNAFIL 2.35 UIT.`,
        multaEstimada: UIT * 2.35,
      })
    }
  }

  // ─── 13. SCTR vencido (sectores de riesgo, Ola 1) ───────────────────────
  // Construcción civil, minería y pesca exigen SCTR vigente. Sin él, multa
  // grave + responsabilidad solidaria del empleador en accidentes (Ley 26790).
  const sectoresRiesgo = ['CONSTRUCCION_CIVIL', 'MINERO', 'PESQUERO']
  if (sectoresRiesgo.includes(w.regimenLaboral) || w.sctr) {
    const sctrDocs = w.documents.filter(d => d.documentType === 'sctr' || d.documentType === 'sctr_vigencia')
    const sctrVigente = sctrDocs.some(d => {
      if (!d.expiresAt) return false
      return new Date(d.expiresAt) > now
    })
    if (!sctrVigente) {
      alerts.push({
        type: 'SCTR_VENCIDO',
        severity: 'CRITICAL',
        title: `SCTR vencido — ${w.firstName} ${w.lastName}`,
        description: `${sectoresRiesgo.includes(w.regimenLaboral)
          ? `Régimen ${w.regimenLaboral} obliga SCTR vigente.`
          : 'SCTR marcado como activo pero sin póliza vigente cargada.'} Renovar inmediatamente. Multa SUNAFIL 6.63 UIT.`,
        multaEstimada: UIT * 6.63,
      })
    }
  }

  // ─── 14. Licencia médica vencida (Ola 1) ────────────────────────────────
  // Si hay un descanso médico cargado y ya expiró sin renovación, riesgo de
  // pérdida del derecho de licencia + cuestionamiento ante EsSalud.
  const licenciaDocs = w.documents.filter(d =>
    d.documentType === 'licencia_medica' || d.documentType === 'descanso_medico'
  )
  for (const lic of licenciaDocs) {
    if (lic.expiresAt && new Date(lic.expiresAt) < now && lic.status !== 'EXPIRED') {
      const diasVencido = Math.floor(
        (now.getTime() - new Date(lic.expiresAt).getTime()) / (1000 * 60 * 60 * 24),
      )
      alerts.push({
        type: 'LICENCIA_MEDICA_VENCIDA',
        severity: diasVencido >= 7 ? 'HIGH' : 'MEDIUM',
        title: `Licencia médica vencida (${diasVencido}d) — ${w.firstName} ${w.lastName}`,
        description: `El descanso médico expiró hace ${diasVencido} días sin renovación. Verifica si el trabajador volvió a labores o tiene continuación CITT.`,
      })
      break // una sola alerta por trabajador, aunque haya múltiples
    }
  }

  // CAMBIO_REGIMEN_SIN_ADENDA es disparada desde el hook PATCH /api/workers/[id]
  // (no acá), porque requiere comparación before/after que sólo el endpoint
  // tiene en el momento de la mutación. Ver src/app/api/workers/[id]/route.ts.

  return alerts
}
