import { isFeriado, diasLaborables } from '@/lib/legal-engine/feriados-peru'
import { calcularPlazoSat, type TipoAccidente } from '@/lib/sst/sat-deadline'

export type ComplaintRegimeValue = 'HSL' | 'SST' | 'MPD'
export type ComplaintChannelValue = 'WEB' | 'EMAIL' | 'PHONE' | 'IN_PERSON' | 'ANONYMOUS'

export type ComplaintTypeValue =
  | 'HOSTIGAMIENTO_SEXUAL'
  | 'DISCRIMINACION'
  | 'ACOSO_LABORAL'
  | 'SST_ACCIDENTE_MORTAL'
  | 'SST_INCIDENTE_PELIGROSO'
  | 'SST_ACCIDENTE_NO_MORTAL'
  | 'SST_ENFERMEDAD_OCUPACIONAL'
  | 'SST_CONDICION_INSEGURA'
  | 'MPD_CORRUPCION'
  | 'MPD_LAVADO_ACTIVOS'
  | 'MPD_TRIBUTARIO_ADUANERO'
  | 'MPD_TERRORISMO'
  | 'MPD_OTRO'
  | 'OTRO'

export type DeadlineStatus = 'OK' | 'EXPIRING_SOON' | 'OVERDUE'
export type DeadlineKind = 'LEGAL' | 'BEST_PRACTICE' | 'EXTERNAL_REPORT' | 'PRESCRIPTION'

export interface ComplaintRegimeConfig {
  label: string
  shortLabel: string
  title: string
  description: string
  baseLegal: string
  color: 'red' | 'emerald' | 'indigo'
  responsibleSmall: string
  responsibleLarge: string
}

export interface ComplaintTypeConfig {
  regime: ComplaintRegimeValue
  label: string
  description: string
  baseLegal: string
  externalReport?: string
}

export interface ComplaintDeadline {
  label: string
  baseLegal: string
  dueDate: string
  daysRemaining: number
  status: DeadlineStatus
  kind: DeadlineKind
  action: string
  authority?: string
}

export const COMPLAINT_REGIMES: Record<ComplaintRegimeValue, ComplaintRegimeConfig> = {
  HSL: {
    label: 'Hostigamiento sexual',
    shortLabel: 'HSL',
    title: 'Hostigamiento sexual',
    description: 'Ley 27942, D. Leg. 1410, D.S. 014-2019-MIMP y D.S. 021-2021-MIMP.',
    baseLegal: 'Ley 27942 y D.S. 014-2019-MIMP',
    color: 'red',
    responsibleSmall: 'Delegado/a contra el hostigamiento sexual',
    responsibleLarge: 'Comite de Intervencion frente al Hostigamiento Sexual',
  },
  SST: {
    label: 'Seguridad y salud en el trabajo',
    shortLabel: 'SST',
    title: 'Seguridad y salud en el trabajo',
    description: 'Ley 29783, D.S. 005-2012-TR, R.M. 050-2013-TR y reglas SAT/MTPE.',
    baseLegal: 'Ley 29783 y D.S. 005-2012-TR',
    color: 'emerald',
    responsibleSmall: 'Supervisor de SST',
    responsibleLarge: 'Comite paritario de SST',
  },
  MPD: {
    label: 'Compliance penal / MPD',
    shortLabel: 'MPD',
    title: 'Modelo de prevencion de delitos',
    description: 'Ley 30424, Ley 31740, Ley 32054 y D.S. 002-2025-JUS.',
    baseLegal: 'Ley 30424 y D.S. 002-2025-JUS',
    color: 'indigo',
    responsibleSmall: 'Organo de administracion / encargado de prevencion',
    responsibleLarge: 'Encargado de Prevencion autonomo',
  },
}

