import type { DoctorFinding } from '../../types'
import type { DoctorContext, ServiceProviderForDoctor } from '../index'

export function ruleSubordinationRisk(ctx: DoctorContext): DoctorFinding[] {
  const providers = ctx.serviceProviders ?? []
  const findings: DoctorFinding[] = []

  for (const provider of providers) {
    const indicators = subordinationIndicators(provider)
    if (indicators.length === 0 && provider.desnaturalizacionRisk < 40) continue

    const severity = severityForProvider(provider, indicators.length)
    if (!severity) continue

    const unit = provider.area
      ? ctx.tree.units.find(candidate => normalize(candidate.name) === normalize(provider.area ?? ''))
      : null
    const name = `${provider.firstName} ${provider.lastName}`.trim()

    findings.push({
      rule: `subordination-risk-${provider.id}`,
      severity,
      title: `Riesgo de subordinación: ${name}`,
      description: [
        `${name} está registrado como prestador de servicios, pero presenta indicadores laborales de subordinación.`,
        `Riesgo calculado: ${provider.desnaturalizacionRisk}/100.`,
        `Indicadores: ${indicators.join(', ') || 'riesgo histórico del proveedor'}.`,
      ].join(' '),
      baseLegal: 'Principio de primacía de la realidad; D.Leg. 728; Código Civil art. 1764',
      affectedUnitIds: unit ? [unit.id] : [],
      affectedWorkerIds: [],
      suggestedTaskTitle: `Revisar subordinación de ${name}`,
      suggestedFix: 'Revisar contrato, correos, horarios, órdenes y dependencia funcional. Si existe subordinación real, regularizar la relación laboral o eliminar los indicadores de dependencia.',
    })
  }

  return findings
}

function severityForProvider(provider: ServiceProviderForDoctor, indicatorCount: number) {
  if (
    provider.desnaturalizacionRisk >= 80 ||
    (provider.hasFixedSchedule && provider.reportsToSupervisor && provider.receivesOrders)
  ) {
    return 'CRITICAL' as const
  }
  if (provider.desnaturalizacionRisk >= 60 || indicatorCount >= 3) return 'HIGH' as const
  if (provider.desnaturalizacionRisk >= 40 || indicatorCount >= 2) return 'MEDIUM' as const
  return null
}

function subordinationIndicators(provider: ServiceProviderForDoctor) {
  const indicators: string[] = []
  if (provider.hasFixedSchedule) indicators.push('horario fijo')
  if (provider.reportsToSupervisor) indicators.push('reporta a supervisor')
  if (provider.receivesOrders) indicators.push('recibe órdenes')
  if (provider.hasExclusivity) indicators.push('exclusividad')
  if (provider.usesCompanyTools) indicators.push('usa herramientas de la empresa')
  if (provider.worksOnPremises) indicators.push('trabaja en instalaciones')
  return indicators
}

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
