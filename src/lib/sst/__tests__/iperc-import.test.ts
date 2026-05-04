/**
 * Tests del parser de filas IPERC desde Excel.
 *
 * Cubre:
 *   - Aliases de columnas en español/inglés/abreviado
 *   - Validación de los 5 índices (1..3)
 *   - Filas vacías → skipped (no error)
 *   - Filas parcialmente vacías → errores por campo faltante
 *   - Controles separados por ; \n |
 *   - Plazo cierre en yyyy-mm-dd y como número serial Excel
 *   - Columnas extra ignoradas
 */

import { describe, it, expect } from 'vitest'
import { parseIpercRows } from '../iperc-import'

describe('parseIpercRows — feliz path', () => {
  it('parsea una fila válida con todos los campos', () => {
    const result = parseIpercRows([
      {
        Proceso: 'Producción',
        Actividad: 'Operación maquinaria',
        Tarea: 'Manejo de montacargas',
        Peligro: 'Atropello',
        Riesgo: 'Lesiones graves',
        'A (Personas)': 2,
        'B (Procedimiento)': 2,
        'C (Capacitación)': 1,
        'D (Exposición)': 3,
        'S (Severidad)': 3,
        'Controles actuales': 'Señalización; Velocidad limitada',
        'Eliminación': '',
        'Sustitución': '',
        'Ingeniería': 'Carriles separados',
        'Administrativo': 'Capacitación; Supervisor',
        'EPP': 'Chaleco; Casco',
        'Responsable': 'Jefe Almacén',
        'Plazo cierre': '2026-09-30',
      },
    ])

    expect(result.errors).toEqual([])
    expect(result.skipped).toBe(0)
    expect(result.rows).toHaveLength(1)
    const row = result.rows[0]
    expect(row.proceso).toBe('Producción')
    expect(row.peligroNombre).toBe('Atropello')
    expect(row.indicePersonas).toBe(2)
    expect(row.indiceSeveridad).toBe(3)
    expect(row.controlesActuales).toEqual(['Señalización', 'Velocidad limitada'])
    expect(row.controlesPropuestos.ingenieria).toEqual(['Carriles separados'])
    expect(row.controlesPropuestos.administrativo).toEqual(['Capacitación', 'Supervisor'])
    expect(row.controlesPropuestos.epp).toEqual(['Chaleco', 'Casco'])
    expect(row.responsable).toBe('Jefe Almacén')
    expect(row.plazoCierre).toBe('2026-09-30')
  })

  it('acepta aliases A/B/C/D/S sin paréntesis', () => {
    const result = parseIpercRows([
      {
        proceso: 'Mantenimiento',
        actividad: 'Trabajo en altura',
        tarea: 'Reparación de techo',
        riesgo: 'Caída de altura',
        A: 1,
        B: 1,
        C: 1,
        D: 1,
        S: 3,
      },
    ])
    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(1)
  })

  it('acepta nombres de columna case-insensitive y con tildes', () => {
    const result = parseIpercRows([
      {
        PROCESO: 'pp',
        actividad: 'aa',
        TAREA: 'tt',
        riesgo: 'rr',
        Personas: 2,
        Procedimiento: 2,
        Capacitación: 2,
        Exposición: 2,
        Severidad: 2,
      },
    ])
    expect(result.rows).toHaveLength(1)
    expect(result.errors).toEqual([])
  })
})

describe('parseIpercRows — validación', () => {
  it('rechaza índices fuera de 1..3', () => {
    const result = parseIpercRows([
      {
        proceso: 'pp',
        actividad: 'aa',
        tarea: 'tt',
        riesgo: 'rr',
        a: 4,
        b: 2,
        c: 2,
        d: 2,
        s: 2,
      },
    ])
    expect(result.rows).toHaveLength(0)
    expect(result.errors.some((e) => e.field === 'indicePersonas')).toBe(true)
  })

  it('rechaza índices no enteros', () => {
    const result = parseIpercRows([
      {
        proceso: 'pp',
        actividad: 'aa',
        tarea: 'tt',
        riesgo: 'rr',
        a: 2.5,
        b: 2,
        c: 2,
        d: 2,
        s: 2,
      },
    ])
    expect(result.rows).toHaveLength(0)
    expect(result.errors.some((e) => e.field === 'indicePersonas')).toBe(true)
  })

  it('rechaza filas con campos requeridos vacíos', () => {
    const result = parseIpercRows([
      {
        proceso: '',
        actividad: 'a',
        tarea: 't',
        riesgo: 'r',
        a: 2,
        b: 2,
        c: 2,
        d: 2,
        s: 2,
      },
    ])
    expect(result.rows).toHaveLength(0)
    expect(result.errors.some((e) => e.field === 'proceso')).toBe(true)
  })

  it('rechaza plazoCierre con formato inválido', () => {
    const result = parseIpercRows([
      {
        proceso: 'pp',
        actividad: 'aa',
        tarea: 'tt',
        riesgo: 'rr',
        a: 2,
        b: 2,
        c: 2,
        d: 2,
        s: 2,
        plazo: '30/09/2026', // formato dd/mm/yyyy NO aceptado
      },
    ])
    expect(result.rows).toHaveLength(0)
    expect(result.errors.some((e) => e.field === 'plazoCierre')).toBe(true)
  })
})

