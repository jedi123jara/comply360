/**
 * Tests herméticos (sin BD) de los schemas zod de rutas mutadoras.
 *
 * Objetivo principal: garantizar que los schemas NO rechazan los bodies que el
 * frontend ya envía hoy (regresión que tumbaría flujos en producción), y SÍ
 * rechazan los valores que antes corrompían datos o reventaban Prisma con 500.
 */

import {
  workerCreateSchema,
  workerUpdateSchema,
  vacacionCreateSchema,
  payslipBatchSchema,
} from '../schemas'

describe('workerCreateSchema (POST /api/workers)', () => {
  it('acepta el body real del form, incluyendo campos extra que el handler ignora', () => {
    const body = {
      dni: '45678912',
      firstName: 'Ana',
      lastName: 'Quispe',
      email: '',
      birthDate: null,
      gender: 'F',
      fechaIngreso: '2026-01-15',
      sueldoBruto: 2500,
      regimenLaboral: 'GENERAL',
      tipoContrato: 'INDEFINIDO',
      jornadaSemanal: 48,
      // Campos EXTRA que el form envía y el handler NO consume: deben pasar por strip
      afpComisionTipo: 'FLUJO',
      sctrRiesgoNivel: 'BAJO',
      discapacidad: false,
      discapacidadTipo: null,
      tipoJornada: 'COMPLETA',
    }
    expect(workerCreateSchema.safeParse(body).success).toBe(true)
  })

  it('rechaza un régimen laboral inválido', () => {
    const r = workerCreateSchema.safeParse({
      dni: '45678912',
      firstName: 'Ana',
      lastName: 'Quispe',
      fechaIngreso: '2026-01-15',
      sueldoBruto: 2500,
      regimenLaboral: 'general', // minúscula → inválido
    })
    expect(r.success).toBe(false)
  })

  it('rechaza una fechaIngreso no parseable', () => {
    const r = workerCreateSchema.safeParse({
      dni: '45678912',
      firstName: 'Ana',
      lastName: 'Quispe',
      fechaIngreso: 'basura',
      sueldoBruto: 2500,
    })
    expect(r.success).toBe(false)
  })

  it('rechaza un DNI que no tiene 8 dígitos', () => {
    const r = workerCreateSchema.safeParse({
      dni: '123',
      firstName: 'Ana',
      lastName: 'Quispe',
      fechaIngreso: '2026-01-15',
      sueldoBruto: 2500,
    })
    expect(r.success).toBe(false)
  })
})

describe('workerUpdateSchema (PUT /api/workers/[id])', () => {
  it('acepta un update parcial sin inyectar otras claves (semántica `field in body`)', () => {
    const r = workerUpdateSchema.safeParse({ position: 'Gerente' })
    expect(r.success).toBe(true)
    if (r.success) {
      // CRÍTICO: el schema no debe agregar defaults; el handler usa `field in body`.
      expect(Object.keys(r.data)).toEqual(['position'])
    }
  })

  it('acepta gender en formato largo y birthDate vacío/null (lo que mandan los forms)', () => {
    expect(workerUpdateSchema.safeParse({ gender: 'MASCULINO', birthDate: '' }).success).toBe(true)
    expect(workerUpdateSchema.safeParse({ birthDate: null }).success).toBe(true)
  })

  it('rechaza un status inválido', () => {
    expect(workerUpdateSchema.safeParse({ status: 'BORRADO' }).success).toBe(false)
  })
})

describe('vacacionCreateSchema (POST /api/workers/[id]/vacaciones)', () => {
  it('acepta el body real (días como number, fechaGoce opcional)', () => {
    const r = vacacionCreateSchema.safeParse({
      periodoInicio: '2025-01-01',
      periodoFin: '2025-12-31',
      diasCorresponden: 30,
      diasGozados: 10,
    })
    expect(r.success).toBe(true)
  })

  it('rechaza diasGozados negativo (corrompía el balance)', () => {
    expect(
      vacacionCreateSchema.safeParse({
        periodoInicio: '2025-01-01',
        periodoFin: '2025-12-31',
        diasGozados: -5,
      }).success,
    ).toBe(false)
  })

  it('rechaza diasCorresponden no entero', () => {
    expect(
      vacacionCreateSchema.safeParse({
        periodoInicio: '2025-01-01',
        periodoFin: '2025-12-31',
        diasCorresponden: 12.5,
      }).success,
    ).toBe(false)
  })

  it('rechaza si faltan los períodos', () => {
    expect(vacacionCreateSchema.safeParse({ diasCorresponden: 30 }).success).toBe(false)
  })
})

describe('payslipBatchSchema (POST /api/payslips/batch)', () => {
  it('acepta el body real del cliente: solo { periodo }', () => {
    expect(payslipBatchSchema.safeParse({ periodo: '2026-04' }).success).toBe(true)
  })

  it('acepta workerIds como array de strings', () => {
    expect(payslipBatchSchema.safeParse({ periodo: '2026-04', workerIds: ['a', 'b'] }).success).toBe(true)
  })

  it('rechaza workerIds que no es array', () => {
    expect(payslipBatchSchema.safeParse({ periodo: '2026-04', workerIds: 'no-array' }).success).toBe(false)
  })

  it('rechaza un periodo con formato inválido', () => {
    expect(payslipBatchSchema.safeParse({ periodo: '2026/04' }).success).toBe(false)
  })
})