export const COMPLAINT_TYPES: Record<ComplaintTypeValue, ComplaintTypeConfig> = {
  HOSTIGAMIENTO_SEXUAL: {
    regime: 'HSL',
    label: 'Hostigamiento sexual',
    description: 'Conducta de naturaleza o connotacion sexual no deseada.',
    baseLegal: 'Ley 27942; D.S. 014-2019-MIMP',
    externalReport: 'MTPE/SUNAFIL',
  },
  DISCRIMINACION: {
    regime: 'HSL',
    label: 'Discriminacion o violencia laboral',
    description: 'Trato desigual o acto hostil vinculado al entorno laboral.',
    baseLegal: 'Ley 27942, Convenio 190 OIT y normativa laboral conexa',
  },
  ACOSO_LABORAL: {
    regime: 'HSL',
    label: 'Acoso laboral',
    description: 'Conductas hostiles, humillantes o intimidatorias.',
    baseLegal: 'Convenio 190 OIT y normativa laboral conexa',
  },
  SST_ACCIDENTE_MORTAL: {
    regime: 'SST',
    label: 'Accidente mortal',
    description: 'Accidente de trabajo con fallecimiento.',
    baseLegal: 'Ley 29783; D.S. 005-2012-TR; D.S. 006-2022-TR',
    externalReport: 'SAT-MTPE/SUNAFIL en 24 horas',
  },
  SST_INCIDENTE_PELIGROSO: {
    regime: 'SST',
    label: 'Incidente peligroso',
    description: 'Evento con potencial de causar lesiones graves o muerte.',
    baseLegal: 'Ley 29783; D.S. 005-2012-TR; D.S. 006-2022-TR',
    externalReport: 'SAT-MTPE/SUNAFIL en 24 horas',
  },
  SST_ACCIDENTE_NO_MORTAL: {
    regime: 'SST',
    label: 'Accidente no mortal',
    description: 'Accidente de trabajo con lesion no mortal.',
    baseLegal: 'Ley 29783; D.S. 005-2012-TR; D.S. 006-2022-TR',
    externalReport: 'SAT-MTPE hasta el ultimo dia habil del mes siguiente',
  },
  SST_ENFERMEDAD_OCUPACIONAL: {
    regime: 'SST',
    label: 'Enfermedad ocupacional',
    description: 'Enfermedad diagnosticada vinculada al trabajo.',
    baseLegal: 'Ley 29783; D.S. 005-2012-TR; D.S. 006-2022-TR',
    externalReport: 'SAT-MTPE/MINSA en 5 dias habiles desde el diagnostico',
  },
  SST_CONDICION_INSEGURA: {
    regime: 'SST',
    label: 'Condicion insegura',
    description: 'Riesgo, peligro o incumplimiento preventivo reportado por trabajadores.',
    baseLegal: 'Ley 29783, Arts. 71, 72, 73 y 75',
  },
  MPD_CORRUPCION: {
    regime: 'MPD',
    label: 'Corrupcion / cohecho / colusion',
    description: 'Hechos vinculados a delitos de corrupcion o trafico de influencias.',
    baseLegal: 'Ley 30424; Ley 31740; D.S. 002-2025-JUS',
  },
  MPD_LAVADO_ACTIVOS: {
    regime: 'MPD',
    label: 'Lavado de activos / mineria ilegal',
    description: 'Operaciones o conductas sospechosas del D. Leg. 1106.',
    baseLegal: 'Ley 30424; D. Leg. 1106; D.S. 002-2025-JUS',
  },
  MPD_TRIBUTARIO_ADUANERO: {
    regime: 'MPD',
    label: 'Delito tributario o aduanero',
    description: 'Hechos de Ley Penal Tributaria o Ley de Delitos Aduaneros.',
    baseLegal: 'Ley 30424; D. Leg. 813; Ley 28008',
  },
  MPD_TERRORISMO: {
    regime: 'MPD',
    label: 'Terrorismo / financiamiento',
    description: 'Hechos vinculados al D. Ley 25475.',
    baseLegal: 'Ley 30424; D. Ley 25475',
  },
  MPD_OTRO: {
    regime: 'MPD',
    label: 'Otra irregularidad MPD',
    description: 'Incumplimiento del modelo de prevencion o conducta penalmente relevante.',
    baseLegal: 'Ley 30424; D.S. 002-2025-JUS, Arts. 39 y 40',
  },
  OTRO: {
    regime: 'HSL',
    label: 'Otro reclamo laboral',
    description: 'Otro hecho que requiere evaluacion interna.',
    baseLegal: 'Ley 27444, Ley 29733 y normativa laboral aplicable',
  },
}

