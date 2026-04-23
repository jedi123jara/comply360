import { REQUIRED_DOC_TYPES, recalculateLegajoScore } from '@/lib/compliance/legajo-config'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workerDocument: { findMany: vi.fn() },
    worker: { update: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'

const findManyMock = prisma.workerDocument.findMany as ReturnType<typeof vi.fn>
const updateMock = prisma.worker.update as ReturnType<typeof vi.fn>

describe('REQUIRED_DOC_TYPES', () => {
  it('has exactly 18 entries', () => {
    expect(REQUIRED_DOC_TYPES).toHaveLength(18)
  })

  it('includes contrato_trabajo', () => {
    expect(REQUIRED_DOC_TYPES).toContain('contrato_trabajo')
  })

  it('includes dni_copia', () => {
    expect(REQUIRED_DOC_TYPES).toContain('dni_copia')
  })

  it('includes examen_medico_ingreso', () => {
    expect(REQUIRED_DOC_TYPES).toContain('examen_medico_ingreso')
  })

  it('all entries are non-empty strings', () => {
    for (const docType of REQUIRED_DOC_TYPES) {
      expect(typeof docType).toBe('string')
      expect(docType.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate entries', () => {
    const unique = new Set(REQUIRED_DOC_TYPES)
    expect(unique.size).toBe(REQUIRED_DOC_TYPES.length)
  })
})

describe('recalculateLegajoScore', () => {
  beforeEach(() => {
    findManyMock.mockReset()
    updateMock.mockReset()
    updateMock.mockResolvedValue({})
  })

  it('returns 100 when all 18 required doc types are uploaded/verified', async () => {
    findManyMock.mockResolvedValue(
      REQUIRED_DOC_TYPES.map((dt) => ({ documentType: dt }))
    )

    const score = await recalculateLegajoScore('worker-1')

    expect(score).toBe(100)
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'worker-1' },
      data: { legajoScore: 100 },
    })
  })

  it('returns 0 when no documents exist', async () => {
    findManyMock.mockResolvedValue([])

    const score = await recalculateLegajoScore('worker-2')

    expect(score).toBe(0)
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'worker-2' },
      data: { legajoScore: 0 },
    })
  })

  it('returns 50 when 9 of 18 required docs are present', async () => {
    const nineDocs = REQUIRED_DOC_TYPES.slice(0, 9).map((dt) => ({
      documentType: dt,
    }))
    findManyMock.mockResolvedValue(nineDocs)

    const score = await recalculateLegajoScore('worker-3')

    expect(score).toBe(50)
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'worker-3' },
      data: { legajoScore: 50 },
    })
  })

  it('only counts UPLOADED and VERIFIED statuses (via prisma query filter)', async () => {
    findManyMock.mockResolvedValue([])

    await recalculateLegajoScore('worker-4')

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        workerId: 'worker-4',
        status: { in: ['UPLOADED', 'VERIFIED'] },
      },
      select: { documentType: true },
    })
  })

  it('ignores documents whose type is not in REQUIRED_DOC_TYPES', async () => {
    findManyMock.mockResolvedValue([
      { documentType: 'contrato_trabajo' },
      { documentType: 'random_extra_doc' },
      { documentType: 'otro_no_requerido' },
    ])

    const score = await recalculateLegajoScore('worker-5')

    // Only 1 of 18 required types matched
    expect(score).toBe(Math.round((1 / 18) * 100))
  })

  it('does not double-count duplicate document types', async () => {
    findManyMock.mockResolvedValue([
      { documentType: 'contrato_trabajo' },
      { documentType: 'contrato_trabajo' },
      { documentType: 'dni_copia' },
    ])

    const score = await recalculateLegajoScore('worker-6')

    // 2 unique required types out of 18
    expect(score).toBe(Math.round((2 / 18) * 100))
  })
})
