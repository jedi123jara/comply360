import { describe, it, expect } from 'vitest'
import {
  generatePlameTxt,
  generatePlameFileName,
  type PlameWorkerRow,
} from '../plame-generator'

const sampleWorker: PlameWorkerRow = {
  tipoDocumento: '1',
  numeroDocumento: '12345678',
  apellidoPaterno: 'Pérez',
  apellidoMaterno: 'García',
  nombres: 'Juan Carlos',
  sexo: 'M',
  fechaNacimiento: '1990-05-15',
  fechaIngreso: '2024-01-01',
  tipoTrabajador: '21',
  regimenPensionario: '2',
  cuspp: '123456789012',
  regimenSalud: '01',
  remuneracionBruta: 3000,
  diasLaborados: 30,
  diasNoLaborados: 0,
  diasSubsidiados: 0,
  periodo: '202604',
}

describe('PLAME generator', () => {
  it('genera línea con todos los campos separados por pipe', () => {
    const txt = generatePlameTxt({
      rucEmpleador: '20123456789',
      periodo: '202604',
      workers: [sampleWorker],
    })
    const fields = txt.trim().split('|')
    expect(fields.length).toBe(22)
    expect(fields[0]).toBe('20123456789')
    expect(fields[1]).toBe('202604')
    expect(fields[3]).toBe('12345678')
    expect(fields[15]).toBe('3000.00') // remuneración bruta
  })

  it('formatea fechas en DD/MM/YYYY', () => {
    const txt = generatePlameTxt({
      rucEmpleador: '20123456789',
      periodo: '202604',
      workers: [sampleWorker],
    })
    expect(txt).toContain('15/05/1990')
    expect(txt).toContain('01/01/2024')
  })

  it('rechaza RUC inválido', () => {
    expect(() =>
      generatePlameTxt({
        rucEmpleador: '123',
        periodo: '202604',
        workers: [sampleWorker],
      })
    ).toThrow(/RUC/)
  })

  it('rechaza periodo inválido', () => {
    expect(() =>
      generatePlameTxt({
        rucEmpleador: '20123456789',
        periodo: '2026-04',
        workers: [sampleWorker],
      })
    ).toThrow(/[Pp]er[íi]odo/)
  })

  it('rechaza lista vacía', () => {
    expect(() =>
      generatePlameTxt({
        rucEmpleador: '20123456789',
        periodo: '202604',
        workers: [],
      })
    ).toThrow()
  })

  it('genera nombre de archivo correcto', () => {
    const name = generatePlameFileName({ rucEmpleador: '20123456789', periodo: '202604' })
    expect(name).toBe('0601_20123456789_202604.txt')
  })

  it('escapa pipes dentro de campos para no romper la estructura', () => {
    const w = { ...sampleWorker, nombres: 'Juan|Carlos' }
    const txt = generatePlameTxt({
      rucEmpleador: '20123456789',
      periodo: '202604',
      workers: [w],
    })
    const fields = txt.trim().split('|')
    expect(fields.length).toBe(22)
  })

  it('soporta múltiples trabajadores en líneas separadas por CRLF', () => {
    const w2 = { ...sampleWorker, numeroDocumento: '87654321' }
    const txt = generatePlameTxt({
      rucEmpleador: '20123456789',
      periodo: '202604',
      workers: [sampleWorker, w2],
    })
    const lines = txt.trim().split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('12345678')
    expect(lines[1]).toContain('87654321')
  })
})
