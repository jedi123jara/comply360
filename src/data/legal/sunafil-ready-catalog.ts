/**
 * Catálogo SUNAFIL-Ready — los 28 documentos que un inspector SUNAFIL solicita
 * durante una inspección según el protocolo R.M. 199-2016-TR.
 *
 * Fuente de verdad para:
 *   - `/dashboard/sunafil-ready` (checklist visual + % completitud)
 *   - `/api/sunafil-ready` (cómputo de estado por organización)
 *   - Alert engine (brechas detectadas → alertas)
 *   - Simulacro SUNAFIL (ya usa un subconjunto idéntico en simulacro-engine.ts)
 *
 * Cada documento tiene:
 *  - `scope`: worker (legajo digital), org (documento corporativo), hybrid (ambos),
 *            exhibited (solo debe estar visible, no requiere archivo subido)
 *  - `workerDocType` / `orgDocType`: mapeo a los modelos Prisma existentes
 *  - `generatorSlug`: slug del generador interno (null si aún no hay generador)
 *  - `conditionalOn`: predicado para aplicabilidad por tamaño/sector
 *
 * NO importa nada que no sea tipo — mantener puro y estático.
 */

export type SunafilCategory =
  | 'CONTRATOS_REGISTRO'
  | 'BOLETAS_REMUNERACIONES'
  | 'PREVISIONAL'
  | 'JORNADA_ASISTENCIA'
  | 'VACACIONES'
  | 'SST'
  | 'POLITICAS_OBLIGATORIAS'
  | 'DOCUMENTOS_COMPLEMENTARIOS'

export type SunafilScope = 'worker' | 'org' | 'hybrid' | 'exhibited'
export type SunafilGravity = 'LEVE' | 'GRAVE' | 'MUY_GRAVE'

export interface SunafilDocCondition {
  type: 'totalWorkers' | 'hasRiskActivities' | 'hasConstructionCivil' | 'hasTercerizacion'
  op: 'gte' | 'lte' | 'eq'
  value: number | boolean
  description: string
}

export interface SunafilDocSpec {
  /** ID estable tipo slug para URLs. */
  id: string
  /** Numeración protocolo R.M. 199-2016-TR (1-28). */
  number: number
  /** Título corto para listado. */
  title: string
  /** Descripción completa de qué debe contener. */
  description: string
  category: SunafilCategory
  gravity: SunafilGravity
  /** Multa en UIT por ausencia (D.S. 019-2006-TR, valor base para 1-10 trabajadores). */
  multaUIT: number
  baseLegal: string
  scope: SunafilScope
  /** Si scope=worker|hybrid, el documentType usado en WorkerDocument.documentType. */
  workerDocType?: string
  /** Si scope=org|hybrid, el enum OrgDocType correspondiente. */
  orgDocType?: string
  /** Vencimiento: true = tiene fecha de caducidad que SUNAFIL verifica. */
  hasExpiration: boolean
  /** Meses típicos de vigencia (si hasExpiration). */
  expirationMonths?: number
  /** Slug del generador interno (ej. 'politica-sst' → /dashboard/generadores/politica-sst). */
  generatorSlug?: string
  /** Condición de aplicabilidad. Si no se cumple, el doc es NO_APLICA. */
  condition?: SunafilDocCondition
  /** Pista accionable para el usuario cuando falta. */
  actionHint: string
}

/* ═════════════════════════════════════════════════════════════════════════
 * LOS 28 DOCUMENTOS SUNAFIL
 * ═════════════════════════════════════════════════════════════════════════ */

