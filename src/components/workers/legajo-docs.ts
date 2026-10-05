/**
 * Catálogo del legajo digital por trabajador — fuente única para la UI.
 *
 * - Los documentos con `required: true` deben coincidir 1:1 con
 *   `REQUIRED_DOC_TYPES` de `@/lib/compliance/legajo-config` (es lo que cuenta
 *   el score del servidor). Lo verifica `__tests__/legajo-docs.test.ts`.
 *   No se importa desde ahí porque ese módulo arrastra Prisma al bundle del
 *   cliente.
 * - La multa referencial sale del catálogo SUNAFIL-Ready
 *   (`@/data/legal/sunafil-ready-catalog`, D.S. 019-2006-TR) y se convierte a
 *   soles con la UIT vigente de `peru-labor.ts`.
 *
 * Módulo puro (sin React ni Prisma): se puede usar en cliente, servidor y tests.
 */

import { SUNAFIL_READY_DOCS, type SunafilGravity } from '@/data/legal/sunafil-ready-catalog'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'

export type LegajoCategory = 'INGRESO' | 'VIGENTE' | 'SST' | 'PREVISIONAL' | 'CESE'

export interface LegajoDocDefinition {
  category: LegajoCategory
  /** Valor que se guarda en `WorkerDocument.documentType`. */
  type: string
  title: string
  required: boolean
  /** Por qué lo pide la ley, en lenguaje simple (sin jerga). */
  why: string
  /** Norma que lo sustenta, si aplica. */
  baseLegal?: string
}

export const LEGAJO_CATEGORY_LABELS: Record<LegajoCategory, string> = {
  INGRESO: 'Al ingresar a la empresa',
  VIGENTE: 'Durante la relación laboral',
  SST: 'Seguridad y salud en el trabajo (SST)',
  PREVISIONAL: 'Pensiones y seguro de salud',
  CESE: 'Al terminar la relación laboral',
}

export const LEGAJO_CATEGORY_ORDER: LegajoCategory[] = ['INGRESO', 'VIGENTE', 'SST', 'PREVISIONAL', 'CESE']

