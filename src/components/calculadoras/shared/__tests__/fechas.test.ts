import { describe, expect, it } from 'vitest'
import {
  etiquetaCorteCTS,
  hoyLimaIso,
  mesesCompletosSemestreGrati,
  opcionesCorteCTS,
  opcionesGratificacion,
  periodoCTS,
  proximaGratificacion,
  proximoCorteCTS,
} from '../fechas'

// 12:00 de Lima = 17:00 UTC
const lima = (iso: string) => new Date(`${iso}T17:00:00.000Z`)

describe('proximoCorteCTS', () => {
  it('antes del 15 de mayo sugiere mayo del mismo año', () => {
    expect(proximoCorteCTS(lima('2026-03-10'))).toBe('2026-05-15')
  })

  it('el mismo 15 de mayo todavía es el depósito de mayo', () => {
    expect(proximoCorteCTS(lima('2026-05-15'))).toBe('2026-05-15')
  })

  it('después de mayo sugiere noviembre (nunca un periodo pasado)', () => {
    expect(proximoCorteCTS(lima('2026-10-05'))).toBe('2026-11-15')
  })

  it('después del 15 de noviembre pasa a mayo del año siguiente', () => {
    expect(proximoCorteCTS(lima('2026-11-16'))).toBe('2027-05-15')
  })

  it('usa la fecha de Lima en el cambio de año UTC', () => {
    // 31-dic 23:00 en Lima = 1-ene 04:00 UTC
    expect(proximoCorteCTS(new Date('2027-01-01T04:00:00.000Z'))).toBe('2027-05-15')
  })
})

describe('opcionesCorteCTS', () => {
  it('ofrece el próximo (por defecto), el siguiente y el anterior para revisar', () => {
    const ops = opcionesCorteCTS(lima('2026-10-05'))
    expect(ops.map(o => o.value)).toEqual(['2026-11-15', '2027-05-15', '2026-05-15'])
    expect(ops.map(o => o.estado)).toEqual(['proximo', 'siguiente', 'anterior'])
    expect(ops[0].label).toContain('próximo depósito')
    expect(ops[2].label).toContain('ya pasó')
  })

  it('describe el semestre que cubre cada depósito', () => {
    expect(periodoCTS('2027-05-15')).toBe('noviembre 2026 a abril 2027')
    expect(periodoCTS('2026-11-15')).toBe('mayo a octubre 2026')
    expect(etiquetaCorteCTS('2026-11-15')).toBe('15 de noviembre de 2026')
  })
})

describe('proximaGratificacion', () => {
  it('hasta el 15 de julio sugiere julio', () => {
    expect(proximaGratificacion(lima('2026-07-15'))).toEqual({ periodo: 'julio', anio: 2026 })
  })

  it('después de julio sugiere diciembre', () => {
    expect(proximaGratificacion(lima('2026-10-05'))).toEqual({ periodo: 'diciembre', anio: 2026 })
  })

  it('después del 15 de diciembre pasa a julio del año siguiente', () => {
    expect(proximaGratificacion(lima('2026-12-20'))).toEqual({ periodo: 'julio', anio: 2027 })
  })

  it('las opciones empiezan por el próximo pago', () => {
    const ops = opcionesGratificacion(lima('2026-10-05'))
    expect(ops.map(o => o.value)).toEqual(['2026-diciembre', '2027-julio', '2026-julio'])
  })
})

describe('mesesCompletosSemestreGrati', () => {
  const julio = { periodo: 'julio' as const, anio: 2026 }
  const diciembre = { periodo: 'diciembre' as const, anio: 2026 }

  it('si ingresó antes del semestre, cuenta 6 meses', () => {
    expect(mesesCompletosSemestreGrati('2020-05-10', julio)).toBe(6)
    expect(mesesCompletosSemestreGrati('2026-01-01', julio)).toBe(6)
  })

  it('el mes de ingreso no cuenta si no empezó el día 1', () => {
    expect(mesesCompletosSemestreGrati('2026-03-10', julio)).toBe(3) // abril, mayo, junio
    expect(mesesCompletosSemestreGrati('2026-03-01', julio)).toBe(4) // marzo a junio
  })

  it('semestre de diciembre: julio a diciembre', () => {
    expect(mesesCompletosSemestreGrati('2026-08-15', diciembre)).toBe(4) // set-dic
  })

  it('si ingresó después del semestre, no le corresponde', () => {
    expect(mesesCompletosSemestreGrati('2026-07-02', julio)).toBe(0)
  })

  it('fecha inválida devuelve null', () => {
    expect(mesesCompletosSemestreGrati('10/03/2026', julio)).toBeNull()
  })
})

describe('hoyLimaIso', () => {
  it('devuelve la fecha civil de Lima', () => {
    expect(hoyLimaIso(new Date('2026-10-06T03:00:00.000Z'))).toBe('2026-10-05')
  })
})
