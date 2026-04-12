import { describe, it, expect } from 'vitest'
import { splitContracts } from '../contract-splitter'

describe('splitContracts', () => {
  it('devuelve un único bloque cuando el texto es corto', () => {
    const out = splitContracts('Texto muy corto')
    expect(out).toHaveLength(1)
    expect(out[0].index).toBe(1)
  })

  it('devuelve un único bloque cuando hay un solo contrato', () => {
    const text =
      'CONTRATO DE TRABAJO INDIVIDUAL\n' +
      'Conste por el presente documento el contrato de trabajo entre la empresa ' +
      'ACME SAC y el trabajador Juan Pérez García identificado con DNI 12345678, ' +
      'que se regirá por las siguientes cláusulas...\n'.repeat(20)
    const out = splitContracts(text)
    expect(out).toHaveLength(1)
  })

  it('detecta dos contratos consecutivos en el mismo documento', () => {
    const block1 =
      'CONTRATO DE TRABAJO N° 001-2026\n' +
      'Conste por el presente documento que ACME SAC contrata a Juan Pérez ' +
      'identificado con DNI 11111111, en el cargo de Analista de Marketing. ' +
      'La remuneración será de S/3000 mensuales.\n'.repeat(8)
    const block2 =
      'CONTRATO DE TRABAJO N° 002-2026\n' +
      'Conste por el presente documento que ACME SAC contrata a María García ' +
      'identificada con DNI 22222222, en el cargo de Diseñadora. ' +
      'La remuneración será de S/2500 mensuales.\n'.repeat(8)
    const out = splitContracts(block1 + '\n\n' + block2)
    expect(out.length).toBeGreaterThanOrEqual(2)
    expect(out[0].text).toContain('11111111')
    expect(out[1].text).toContain('22222222')
  })

  it('reconoce variantes (locación, prácticas)', () => {
    const filler = (label: string) =>
      `${label}\n` +
      'En la ciudad de Lima, a los días del mes de abril de 2026, comparecen las partes ' +
      'para suscribir el presente documento bajo las cláusulas que se detallan a continuación. ' +
      'Primera: objeto. Segunda: contraprestación. Tercera: vigencia. Cuarta: obligaciones. ' +
      'Quinta: confidencialidad. Sexta: jurisdicción. Sétima: domicilio. ' +
      'Las partes declaran conocer y aceptar todas las cláusulas precedentes en señal de conformidad.\n\n'
    const text =
      filler('CONTRATO DE LOCACIÓN DE SERVICIOS') +
      filler('CONVENIO DE PRÁCTICAS PROFESIONALES')
    const out = splitContracts(text)
    expect(out.length).toBeGreaterThanOrEqual(2)
  })
})
