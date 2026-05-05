import { describe, expect, it } from 'vitest'
import { listOrgTemplates, recommendOrgTemplatesFromSignals } from '../templates'

describe('plantillas organizacionales', () => {
  it('cubre las seis industrias exigidas para el onramp del organigrama', () => {
    const templates = listOrgTemplates()
    const ids = templates.map(template => template.id)
    const industrialIds = [
      'retail-operaciones',
      'manufactura-sst',
      'servicios-profesionales',
      'transporte-logistica',
      'construccion-obras',
      'agroindustria-campo',
    ]

    expect(ids).toEqual(expect.arrayContaining(industrialIds))
    expect(ids).toEqual(expect.arrayContaining([
      'comite-sst-paritario',
      'supervisor-sst',
      'brigada-emergencia',
      'comision-investigadora',
      'equipo-temporal-auditoria',
    ]))

    const industrialTemplates = templates.filter(template =>
      industrialIds.includes(template.id),
    )
    expect(industrialTemplates.every(template => template.unitCount >= 6)).toBe(true)
    expect(industrialTemplates.every(template => template.positionCount >= 7)).toBe(true)
  })

  it('incluye plantillas de comisiones y equipos paralelos', () => {
    const templates = listOrgTemplates()
    const commissionTemplates = templates.filter(template => template.sector === 'Comisiones')

    expect(commissionTemplates.map(template => template.id)).toEqual([
      'comite-sst-paritario',
      'supervisor-sst',
      'brigada-emergencia',
      'comision-investigadora',
      'equipo-temporal-auditoria',
    ])
    expect(commissionTemplates.every(template => template.unitCount >= 1)).toBe(true)
    expect(commissionTemplates.every(template => template.positionCount >= 2)).toBe(true)
  })

  it('mantiene el orden base de las plantillas industriales', () => {
    const templates = listOrgTemplates()
    expect(templates.slice(0, 6).map(template => template.id)).toEqual([
      'retail-operaciones',
      'manufactura-sst',
      'servicios-profesionales',
      'transporte-logistica',
      'construccion-obras',
      'agroindustria-campo',
    ])
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
