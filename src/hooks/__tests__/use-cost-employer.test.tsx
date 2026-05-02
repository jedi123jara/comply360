// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCostEmployer } from '../use-cost-employer'

describe('useCostEmployer', () => {
  it('devuelve null cuando sueldo es muy bajo', () => {
    const { result } = renderHook(() =>
      useCostEmployer({
        sueldoBruto: 50,
        regimenLaboral: 'GENERAL',
      })
    )
    expect(result.current).toBeNull()
  })

  it('devuelve null cuando falta regimen', () => {
    const { result } = renderHook(() =>
      useCostEmployer({
        sueldoBruto: 3500,
      })
    )
    expect(result.current).toBeNull()
  })

  it('calcula costo total para sueldo + regimen GENERAL', () => {
    const { result } = renderHook(() =>
      useCostEmployer({
        sueldoBruto: 3500,
        regimenLaboral: 'GENERAL',
        asignacionFamiliar: false,
        tipoAporte: 'AFP',
        sctr: false,
        essaludVida: false,
      })
    )
    expect(result.current).not.toBeNull()
    expect(result.current!.sueldoBruto).toBe(3500)
    // EsSalud 9% = 315
    expect(result.current!.essalud).toBe(315)
    // Costo mensual debe ser > sueldo bruto
    expect(result.current!.costoMensualEmpleador).toBeGreaterThan(3500)
    // Porcentaje extra debe ser positivo
    expect(result.current!.porcentajeSobreSueldo).toBeGreaterThan(0)
  })

  it('regimen MYPE_MICRO no incluye CTS', () => {
    const { result } = renderHook(() =>
      useCostEmployer({
        sueldoBruto: 1500,
        regimenLaboral: 'MYPE_MICRO',
        tipoAporte: 'AFP',
      })
    )
    expect(result.current).not.toBeNull()
    expect(result.current!.provisionCTS).toBe(0)
  })

  it('asignacion familiar suma al sueldo bruto', () => {
    const { result: sin } = renderHook(() =>
      useCostEmployer({
        sueldoBruto: 3500,
        regimenLaboral: 'GENERAL',
        asignacionFamiliar: false,
      })
    )
    const { result: con } = renderHook(() =>
      useCostEmployer({
        sueldoBruto: 3500,
        regimenLaboral: 'GENERAL',
        asignacionFamiliar: true,
      })
    )
    // Asignacion familiar es 10% RMV, sumada al bruto eleva el costo
    expect(con.current!.remuneracionTotal).toBeGreaterThan(sin.current!.remuneracionTotal)
    expect(con.current!.costoMensualEmpleador).toBeGreaterThan(sin.current!.costoMensualEmpleador)
  })
})
