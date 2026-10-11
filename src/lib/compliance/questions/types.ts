export type AreaKey =
  | 'contratos_registro'
  | 'remuneraciones_beneficios'
  | 'jornada_descansos'
  | 'sst'
  | 'documentos_obligatorios'
  | 'relaciones_laborales'
  | 'igualdad_nodiscriminacion'
  | 'trabajadores_especiales'
  | 'tercerizacion_intermediacion'
  | 'hostigamiento_sexual_detallado'

/**
 * Respuestas posibles del diagnóstico. Los valores se guardan tal cual en
 * `ComplianceDiagnostic.questionsJson`: no los renombres.
 *
 *  - SI / PARCIAL / NO: lo que el usuario sabe de su empresa.
 *  - NO_SE: no sabe. Cuenta como brecha (igual que NO en puntaje y multa, para
 *    no dar falsa tranquilidad) y se muestra aparte como «Por verificar».
 *  - NO_APLICA: la situación no existe en la empresa. Sale del puntaje (no suma
 *    ni resta) y no genera tarea.
 *
 * Los diagnósticos antiguos solo tienen SI / PARCIAL / NO y siguen siendo válidos.
 */
export const ANSWER_VALUES = ['SI', 'PARCIAL', 'NO', 'NO_SE', 'NO_APLICA'] as const

export type AnswerOption = (typeof ANSWER_VALUES)[number]

export type AnswerValue = AnswerOption | null

export function isAnswerOption(value: unknown): value is AnswerOption {
  return typeof value === 'string' && (ANSWER_VALUES as readonly string[]).includes(value)
}

export type InfraccionGravedad = 'LEVE' | 'GRAVE' | 'MUY_GRAVE'

export interface ComplianceQuestion {
  id: string // e.g. "CR-01"
  area: AreaKey
  text: string
  /**
   * «¿Por qué te lo preguntamos?»: qué se revisa, por qué importa y qué riesgo
   * hay, en lenguaje simple (1-2 frases). Obligatorio en las preguntas express.
   * Si falta, la UI muestra la base legal explicada en simple.
   */
  helpText?: string
  baseLegal: string
  infraccionGravedad: InfraccionGravedad
  multaUIT: number // multa en UITs por trabajador afectado
  peso: number // 1-5 importancia
  express: boolean // si es parte del diagnostico express
  /** If set, question is only shown when condition is met */
  condition?: {
    field: 'sizeRange' | 'regimenPrincipal' | 'totalWorkers' | 'tieneIntermediacion' | 'tieneTercerización'
    operator: 'eq' | 'neq' | 'gte' | 'lte'
    value: string | number
  }
}

export interface AreaDefinition {
  key: AreaKey
  label: string
  description: string
  icon: string // lucide icon name
  weight: number // percentage weight in global score
}

// Weights must sum to exactly 100
// Área 9 (tercerizacion_intermediacion): 4%
// Área 10 (hostigamiento_sexual_detallado): 4%
// Redistributed from: contratos_registro 15→14, remuneraciones_beneficios 20→18,
//                     sst 20→19, documentos_obligatorios 15→14, igualdad_nodiscriminacion 10→7
// Total: 14+18+10+19+14+5+7+5+4+4 = 100 ✓
// `label` y `description` son textos visibles (con tildes). `key` es lo que se
// guarda y se compara: no lo cambies.
export const AREAS: AreaDefinition[] = [
  { key: 'contratos_registro',            label: 'Contratos y registro',                description: 'Contratos por escrito, T-REGISTRO y contratos temporales',               icon: 'FileText',   weight: 14 },
  { key: 'remuneraciones_beneficios',     label: 'Remuneraciones y beneficios',         description: 'CTS, gratificaciones, vacaciones y asignación familiar',                 icon: 'Calculator', weight: 18 },
  { key: 'jornada_descansos',             label: 'Jornada y descansos',                 description: 'Horario, horas extras, descanso semanal y feriados',                     icon: 'Clock',      weight: 10 },
  { key: 'sst',                           label: 'Seguridad y salud en el trabajo',     description: 'Ley 29783, IPERC, Comité de SST y capacitaciones',                       icon: 'ShieldCheck',weight: 19 },
  { key: 'documentos_obligatorios',       label: 'Documentos obligatorios',             description: 'Legajo, boletas, planillas y registros',                                 icon: 'FolderOpen', weight: 14 },
  { key: 'relaciones_laborales',          label: 'Relaciones laborales',                description: 'Sindicatos, negociación colectiva y disciplina',                         icon: 'Users',      weight:  5 },
  { key: 'igualdad_nodiscriminacion',     label: 'Igualdad y no discriminación',        description: 'Ley 30709, brecha salarial e inclusión de personas con discapacidad',    icon: 'Scale',      weight:  7 },
  { key: 'trabajadores_especiales',       label: 'Trabajadores especiales',             description: 'Gestantes, personas con discapacidad, menores de edad y extranjeros',    icon: 'UserCheck',  weight:  5 },
  { key: 'tercerizacion_intermediacion',  label: 'Tercerización e intermediación',      description: 'Ley 29245 y Ley 27626: registro en el MTPE, límites y responsabilidad',  icon: 'Network',    weight:  4 },
  { key: 'hostigamiento_sexual_detallado',label: 'Hostigamiento sexual: procedimiento', description: 'Ley 27942 y D.S. 014-2019-MIMP: comité, plazos y medidas de protección', icon: 'AlertTriangle', weight: 4 },
]

export function getAreaWeight(key: AreaKey): number {
  return AREAS.find(a => a.key === key)?.weight ?? 10
}
