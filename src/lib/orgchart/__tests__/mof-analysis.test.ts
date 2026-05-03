import { describe, expect, it } from 'vitest'
import { analyzeMof } from '../mof-analysis'

describe('Analisis de completitud MOF', () => {
  it('marca como completo un MOF robusto', () => {
    const report = analyzeMof({
      title: 'Jefe de Operaciones',
      description: 'Responsable de la continuidad operativa y coordinacion de equipos.',
      level: 'Jefatura',
      category: 'Operativo',
      purpose: 'Asegurar que la operacion diaria cumpla metas, controles internos y continuidad del servicio.',
      functions: ['Planificar turnos', 'Supervisar indicadores', 'Coordinar mejoras'],
      responsibilities: ['Cumplimiento operativo', 'Control de riesgos', 'Gestion de equipos'],
      requirements: {
        education: 'Universitario o tecnico',
        experience: '3 anos en operaciones',
        competencies: ['Liderazgo', 'Analisis', 'Comunicacion'],
      },
      riskCategory: 'MEDIO',
      requiresSctr: false,
      requiresMedicalExam: true,
      isCritical: true,
      isManagerial: true,
      reportsToPositionId: 'p-gerente',
      backupPositionId: 'p-backup',
    })

    expect(report).toMatchObject({
      score: 100,
      status: 'complete',
      completed: 14,
      total: 14,
    })
    expect(report.issues).toHaveLength(0)
  })

  it('prioriza faltantes criticos y alertas SST', () => {
    const report = analyzeMof({
      title: 'Supervisor Planta',
      purpose: 'Supervisar planta',
      functions: ['Supervisar'],
      responsibilities: [],
      requirements: null,
      riskCategory: 'CRITICO',
      requiresSctr: false,
      requiresMedicalExam: false,
      isCritical: true,
      isManagerial: true,
      reportsToPositionId: null,
      backupPositionId: null,
    })

    expect(report.status).toBe('critical')
    expect(report.issues.map(issue => issue.key)).toEqual(
      expect.arrayContaining([
        'responsibilities',
        'education',
        'experience',
        'competencies',
        'backup',
        'medical-high-risk',
        'sctr-high-risk',
      ]),
    )
  })
})
