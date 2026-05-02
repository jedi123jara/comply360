import type { DoctorFinding } from '../../types'
import type { DoctorContext } from '../index'

/**
 * DPO (Data Protection Officer) — Ley 29733 art. 42 · D.S. 003-2013-JUS
 *
 * Aunque la ley peruana no fija un umbral exacto de trabajadores, la práctica
 * administrativa de la Autoridad Nacional de Protección de Datos Personales
 * recomienda DPO designado cuando:
 *   - La empresa tiene > 100 trabajadores o
 *   - Procesa categorías especiales de datos (salud, biometría, menores)
 *
 * Aquí marcamos como HIGH a partir de 100 trabajadores. Bajo ese umbral solo
 * informamos como recomendación (LOW).
 */
export function ruleDpoLey29733(ctx: DoctorContext): DoctorFinding[] {
  const dpos = ctx.tree.complianceRoles.filter(r => r.roleType === 'DPO_LEY_29733')
  if (dpos.length > 0) return []

  if (ctx.workerCount >= 100) {
    return [
      {
        rule: 'dpo-not-designated',
        severity: 'HIGH',
        title: 'Sin Oficial de Protección de Datos (DPO) designado',
        description: `Con ${ctx.workerCount} trabajadores y procesamiento de datos personales (planilla, RRHH, biometría) la designación de un DPO es la mejor práctica. La ANPDP puede solicitar evidencia de la figura responsable.`,
        baseLegal: 'Ley 29733 art. 42 · D.S. 003-2013-JUS',
        affectedUnitIds: [],
        affectedWorkerIds: [],
        suggestedTaskTitle: 'Designar Oficial de Protección de Datos (DPO)',
        suggestedFix: 'Designa formalmente al responsable con acta firmada por gerencia y publica el rol en políticas internas.',
      },
    ]
  }

  return []
}
