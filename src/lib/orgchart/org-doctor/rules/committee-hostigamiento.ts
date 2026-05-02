import type { DoctorFinding } from '../../types'
import type { DoctorContext } from '../index'

/**
 * Comité de Intervención frente al Hostigamiento Sexual — Ley 27942 / D.S. 014-2019-MIMP
 *
 * Obligaciones:
 *   - Empresas ≥ 20 trabajadores: deben constituir un Comité.
 *   - Empresas < 20: basta con un delegado contra el hostigamiento.
 *   - Debe haber al menos un mecanismo formal para recibir denuncias.
 */
export function ruleCommitteeHostigamiento(ctx: DoctorContext): DoctorFinding[] {
  const out: DoctorFinding[] = []
  const roles = ctx.tree.complianceRoles

  const presidentes = roles.filter(r => r.roleType === 'PRESIDENTE_COMITE_HOSTIGAMIENTO')
  const miembros = roles.filter(r => r.roleType === 'MIEMBRO_COMITE_HOSTIGAMIENTO')
  const receptores = roles.filter(r => r.roleType === 'JEFE_INMEDIATO_HOSTIGAMIENTO')

  if (ctx.workerCount >= 20) {
    if (presidentes.length === 0 && miembros.length === 0) {
      out.push({
        rule: 'comite-hostigamiento-missing',
        severity: 'CRITICAL',
        title: 'Empresa sin Comité de Intervención frente al Hostigamiento Sexual',
        description: `Con ${ctx.workerCount} trabajadores estás obligada a contar con un Comité formal con representación paritaria empleador/trabajadores.`,
        baseLegal: 'Ley 27942 · D.S. 014-2019-MIMP art. 30',
        affectedUnitIds: [],
        affectedWorkerIds: [],
        suggestedTaskTitle: 'Constituir Comité de Intervención frente al Hostigamiento Sexual',
        suggestedFix: 'Designa 4 miembros titulares con paridad empleador/trabajadores y formaliza en acta.',
      })
    }
  }

  if (receptores.length === 0) {
    out.push({
      rule: 'hostigamiento-no-receiver',
      severity: 'HIGH',
      title: 'Sin canal formal de recepción de denuncias por hostigamiento',
      description:
        'La ley exige tener al menos una persona designada para recibir denuncias verbales o escritas, sin trámite previo. El canal de denuncias debe estar publicado en la empresa.',
      baseLegal: 'Ley 27942 art. 7',
      affectedUnitIds: [],
      affectedWorkerIds: [],
      suggestedTaskTitle: 'Designar receptor formal de denuncias por hostigamiento',
      suggestedFix: null,
    })
  }

  return out
}
