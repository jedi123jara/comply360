import type { DoctorFinding } from '../../types'
import type { DoctorContext } from '../index'

/**
 * Comité SST — Ley 29783 art. 29 / D.S. 005-2012-TR
 *
 * Reglas mínimas:
 *   - Empresas con 20 o más trabajadores deben tener Comité SST (no solo Supervisor).
 *   - Composición paritaria: al menos 1 representante de trabajadores por cada
 *     representante del empleador.
 *   - Debe haber Presidente y Secretario designados.
 *   - Si hay menos de 20 trabajadores, basta con un Supervisor SST (Ley 29783 art. 30).
 */
export function ruleCommitteeSST(ctx: DoctorContext): DoctorFinding[] {
  const out: DoctorFinding[] = []
  const roles = ctx.tree.complianceRoles

  const presidentes = roles.filter(r => r.roleType === 'PRESIDENTE_COMITE_SST')
  const secretarios = roles.filter(r => r.roleType === 'SECRETARIO_COMITE_SST')
  const repTrab = roles.filter(r => r.roleType === 'REPRESENTANTE_TRABAJADORES_SST')
  const repEmpl = roles.filter(r => r.roleType === 'REPRESENTANTE_EMPLEADOR_SST')
  const supervisores = roles.filter(r => r.roleType === 'SUPERVISOR_SST')

  if (ctx.workerCount >= 20) {
    if (presidentes.length === 0) {
      out.push({
        rule: 'committee-sst-no-president',
        severity: 'CRITICAL',
        title: 'Comité SST sin Presidente designado',
        description: `Tu empresa tiene ${ctx.workerCount} trabajadores y debe contar con un Comité SST. Falta designar al Presidente.`,
        baseLegal: 'Ley 29783 art. 29 · D.S. 005-2012-TR',
        affectedUnitIds: [],
        affectedWorkerIds: [],
        suggestedTaskTitle: 'Designar Presidente del Comité SST',
        suggestedFix: 'Convoca al Comité a sesión y formaliza la designación en acta.',
      })
    }
    if (secretarios.length === 0) {
      out.push({
        rule: 'committee-sst-no-secretary',
        severity: 'HIGH',
        title: 'Comité SST sin Secretario designado',
        description: 'El Comité SST debe contar con un Secretario que lleve las actas y convoque las sesiones.',
        baseLegal: 'Ley 29783 art. 29',
        affectedUnitIds: [],
        affectedWorkerIds: [],
        suggestedTaskTitle: 'Designar Secretario del Comité SST',
        suggestedFix: null,
      })
    }
    if (repTrab.length < 2) {
      out.push({
        rule: 'committee-sst-no-worker-rep',
        severity: 'CRITICAL',
        title: 'Comité SST sin representantes de trabajadores',
        description:
          'El Comité SST debe estar conformado por igual número de representantes del empleador y de los trabajadores, con mínimo 2 representantes de trabajadores. La elección es por votación directa y secreta.',
        baseLegal: 'Ley 29783 art. 29 inc. 4',
        affectedUnitIds: [],
        affectedWorkerIds: [],
        suggestedTaskTitle: 'Convocar elecciones para representantes de trabajadores en SST',
        suggestedFix: 'Publica convocatoria con 30 días de anticipación. Elección por votación directa y secreta.',
      })
    }
    if (repTrab.length < repEmpl.length) {
      out.push({
        rule: 'committee-sst-imbalanced',
        severity: 'HIGH',
        title: 'Comité SST con composición desbalanceada',
        description: `Tienes ${repEmpl.length} representante(s) del empleador pero solo ${repTrab.length} representante(s) de trabajadores. La ley exige paridad estricta.`,
        baseLegal: 'Ley 29783 art. 29',
        affectedUnitIds: [],
        affectedWorkerIds: [],
        suggestedTaskTitle: 'Equilibrar composición del Comité SST',
        suggestedFix: null,
      })
    }
    if (repEmpl.length < 2) {
      out.push({
        rule: 'committee-sst-no-employer-rep',
        severity: 'HIGH',
        title: 'Comité SST sin representantes suficientes del empleador',
        description: 'El Comité SST debe tener al menos 2 representantes del empleador para completar el mínimo legal paritario.',
        baseLegal: 'Ley 29783 art. 29',
        affectedUnitIds: [],
        affectedWorkerIds: [],
        suggestedTaskTitle: 'Designar representantes del empleador en el Comité SST',
        suggestedFix: 'Formaliza la designación por decisión del empleador y deja constancia en acta.',
      })
    }
  } else {
    // <20 trabajadores: basta con Supervisor SST
    if (supervisores.length === 0) {
      out.push({
        rule: 'sst-no-supervisor',
        severity: 'HIGH',
        title: 'Empresa sin Supervisor SST designado',
        description: `Con ${ctx.workerCount} trabajador(es) tienes la opción de Supervisor SST en lugar de Comité, pero al menos uno debe estar designado.`,
        baseLegal: 'Ley 29783 art. 30',
        affectedUnitIds: [],
        affectedWorkerIds: [],
        suggestedTaskTitle: 'Designar Supervisor SST',
        suggestedFix: 'Capacita y designa formalmente al Supervisor SST.',
      })
    }
  }

  return out
}