export const LEGAJO_DOCS: LegajoDocDefinition[] = [
  // ── Ingreso ──────────────────────────────────────────────────────────────
  {
    category: 'INGRESO',
    type: 'contrato_trabajo',
    title: 'Contrato de trabajo',
    required: true,
    why: 'Prueba la relación laboral: cargo, sueldo, jornada y fecha de inicio. Si es a plazo fijo, debe indicar la causa que lo justifica.',
    baseLegal: 'D.S. 003-97-TR, Art. 4 y 72',
  },
  {
    category: 'INGRESO',
    type: 'cv',
    title: 'Currículum vitae',
    required: true,
    why: 'No lo exige una norma específica, pero respalda que el trabajador cumple el perfil del puesto y suma al avance de su legajo.',
  },
  {
    category: 'INGRESO',
    type: 'dni_copia',
    title: 'Copia del DNI',
    required: true,
    why: 'Identifica al trabajador y permite registrarlo bien en la planilla electrónica.',
    baseLegal: 'D.S. 001-98-TR',
  },
  {
    category: 'INGRESO',
    type: 'declaracion_jurada',
    title: 'Declaración jurada de domicilio',
    required: true,
    why: 'Confirma dónde vive y quiénes son sus derechohabientes (hijos, cónyuge). Con esto pagas bien la asignación familiar y lo aseguras en EsSalud.',
    baseLegal: 'D.S. 001-98-TR',
  },
  {
    category: 'INGRESO',
    type: 'antecedentes_penales',
    title: 'Antecedentes penales',
    required: false,
    why: 'Opcional. Pídelo solo si el puesto lo justifica (por ejemplo, manejo de dinero o seguridad).',
  },
  {
    category: 'INGRESO',
    type: 'antecedentes_policiales',
    title: 'Antecedentes policiales',
    required: false,
    why: 'Opcional. Pídelo solo si el puesto lo justifica.',
  },
  {
    category: 'INGRESO',
    type: 'certificados_trabajo',
    title: 'Certificados de trabajos anteriores',
    required: false,
    why: 'Opcional. Respalda la experiencia que declaró al postular.',
  },

  // ── Durante la relación laboral ──────────────────────────────────────────
  {
    category: 'VIGENTE',
    type: 'boleta_pago',
    title: 'Última boleta de pago',
    required: true,
    why: 'Prueba que pagaste el sueldo completo y a tiempo. Debes entregarla dentro de los 3 días hábiles siguientes al pago.',
    baseLegal: 'D.S. 001-98-TR, Art. 18-19',
  },
  {
    category: 'VIGENTE',
    type: 't_registro',
    title: 'Constancia de alta en T-REGISTRO',
    required: true,
    why: 'Prueba que diste de alta al trabajador en la planilla electrónica de SUNAT el mismo día hábil en que empezó a trabajar.',
    baseLegal: 'D.S. 018-2007-TR, Art. 4-A',
  },
  {
    category: 'VIGENTE',
    type: 'vacaciones_goce',
    title: 'Registro de vacaciones',
    required: true,
    why: 'Prueba que el trabajador descansó sus vacaciones. Si acumula dos períodos sin gozarlas, te toca pagarle una indemnización.',
    baseLegal: 'D.Leg. 713, Art. 10-14',
  },
  {
    category: 'VIGENTE',
    type: 'capacitacion_registro',
    title: 'Registro de capacitaciones',
    required: true,
    why: 'Deja constancia de las capacitaciones que recibió (incluidas las de seguridad). SUNAFIL lo revisa en una inspección.',
    baseLegal: 'R.M. 050-2013-TR',
  },
  {
    category: 'VIGENTE',
    type: 'evaluacion_desempeno',
    title: 'Evaluación de desempeño',
    required: false,
    why: 'Opcional. Sirve para sustentar ascensos, aumentos o un despido por bajo rendimiento.',
  },
  {
    category: 'VIGENTE',
    type: 'addendum',
    title: 'Adenda de contrato',
    required: false,
    why: 'Solo si cambiaste condiciones del contrato (sueldo, cargo, plazo o régimen).',
  },

  // ── SST ──────────────────────────────────────────────────────────────────
  {
    category: 'SST',
    type: 'examen_medico_ingreso',
    title: 'Examen médico ocupacional de ingreso',
    required: true,
    why: 'Certifica que el trabajador está apto para su puesto antes de empezar. Lo paga la empresa.',
    baseLegal: 'Ley 29783, Art. 49-d',
  },
  {
    category: 'SST',
    type: 'examen_medico_periodico',
    title: 'Examen médico periódico',
    required: true,
    why: 'Vigila su salud mientras trabaja contigo. Es obligatorio al menos cada 2 años y lo paga la empresa.',
    baseLegal: 'Ley 29783, Art. 49-d',
  },
  {
    category: 'SST',
    type: 'induccion_sst',
    title: 'Constancia de inducción en SST',
    required: true,
    why: 'Prueba que, al ingresar, le explicaste los riesgos de su puesto y cómo trabajar de forma segura.',
    baseLegal: 'Ley 29783, Art. 49-g',
  },
  {
    category: 'SST',
    type: 'entrega_epp',
    title: 'Registro de entrega de EPP',
    required: true,
    why: 'Prueba, con su firma, que le entregaste su equipo de protección (casco, guantes, lentes, etc.).',
    baseLegal: 'Ley 29783, Art. 60',
  },
  {
    category: 'SST',
    type: 'iperc_puesto',
    title: 'IPERC del puesto',
    required: true,
    why: 'Identifica los peligros de su puesto y las medidas para controlarlos. Debe estar al día y ser conocido por el trabajador.',
    baseLegal: 'Ley 29783, Art. 57; R.M. 050-2013-TR',
  },
  {
    category: 'SST',
    type: 'capacitacion_sst',
    title: 'Capacitaciones en SST (4 al año)',
    required: true,
    why: 'La ley exige al menos 4 capacitaciones de seguridad y salud al año para cada trabajador.',
    baseLegal: 'Ley 29783, Art. 35-b',
  },
  {
    category: 'SST',
    type: 'reglamento_interno',
    title: 'Cargo de entrega del Reglamento Interno de SST',
    required: true,
    why: 'Prueba que le entregaste el Reglamento Interno de Seguridad y Salud (obligatorio si tienes 20 o más trabajadores).',
    baseLegal: 'Ley 29783, Art. 34 y 35-a',
  },

  // ── Previsional ──────────────────────────────────────────────────────────
  {
    category: 'PREVISIONAL',
    type: 'afp_onp_afiliacion',
    title: 'Constancia de afiliación AFP u ONP',
    required: true,
    why: 'Prueba a qué sistema de pensiones aporta. Sin esto, los descuentos de su boleta pueden estar mal.',
    baseLegal: 'D.S. 054-97-EF',
  },
  {
    category: 'PREVISIONAL',
    type: 'essalud_registro',
    title: 'Registro en EsSalud',
    required: true,
    why: 'Prueba que el trabajador está asegurado en EsSalud y que pagas el aporte del 9 % de su sueldo.',
    baseLegal: 'Ley 26790, Art. 6',
  },
  {
    category: 'PREVISIONAL',
    type: 'cts_deposito',
    title: 'Constancia de depósito de CTS',
    required: true,
    why: 'Prueba que depositaste su CTS en mayo y noviembre en el banco que eligió. No aplica a la microempresa.',
    baseLegal: 'D.S. 001-97-TR, Art. 21-22',
  },
  {
    category: 'PREVISIONAL',
    type: 'sctr_poliza',
    title: 'Póliza SCTR',
    required: false,
    why: 'Solo si el puesto es de alto riesgo (construcción, minería, manufactura, etc.): seguro obligatorio de salud y pensión.',
    baseLegal: 'Ley 26790, Art. 19',
  },

  // ── Cese ─────────────────────────────────────────────────────────────────
  {
    category: 'CESE',
    type: 'carta_renuncia',
    title: 'Carta de renuncia',
    required: false,
    why: 'Solo si el trabajador renunció. Prueba que la salida fue voluntaria.',
  },
  {
    category: 'CESE',
    type: 'carta_despido',
    title: 'Carta de despido',
    required: false,
    why: 'Solo si lo despediste. Debe indicar la causa y la fecha de cese.',
    baseLegal: 'D.S. 003-97-TR, Art. 32',
  },
  {
    category: 'CESE',
    type: 'liquidacion_beneficios',
    title: 'Liquidación de beneficios sociales',
    required: false,
    why: 'Prueba que pagaste CTS, vacaciones y gratificación truncas al terminar el vínculo.',
  },
  {
    category: 'CESE',
    type: 'certificado_trabajo',
    title: 'Certificado de trabajo',
    required: false,
    why: 'Debes entregarlo al terminar el vínculo: indica el tiempo de servicios y el cargo.',
  },
]