export const COMPLAINT_TYPE_VALUES = Object.keys(COMPLAINT_TYPES) as ComplaintTypeValue[]
export const COMPLAINT_REGIME_VALUES = Object.keys(COMPLAINT_REGIMES) as ComplaintRegimeValue[]
export const COMPLAINT_CHANNEL_VALUES: ComplaintChannelValue[] = ['WEB', 'EMAIL', 'PHONE', 'IN_PERSON', 'ANONYMOUS']

export function inferRegimeFromType(type: ComplaintTypeValue): ComplaintRegimeValue {
  return COMPLAINT_TYPES[type]?.regime ?? 'HSL'
}

export function assertTypeMatchesRegime(type: ComplaintTypeValue, regime: ComplaintRegimeValue): boolean {
  return inferRegimeFromType(type) === regime
}

export function getTypeLabel(type: string): string {
  return COMPLAINT_TYPES[type as ComplaintTypeValue]?.label ?? type
}

export function getRegimeLabel(regime: string): string {
  return COMPLAINT_REGIMES[regime as ComplaintRegimeValue]?.label ?? regime
}

function addCalendarDays(from: Date, days: number): Date {
  const result = new Date(from)
  result.setDate(result.getDate() + days)
  return result
}

function addHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000)
}

export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow === 0 || dow === 6) continue
    if (isFeriado(result).isFeriado) continue
    added++
  }
  return result
}

