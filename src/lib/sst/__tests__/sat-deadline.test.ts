import { describe, it, expect } from 'vitest'
import { calcularPlazoSat, evaluarCountdown, formularioSatLabel } from '../sat-deadline'

describe('calcularPlazoSat — D.S. 006-2022-TR', () => {
  it('MORTAL → 24 h calendario, empleador, FORM_01', () => {
    const evento = new Date('2026-05-10T10:00:00.000Z')
    const p = calcularPlazoSat('MORTAL', evento)
    expect(p.horas).toBe(24)
    expect(p.obligadoNotificar).toBe('EMPLEADOR')
    expect(p.formularioSat).toBe('FORM_01_MORTAL')
    expect(p.deadline.getTime() - evento.getTime()).toBe(24 * 60 * 60 * 1000)
    expect(p.descripcion).toMatch(/24 horas/)
    expect(p.baseLegal).toMatch(/D\.S\. 006-2022-TR/)
  })

  it('INCIDENTE_PELIGROSO → 24 h calendario, empleador, FORM_02', () => {
    const evento = new Date('2026-05-10T10:00:00.000Z')
    const p = calcularPlazoSat('INCIDENTE_PELIGROSO', evento)
    expect(p.horas).toBe(24)
    expect(p.obligadoNotificar).toBe('EMPLEADOR')
    expect(p.formularioSat).toBe('FORM_02_INCIDENTE_PELIGROSO')
    expect(p.deadline.getTime()).toBe(evento.getTime() + 24 * 60 * 60 * 1000)
  })

  it('NO_MORTAL → último día hábil del mes siguiente, centro médico, FORM_03', () => {
    // 10 mayo 2026 → último día hábil del mes siguiente debe estar en junio 2026
    const evento = new Date('2026-05-10T10:00:00.000Z')
    const p = calcularPlazoSat('NO_MORTAL', evento)
    expect(p.obligadoNotificar).toBe('CENTRO_MEDICO')
    expect(p.formularioSat).toBe('FORM_03_NO_MORTAL')
    // 30 jun 2026 es martes → día hábil
    expect(p.deadline.getMonth()).toBe(5) // 0-indexed: junio = 5
    expect(p.deadline.getFullYear()).toBe(2026)
    const dow = p.deadline.getDay()
    expect(dow).not.toBe(0)
    expect(dow).not.toBe(6)
  })

  it('NO_MORTAL ajusta cuando último día del mes siguiente es sábado', () => {
    // Si fechaEvento = 1 de octubre 2026, mes siguiente = noviembre. 30 nov 2026 = lunes (OK).
    // Buscamos un mes cuyo último día sea sábado: enero 2026 → último día 31 ene es sábado.
    // Evento en diciembre 2025: mes siguiente es enero 2026.
    const evento = new Date('2025-12-15T10:00:00.000Z')
    const p = calcularPlazoSat('NO_MORTAL', evento)
    // 31 ene 2026 = sábado → debe retroceder a viernes 30 ene
    expect(p.deadline.getDate()).toBe(30)
    expect(p.deadline.getMonth()).toBe(0) // enero = 0
    expect(p.deadline.getDay()).toBe(5) // viernes
  })

  it('ENFERMEDAD_OCUPACIONAL → 5 días hábiles desde diagnóstico, centro médico, FORM_04', () => {
    // Lunes 11 mayo 2026 (UTC) + 5 días hábiles = lunes 18 mayo 2026
    const evento = new Date('2026-05-11T10:00:00.000Z')
    const p = calcularPlazoSat('ENFERMEDAD_OCUPACIONAL', evento)
    expect(p.obligadoNotificar).toBe('CENTRO_MEDICO')
    expect(p.formularioSat).toBe('FORM_04_ENF_OCUPACIONAL')
    // Deadline cae en día hábil (lun-vie)
    const dow = p.deadline.getDay()
    expect(dow).toBeGreaterThanOrEqual(1)
    expect(dow).toBeLessThanOrEqual(5)
  })

  it('ENFERMEDAD_OCUPACIONAL — diagnóstico viernes salta el fin de semana', () => {
    // Viernes 8 mayo 2026 + 5 días hábiles = viernes 15 mayo 2026
    const evento = new Date('2026-05-08T10:00:00.000Z')
    const p = calcularPlazoSat('ENFERMEDAD_OCUPACIONAL', evento)
    // 5 días hábiles después de viernes: lun, mar, mie, jue, vie = vie sig
    expect(p.deadline.getDate()).toBe(15)
    expect(p.deadline.getDay()).toBe(5) // viernes
  })

  it('texto del formulario es legible para UI', () => {
    expect(formularioSatLabel('FORM_01_MORTAL')).toMatch(/Mortal/)
    expect(formularioSatLabel('FORM_02_INCIDENTE_PELIGROSO')).toMatch(/Incidente/)
    expect(formularioSatLabel('FORM_03_NO_MORTAL')).toMatch(/No Mortal/)
    expect(formularioSatLabel('FORM_04_ENF_OCUPACIONAL')).toMatch(/Enfermedad/)
  })
})

describe('evaluarCountdown', () => {
  it('VENCIDO cuando deadline < now', () => {
    const now = new Date('2026-05-10T10:00:00.000Z')
    const deadline = new Date('2026-05-09T10:00:00.000Z')
    const r = evaluarCountdown(deadline, now)
    expect(r.estado).toBe('VENCIDO')
    expect(r.msRestantes).toBeLessThan(0)
    expect(r.texto).toMatch(/Vencido/)
  })

  it('CRITICO cuando ≤ 4 horas restantes', () => {
    const now = new Date('2026-05-10T10:00:00.000Z')
    const deadline = new Date('2026-05-10T13:00:00.000Z') // 3h
    const r = evaluarCountdown(deadline, now)
    expect(r.estado).toBe('CRITICO')
  })

  it('CRITICO en el borde 4 horas exactas', () => {
    const now = new Date('2026-05-10T10:00:00.000Z')
    const deadline = new Date('2026-05-10T14:00:00.000Z')
    const r = evaluarCountdown(deadline, now)
    expect(r.estado).toBe('CRITICO')
  })

  it('PROXIMO cuando entre 4 y 24 horas', () => {
    const now = new Date('2026-05-10T10:00:00.000Z')
    const deadline = new Date('2026-05-11T08:00:00.000Z') // 22h
    const r = evaluarCountdown(deadline, now)
    expect(r.estado).toBe('PROXIMO')
  })

  it('OK cuando > 24 horas', () => {
    const now = new Date('2026-05-10T10:00:00.000Z')
    const deadline = new Date('2026-05-15T10:00:00.000Z')
    const r = evaluarCountdown(deadline, now)
    expect(r.estado).toBe('OK')
    expect(r.texto).toMatch(/restantes/)
  })

  it('texto incluye días cuando deadline > 1 día', () => {
    const now = new Date('2026-05-10T10:00:00.000Z')
    const deadline = new Date('2026-05-13T10:00:00.000Z')
    const r = evaluarCountdown(deadline, now)
    expect(r.texto).toMatch(/3d/)
  })
})
