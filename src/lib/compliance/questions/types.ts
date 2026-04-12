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

export type AnswerValue = 'SI' | 'NO' | 'PARCIAL' | null

export type InfraccionGravedad = 'LEVE' | 'GRAVE' | 'MUY_GRAVE'

export interface ComplianceQuestion {
  id: string // e.g. "CR-01"
  area: AreaKey
  text: string
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
export const AREAS: AreaDefinition[] = [
  { key: 'contratos_registro',            label: 'Contratos y Registro',                description: 'Formalidad contractual, T-REGISTRO, modalidades',              icon: 'FileText',   weight: 14 },
  { key: 'remuneraciones_beneficios',     label: 'Remuneraciones y Beneficios',         description: 'CTS, gratificaciones, vacaciones, asignacion familiar',         icon: 'Calculator', weight: 18 },
  { key: 'jornada_descansos',             label: 'Jornada y Descansos',                 description: 'Horario, horas extras, descanso semanal, feriados',             icon: 'Clock',      weight: 10 },
  { key: 'sst',                           label: 'Seguridad y Salud en el Trabajo',     description: 'Ley 29783, IPERC, comite SST, capacitaciones',                  icon: 'ShieldCheck',weight: 19 },
  { key: 'documentos_obligatorios',       label: 'Documentos Obligatorios',             description: 'Legajo, boletas, planillas, registros',                         icon: 'FolderOpen', weight: 14 },
  { key: 'relaciones_laborales',          label: 'Relaciones Laborales',                description: 'Sindicatos, negociacion colectiva, disciplina',                  icon: 'Users',      weight:  5 },
  { key: 'igualdad_nodiscriminacion',     label: 'Igualdad y No Discriminacion',        description: 'Ley 30709, brecha salarial, inclusion de personas con discapacidad', icon: 'Scale', weight:  7 },
  { key: 'trabajadores_especiales',       label: 'Trabajadores Especiales',             description: 'Gestantes, discapacidad, menores, extranjeros',                  icon: 'UserCheck',  weight:  5 },
  { key: 'tercerizacion_intermediacion',  label: 'Tercerizacion e Intermediacion',      description: 'Ley 29245, Ley 27626: registro SUNAFIL, limites y solidaridad', icon: 'Network',    weight:  4 },
  { key: 'hostigamiento_sexual_detallado',label: 'Hostigamiento Sexual — Procedimiento',description: 'Ley 27942, D.S. 014-2019-MIMP: CIHSO, plazos, medidas de proteccion', icon: 'AlertTriangle', weight: 4 },
]

export function getAreaWeight(key: AreaKey): number {
  return AREAS.find(a => a.key === key)?.weight ?? 10
}
