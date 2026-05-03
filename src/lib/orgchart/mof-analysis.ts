import type { OrgPositionDTO } from './types'

export type MofReadinessStatus = 'complete' | 'usable' | 'incomplete' | 'critical'
export type MofIssueSeverity = 'high' | 'medium' | 'low'

export interface MofAnalysisInput {
  title?: string | null
  description?: string | null
  level?: string | null
  category?: string | null
  purpose?: string | null
  functions?: unknown
  responsibilities?: unknown
  requirements?: unknown
  riskCategory?: string | null
  requiresSctr?: boolean | null
  requiresMedicalExam?: boolean | null
  isCritical?: boolean | null
  isManagerial?: boolean | null
  reportsToPositionId?: string | null
  backupPositionId?: string | null
}

export interface MofIssue {
  key: string
  severity: MofIssueSeverity
  label: string
  detail: string
}

export interface MofCompletenessReport {
  score: number
  status: MofReadinessStatus
  completed: number
  total: number
  issues: MofIssue[]
  strengths: string[]
}

interface RequirementShape {
  education: string
  experience: string
  competencies: string[]
}

const CHECKS = [
  'title',
  'description',
  'level',
  'category',
  'purpose',
  'functions',
  'responsibilities',
  'education',
  'experience',
  'competencies',
  'line',
  'sst',
  'criticality',
  'backup',
] as const

export function analyzeMof(input: MofAnalysisInput): MofCompletenessReport {
  const functions = listFromUnknown(input.functions)
  const responsibilities = listFromUnknown(input.responsibilities)
  const requirements = requirementsFromUnknown(input.requirements)
  const risk = normalize(input.riskCategory ?? '')
  const highRisk = ['ALTO', 'CRITICO'].includes(risk.toUpperCase())
  const criticalOrManagerial = Boolean(input.isCritical || input.isManagerial)
  const issues: MofIssue[] = []
  const completedChecks = new Set<(typeof CHECKS)[number]>()

  if (hasText(input.title, 2)) completedChecks.add('title')
  else issues.push(issue('title', 'high', 'Título del cargo', 'Define un nombre claro y auditable para el cargo.'))

  if (hasText(input.description, 20)) completedChecks.add('description')
  else issues.push(issue('description', 'low', 'Descripción general', 'Agrega una descripción breve para ubicar el rol en el organigrama.'))

  if (hasText(input.level, 2)) completedChecks.add('level')
  else issues.push(issue('level', 'medium', 'Nivel organizacional', 'Clasifica el cargo como gerencia, jefatura, operativo u otro nivel.'))

  if (hasText(input.category, 2)) completedChecks.add('category')
  else issues.push(issue('category', 'medium', 'Categoría del cargo', 'Indica la categoría para análisis laboral y salarial.'))

  if (hasText(input.purpose, 30)) completedChecks.add('purpose')
  else issues.push(issue('purpose', 'high', 'Propósito suficiente', 'El propósito debe explicar por qué existe el cargo.'))

  if (functions.length >= 3) completedChecks.add('functions')
  else issues.push(issue('functions', 'high', 'Funciones principales', 'Registra al menos 3 funciones verificables.'))

  if (responsibilities.length >= 3) completedChecks.add('responsibilities')
  else issues.push(issue('responsibilities', 'high', 'Responsabilidades', 'Registra al menos 3 responsabilidades o resultados esperados.'))

  if (hasText(requirements.education, 2)) completedChecks.add('education')
  else issues.push(issue('education', 'medium', 'Formación requerida', 'Indica formación, certificaciones o estudios requeridos.'))

  if (hasText(requirements.experience, 2)) completedChecks.add('experience')
  else issues.push(issue('experience', 'medium', 'Experiencia requerida', 'Indica experiencia mínima y contexto esperado.'))

  if (requirements.competencies.length >= 3) completedChecks.add('competencies')
  else issues.push(issue('competencies', 'medium', 'Competencias', 'Agrega al menos 3 competencias para selección y evaluación.'))

  if (input.reportsToPositionId || input.isManagerial) completedChecks.add('line')
  else issues.push(issue('line', 'low', 'Línea de mando', 'Define jefe inmediato o confirma que es un cargo de mando raíz.'))

  if (risk || input.requiresSctr || input.requiresMedicalExam) completedChecks.add('sst')
  else issues.push(issue('sst', 'medium', 'Clasificación SST', 'Clasifica riesgo SST o confirma requisitos médicos/SCTR.'))

  if (input.isCritical !== null && input.isCritical !== undefined && input.isManagerial !== null && input.isManagerial !== undefined) {
    completedChecks.add('criticality')
  } else {
    issues.push(issue('criticality', 'medium', 'Criticidad', 'Marca si el cargo es crítico y si tiene mando.'))
  }

  if (!criticalOrManagerial || input.backupPositionId) completedChecks.add('backup')
  else issues.push(issue('backup', 'medium', 'Backup del cargo', 'Un cargo crítico o con mando debería tener backup o sucesor.'))

  if (highRisk && !input.requiresMedicalExam) {
    issues.push(issue('medical-high-risk', 'medium', 'Examen médico', 'Riesgo alto/crítico normalmente exige vigilancia médica ocupacional.'))
  }
  if (highRisk && !input.requiresSctr) {
    issues.push(issue('sctr-high-risk', 'medium', 'SCTR', 'Revisa si corresponde SCTR por exposición del puesto.'))
  }

  const completed = completedChecks.size
  const score = Math.round((completed / CHECKS.length) * 100)

  return {
    score,
    status: statusFromScore(score, issues),
    completed,
    total: CHECKS.length,
    issues,
    strengths: buildStrengths({
      functions,
      responsibilities,
      requirements,
      highRisk,
      criticalOrManagerial,
      hasBackup: Boolean(input.backupPositionId),
    }),
  }
}

