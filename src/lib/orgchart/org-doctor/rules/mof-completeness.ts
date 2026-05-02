import type { DoctorFinding } from '../../types'
import type { DoctorContext } from '../index'

export function ruleMofCompleteness(ctx: DoctorContext): DoctorFinding[] {
  const findings: DoctorFinding[] = []

  for (const position of ctx.tree.positions) {
    const missing = missingMofSections(position)
    if (missing.length === 0) continue

    const sensitive = isSensitivePosition(position)
    findings.push({
      rule: `mof-incomplete-${position.id}`,
      severity: sensitive ? 'HIGH' : 'MEDIUM',
      title: `MOF incompleto: ${position.title}`,
      description: `El cargo "${position.title}" no tiene MOF completo. Faltan: ${missing.join(', ')}.`,
      baseLegal: null,
      affectedUnitIds: [position.orgUnitId],
      affectedWorkerIds: [],
      suggestedTaskTitle: `Completar MOF de "${position.title}"`,
      suggestedFix:
        'Completar propósito, funciones, responsabilidades y requisitos antes de usar el cargo como evidencia organizacional.',
    })
  }

  return findings
}

function missingMofSections(position: DoctorContext['tree']['positions'][number]) {
  const missing: string[] = []
  if (!textHasContent(position.purpose)) missing.push('propósito')
  if (!valueHasContent(position.functions)) missing.push('funciones')
  if (!valueHasContent(position.responsibilities)) missing.push('responsabilidades')
  if (!valueHasContent(position.requirements)) missing.push('requisitos')
  return missing
}

function isSensitivePosition(position: DoctorContext['tree']['positions'][number]) {
  const risk = (position.riskCategory ?? '').toUpperCase()
  return Boolean(
    position.isManagerial ||
      position.isCritical ||
      position.requiresSctr ||
      position.requiresMedicalExam ||
      risk.includes('ALTO') ||
      risk.includes('CRITICO') ||
      risk.includes('CRÍTICO'),
  )
}

function textHasContent(value: string | null | undefined) {
  return Boolean(value?.trim())
}

function valueHasContent(value: unknown): boolean {
  if (typeof value === 'string') return textHasContent(value)
  if (Array.isArray(value)) return value.some(item => valueHasContent(item))
  if (value && typeof value === 'object') {
    return Object.values(value).some(item => valueHasContent(item))
  }
  return Boolean(value)
}
