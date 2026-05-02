import type { DoctorFinding } from '../../types'
import type { DoctorContext } from '../index'
import { COMPLIANCE_ROLES } from '../../compliance-rules'

/**
 * Roles legales con vencimiento próximo (≤ 60 días) o ya vencidos.
 *
 * Comité SST y Hostigamiento tienen vigencia de 2 años por norma. Dejar pasar
 * el vencimiento sin renovar deja a la empresa con un comité ilegal.
 */
export function ruleExpiringRoles(ctx: DoctorContext): DoctorFinding[] {
  const out: DoctorFinding[] = []
  const SOON = 60 * 24 * 60 * 60 * 1000 // 60 días

  for (const r of ctx.tree.complianceRoles) {
    if (!r.endsAt) continue
    const endsAt = new Date(r.endsAt).getTime()
    const diff = endsAt - ctx.now.getTime()
    const def = COMPLIANCE_ROLES[r.roleType]
    const workerName = `${r.worker.firstName} ${r.worker.lastName}`

    if (diff < 0) {
      out.push({
        rule: 'role-expired',
        severity: 'HIGH',
        title: `Rol legal vencido: ${def.shortLabel} (${workerName})`,
        description: `El rol "${def.label}" asignado a ${workerName} venció el ${new Date(r.endsAt).toLocaleDateString('es-PE')}. Sin renovación, la designación pierde validez legal.`,
        baseLegal: def.baseLegal,
        affectedUnitIds: r.unitId ? [r.unitId] : [],
        affectedWorkerIds: [r.workerId],
        suggestedTaskTitle: `Renovar designación: ${def.shortLabel}`,
        suggestedFix: 'Convoca elecciones / designa formalmente y carga el acta firmada.',
      })
    } else if (diff < SOON) {
      const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
      out.push({
        rule: 'role-expiring-soon',
        severity: 'MEDIUM',
        title: `Rol legal vence en ${days} días: ${def.shortLabel}`,
        description: `El rol "${def.label}" asignado a ${workerName} vence en ${days} días.`,
        baseLegal: def.baseLegal,
        affectedUnitIds: r.unitId ? [r.unitId] : [],
        affectedWorkerIds: [r.workerId],
        suggestedTaskTitle: `Planificar renovación de ${def.shortLabel}`,
        suggestedFix: null,
      })
    }
  }

  return out
}
