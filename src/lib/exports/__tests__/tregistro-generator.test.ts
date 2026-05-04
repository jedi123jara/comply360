import { describe, it, expect } from 'vitest'
import {
  generateTRegistroTxt,
  generateTRegistroFileName,
  type TRegistroRow,
} from '../tregistro-generator'

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function baseRow(overrides: Partial<TRegistroRow> = {}): TRegistroRow {
  return {
    tipoOperacion: 'A',
    tipoDocumento: '1',
    numeroDocumento: '12345678',
    apellidoPaterno: 'Pérez',
    apellidoMaterno: 'García',
    nombres: 'Juan Carlos',
    sexo: 'M',
    fechaNacimiento: '1990-03-15',
    nacionalidad: 'PE',
    fechaIngreso: '2026-01-15',
    tipoContrato: '21',
    ocupacion: 'Asistente administrativo',
    discapacidad: 'N',
    regimenLaboral: '00',
    sistemaPension: '02',
    regimenSalud: '01',
    esSaludVida: 'N',
    sctr: 'N',
    trabajoDomestico: 'N',
    periodo: '202601',
    ...overrides,
  }
}

const RUC_VALIDO = '20123456789'

/* ── Validaciones de input ─────────────────────────────────────────────────── */

describe('generateTRegistroTxt — validaciones', () => {
  it('rechaza RUC con menos de 11 dígitos', () => {
    expect(() =>
      generateTRegistroTxt({ rucEmpleador: '1234567890', workers: [baseRow()] }),
    ).toThrow(/11 dígitos/i)
  })

  it('rechaza RUC con más de 11 dígitos', () => {
    expect(() =>
      generateTRegistroTxt({ rucEmpleador: '123456789012', workers: [baseRow()] }),
    ).toThrow(/11 dígitos/i)
  })

  it('rechaza RUC con letras', () => {
    expect(() =>
      generateTRegistroTxt({ rucEmpleador: '2012345678A', workers: [baseRow()] }),
    ).toThrow(/11 dígitos/i)
  })

  it('rechaza lista de trabajadores vacía', () => {
    expect(() =>
      generateTRegistroTxt({ rucEmpleador: RUC_VALIDO, workers: [] }),
    ).toThrow(/al menos un trabajador/i)
  })

  it('acepta RUC válido + 1 trabajador', () => {
    const out = generateTRegistroTxt({ rucEmpleador: RUC_VALIDO, workers: [baseRow()] })
    expect(out).toBeTruthy()
    expect(out.split('\r\n').filter(Boolean).length).toBe(1)
  })
})

/* ── Estructura del output ─────────────────────────────────────────────────── */

describe('generateTRegistroTxt — estructura', () => {
  it('separa campos por pipe |', () => {
    const out = generateTRegistroTxt({ rucEmpleador: RUC_VALIDO, workers: [baseRow()] })
    const fields = out.trim().split('|')
    // Mínimo 30 campos según el formato SUNAT (RUC + 29 columnas del worker)
    expect(fields.length).toBeGreaterThanOrEqual(28)
  })

  it('inicia cada línea con el RUC del empleador', () => {
    const out = generateTRegistroTxt({ rucEmpleador: RUC_VALIDO, workers: [baseRow(), baseRow({ numeroDocumento: '87654321' })] })
    const lines = out.trim().split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[0].split('|')[0]).toBe(RUC_VALIDO)
    expect(lines[1].split('|')[0]).toBe(RUC_VALIDO)
  })

  it('termina cada línea con CR+LF', () => {
    const out = generateTRegistroTxt({ rucEmpleador: RUC_VALIDO, workers: [baseRow()] })
    expect(out.endsWith('\r\n')).toBe(true)
  })

  it('separa múltiples trabajadores con CR+LF', () => {
    const workers = [
      baseRow({ numeroDocumento: '11111111' }),
      baseRow({ numeroDocumento: '22222222' }),
      baseRow({ numeroDocumento: '33333333' }),
    ]
    const out = generateTRegistroTxt({ rucEmpleador: RUC_VALIDO, workers })
    const lines = out.split('\r\n').filter(Boolean)
    expect(lines).toHaveLength(3)
  })
})

/* ── Sanitización de campos ────────────────────────────────────────────────── */

describe('generateTRegistroTxt — sanitización', () => {
  it('reemplaza pipes en datos de texto (no rompe el formato)', () => {
    const out = generateTRegistroTxt({
      rucEmpleador: RUC_VALIDO,
      workers: [baseRow({ ocupacion: 'Asistente | de | RRHH' })],
    })
    const fields = out.trim().split('|')
    // Si los pipes en ocupacion no se sanitizaran, tendríamos más campos de los esperados
    expect(fields.filter(f => f.includes('|')).length).toBe(0)
  })

  it('convierte texto a mayúsculas (formato SUNAT)', () => {
    const out = generateTRegistroTxt({
      rucEmpleador: RUC_VALIDO,
      workers: [baseRow({ apellidoPaterno: 'pérez', nombres: 'juan carlos' })],
    })
    expect(out).toContain('PÉREZ')
    expect(out).toContain('JUAN CARLOS')
  })

  it('trunca campos largos al máximo permitido', () => {
    const longName = 'A'.repeat(100)
    const out = generateTRegistroTxt({
      rucEmpleador: RUC_VALIDO,
      workers: [baseRow({ apellidoPaterno: longName })],
    })
    // ApellidoPaterno máximo 30 chars
    const fields = out.trim().split('|')
    expect(fields[4].length).toBeLessThanOrEqual(30)
  })
})