export function buildMofInputFromPosition(position: OrgPositionDTO): MofAnalysisInput {
  return {
    title: position.title,
    description: position.description,
    level: position.level,
    category: position.category,
    purpose: position.purpose,
    functions: position.functions,
    responsibilities: position.responsibilities,
    requirements: position.requirements,
    riskCategory: position.riskCategory,
    requiresSctr: position.requiresSctr,
    requiresMedicalExam: position.requiresMedicalExam,
    isCritical: position.isCritical,
    isManagerial: position.isManagerial,
    reportsToPositionId: position.reportsToPositionId,
    backupPositionId: position.backupPositionId,
  }
}

export function listFromUnknown(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean)
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|;/g)
      .map(item => item.trim())
      .filter(Boolean)
  }
  return []
}

function requirementsFromUnknown(value: unknown): RequirementShape {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { education: '', experience: '', competencies: [] }
  }
  const record = value as { education?: unknown; experience?: unknown; competencies?: unknown }
  return {
    education: typeof record.education === 'string' ? record.education.trim() : '',
    experience: typeof record.experience === 'string' ? record.experience.trim() : '',
    competencies: listFromUnknown(record.competencies),
  }
}

function issue(key: string, severity: MofIssueSeverity, label: string, detail: string): MofIssue {
  return { key, severity, label, detail }
}

function buildStrengths(input: {
  functions: string[]
  responsibilities: string[]
  requirements: RequirementShape
  highRisk: boolean
  criticalOrManagerial: boolean
  hasBackup: boolean
}) {
  const strengths: string[] = []
  if (input.functions.length >= 3) strengths.push('Funciones principales listas')
  if (input.responsibilities.length >= 3) strengths.push('Responsabilidades trazables')
  if (input.requirements.competencies.length >= 3) strengths.push('Competencias definidas')
  if (input.highRisk) strengths.push('Puesto sensible SST identificado')
  if (input.criticalOrManagerial && input.hasBackup) strengths.push('Cargo crítico/con mando con backup')
  return strengths
}

function statusFromScore(score: number, issues: MofIssue[]): MofReadinessStatus {
  if (score >= 90 && !issues.some(item => item.severity === 'high')) return 'complete'
  if (score >= 70) return 'usable'
  if (score >= 45) return 'incomplete'
  return 'critical'
}

function hasText(value: string | null | undefined, minLength: number) {
  return Boolean(value && value.trim().length >= minLength)
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
