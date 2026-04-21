/**
 * Tipos compartidos para el motor de generadores de documentos compliance.
 *
 * Cada generador es una función pura que toma parámetros del usuario + contexto
 * de la organización y devuelve un documento estructurado (markdown + clauses).
 * La capa de PDF + persistencia es compartida.
 */

/** Identificador estable del tipo de generador. */
export type GeneratorType =
  | 'politica-sst'
  | 'politica-hostigamiento'
  | 'cuadro-categorias'
  | 'acta-comite-sst'
  | 'plan-anual-sst'
  | 'iperc'
  | 'reglamento-interno'
  | 'capacitacion-sst'
  | 'induccion-sst'
  | 'entrega-epp'
  | 'mapa-riesgos'
  | 'registro-accidentes'
  | 'declaracion-jurada'
  | 'horario-trabajo-cartel'
  | 'sintesis-legislacion'

/** Contexto de la organización que todos los generadores reciben. */
export interface GeneratorOrgContext {
  razonSocial: string
  ruc: string
  domicilio?: string
  sector?: string
  totalWorkers: number
  representanteLegal?: string
  cargoRepresentante?: string
  emailContacto?: string
  telefono?: string
}

/** Resultado canónico que todo generador devuelve. */
export interface GeneratedDocument {
  /** Tipo de generador. */
  type: GeneratorType
  /** Título final del documento (aparece en cabecera + filename). */
  title: string
  /** Contenido markdown completo del documento. */
  markdown: string
  /** Cláusulas estructuradas para renderizar por secciones (útil para UI). */
  sections: GeneratedSection[]
  /** Base legal consolidada (todas las referencias usadas). */
  legalBasis: string[]
  /** Metadata que persiste en OrgDocument.description o campos custom. */
  metadata: Record<string, unknown>
  /** Si el generador llama a IA, tokens/costo estimado. */
  aiUsed?: boolean
}

export interface GeneratedSection {
  /** ID estable para navegar (ej: "elemento-1"). */
  id: string
  /** Número de sección ("I", "II", "1.", etc.). */
  numbering: string
  /** Título visible. */
  title: string
  /** Contenido markdown de la sección. */
  content: string
  /** Si es editable por el usuario (vs. fijo por ley). */
  editable?: boolean
  /** Base legal específica de esta sección. */
  baseLegal?: string
}

/**
 * Enum de `OrgDocType` que matchea cada generador con un row en OrgDocument.
 * Debe coincidir con el enum Prisma en `schema.prisma`.
 */
export const GENERATOR_ORG_DOC_TYPE: Record<GeneratorType, string> = {
  'politica-sst': 'REGLAMENTO_SST',
  'politica-hostigamiento': 'POLITICA_HOSTIGAMIENTO',
  'cuadro-categorias': 'POLITICA_IGUALDAD',
  'acta-comite-sst': 'OTRO',
  'plan-anual-sst': 'PLAN_SST',
  iperc: 'OTRO',
  'reglamento-interno': 'RIT',
  'capacitacion-sst': 'OTRO',
  'induccion-sst': 'OTRO',
  'entrega-epp': 'OTRO',
  'mapa-riesgos': 'OTRO',
  'registro-accidentes': 'OTRO',
  'declaracion-jurada': 'OTRO',
  'horario-trabajo-cartel': 'OTRO',
  'sintesis-legislacion': 'OTRO',
}

/** Metadata human-readable para el hub de generadores. */
export interface GeneratorMetadata {
  slug: GeneratorType
  title: string
  description: string
  category: 'SST' | 'POLITICAS' | 'DOCUMENTOS' | 'JORNADA'
  gravity: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  baseLegal: string
  available: boolean // true si está implementado
  estimatedMinutes: number
}

