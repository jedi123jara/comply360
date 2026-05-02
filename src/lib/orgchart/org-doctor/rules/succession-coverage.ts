import type { DoctorFinding } from '../../types'
import type { DoctorContext } from '../index'

/**
 * Cobertura de sucesión / bus factor.
 *
 * Detecta cargos gerenciales (`isManagerial: true`) sin backup designado.
 * Si el ocupante renuncia o se enferma, no hay continuidad operacional.
 */
export function ruleSuccessionCoverage(ctx: DoctorContext): DoctorFinding[] {
  const managerial = ctx.tree.positions.filter(p => p.isManagerial)
  const out: DoctorFinding[] = []

  for (const p of managerial) {
    if (!p.backupPositionId) {
      out.push({
        rule: 'succession-no-backup',
        severity: 'MEDIUM',
        title: `Cargo gerencial sin backup: ${p.title}`,
        description: `El cargo "${p.title}" no tiene un cargo de backup designado. Si el ocupante deja la empresa, la continuidad operacional queda en riesgo (bus factor 1).`,
        baseLegal: null,
        affectedUnitIds: [p.orgUnitId],
        affectedWorkerIds: [],
        suggestedTaskTitle: `Designar backup formal para "${p.title}"`,
        suggestedFix: 'Asigna un cargo de backup en la posición — alguien que pueda asumir las responsabilidades en una transición.',
      })
    }
  }

  return out
}
