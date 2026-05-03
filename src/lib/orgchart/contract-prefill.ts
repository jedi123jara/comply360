import { getTree } from './tree-service'
import type { OrgAssignmentDTO, OrgChartTree, OrgPositionDTO } from './types'

export interface OrgPositionContractPrefill {
  source: 'ORGCHART_POSITION'
  generatedAt: string
  positionId: string
  positionTitle: string
  unitId: string
  unitName: string | null
  suggestedTemplateId: 'laboral-indefinido' | 'laboral-plazo-fijo' | 'locacion-servicios'
  suggestedFields: Record<string, string>
  worker: {
    id: string
    dni: string
    fullName: string
    tipoContrato: string
    regimenLaboral: string
    fechaIngreso: string
  } | null
  warnings: string[]
}

export async function getOrgPositionContractPrefill(
  orgId: string,
  positionId: string,
): Promise<OrgPositionContractPrefill> {
  const tree = await getTree(orgId)
  return buildOrgPositionContractPrefill(tree, positionId)
}

export function buildOrgPositionContractPrefill(
  tree: OrgChartTree,
  positionId: string,
  generatedAt = new Date().toISOString(),
): OrgPositionContractPrefill {
  const position = tree.positions.find(item => item.id === positionId)
  if (!position) throw new Error('Cargo no existe en el organigrama')

  const unit = tree.units.find(item => item.id === position.orgUnitId) ?? null
  const assignment = primaryAssignmentFor(tree.assignments, position.id)
  const worker = assignment?.worker ?? null
  const salary = suggestedSalary(position)
  const suggestedFields: Record<string, string> = {
    org_position_id: position.id,
    org_unit_id: position.orgUnitId,
    trabajador_cargo: position.title,
    cargo: position.title,
  }

  if (unit) {
    suggestedFields.trabajador_area = unit.name
    suggestedFields.area = unit.name
    suggestedFields.departamento = unit.name
  }

  if (salary) {
    suggestedFields.remuneracion_mensual = salary
    suggestedFields.remuneracion = salary
  }

  if (worker) {
    const fullName = `${worker.firstName} ${worker.lastName}`.trim()
    suggestedFields.trabajador_dni = worker.dni
    suggestedFields.trabajador_nombre = fullName
    suggestedFields.trabajador_regimen = worker.regimenLaboral
    suggestedFields.tipo_contrato_actual = worker.tipoContrato
    suggestedFields.fecha_inicio = worker.fechaIngreso.split('T')[0] ?? worker.fechaIngreso
  }

  return {
    source: 'ORGCHART_POSITION',
    generatedAt,
    positionId: position.id,
    positionTitle: position.title,
    unitId: position.orgUnitId,
    unitName: unit?.name ?? null,
    suggestedTemplateId: suggestedTemplateFor(worker?.tipoContrato ?? null),
    suggestedFields,
    worker: worker
      ? {
          id: worker.id,
          dni: worker.dni,
          fullName: `${worker.firstName} ${worker.lastName}`.trim(),
          tipoContrato: worker.tipoContrato,
          regimenLaboral: worker.regimenLaboral,
          fechaIngreso: worker.fechaIngreso,
        }
      : null,
    warnings: warningsFor(position),
  }
}

function primaryAssignmentFor(assignments: OrgAssignmentDTO[], positionId: string) {
  const current = assignments.filter(item => item.positionId === positionId && !item.endedAt)
  return current.find(item => item.isPrimary) ?? current[0] ?? null
}

function suggestedSalary(position: OrgPositionDTO) {
  return position.salaryBandMin ?? position.salaryBandMax ?? ''
}

function suggestedTemplateFor(tipoContrato: string | null): OrgPositionContractPrefill['suggestedTemplateId'] {
  const normalized = (tipoContrato ?? '').toUpperCase()
  if (normalized.includes('LOCACION') || normalized.includes('SERVICIO')) return 'locacion-servicios'
  if (normalized.includes('PLAZO') || normalized.includes('MODAL') || normalized.includes('TEMPORAL')) {
    return 'laboral-plazo-fijo'
  }
  return 'laboral-indefinido'
}

function warningsFor(position: OrgPositionDTO) {
  const warnings: string[] = []
  if (position.requiresSctr) warnings.push('El cargo requiere revisar SCTR antes de firmar.')
  if (position.requiresMedicalExam) warnings.push('El cargo requiere examen medico ocupacional vigente.')
  if (position.isCritical) warnings.push('Cargo critico: validar MOF, funciones y cadena de mando.')
  if (position.riskCategory) warnings.push(`Categoria de riesgo del cargo: ${position.riskCategory}.`)
  return warnings
}
