import { describe, expect, it } from 'vitest'
import { listOrgTemplates, recommendOrgTemplatesFromSignals } from '../templates'

describe('plantillas organizacionales', () => {
  it('cubre las seis industrias exigidas para el onramp del organigrama', () => {
    const templates = listOrgTemplates()

    expect(templates.map(template => template.id)).toEqual([
      'retail-operaciones',
      'manufactura-sst',
      'servicios-profesionales',
      'transporte-logistica',
      'construccion-obras',
      'agroindustria-campo',
    ])
    expect(templates.every(template => template.unitCount >= 6)).toBe(true)
    expect(templates.every(template => template.positionCount >= 7)).toBe(true)
  })

  it('prioriza construcción cuando detecta obra, CIIU y exposición SST', () => {
    const templates = recommendOrgTemplatesFromSignals({
      organizationSector: 'Construcción civil',
      ciiu: '4100',
      currentProjectCostUIT: 80,
      workerCount: 35,
      departments: ['Obra', 'SSOMA', 'Almacén de obra'],
      workerPositions: ['Residente de obra', 'Maestro de obra', 'Prevencionista de riesgos'],
      sctrWorkerCount: 18,
      highRiskWorkerCount: 12,
    })

    expect(templates[0].id).toBe('construccion-obras')
    expect(templates[0].recommendation?.level).toBe('STRONG')
    expect(templates[0].recommendation?.score).toBeGreaterThanOrEqual(90)
  })

  it('prioriza agroindustria cuando la organización usa insumos agropecuarios', () => {
    const templates = recommendOrgTemplatesFromSignals({
      organizationSector: 'Agroindustria',
      ciiu: '0113',
      usesAgroInputs: true,
      declaredWorkers: 120,
      departments: ['Campo', 'Packing', 'Calidad e inocuidad'],
      workerPositions: ['Supervisor de cuadrilla', 'Operario agrícola'],
      sctrWorkerCount: 30,
    })

    expect(templates[0].id).toBe('agroindustria-campo')
    expect(templates[0].recommendation?.reasons.join(' ')).toContain('agroindustrial')
  })
})
