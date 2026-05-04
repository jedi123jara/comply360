import { describe, expect, it } from 'vitest'
import { evaluateContractAnnexCoverage } from '../annex-coverage'
import type { PremiumContractAnnex } from '../premium-library'

const laborAnnexes: PremiumContractAnnex[] = [
  {
    id: 'sst-policy',
    title: 'Política de Seguridad y Salud en el Trabajo',
    required: true,
    legalBasis: ['Ley 29783'],
    reason: 'Acredita SST.',
  },
  {
    id: 'harassment-policy',
    title: 'Política de Prevención del Hostigamiento Sexual',
    required: true,
    legalBasis: ['Ley 27942'],
    reason: 'Acredita prevención.',
  },
  {
    id: 'job-description',
    title: 'Descripción de Puesto o Funciones',
    required: true,
    legalBasis: ['D.Leg. 728'],
    reason: 'Acredita funciones.',
  },
]

describe('evaluateContractAnnexCoverage', () => {
  it('reconoce evidencia real desde documentos de empresa y trabajador', () => {
    const result = evaluateContractAnnexCoverage({
      requiredAnnexes: laborAnnexes,
      workerLinked: true,
      candidates: [
        {
          id: 'org-sst',
          title: 'Reglamento de Seguridad y Salud en el Trabajo',
          type: 'REGLAMENTO_SST',
          status: 'PUBLISHED',
          source: 'ORG_DOCUMENT',
          fileUrl: 'https://example.com/sst.pdf',
        },
        {
          id: 'org-hostigamiento',
          title: 'Política de prevención del hostigamiento sexual',
          type: 'POLITICA_HOSTIGAMIENTO',
          status: 'PUBLISHED',
          source: 'ORG_DOCUMENT',
          fileUrl: 'https://example.com/hostigamiento.pdf',
        },
        {
          id: 'worker-job',
          title: 'Descripción de puesto - Analista',
          type: 'VIGENTE:descripcion_puesto',
          status: 'VERIFIED',
          source: 'WORKER_DOCUMENT',
          fileUrl: 'https://example.com/puesto.pdf',
        },
      ],
    })

    expect(result.missingAnnexes).toHaveLength(0)
    expect(result.coveredAnnexes.map((item) => item.annexId)).toEqual([
      'sst-policy',
      'harassment-policy',
      'job-description',
    ])
  })

  it('marca faltantes cuando no existe documento que acredite el anexo', () => {
    const result = evaluateContractAnnexCoverage({
      requiredAnnexes: laborAnnexes,
      candidates: [
        {
          id: 'org-sst',
          title: 'Plan SST',
          type: 'PLAN_SST',
          status: 'PUBLISHED',
          source: 'ORG_DOCUMENT',
        },
      ],
    })

    expect(result.coveredAnnexes.map((item) => item.annexId)).toEqual(['sst-policy'])
    expect(result.missingAnnexes).toEqual([
      'Política de Prevención del Hostigamiento Sexual',
      'Descripción de Puesto o Funciones',
    ])
  })

  it('reconoce documentos generados internamente como evidencia disponible', () => {
    const result = evaluateContractAnnexCoverage({
      requiredAnnexes: [laborAnnexes[1]],
      candidates: [
        {
          id: 'generated-hostigamiento',
          title: 'Política de Prevención y Sanción del Hostigamiento Sexual en el Trabajo',
          type: 'POLITICA_HOSTIGAMIENTO',
          status: 'GENERATED',
          source: 'ORG_DOCUMENT',
        },
      ],
    })

    expect(result.missingAnnexes).toHaveLength(0)
    expect(result.coveredAnnexes[0]).toMatchObject({
      annexId: 'harassment-policy',
      status: 'GENERATED',
    })
  })
})