describe('parseIpercRows — comportamiento de filas vacías', () => {
  it('cuenta filas totalmente vacías como skipped (no errores)', () => {
    const result = parseIpercRows([
      {
        proceso: 'p1',
        actividad: 'a1',
        tarea: 't1',
        riesgo: 'r1',
        a: 1,
        b: 1,
        c: 1,
        d: 1,
        s: 1,
      },
      { proceso: '', actividad: '', tarea: '', riesgo: '' }, // vacía
      {
        proceso: 'p2',
        actividad: 'a2',
        tarea: 't2',
        riesgo: 'r2',
        a: 3,
        b: 3,
        c: 3,
        d: 3,
        s: 3,
      },
    ])
    expect(result.rows).toHaveLength(2)
    expect(result.skipped).toBe(1)
    expect(result.errors).toEqual([])
  })

  it('un error en fila X no detiene las siguientes', () => {
    const result = parseIpercRows([
      { proceso: 'p1', actividad: 'a1', tarea: 't1', riesgo: 'r1', a: 1, b: 1, c: 1, d: 1, s: 1 },
      { proceso: 'p2', actividad: 'a2', tarea: 't2', riesgo: 'r2', a: 99, b: 1, c: 1, d: 1, s: 1 },
      { proceso: 'p3', actividad: 'a3', tarea: 't3', riesgo: 'r3', a: 2, b: 2, c: 2, d: 2, s: 2 },
    ])
    expect(result.rows).toHaveLength(2)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].rowIndex).toBe(1)
  })
})

describe('parseIpercRows — controles', () => {
  it('separa controles actuales por ;', () => {
    const result = parseIpercRows([
      {
        proceso: 'pp',
        actividad: 'aa',
        tarea: 'tt',
        riesgo: 'rr',
        a: 1, b: 1, c: 1, d: 1, s: 1,
        'Controles actuales': 'Control A;Control B;Control C',
      },
    ])
    expect(result.rows[0].controlesActuales).toEqual(['Control A', 'Control B', 'Control C'])
  })

  it('separa controles por salto de línea', () => {
    const result = parseIpercRows([
      {
        proceso: 'pp',
        actividad: 'aa',
        tarea: 'tt',
        riesgo: 'rr',
        a: 1, b: 1, c: 1, d: 1, s: 1,
        'Controles actuales': 'Control A\nControl B',
      },
    ])
    expect(result.rows[0].controlesActuales).toEqual(['Control A', 'Control B'])
  })

  it('parsea columna combinada con prefijos [E]/[S]/[I]/[A]/[EPP]', () => {
    const result = parseIpercRows([
      {
        proceso: 'pp',
        actividad: 'aa',
        tarea: 'tt',
        riesgo: 'rr',
        a: 1, b: 1, c: 1, d: 1, s: 1,
        Controles: '[E] Eliminar peligro;[I] Guardas;[EPP] Casco',
      },
    ])
    const row = result.rows[0]
    expect(row.controlesPropuestos.eliminacion).toEqual(['Eliminar peligro'])
    expect(row.controlesPropuestos.ingenieria).toEqual(['Guardas'])
    expect(row.controlesPropuestos.epp).toEqual(['Casco'])
  })

  it('controles vacíos resultan en arrays vacíos', () => {
    const result = parseIpercRows([
      { proceso: 'pp', actividad: 'aa', tarea: 'tt', riesgo: 'rr', a: 1, b: 1, c: 1, d: 1, s: 1 },
    ])
    expect(result.rows[0].controlesActuales).toEqual([])
    expect(result.rows[0].controlesPropuestos.eliminacion).toEqual([])
  })
})

describe('parseIpercRows — plazoCierre serial Excel', () => {
  it('convierte serial Excel a yyyy-mm-dd', () => {
    // 45200 = 2023-09-29 aprox (epoch Excel 1899-12-30)
    const result = parseIpercRows([
      {
        proceso: 'pp',
        actividad: 'aa',
        tarea: 'tt',
        riesgo: 'rr',
        a: 1, b: 1, c: 1, d: 1, s: 1,
        plazo: 46295, // ~2026-09-30
      },
    ])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].plazoCierre).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('parseIpercRows — robustez', () => {
  it('ignora columnas extra desconocidas', () => {
    const result = parseIpercRows([
      {
        proceso: 'pp',
        actividad: 'aa',
        tarea: 'tt',
        riesgo: 'rr',
        a: 1, b: 1, c: 1, d: 1, s: 1,
        'Columna inventada': 'no debería romper',
        'Otra cosa': 12345,
      },
    ])
    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(1)
  })

  it('acepta input vacío sin crashear', () => {
    const result = parseIpercRows([])
    expect(result.rows).toEqual([])
    expect(result.errors).toEqual([])
    expect(result.skipped).toBe(0)
  })

  it('parsea índices que vienen como strings numéricos', () => {
    const result = parseIpercRows([
      {
        proceso: 'pp',
        actividad: 'aa',
        tarea: 'tt',
        riesgo: 'rr',
        a: '2',
        b: '2',
        c: '2',
        d: '2',
        s: '3',
      },
    ])
    expect(result.errors).toEqual([])
    expect(result.rows[0].indicePersonas).toBe(2)
    expect(result.rows[0].indiceSeveridad).toBe(3)
  })
})