export const REQUIRED_LEGAJO_DOCS: LegajoDocDefinition[] = LEGAJO_DOCS.filter((d) => d.required)

// ─────────────────────────────────────────────────────────────────────────────
// Multa referencial (catálogo SUNAFIL-Ready)
// ─────────────────────────────────────────────────────────────────────────────

export const GRAVITY_LABELS: Record<SunafilGravity, string> = {
  LEVE: 'leve',
  GRAVE: 'grave',
  MUY_GRAVE: 'muy grave',
}

export interface LegajoMultaReferencial {
  uit: number
  soles: number
  gravity: SunafilGravity
}

/**
 * Multa SUNAFIL referencial si falta el documento. Valor base del catálogo
 * (empresa de 1 a 10 trabajadores); el monto real varía según tamaño y
 * régimen. `null` si el documento no tiene una multa directa asociada.
 */
export function getMultaReferencial(type: string): LegajoMultaReferencial | null {
  const spec = SUNAFIL_READY_DOCS.find((d) => d.workerDocType === type)
  if (!spec) return null
  return {
    uit: spec.multaUIT,
    soles: Math.round(spec.multaUIT * PERU_LABOR.UIT),
    gravity: spec.gravity,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado de cada fila del checklist
// ─────────────────────────────────────────────────────────────────────────────

export type LegajoRowStatus = 'falta' | 'pendiente' | 'subido' | 'verificado' | 'vencido'

export interface LegajoDocLike {
  documentType?: string | null
  status: string
  expiresAt?: string | null
  createdAt?: string | null
}

export function isRowComplete(status: LegajoRowStatus): boolean {
  return status === 'subido' || status === 'verificado'
}

export function resolveDocStatus(doc: LegajoDocLike | undefined, now: Date = new Date()): LegajoRowStatus {
  if (!doc) return 'falta'
  // MISSING = rechazado por el admin: hay que volver a subirlo.
  if (doc.status === 'MISSING') return 'falta'
  if (doc.status === 'EXPIRED') return 'vencido'
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < now.getTime()) return 'vencido'
  if (doc.status === 'VERIFIED') return 'verificado'
  if (doc.status === 'UPLOADED') return 'subido'
  return 'pendiente'
}

/**
 * Elige el documento que representa a cada tipo: el más reciente que no esté
 * rechazado (MISSING). Si todos están rechazados, el más reciente.
 */
export function pickDocsByType<T extends LegajoDocLike>(docs: T[]): Map<string, T> {
  const byType = new Map<string, T>()
  for (const doc of docs) {
    const type = doc.documentType
    if (!type) continue
    const current = byType.get(type)
    if (!current) {
      byType.set(type, doc)
      continue
    }
    const currentRejected = current.status === 'MISSING'
    const docRejected = doc.status === 'MISSING'
    if (currentRejected !== docRejected) {
      if (currentRejected) byType.set(type, doc)
      continue
    }
    if (doc.createdAt && current.createdAt && doc.createdAt > current.createdAt) {
      byType.set(type, doc)
    }
  }
  return byType
}

export interface LegajoSummary {
  total: number
  completeCount: number
  verifiedCount: number
  /** Obligatorios que faltan, están vencidos o pendientes de revisión. */
  missing: LegajoDocDefinition[]
  /** Suma de multas referenciales de los obligatorios que faltan (S/). */
  multaReferencialTotal: number
  isComplete: boolean
}

export function summarizeLegajo<T extends LegajoDocLike>(docs: T[], now: Date = new Date()): LegajoSummary {
  const byType = pickDocsByType(docs)
  const missing: LegajoDocDefinition[] = []
  let completeCount = 0
  let verifiedCount = 0
  for (const def of REQUIRED_LEGAJO_DOCS) {
    const status = resolveDocStatus(byType.get(def.type), now)
    if (isRowComplete(status)) {
      completeCount++
      if (status === 'verificado') verifiedCount++
    } else {
      missing.push(def)
    }
  }
  const multaReferencialTotal = missing.reduce(
    (sum, def) => sum + (getMultaReferencial(def.type)?.soles ?? 0),
    0,
  )
  return {
    total: REQUIRED_LEGAJO_DOCS.length,
    completeCount,
    verifiedCount,
    missing,
    multaReferencialTotal,
    isComplete: missing.length === 0,
  }
}