export const SUNAFIL_READY_DOCS: SunafilDocSpec[] = [
  /* ── I. CONTRATOS Y REGISTRO ───────────────────────────────────────── */
  {
    id: 'contrato-trabajo',
    number: 1,
    title: 'Contratos de Trabajo',
    description:
      'Contratos firmados por ambas partes, con fecha de inicio, cargo, remuneración, jornada. Si son a plazo fijo deben consignar causa objetiva (D.S. 003-97-TR Art. 72).',
    category: 'CONTRATOS_REGISTRO',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'D.Leg. 728, Art. 4',
    scope: 'worker',
    workerDocType: 'contrato_trabajo',
    hasExpiration: true, // plazo fijo vence
    generatorSlug: 'contrato-trabajo',
    actionHint: 'Generá contratos desde el perfil del trabajador o subilos en su legajo.',
  },
  {
    id: 't-registro',
    number: 2,
    title: 'Constancias de alta en T-REGISTRO',
    description:
      'Constancia SUNAT/MTPE de alta en Planilla Electrónica dentro del día hábil de inicio de labores (Art. 4-A D.S. 018-2007-TR).',
    category: 'CONTRATOS_REGISTRO',
    gravity: 'MUY_GRAVE',
    multaUIT: 2.63,
    baseLegal: 'D.S. 018-2007-TR, Art. 4-A',
    scope: 'worker',
    workerDocType: 't_registro',
    hasExpiration: false,
    actionHint: 'Subí la constancia de T-REGISTRO desde el legajo del trabajador.',
  },
  {
    id: 'dni-copia',
    number: 3,
    title: 'Copia de DNI',
    description: 'Copia fotostática del DNI vigente de cada trabajador.',
    category: 'CONTRATOS_REGISTRO',
    gravity: 'LEVE',
    multaUIT: 0.23,
    baseLegal: 'D.S. 001-98-TR',
    scope: 'worker',
    workerDocType: 'dni_copia',
    hasExpiration: false,
    actionHint: 'Subí escaneo del DNI al crear el trabajador.',
  },

  /* ── II. BOLETAS Y REMUNERACIONES ──────────────────────────────────── */
  {
    id: 'boletas-pago',
    number: 4,
    title: 'Boletas de Pago',
    description:
      'Boletas con todos los conceptos remunerativos y descuentos desglosados. Entrega al trabajador dentro de 3 días hábiles del pago.',
    category: 'BOLETAS_REMUNERACIONES',
    gravity: 'LEVE',
    multaUIT: 0.23,
    baseLegal: 'D.S. 001-98-TR, Art. 18-19',
    scope: 'worker',
    workerDocType: 'boleta_pago',
    hasExpiration: false,
    generatorSlug: 'boleta-pago',
    actionHint: 'Generá boletas desde /dashboard/boletas por período mensual.',
  },
  {
    id: 'cts-deposito',
    number: 5,
    title: 'Constancia de depósito CTS',
    description:
      'Constancia de la entidad financiera del depósito semestral (mayo y noviembre). Calcular sobre remuneración computable + 1/6 última gratificación.',
    category: 'BOLETAS_REMUNERACIONES',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'D.S. 001-97-TR, Art. 21-22',
    scope: 'worker',
    workerDocType: 'cts_deposito',
    hasExpiration: false,
    generatorSlug: 'cts-liquidacion',
    actionHint: 'Usá la calculadora CTS y subí la constancia del banco.',
  },
  {
    id: 'gratificacion-pago',
    number: 6,
    title: 'Comprobante de Gratificaciones',
    description:
      'Comprobante de pago de gratificaciones de julio y diciembre, incluyendo bonificación extraordinaria del 9% (Ley 30334).',
    category: 'BOLETAS_REMUNERACIONES',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'Ley 27735, Art. 2-3',
    scope: 'worker',
    workerDocType: 'gratificacion_pago',
    hasExpiration: false,
    generatorSlug: 'gratificacion',
    actionHint: 'Calculá con la calculadora Gratificación y subí el comprobante.',
  },

  /* ── III. PREVISIONAL ──────────────────────────────────────────────── */
  {
    id: 'afp-onp-afiliacion',
    number: 7,
    title: 'Afiliación AFP/ONP',
    description:
      'Constancia de afiliación previsional (Sistema Privado AFP o Sistema Nacional ONP). CUSPP si AFP.',
    category: 'PREVISIONAL',
    gravity: 'MUY_GRAVE',
    multaUIT: 2.63,
    baseLegal: 'D.S. 054-97-EF',
    scope: 'worker',
    workerDocType: 'afp_onp_afiliacion',
    hasExpiration: false,
    actionHint: 'Registrá CUSPP y sistema previsional en el perfil del trabajador.',
  },
  {
    id: 'essalud-registro',
    number: 8,
    title: 'Registro EsSalud',
    description:
      'Constancia de aportes EsSalud (9% sobre remuneración) del último trimestre. Verificar altas y derechohabientes.',
    category: 'PREVISIONAL',
    gravity: 'MUY_GRAVE',
    multaUIT: 2.63,
    baseLegal: 'Ley 26790, Art. 6',
    scope: 'worker',
    workerDocType: 'essalud_registro',
    hasExpiration: false,
    actionHint: 'Subí la constancia de pago EsSalud al legajo del trabajador.',
  },

  /* ── IV. JORNADA Y ASISTENCIA ──────────────────────────────────────── */
  {
    id: 'registro-asistencia',
    number: 9,
    title: 'Registro de Asistencia',
    description:
      'Control de asistencia (manual, mecánico o digital) de los últimos 3 meses, con ingreso y salida consignados.',
    category: 'JORNADA_ASISTENCIA',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'D.S. 004-2006-TR, Art. 1',
    scope: 'org',
    orgDocType: 'OTRO', // el módulo /dashboard/asistencia guarda esto
    hasExpiration: false,
    generatorSlug: 'asistencia-export',
    actionHint: 'Exportá el registro desde /dashboard/asistencia como PDF.',
  },
  {
    id: 'horario-trabajo',
    number: 10,
    title: 'Horario de trabajo exhibido',
    description:
      'Cartel con el horario de trabajo vigente, exhibido en lugar visible del centro de labores.',
    category: 'JORNADA_ASISTENCIA',
    gravity: 'LEVE',
    multaUIT: 0.23,
    baseLegal: 'D.S. 004-2006-TR, Art. 5',
    scope: 'exhibited',
    hasExpiration: false,
    generatorSlug: 'horario-trabajo-cartel',
    actionHint: 'Generá el cartel de horario exhibible desde el generador.',
  },

  /* ── V. VACACIONES ─────────────────────────────────────────────────── */
  {
    id: 'registro-vacaciones',
    number: 11,
    title: 'Registro de Vacaciones',
    description:
      'Registro de períodos vacacionales gozados, pendientes y programados. Sin acumular más de 2 períodos (triple vacacional).',
    category: 'VACACIONES',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'D.Leg. 713, Art. 10-14',
    scope: 'worker',
    workerDocType: 'vacaciones_goce',
    hasExpiration: false,
    generatorSlug: 'vacaciones-export',
    actionHint: 'Exportá el registro de vacaciones desde /dashboard/vacaciones.',
  },

  /* ── VI. SST (el bloque más auditado) ──────────────────────────────── */
  {
    id: 'politica-sst',
    number: 12,
    title: 'Política de SST firmada y exhibida',
    description:
      'Política de Seguridad y Salud en el Trabajo con los 8 elementos obligatorios (Art. 22 Ley 29783), firmada por gerencia y exhibida.',
    category: 'SST',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'Ley 29783, Art. 22',
    scope: 'org',
    orgDocType: 'REGLAMENTO_SST',
    hasExpiration: false,
    generatorSlug: 'politica-sst',
    actionHint: 'Generá la Política SST con el wizard IA — incluye los 8 elementos obligatorios.',
  },
  {
    id: 'iperc',
    number: 13,
    title: 'Matriz IPERC',
    description:
      'Matriz de Identificación de Peligros, Evaluación de Riesgos y Control por puesto y área. Formato R.M. 050-2013-TR.',
    category: 'SST',
    gravity: 'MUY_GRAVE',
    multaUIT: 2.63,
    baseLegal: 'Ley 29783, Art. 57; R.M. 050-2013-TR',
    scope: 'org',
    orgDocType: 'OTRO', // SstRecord con type=IPERC
    hasExpiration: true,
    expirationMonths: 12, // se revisa al menos anualmente
    generatorSlug: 'iperc',
    actionHint: 'Generá la matriz IPERC por puesto con nuestra biblioteca de peligros sectoriales.',
  },
  {
    id: 'plan-anual-sst',
    number: 14,
    title: 'Plan Anual de SST',
    description:
      'Plan Anual de SST aprobado por el Comité o Supervisor, con objetivos SMART, cronograma y responsables.',
    category: 'SST',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'Ley 29783, Art. 38',
    scope: 'org',
    orgDocType: 'PLAN_SST',
    hasExpiration: true,
    expirationMonths: 12,
    generatorSlug: 'plan-anual-sst',
    actionHint: 'Generá el Plan Anual SST con asistente + diagnóstico + objetivos SMART.',
  },
  {
    id: 'comite-sst',
    number: 15,
    title: 'Acta Comité o Supervisor SST',
    description:
      'Acta de conformación del Comité SST (si 20+ trabajadores) o designación del Supervisor SST (si menos). Actas de reuniones mensuales.',
    category: 'SST',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'Ley 29783, Art. 29-30',
    scope: 'org',
    orgDocType: 'OTRO', // SstRecord type=ACTA_COMITE
    hasExpiration: false,
    generatorSlug: 'acta-comite-sst',
    actionHint: 'Generá el acta de designación según cantidad de trabajadores.',
  },
  {
    id: 'capacitacion-sst',
    number: 16,
    title: 'Capacitaciones SST (4 anuales mínimas)',
    description:
      'Registros de 4 capacitaciones anuales en SST con temario, firmas de asistencia y certificados.',
    category: 'SST',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'Ley 29783, Art. 35',
    scope: 'hybrid', // asistencia por worker + programa anual a nivel org
    workerDocType: 'capacitacion_sst',
    orgDocType: 'OTRO', // SstRecord type=CAPACITACION
    hasExpiration: true,
    expirationMonths: 12,
    generatorSlug: 'capacitacion-sst',
    actionHint: 'Registrá las 4 capacitaciones anuales y subí asistencias.',
  },
  {
    id: 'examen-medico-ingreso',
    number: 17,
    title: 'Exámenes Médicos Ocupacionales',
    description:
      'Exámenes médicos de ingreso, periódicos (cada 2 años o 1 año según riesgo) y de retiro. Resultados firmados por médico ocupacional.',
    category: 'SST',
    gravity: 'MUY_GRAVE',
    multaUIT: 2.63,
    baseLegal: 'Ley 29783, Art. 49-d',
    scope: 'worker',
    workerDocType: 'examen_medico_ingreso',
    hasExpiration: true,
    expirationMonths: 24,
    actionHint: 'Subí exámenes médicos por trabajador al legajo (ingreso + periódicos).',
  },
  {
    id: 'entrega-epp',
    number: 18,
    title: 'Registro de entrega de EPP',
    description:
      'Registro firmado por el trabajador de cada entrega de Equipo de Protección Personal, con stock, fecha y tipo.',
    category: 'SST',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'Ley 29783, Art. 60',
    scope: 'worker',
    workerDocType: 'entrega_epp',
    hasExpiration: false,
    generatorSlug: 'entrega-epp',
    actionHint: 'Generá las actas de entrega de EPP por trabajador.',
  },
  {
    id: 'induccion-sst',
    number: 19,
    title: 'Inducción SST trabajadores nuevos',
    description:
      'Registro de inducción SST obligatoria al inicio de labores, con temario, duración y firma del trabajador.',
    category: 'SST',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'Ley 29783, Art. 49-g',
    scope: 'worker',
    workerDocType: 'induccion_sst',
    hasExpiration: false,
    generatorSlug: 'induccion-sst',
    actionHint: 'Usá el template de inducción SST y subí la constancia firmada.',
  },
  {
    id: 'mapa-riesgos',
    number: 20,
    title: 'Mapa de Riesgos exhibido',
    description:
      'Mapa de riesgos del centro de trabajo con señalética estandarizada, exhibido en lugar visible.',
    category: 'SST',
    gravity: 'LEVE',
    multaUIT: 0.23,
    baseLegal: 'D.S. 005-2012-TR, Art. 35-e',
    scope: 'exhibited',
    hasExpiration: true,
    expirationMonths: 12,
    generatorSlug: 'mapa-riesgos',
    actionHint: 'Generá el mapa de riesgos con señalética imprimible.',
  },
  {
    id: 'registro-accidentes',
    number: 21,
    title: 'Registro de Accidentes e Incidentes',
    description:
      'Registro formato SUNAFIL de accidentes de trabajo, enfermedades ocupacionales e incidentes peligrosos. Notificación 24h al MTPE.',
    category: 'SST',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'Ley 29783, Art. 28; R.M. 050-2013-TR',
    scope: 'org',
    orgDocType: 'OTRO', // SstRecord type=ACCIDENTE/INCIDENTE
    hasExpiration: false,
    generatorSlug: 'registro-accidentes',
    actionHint: 'Registrá accidentes e incidentes con notificación automática 24h.',
  },

  /* ── VII. POLÍTICAS OBLIGATORIAS ───────────────────────────────────── */
  {
    id: 'politica-hostigamiento',
    number: 22,
    title: 'Política contra Hostigamiento Sexual',
    description:
      'Política de prevención + procedimiento de investigación. CIHSO (Comité Intervención). Ley 27942 + D.S. 014-2019-MIMP.',
    category: 'POLITICAS_OBLIGATORIAS',
    gravity: 'MUY_GRAVE',
    multaUIT: 2.63,
    baseLegal: 'Ley 27942; D.S. 014-2019-MIMP',
    scope: 'org',
    orgDocType: 'POLITICA_HOSTIGAMIENTO',
    hasExpiration: false,
    generatorSlug: 'politica-hostigamiento',
    actionHint: 'Generá la política con IA conforme D.S. 014-2019-MIMP.',
  },
  {
    id: 'cuadro-categorias',
    number: 23,
    title: 'Cuadro de Categorías y Funciones',
    description:
      'Cuadro de categorías salariales con criterios objetivos (conocimiento, responsabilidad, esfuerzo, condiciones). Ley 30709 D.S. 002-2018-TR.',
    category: 'POLITICAS_OBLIGATORIAS',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'Ley 30709, Art. 2; D.S. 002-2018-TR',
    scope: 'org',
    orgDocType: 'POLITICA_IGUALDAD',
    hasExpiration: false,
    generatorSlug: 'cuadro-categorias',
    actionHint: 'Generá el cuadro con las 4 dimensiones de Ley 30709.',
  },

  /* ── VIII. DOCUMENTOS COMPLEMENTARIOS ──────────────────────────────── */
  {
    id: 'seguro-vida-ley',
    number: 24,
    title: 'Póliza Seguro Vida Ley',
    description:
      'Póliza vigente de Vida Ley para trabajadores con 4+ años de servicio. Capital asegurado según D.Leg. 688.',
    category: 'DOCUMENTOS_COMPLEMENTARIOS',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'D.Leg. 688, Art. 1',
    scope: 'org',
    orgDocType: 'OTRO',
    hasExpiration: true,
    expirationMonths: 12,
    actionHint: 'Subí la póliza anual de Vida Ley vigente.',
  },
  {
    id: 'sctr-poliza',
    number: 25,
    title: 'Póliza SCTR vigente',
    description:
      'Seguro Complementario de Trabajo de Riesgo (salud + pensión) para actividades de riesgo. Ley 26790.',
    category: 'DOCUMENTOS_COMPLEMENTARIOS',
    gravity: 'MUY_GRAVE',
    multaUIT: 2.63,
    baseLegal: 'Ley 26790, Art. 19',
    scope: 'org',
    orgDocType: 'OTRO',
    hasExpiration: true,
    expirationMonths: 12,
    condition: {
      type: 'hasRiskActivities',
      op: 'eq',
      value: true,
      description: 'Aplicable si la empresa realiza actividades de riesgo (sector o puestos).',
    },
    actionHint: 'Contratá SCTR con EsSalud/ONP o EPS privada y subí la póliza.',
  },
  {
    id: 'declaracion-jurada',
    number: 26,
    title: 'Declaraciones Juradas del trabajador',
    description:
      'DDJJ de domicilio, derechohabientes (hijos, cónyuge) y datos para asignación familiar + previsional.',
    category: 'DOCUMENTOS_COMPLEMENTARIOS',
    gravity: 'LEVE',
    multaUIT: 0.23,
    baseLegal: 'D.S. 001-98-TR',
    scope: 'worker',
    workerDocType: 'declaracion_jurada',
    hasExpiration: false,
    generatorSlug: 'declaracion-jurada',
    actionHint: 'Generá el formato y firmalo con el trabajador al ingreso.',
  },
  {
    id: 'sintesis-legislacion',
    number: 27,
    title: 'Síntesis Legislación Laboral exhibida',
    description:
      'Síntesis de derechos laborales (Art. 48 D.S. 001-98-TR) en cartel visible del centro de labores.',
    category: 'DOCUMENTOS_COMPLEMENTARIOS',
    gravity: 'LEVE',
    multaUIT: 0.23,
    baseLegal: 'D.S. 001-98-TR, Art. 48',
    scope: 'exhibited',
    hasExpiration: false,
    generatorSlug: 'sintesis-legislacion',
    actionHint: 'Descargá el cartel e imprímelo en A3 para exhibición.',
  },
  {
    id: 'reglamento-interno',
    number: 28,
    title: 'Reglamento Interno de Trabajo',
    description:
      'RIT aprobado por el MTPE (obligatorio si 100+ trabajadores). D.S. 039-91-TR.',
    category: 'DOCUMENTOS_COMPLEMENTARIOS',
    gravity: 'GRAVE',
    multaUIT: 1.57,
    baseLegal: 'D.S. 039-91-TR, Art. 2',
    scope: 'org',
    orgDocType: 'RIT',
    hasExpiration: false,
    condition: {
      type: 'totalWorkers',
      op: 'gte',
      value: 100,
      description: 'Obligatorio para empresas con 100 o más trabajadores.',
    },
    generatorSlug: 'reglamento-interno',
    actionHint: 'Generá el RIT con los 9 capítulos obligatorios + registro MTPE.',
  },
]

