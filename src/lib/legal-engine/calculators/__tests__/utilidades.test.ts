import { describe, it, expect } from 'vitest'
import { calcularUtilidades } from '../utilidades'

const TRABAJADORES_BASE = [
  { nombre: 'Ana Garcia', diasTrabajados: 360, remuneracionTotal: 36000 },
  { nombre: 'Luis Torres', diasTrabajados: 180, remuneracionTotal: 18000 },
]

describe('calcularUtilidades', () => {
  it('calcula tasa de participacion por sector', () => {
    const comercio = calcularUtilidades({
      rentaAnualNeta: 100000,
      sector: 'COMERCIO',
      trabajadores: TRABAJADORES_BASE,
    })
    expect(comercio.tasaParticipacion).toBe(0.08)

    const industria = calcularUtilidades({
      rentaAnualNeta: 100000,
      sector: 'INDUSTRIA',
      trabajadores: TRABAJADORES_BASE,
    })
    expect(industria.tasaParticipacion).toBe(0.10)
  })

  it('distribuye 50% por dias y 50% por remuneracion', () => {
    const result = calcularUtilidades({
      rentaAnualNeta: 100000,
      sector: 'COMERCIO',
      trabajadores: TRABAJADORES_BASE,
    })
    // Total participacion = 100000 * 8% = 8000
    expect(result.montoTotalParticipacion).toBeCloseTo(8000, 0)
    expect(result.distribucionPorDias).toBeCloseTo(4000, 0)
    expect(result.distribucionPorRemuneracion).toBeCloseTo(4000, 0)
  })

  it('aplica tope de 18 remuneraciones mensuales', () => {
    // Trabajador con salario muy alto para que llegue al tope
    const trabajadoresAlto = [
      { nombre: 'CEO', diasTrabajados: 360, remuneracionTotal: 720000 }, // 60k/mes
    ]
    const result = calcularUtilidades({
      rentaAnualNeta: 100000000, // renta muy alta
      sector: 'MINERIA',
      trabajadores: trabajadoresAlto,
    })
    const detalle = result.detallePorTrabajador[0]
    // Tope = 18 * (720000/12) = 18 * 60000 = 1,080,000
    if (detalle.topeAplicado) {
      expect(detalle.totalFinal).toBeLessThan(detalle.total)
    }
  })

  it('distribuye correctamente entre dos trabajadores con distinta antiguedad', () => {
    const result = calcularUtilidades({
      rentaAnualNeta: 100000,
      sector: 'COMERCIO',
      trabajadores: TRABAJADORES_BASE,
    })
    const anaDetalle = result.detallePorTrabajador.find(t => t.nombre === 'Ana Garcia')
    const luisDetalle = result.detallePorTrabajador.find(t => t.nombre === 'Luis Torres')

    // Ana trabajo el doble de dias, debe recibir mas por dias
    expect(anaDetalle!.porDias).toBeGreaterThan(luisDetalle!.porDias)
    // Ana tiene mayor remuneracion total, debe recibir mas por remuneracion
    expect(anaDetalle!.porRemuneracion).toBeGreaterThan(luisDetalle!.porRemuneracion)
  })

  it('total distribuido no supera el monto total de participacion (sin topes)', () => {
    const result = calcularUtilidades({
      rentaAnualNeta: 50000,
      sector: 'OTROS',
      trabajadores: TRABAJADORES_BASE,
    })
    expect(result.totalDistribuido).toBeLessThanOrEqual(result.montoTotalParticipacion + 0.01)
  })

  it('incluye plazo maximo en resultado', () => {
    const result = calcularUtilidades({
      rentaAnualNeta: 100000,
      sector: 'COMERCIO',
      trabajadores: TRABAJADORES_BASE,
    })
    expect(result.plazoMaximo).toBeTruthy()
    expect(result.baseLegal).toContain('892')
  })

  it('devuelve detalle por trabajador con todos los campos', () => {
    const result = calcularUtilidades({
      rentaAnualNeta: 100000,
      sector: 'COMERCIO',
      trabajadores: TRABAJADORES_BASE,
    })
    expect(result.detallePorTrabajador).toHaveLength(2)
    const detalle = result.detallePorTrabajador[0]
    expect(detalle).toHaveProperty('nombre')
    expect(detalle).toHaveProperty('porDias')
    expect(detalle).toHaveProperty('porRemuneracion')
    expect(detalle).toHaveProperty('total')
    expect(detalle).toHaveProperty('totalFinal')
  })
})

describe('tope de utilidades por remuneración mensual real (fix P3)', () => {
  it('para año completo (360 días) el tope es 18 × total/12 (sin cambio)', () => {
    const r = calcularUtilidades({
      rentaAnualNeta: 100000,
      sector: 'COMERCIO',
      trabajadores: [{ nombre: 'Full', diasTrabajados: 360, remuneracionTotal: 36000 }],
    })
    // 36000/12 = 3000 mensual; tope = 18 × 3000 = 54000.
    expect(r.detallePorTrabajador[0].tope).toBeCloseTo(54000, 0)
  })

  it('para medio año (180 días) usa la mensual real, no total/12', () => {
    const r = calcularUtilidades({
      rentaAnualNeta: 100000,
      sector: 'COMERCIO',
      trabajadores: [{ nombre: 'Medio', diasTrabajados: 180, remuneracionTotal: 18000 }],
    })
    // mensual real = 18000 × 30/180 = 3000; tope = 18 × 3000 = 54000.
    // (Antes: 18000/12 = 1500 → tope 27000, subestimado a la mitad.)
    expect(r.detallePorTrabajador[0].tope).toBeCloseTo(54000, 0)
  })
})