function daysUntil(target: Date, now = new Date()): number {
  try {
    if (target > now) {
      diasLaborables(now, target)
    }
  } catch {
    // ignore
  }
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function deadlineStatus(dueDate: Date, now = new Date()): DeadlineStatus {
  const remaining = dueDate.getTime() - now.getTime()
  if (remaining < 0) return 'OVERDUE'
  if (remaining <= 3 * 24 * 60 * 60 * 1000) return 'EXPIRING_SOON'
  return 'OK'
}

function deadline(
  label: string,
  baseLegal: string,
  dueDate: Date,
  kind: DeadlineKind,
  action: string,
  authority?: string,
  now = new Date(),
): ComplaintDeadline {
  return {
    label,
    baseLegal,
    dueDate: dueDate.toISOString(),
    daysRemaining: daysUntil(dueDate, now),
    status: deadlineStatus(dueDate, now),
    kind,
    action,
    authority,
  }
}

function satTypeForComplaint(type: ComplaintTypeValue): TipoAccidente | null {
  switch (type) {
    case 'SST_ACCIDENTE_MORTAL':
      return 'MORTAL'
    case 'SST_INCIDENTE_PELIGROSO':
      return 'INCIDENTE_PELIGROSO'
    case 'SST_ACCIDENTE_NO_MORTAL':
      return 'NO_MORTAL'
    case 'SST_ENFERMEDAD_OCUPACIONAL':
      return 'ENFERMEDAD_OCUPACIONAL'
    default:
      return null
  }
}

export function buildComplaintDeadlines(input: {
  regime: ComplaintRegimeValue
  type: ComplaintTypeValue
  receivedAt: Date
  occurredAt?: Date | null
  now?: Date
}): ComplaintDeadline[] {
  const now = input.now ?? new Date()
  const received = input.receivedAt
  const eventDate = input.occurredAt ?? received

  if (input.regime === 'HSL') {
    const committeeReport = addCalendarDays(received, 15)
    const finalDecision = addBusinessDays(committeeReport, 10)
    return [
      deadline(
        'Atencion medica/psicologica',
        'D.S. 014-2019-MIMP, Art. 17.1',
        addBusinessDays(received, 1),
        'LEGAL',
        'Documentar canales de atencion fisica, mental o psicologica puestos a disposicion.',
        undefined,
        now,
      ),
      deadline(
        'Traslado a Comite/Delegado',
        'D.S. 014-2019-MIMP, Art. 29.4',
        addBusinessDays(received, 1),
        'LEGAL',
        'RRHH debe trasladar la queja al Comite o Delegado.',
        undefined,
        now,
      ),
      deadline(
        'Medidas de proteccion',
        'D.S. 014-2019-MIMP, Art. 18',
        addBusinessDays(received, 3),
        'LEGAL',
        'Emitir y ejecutar medidas de proteccion sin revictimizar.',
        undefined,
        now,
      ),
      deadline(
        'Comunicacion inicial al MTPE',
        'D.S. 014-2019-MIMP, Art. 29.3',
        addBusinessDays(received, 6),
        'EXTERNAL_REPORT',
        'Comunicar recepcion/inicio y medidas adoptadas.',
        'MTPE',
        now,
      ),
      deadline(
        'Informe del Comite',
        'D.S. 014-2019-MIMP, Art. 29.5',
        committeeReport,
        'LEGAL',
        'Emitir informe con hechos, descargos, pruebas, conclusiones y recomendacion.',
        undefined,
        now,
      ),
      deadline(
        'Decision final',
        'D.S. 014-2019-MIMP, Art. 29.6',
        finalDecision,
        'LEGAL',
        'Emitir decision de sancion, archivo o medidas finales.',
        undefined,
        now,
      ),
      deadline(
        'Comunicacion de resultado al MTPE',
        'D.S. 014-2019-MIMP, Art. 29.6',
        addBusinessDays(finalDecision, 6),
        'EXTERNAL_REPORT',
        'Comunicar el resultado del procedimiento.',
        'MTPE',
        now,
      ),
      deadline(
        'Prescripcion HSL',
        'D.S. 014-2019-MIMP, Art. 27',
        addCalendarDays(eventDate, 30),
        'PRESCRIPTION',
        'Alertar riesgo de prescripcion desde el ultimo acto de hostigamiento.',
        undefined,
        now,
      ),
    ]
  }

  if (input.regime === 'SST') {
    const satType = satTypeForComplaint(input.type)
    const deadlines: ComplaintDeadline[] = []

    if (satType) {
      const sat = calcularPlazoSat(satType, eventDate)
      deadlines.push(deadline(
        sat.obligadoNotificar === 'EMPLEADOR' ? 'Notificacion SAT/SUNAFIL' : 'Notificacion SAT',
        sat.baseLegal,
        sat.deadline,
        'EXTERNAL_REPORT',
        `${sat.descripcion}. Formulario: ${sat.formularioSat}. Obligado: ${sat.obligadoNotificar === 'EMPLEADOR' ? 'empleador' : 'centro medico'}.`,
        'SAT-MTPE/SUNAFIL',
        now,
      ))
    } else {
      deadlines.push(deadline(
        'Evaluacion preventiva del riesgo',
        'Ley 29783, Arts. 71, 72, 73 y 75',
        addBusinessDays(received, 3),
        'BEST_PRACTICE',
        'Evaluar condicion insegura, adoptar control preventivo y proteger al reportante.',
        undefined,
        now,
      ))
    }

    deadlines.push(deadline(
      'Investigacion interna SST',
      'Ley 29783; R.M. 050-2013-TR, Registro de accidentes/incidentes',
      addCalendarDays(eventDate, 30),
      'BEST_PRACTICE',
      'Completar investigacion, causas, medidas correctivas y registro obligatorio.',
      undefined,
      now,
    ))

    return deadlines
  }

  return [
    deadline(
      'Acuse de recibo',
      'D.S. 002-2025-JUS, Art. 40',
      addHours(received, 72),
      'BEST_PRACTICE',
      'Confirmar recepcion preservando anonimato y confidencialidad.',
      undefined,
      now,
    ),
    deadline(
      'Triaje preliminar MPD',
      'D.S. 002-2025-JUS, Arts. 39 y 40',
      addBusinessDays(received, 10),
      'BEST_PRACTICE',
      'Evaluar admisibilidad, competencia, riesgo penal y conflictos de interes.',
      undefined,
      now,
    ),
    deadline(
      'Plan de investigacion',
      'Lineamientos SMV 006-2021-SMV/01; ISO 37301',
      addBusinessDays(received, 15),
      'BEST_PRACTICE',
      'Definir alcance, evidencia, entrevistas, custodia y responsable investigador.',
      undefined,
      now,
    ),
    deadline(
      'Investigacion MPD',
      'D.S. 002-2025-JUS, Art. 40.g',
      addCalendarDays(received, 90),
      'BEST_PRACTICE',
      'Cerrar investigacion interna o justificar ampliacion documentada.',
      undefined,
      now,
    ),
    deadline(
      'Evaluar derivacion a Fiscalia',
      'Ley 30424; D.S. 002-2025-JUS',
      addBusinessDays(received, 1),
      'EXTERNAL_REPORT',
      'Si hay indicios de delito flagrante o grave, recomendar derivacion inmediata.',
      'Ministerio Publico',
      now,
    ),
  ]
}