/* ── Helpers para consumir el catálogo ─────────────────────────────── */

export const CATEGORY_LABEL: Record<SunafilCategory, string> = {
  CONTRATOS_REGISTRO: 'Contratos y Registro',
  BOLETAS_REMUNERACIONES: 'Boletas y Remuneraciones',
  PREVISIONAL: 'Previsional',
  JORNADA_ASISTENCIA: 'Jornada y Asistencia',
  VACACIONES: 'Vacaciones',
  SST: 'Seguridad y Salud en el Trabajo',
  POLITICAS_OBLIGATORIAS: 'Políticas Obligatorias',
  DOCUMENTOS_COMPLEMENTARIOS: 'Documentos Complementarios',
}

export const CATEGORY_ORDER: SunafilCategory[] = [
  'CONTRATOS_REGISTRO',
  'BOLETAS_REMUNERACIONES',
  'PREVISIONAL',
  'JORNADA_ASISTENCIA',
  'VACACIONES',
  'SST',
  'POLITICAS_OBLIGATORIAS',
  'DOCUMENTOS_COMPLEMENTARIOS',
]

export function getDocsByCategory(category: SunafilCategory): SunafilDocSpec[] {
  return SUNAFIL_READY_DOCS.filter((d) => d.category === category)
}

export function getDocByIdSunafil(id: string): SunafilDocSpec | null {
  return SUNAFIL_READY_DOCS.find((d) => d.id === id) ?? null
}