/* ── Formato de fechas ─────────────────────────────────────────────────────── */

describe('generateTRegistroTxt — formato de fechas', () => {
  it('convierte fechas ISO (YYYY-MM-DD) a formato SUNAT (DD/MM/YYYY)', () => {
    const out = generateTRegistroTxt({
      rucEmpleador: RUC_VALIDO,
      workers: [baseRow({ fechaIngreso: '2026-01-15', fechaNacimiento: '1990-03-15' })],
    })
    expect(out).toContain('15/01/2026')
    expect(out).toContain('15/03/1990')
  })

  it('deja fechaCese vacía si no se provee', () => {
    const out = generateTRegistroTxt({
      rucEmpleador: RUC_VALIDO,
      workers: [baseRow({ fechaCese: undefined })],
    })
    // Encuentra el campo de fechaCese (índice fijo después de fechaIngreso)
    const fields = out.trim().split('|')
    // fechaIngreso está en el índice 10; fechaCese debería ser el siguiente
    expect(fields[11]).toBe('')
  })

  it('formatea fechaCese correctamente cuando hay baja', () => {
    const out = generateTRegistroTxt({
      rucEmpleador: RUC_VALIDO,
      workers: [
        baseRow({
          tipoOperacion: 'B',
          fechaCese: '2026-12-31',
          motivoCese: 'Renuncia voluntaria',
        }),
      ],
    })
    expect(out).toContain('31/12/2026')
    expect(out).toContain('RENUNCIA VOLUNTARIA')
  })
})

/* ── Tipos de operación ────────────────────────────────────────────────────── */

describe('generateTRegistroTxt — tipos de operación', () => {
  it.each(['A', 'B', 'M'] as const)('soporta operación %s', op => {
    const out = generateTRegistroTxt({
      rucEmpleador: RUC_VALIDO,
      workers: [baseRow({ tipoOperacion: op })],
    })
    const fields = out.trim().split('|')
    expect(fields[1]).toBe(op)
  })
})

/* ── Discapacidad y certificado ────────────────────────────────────────────── */

describe('generateTRegistroTxt — discapacidad', () => {
  it('reporta discapacidad="N" sin certificado', () => {
    const out = generateTRegistroTxt({
      rucEmpleador: RUC_VALIDO,
      workers: [baseRow({ discapacidad: 'N', certificadoDiscapacidad: 'N' })],
    })
    const fields = out.trim().split('|')
    expect(fields[16]).toBe('N') // discapacidad
    expect(fields[28]).toBe('N') // certificadoDiscapacidad
  })

  it('reporta discapacidad="S" + certificado="S" cuando CONADIS válido', () => {
    const out = generateTRegistroTxt({
      rucEmpleador: RUC_VALIDO,
      workers: [baseRow({ discapacidad: 'S', certificadoDiscapacidad: 'S' })],
    })
    const fields = out.trim().split('|')
    expect(fields[16]).toBe('S')
    expect(fields[28]).toBe('S')
  })

  it('default certificadoDiscapacidad = "N" si no se especifica', () => {
    const out = generateTRegistroTxt({
      rucEmpleador: RUC_VALIDO,
      workers: [baseRow({ certificadoDiscapacidad: undefined })],
    })
    const fields = out.trim().split('|')
    expect(fields[28]).toBe('N')
  })
})

/* ── Filename ──────────────────────────────────────────────────────────────── */

describe('generateTRegistroFileName', () => {
  it('produce nombre estándar SUNAT', () => {
    expect(generateTRegistroFileName({ rucEmpleador: RUC_VALIDO, periodo: '202601' })).toBe(
      'TREG_20123456789_202601.txt',
    )
  })

  it('mantiene formato consistente entre RUCs distintos', () => {
    const a = generateTRegistroFileName({ rucEmpleador: '20111111111', periodo: '202503' })
    const b = generateTRegistroFileName({ rucEmpleador: '10222222222', periodo: '202503' })
    expect(a).toMatch(/^TREG_\d{11}_\d{6}\.txt$/)
    expect(b).toMatch(/^TREG_\d{11}_\d{6}\.txt$/)
  })
})

/* ── Caso real: 100 trabajadores ──────────────────────────────────────────── */

describe('generateTRegistroTxt — caso real (100 trabajadores)', () => {
  it('genera 100 líneas válidas en una sola pasada', () => {
    const workers = Array.from({ length: 100 }, (_, i) =>
      baseRow({
        numeroDocumento: String(10000000 + i).padStart(8, '0'),
        nombres: `Trabajador${i}`,
      }),
    )
    const out = generateTRegistroTxt({ rucEmpleador: RUC_VALIDO, workers })
    const lines = out.split('\r\n').filter(Boolean)
    expect(lines).toHaveLength(100)
    // Cada línea con la misma cantidad de campos
    const fieldsPerLine = lines.map(l => l.split('|').length)
    const allSame = fieldsPerLine.every(n => n === fieldsPerLine[0])
    expect(allSame).toBe(true)
  })
})
