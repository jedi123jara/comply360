import { describe, it, expect } from 'vitest'
import { calcularNivelRiesgo } from '../iperc-matrix'
import { NivelRiesgoIPERC } from '../../../generated/prisma/client'

/**
 * Tests del motor IPERC determinístico — matriz P × S oficial SUNAFIL
 * R.M. 050-2013-TR (Tablas 9, 11, 12).
 *
 * Cobertura:
 *   - Bordes exactos de cada clasificación (4 / 5 / 8 / 9 / 16 / 17 / 24 / 25 / 36)
 *   - esSignificativo correcto (true desde Moderado en adelante)
 *   - SLA según clasificación
 *   - Validación de inputs (errores en rangos inválidos)
 */

describe('calcularNivelRiesgo — matriz oficial SUNAFIL', () => {
  // ── Casos canónicos por clasificación ─────────────────────────────────

  it('NR=4 (mínimo posible) → TRIVIAL, no significativo, sin SLA', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 1,
      indiceProcedimiento: 1,
      indiceCapacitacion: 1,
      indiceExposicion: 1,
      indiceSeveridad: 1,
    })
    expect(r.indiceProbabilidad).toBe(4)
    expect(r.nivelRiesgo).toBe(4)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.TRIVIAL)
    expect(r.esSignificativo).toBe(false)
    expect(r.slaPlanAccionDias).toBeNull()
    expect(r.accionRecomendada).toMatch(/no se necesita adoptar ninguna acción/i)
  })

  it('NR=5 (borde inferior Tolerable, IP=5×S=1) → TOLERABLE', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 2,
      indiceProcedimiento: 1,
      indiceCapacitacion: 1,
      indiceExposicion: 1,
      indiceSeveridad: 1,
    })
    expect(r.nivelRiesgo).toBe(5)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.TOLERABLE)
    expect(r.esSignificativo).toBe(false)
    expect(r.slaPlanAccionDias).toBeNull()
  })

  it('NR=8 (borde superior Tolerable, IP=8×S=1) → TOLERABLE', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 2,
      indiceProcedimiento: 2,
      indiceCapacitacion: 2,
      indiceExposicion: 2,
      indiceSeveridad: 1,
    })
    expect(r.nivelRiesgo).toBe(8)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.TOLERABLE)
    expect(r.esSignificativo).toBe(false)
  })

  it('NR=9 (borde inferior Moderado, IP=9×S=1) → MODERADO, significativo, SLA 60 días', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3,
      indiceProcedimiento: 2,
      indiceCapacitacion: 2,
      indiceExposicion: 2,
      indiceSeveridad: 1,
    })
    expect(r.indiceProbabilidad).toBe(9)
    expect(r.nivelRiesgo).toBe(9)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.MODERADO)
    expect(r.esSignificativo).toBe(true)
    expect(r.slaPlanAccionDias).toBe(60)
    expect(r.accionRecomendada).toMatch(/esfuerzos para reducir el riesgo/i)
  })

  it('NR=16 (borde superior Moderado, IP=8×S=2) → MODERADO, SLA 60 días', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 2,
      indiceProcedimiento: 2,
      indiceCapacitacion: 2,
      indiceExposicion: 2,
      indiceSeveridad: 2,
    })
    expect(r.nivelRiesgo).toBe(16)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.MODERADO)
    expect(r.esSignificativo).toBe(true)
    expect(r.slaPlanAccionDias).toBe(60)
  })

  it('NR=17 (borde inferior Importante, IP=17? imposible — usar IP=9×S=2=18; cae en Importante)', () => {
    // IP=8 con S=2 = 16 (Moderado), IP=9 con S=2 = 18 (Importante).
    // No existe NR=17 alcanzable con IP*S de enteros 4..12 × 1..3.
    const r = calcularNivelRiesgo({
      indicePersonas: 3,
      indiceProcedimiento: 2,
      indiceCapacitacion: 2,
      indiceExposicion: 2,
      indiceSeveridad: 2,
    })
    expect(r.indiceProbabilidad).toBe(9)
    expect(r.nivelRiesgo).toBe(18)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.IMPORTANTE)
    expect(r.esSignificativo).toBe(true)
    expect(r.slaPlanAccionDias).toBe(15)
    expect(r.accionRecomendada).toMatch(/no debe comenzarse el trabajo/i)
  })

  it('NR=18 (Importante explícito, IP=9×S=2)', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3,
      indiceProcedimiento: 2,
      indiceCapacitacion: 2,
      indiceExposicion: 2,
      indiceSeveridad: 2,
    })
    expect(r.nivelRiesgo).toBe(18)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.IMPORTANTE)
    expect(r.slaPlanAccionDias).toBe(15)
  })

  it('NR=24 (borde superior Importante, IP=12×S=2 o IP=8×S=3)', () => {
    const a = calcularNivelRiesgo({
      indicePersonas: 3,
      indiceProcedimiento: 3,
      indiceCapacitacion: 3,
      indiceExposicion: 3,
      indiceSeveridad: 2,
    })
    expect(a.nivelRiesgo).toBe(24)
    expect(a.clasificacion).toBe(NivelRiesgoIPERC.IMPORTANTE)

    const b = calcularNivelRiesgo({
      indicePersonas: 2,
      indiceProcedimiento: 2,
      indiceCapacitacion: 2,
      indiceExposicion: 2,
      indiceSeveridad: 3,
    })
    expect(b.nivelRiesgo).toBe(24)
    expect(b.clasificacion).toBe(NivelRiesgoIPERC.IMPORTANTE)
  })

  it('NR=25 (borde inferior Intolerable, IP=9×S~? — nearest IP=9×S=3=27, IP=12×S=3=36)', () => {
    // El borde 25 no es alcanzable con IP×S enteros (9×3=27 es el mínimo Intolerable real).
    const r = calcularNivelRiesgo({
      indicePersonas: 3,
      indiceProcedimiento: 2,
      indiceCapacitacion: 2,
      indiceExposicion: 2,
      indiceSeveridad: 3,
    })
    expect(r.indiceProbabilidad).toBe(9)
    expect(r.nivelRiesgo).toBe(27)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.INTOLERABLE)
    expect(r.esSignificativo).toBe(true)
    expect(r.slaPlanAccionDias).toBe(0)
    expect(r.accionRecomendada).toMatch(/no se debe comenzar ni continuar/i)
  })

  it('NR=36 (máximo posible, IP=12×S=3) → INTOLERABLE', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3,
      indiceProcedimiento: 3,
      indiceCapacitacion: 3,
      indiceExposicion: 3,
      indiceSeveridad: 3,
    })
    expect(r.indiceProbabilidad).toBe(12)
    expect(r.nivelRiesgo).toBe(36)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.INTOLERABLE)
    expect(r.esSignificativo).toBe(true)
    expect(r.slaPlanAccionDias).toBe(0)
  })

  // ── Cálculo de probabilidad IP = A+B+C+D ─────────────────────────────

  it('IP = suma de los 4 índices de probabilidad (todos en 1)', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 1,
      indiceProcedimiento: 1,
      indiceCapacitacion: 1,
      indiceExposicion: 1,
      indiceSeveridad: 1,
    })
    expect(r.indiceProbabilidad).toBe(4)
  })

  it('IP = 12 cuando todos los índices de probabilidad están en 3', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3,
      indiceProcedimiento: 3,
      indiceCapacitacion: 3,
      indiceExposicion: 3,
      indiceSeveridad: 1,
    })
    expect(r.indiceProbabilidad).toBe(12)
  })

  it('IP intermedio (2+1+3+1=7)', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 2,
      indiceProcedimiento: 1,
      indiceCapacitacion: 3,
      indiceExposicion: 1,
      indiceSeveridad: 2,
    })
    expect(r.indiceProbabilidad).toBe(7)
    expect(r.nivelRiesgo).toBe(14)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.MODERADO)
  })

  // ── esSignificativo ───────────────────────────────────────────────────

  it('Trivial NO es significativo', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 1, indiceProcedimiento: 1, indiceCapacitacion: 1,
      indiceExposicion: 1, indiceSeveridad: 1,
    })
    expect(r.esSignificativo).toBe(false)
  })

  it('Tolerable NO es significativo', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 2, indiceProcedimiento: 1, indiceCapacitacion: 1,
      indiceExposicion: 1, indiceSeveridad: 1,
    })
    expect(r.esSignificativo).toBe(false)
  })

  it('Moderado SÍ es significativo', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3, indiceProcedimiento: 2, indiceCapacitacion: 2,
      indiceExposicion: 2, indiceSeveridad: 1,
    })
    expect(r.esSignificativo).toBe(true)
  })

  it('Importante SÍ es significativo', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3, indiceProcedimiento: 2, indiceCapacitacion: 2,
      indiceExposicion: 2, indiceSeveridad: 2,
    })
    expect(r.esSignificativo).toBe(true)
  })

  it('Intolerable SÍ es significativo', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3, indiceProcedimiento: 3, indiceCapacitacion: 3,
      indiceExposicion: 3, indiceSeveridad: 3,
    })
    expect(r.esSignificativo).toBe(true)
  })

  // ── SLAs por clasificación ───────────────────────────────────────────

  it('SLA Trivial = null (acción opcional)', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 1, indiceProcedimiento: 1, indiceCapacitacion: 1,
      indiceExposicion: 1, indiceSeveridad: 1,
    })
    expect(r.slaPlanAccionDias).toBeNull()
  })

  it('SLA Tolerable = null (acción opcional)', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 2, indiceProcedimiento: 2, indiceCapacitacion: 1,
      indiceExposicion: 1, indiceSeveridad: 1,
    })
    expect(r.slaPlanAccionDias).toBeNull()
  })

  it('SLA Moderado = 60 días', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3, indiceProcedimiento: 2, indiceCapacitacion: 2,
      indiceExposicion: 2, indiceSeveridad: 1,
    })
    expect(r.slaPlanAccionDias).toBe(60)
  })

  it('SLA Importante = 15 días', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3, indiceProcedimiento: 2, indiceCapacitacion: 2,
      indiceExposicion: 2, indiceSeveridad: 2,
    })
    expect(r.slaPlanAccionDias).toBe(15)
  })

  it('SLA Intolerable = 0 (alerta inmediata)', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3, indiceProcedimiento: 3, indiceCapacitacion: 3,
      indiceExposicion: 3, indiceSeveridad: 3,
    })
    expect(r.slaPlanAccionDias).toBe(0)
  })

  // ── Determinismo: mismas entradas → misma salida ─────────────────────

  it('Mismas entradas siempre dan la misma salida (determinístico)', () => {
    const inputs = {
      indicePersonas: 2,
      indiceProcedimiento: 3,
      indiceCapacitacion: 2,
      indiceExposicion: 1,
      indiceSeveridad: 2,
    }
    const a = calcularNivelRiesgo(inputs)
    const b = calcularNivelRiesgo(inputs)
    const c = calcularNivelRiesgo(inputs)
    expect(a).toEqual(b)
    expect(b).toEqual(c)
  })

  // ── Validación de inputs ─────────────────────────────────────────────

  it('Lanza error si indicePersonas < 1', () => {
    expect(() =>
      calcularNivelRiesgo({
        indicePersonas: 0,
        indiceProcedimiento: 1,
        indiceCapacitacion: 1,
        indiceExposicion: 1,
        indiceSeveridad: 1,
      }),
    ).toThrow(/indicePersonas/)
  })

  it('Lanza error si indicePersonas > 3', () => {
    expect(() =>
      calcularNivelRiesgo({
        indicePersonas: 4,
        indiceProcedimiento: 1,
        indiceCapacitacion: 1,
        indiceExposicion: 1,
        indiceSeveridad: 1,
      }),
    ).toThrow(/indicePersonas/)
  })

  it('Lanza error si indiceProcedimiento fuera de rango', () => {
    expect(() =>
      calcularNivelRiesgo({
        indicePersonas: 1,
        indiceProcedimiento: 5,
        indiceCapacitacion: 1,
        indiceExposicion: 1,
        indiceSeveridad: 1,
      }),
    ).toThrow(/indiceProcedimiento/)
  })

  it('Lanza error si indiceCapacitacion fuera de rango', () => {
    expect(() =>
      calcularNivelRiesgo({
        indicePersonas: 1,
        indiceProcedimiento: 1,
        indiceCapacitacion: 0,
        indiceExposicion: 1,
        indiceSeveridad: 1,
      }),
    ).toThrow(/indiceCapacitacion/)
  })

  it('Lanza error si indiceExposicion fuera de rango', () => {
    expect(() =>
      calcularNivelRiesgo({
        indicePersonas: 1,
        indiceProcedimiento: 1,
        indiceCapacitacion: 1,
        indiceExposicion: 99,
        indiceSeveridad: 1,
      }),
    ).toThrow(/indiceExposicion/)
  })

  it('Lanza error si indiceSeveridad fuera de rango', () => {
    expect(() =>
      calcularNivelRiesgo({
        indicePersonas: 1,
        indiceProcedimiento: 1,
        indiceCapacitacion: 1,
        indiceExposicion: 1,
        indiceSeveridad: 4,
      }),
    ).toThrow(/indiceSeveridad/)
  })

  it('Lanza error si algún índice no es entero', () => {
    expect(() =>
      calcularNivelRiesgo({
        indicePersonas: 1.5,
        indiceProcedimiento: 1,
        indiceCapacitacion: 1,
        indiceExposicion: 1,
        indiceSeveridad: 1,
      }),
    ).toThrow(/indicePersonas/)
  })

  // ── Cobertura de combinaciones representativas ───────────────────────

  it('caso real: oficina con peligro psicosocial (NR=10, Moderado)', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 2,        // 4-12 trabajadores
      indiceProcedimiento: 2,   // procedimientos parciales
      indiceCapacitacion: 3,    // sin entrenamiento en estrés
      indiceExposicion: 3,      // permanente
      indiceSeveridad: 1,       // ligeramente dañino (TME reversibles)
    })
    expect(r.indiceProbabilidad).toBe(10)
    expect(r.nivelRiesgo).toBe(10)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.MODERADO)
    expect(r.esSignificativo).toBe(true)
  })

  it('caso real: trabajo en altura sin EPP (NR=33, Intolerable)', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3,        // >12 trabajadores
      indiceProcedimiento: 3,   // sin procedimientos
      indiceCapacitacion: 3,    // no entrenado
      indiceExposicion: 2,      // eventual
      indiceSeveridad: 3,       // extremadamente dañino (caída → muerte)
    })
    expect(r.indiceProbabilidad).toBe(11)
    expect(r.nivelRiesgo).toBe(33)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.INTOLERABLE)
    expect(r.esSignificativo).toBe(true)
    expect(r.slaPlanAccionDias).toBe(0)
  })

  it('caso real: ruido oficina (NR=6, Tolerable)', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 2,
      indiceProcedimiento: 1,
      indiceCapacitacion: 1,
      indiceExposicion: 2,
      indiceSeveridad: 1,
    })
    expect(r.nivelRiesgo).toBe(6)
    expect(r.clasificacion).toBe(NivelRiesgoIPERC.TOLERABLE)
  })

  it('texto de acción recomendada cita literal Tabla 11 (Trivial)', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 1, indiceProcedimiento: 1, indiceCapacitacion: 1,
      indiceExposicion: 1, indiceSeveridad: 1,
    })
    expect(r.accionRecomendada).toContain('No se necesita adoptar ninguna acción')
  })

  it('texto de acción recomendada cita literal Tabla 11 (Importante)', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3, indiceProcedimiento: 2, indiceCapacitacion: 2,
      indiceExposicion: 2, indiceSeveridad: 2,
    })
    expect(r.accionRecomendada).toContain('No debe comenzarse el trabajo')
  })

  it('texto de acción recomendada cita literal Tabla 11 (Intolerable)', () => {
    const r = calcularNivelRiesgo({
      indicePersonas: 3, indiceProcedimiento: 3, indiceCapacitacion: 3,
      indiceExposicion: 3, indiceSeveridad: 3,
    })
    expect(r.accionRecomendada).toContain('No se debe comenzar ni continuar')
  })

  // ── Determinismo en sweep completo ────────────────────────────────────

  it('barrido exhaustivo: todos los 3^5 = 243 inputs producen NR válido en [4, 36]', () => {
    let count = 0
    for (let a = 1; a <= 3; a++) {
      for (let b = 1; b <= 3; b++) {
        for (let c = 1; c <= 3; c++) {
          for (let d = 1; d <= 3; d++) {
            for (let s = 1; s <= 3; s++) {
              const r = calcularNivelRiesgo({
                indicePersonas: a,
                indiceProcedimiento: b,
                indiceCapacitacion: c,
                indiceExposicion: d,
                indiceSeveridad: s,
              })
              expect(r.nivelRiesgo).toBeGreaterThanOrEqual(4)
              expect(r.nivelRiesgo).toBeLessThanOrEqual(36)
              expect(r.indiceProbabilidad).toBe(a + b + c + d)
              expect(r.nivelRiesgo).toBe(r.indiceProbabilidad * s)
              count++
            }
          }
        }
      }
    }
    expect(count).toBe(243)
  })
})