/** Total de documentos aplicables según contexto de organización. */
export function totalAplicables(ctx: {
  totalWorkers: number
  hasRiskActivities?: boolean
  hasConstructionCivil?: boolean
  hasTercerizacion?: boolean
}): number {
  return SUNAFIL_READY_DOCS.filter((d) => isDocApplicable(d, ctx)).length
}

/**
 * Evalúa si el documento aplica según el contexto (tamaño, sector, actividades).
 * Default: aplica (null condition).
 */
export function isDocApplicable(
  doc: SunafilDocSpec,
  ctx: {
    totalWorkers: number
    hasRiskActivities?: boolean
    hasConstructionCivil?: boolean
    hasTercerizacion?: boolean
  },
): boolean {
  if (!doc.condition) return true
  const c = doc.condition
  if (c.type === 'totalWorkers' && typeof c.value === 'number') {
    if (c.op === 'gte') return ctx.totalWorkers >= c.value
    if (c.op === 'lte') return ctx.totalWorkers <= c.value
    if (c.op === 'eq') return ctx.totalWorkers === c.value
  }
  if (c.type === 'hasRiskActivities') return Boolean(ctx.hasRiskActivities) === Boolean(c.value)
  if (c.type === 'hasConstructionCivil') return Boolean(ctx.hasConstructionCivil) === Boolean(c.value)
  if (c.type === 'hasTercerizacion') return Boolean(ctx.hasTercerizacion) === Boolean(c.value)
  return true
}

export const SUNAFIL_READY_META = {
  totalDocs: SUNAFIL_READY_DOCS.length,
  byGravity: {
    MUY_GRAVE: SUNAFIL_READY_DOCS.filter((d) => d.gravity === 'MUY_GRAVE').length,
    GRAVE: SUNAFIL_READY_DOCS.filter((d) => d.gravity === 'GRAVE').length,
    LEVE: SUNAFIL_READY_DOCS.filter((d) => d.gravity === 'LEVE').length,
  },
  byScope: {
    worker: SUNAFIL_READY_DOCS.filter((d) => d.scope === 'worker').length,
    org: SUNAFIL_READY_DOCS.filter((d) => d.scope === 'org').length,
    hybrid: SUNAFIL_READY_DOCS.filter((d) => d.scope === 'hybrid').length,
    exhibited: SUNAFIL_READY_DOCS.filter((d) => d.scope === 'exhibited').length,
  },
  multaTotalPotencial: SUNAFIL_READY_DOCS.reduce((s, d) => s + d.multaUIT, 0),
} as const