export const GENERATOR_REGISTRY: GeneratorMetadata[] = [
  {
    slug: 'politica-sst',
    title: 'Política de Seguridad y Salud en el Trabajo',
    description: 'Los 8 elementos obligatorios del Art. 22 Ley 29783 firmados por gerencia.',
    category: 'SST',
    gravity: 'GRAVE',
    baseLegal: 'Ley 29783, Art. 22',
    available: true,
    estimatedMinutes: 5,
  },
  {
    slug: 'politica-hostigamiento',
    title: 'Política contra el Hostigamiento Sexual',
    description: 'Política + procedimiento CIHSO conforme D.S. 014-2019-MIMP.',
    category: 'POLITICAS',
    gravity: 'MUY_GRAVE',
    baseLegal: 'Ley 27942; D.S. 014-2019-MIMP',
    available: true,
    estimatedMinutes: 8,
  },
  {
    slug: 'cuadro-categorias',
    title: 'Cuadro de Categorías y Funciones',
    description: 'Categorías salariales con 4 dimensiones (Ley 30709 — igualdad).',
    category: 'POLITICAS',
    gravity: 'GRAVE',
    baseLegal: 'Ley 30709; D.S. 002-2018-TR',
    available: true,
    estimatedMinutes: 10,
  },
  // Los siguientes aparecen en el hub con available:false → se marcan como "próximamente"
  {
    slug: 'acta-comite-sst',
    title: 'Acta de Comité / Supervisor SST',
    description: 'Acta de conformación según cantidad de trabajadores (Art. 29-30 Ley 29783).',
    category: 'SST',
    gravity: 'GRAVE',
    baseLegal: 'Ley 29783, Art. 29-30',
    available: true,
    estimatedMinutes: 7,
  },
  {
    slug: 'plan-anual-sst',
    title: 'Plan Anual de SST',
    description: 'Plan con diagnóstico, objetivos SMART, cronograma de capacitaciones y presupuesto.',
    category: 'SST',
    gravity: 'GRAVE',
    baseLegal: 'Ley 29783, Art. 38',
    available: true,
    estimatedMinutes: 15,
  },
  {
    slug: 'iperc',
    title: 'Matriz IPERC',
    description: 'Identificación de peligros + evaluación de riesgos P×S + jerarquía de controles (R.M. 050-2013-TR).',
    category: 'SST',
    gravity: 'MUY_GRAVE',
    baseLegal: 'Ley 29783, Art. 57; R.M. 050-2013-TR',
    available: true,
    estimatedMinutes: 20,
  },
  {
    slug: 'reglamento-interno',
    title: 'Reglamento Interno de Trabajo',
    description: '10 capítulos del D.S. 039-91-TR: admisión, jornada, remuneraciones, SST, disciplina, hostigamiento, cese.',
    category: 'DOCUMENTOS',
    gravity: 'GRAVE',
    baseLegal: 'D.S. 039-91-TR, Art. 2',
    available: true,
    estimatedMinutes: 20,
  },
  {
    slug: 'capacitacion-sst',
    title: 'Registro de Capacitación SST',
    description: 'Acta de cada sesión con temario, asistentes y firmas (R.M. 050-2013-TR Anexo 5).',
    category: 'SST',
    gravity: 'GRAVE',
    baseLegal: 'Ley 29783, Art. 35',
    available: true,
    estimatedMinutes: 8,
  },
  {
    slug: 'induccion-sst',
    title: 'Inducción SST para nuevos trabajadores',
    description: 'Constancia de inducción con temario mínimo R.M. 050-2013-TR + peligros IPERC + firma.',
    category: 'SST',
    gravity: 'GRAVE',
    baseLegal: 'Ley 29783, Art. 49-g',
    available: true,
    estimatedMinutes: 5,
  },
  {
    slug: 'entrega-epp',
    title: 'Acta de Entrega de EPP',
    description: 'Registro firmable por trabajador con items, tallas, vida útil y fechas de reposición.',
    category: 'SST',
    gravity: 'GRAVE',
    baseLegal: 'Ley 29783, Art. 60',
    available: true,
    estimatedMinutes: 4,
  },
  {
    slug: 'mapa-riesgos',
    title: 'Mapa de Riesgos',
    description: 'Documento por áreas con peligros + señalética NTP 399.010-1 + checklist.',
    category: 'SST',
    gravity: 'LEVE',
    baseLegal: 'D.S. 005-2012-TR, Art. 35-e · NTP 399.010-1',
    available: true,
    estimatedMinutes: 10,
  },
  {
    slug: 'registro-accidentes',
    title: 'Registro de Accidentes / Incidentes / Enfermedades',
    description: 'Formato R.M. 050-2013-TR Anexo 6 con plantilla de notificación 24h al MTPE auto-generada.',
    category: 'SST',
    gravity: 'GRAVE',
    baseLegal: 'Ley 29783, Art. 28; R.M. 050-2013-TR',
    available: true,
    estimatedMinutes: 10,
  },
  {
    slug: 'declaracion-jurada',
    title: 'Declaraciones Juradas del Trabajador',
    description: 'DDJJ de domicilio, derechohabientes, asignación familiar, régimen previsional y datos de contacto.',
    category: 'DOCUMENTOS',
    gravity: 'LEVE',
    baseLegal: 'D.S. 001-98-TR · Ley 25129',
    available: true,
    estimatedMinutes: 5,
  },
  {
    slug: 'horario-trabajo-cartel',
    title: 'Cartel de Horario de Trabajo',
    description: 'Cartel exhibible con turnos + refrigerio + marco legal (Art. 5 D.S. 004-2006-TR).',
    category: 'JORNADA',
    gravity: 'LEVE',
    baseLegal: 'D.S. 004-2006-TR, Art. 5',
    available: true,
    estimatedMinutes: 3,
  },
  {
    slug: 'sintesis-legislacion',
    title: 'Síntesis de Legislación Laboral',
    description: 'Cartel oficial con 10 secciones: remuneraciones, jornada, beneficios, licencias, SST, derechos, despido, inspección (Art. 48 D.S. 001-98-TR).',
    category: 'DOCUMENTOS',
    gravity: 'LEVE',
    baseLegal: 'D.S. 001-98-TR, Art. 48',
    available: true,
    estimatedMinutes: 2,
  },
]

export function getGeneratorMetadata(slug: GeneratorType): GeneratorMetadata | null {
  return GENERATOR_REGISTRY.find((g) => g.slug === slug) ?? null
}
