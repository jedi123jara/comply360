import { describe, it, expect } from 'vitest'
import { buildValidationContextFromDraft } from '../context-builder'

describe('buildValidationContextFromDraft', () => {
  it('produce un contexto valido para un borrador minimo', () => {
    const ctx = buildValidationContextFromDraft({
      contract: {
        type: 'LABORAL_PLAZO_FIJO',
        title: 'Borrador',
        formData: {
          causa_objetiva: 'Proyecto cliente XYZ jul-dic 2026',
          fecha_inicio: '2026-07-01',
          fecha_fin: '2026-12-31',
          remuneracion: 3500,
          cargo: 'Analista de proyecto',
          jornada_semanal: 48,
        },
      },
      organization: {
        id: 'org_1',
        regimenPrincipal: 'GENERAL',
        ruc: '20123456789',
      },
      workers: [
        {
          id: 'worker_1',
          dni: '12345678',
          firstName: 'Juan',
          lastName: 'Perez',
          regimenLaboral: 'GENERAL',
          fechaIngreso: '2026-07-01',
          sueldoBruto: 3500,
          nationality: 'peruana',
        },
      ],
    })

    expect(ctx.contract.id).toBe('draft')
    expect(ctx.contract.status).toBe('DRAFT')
    expect(ctx.contract.type).toBe('LABORAL_PLAZO_FIJO')
    expect(ctx.contract.causeObjective).toBe('Proyecto cliente XYZ jul-dic 2026')
    expect(ctx.contract.startDate).toBeInstanceOf(Date)
    expect(ctx.contract.endDate).toBeInstanceOf(Date)
    expect(ctx.contract.monthlySalary).toBe(3500)
    expect(ctx.contract.weeklyHours).toBe(48)
    expect(ctx.contract.position).toBe('Analista de proyecto')

    expect(ctx.workers).toHaveLength(1)
    expect(ctx.workers[0].dni).toBe('12345678')
    expect(ctx.workers[0].fullName).toBe('Juan Perez')

    expect(ctx.organization.id).toBe('org_1')
    expect(ctx.organization.ruc).toBe('20123456789')

    expect(ctx.workerModalHistory).toEqual([])
    expect(ctx.constants.RMV).toBeGreaterThan(0)
  })

  it('extrae causa objetiva del campo alternativo causaObjetiva', () => {
    const ctx = buildValidationContextFromDraft({
      contract: {
        type: 'LABORAL_PLAZO_FIJO',
        formData: { causaObjetiva: 'Proyecto X' },
      },
      organization: { id: 'org_1' },
      workers: [],
    })
    expect(ctx.contract.causeObjective).toBe('Proyecto X')
  })

  it('historial modal se mapea correctamente', () => {
    const ctx = buildValidationContextFromDraft({
      contract: { type: 'LABORAL_PLAZO_FIJO', formData: null },
      organization: { id: 'org_1' },
      workers: [],
      workerModalHistory: [
        {
          contractId: 'c1',
          type: 'LABORAL_PLAZO_FIJO',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          durationDays: 365,
        },
      ],
    })
    expect(ctx.workerModalHistory).toHaveLength(1)
    expect(ctx.workerModalHistory[0].durationDays).toBe(365)
    expect(ctx.workerModalHistory[0].startDate).toBeInstanceOf(Date)
    expect(ctx.workerModalHistory[0].endDate).toBeInstanceOf(Date)
  })

  it('expiresAt se usa como endDate cuando formData no tiene fecha_fin', () => {
    const ctx = buildValidationContextFromDraft({
      contract: {
        type: 'LABORAL_PLAZO_FIJO',
        formData: { fecha_inicio: '2026-01-01' },
        expiresAt: '2026-12-31',
      },
      organization: { id: 'org_1' },
      workers: [],
    })
    expect(ctx.contract.endDate).toBeInstanceOf(Date)
    expect((ctx.contract.endDate as Date).getFullYear()).toBe(2026)
  })

  it('formData null devuelve campos extraidos en null', () => {
    const ctx = buildValidationContextFromDraft({
      contract: { type: 'LABORAL_INDEFINIDO', formData: null },
      organization: { id: 'org_1' },
      workers: [],
    })
    expect(ctx.contract.causeObjective).toBeNull()
    expect(ctx.contract.startDate).toBeNull()
    expect(ctx.contract.endDate).toBeNull()
    expect(ctx.contract.monthlySalary).toBeNull()
    expect(ctx.contract.position).toBeNull()
  })
})
