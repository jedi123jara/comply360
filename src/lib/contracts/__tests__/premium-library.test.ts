import { describe, expect, it } from 'vitest'
import {
  buildPremiumContractDocument,
  renderPremiumContractHtml,
  withPremiumContractDocument,
} from '../premium-library'
import { renderContract } from '../rendering'

const formData = {
  empleador_razon_social: 'Empresa SAC',
  empleador_ruc: '20123456789',
  trabajador_nombre: 'Ana Perez',
  trabajador_dni: '12345678',
  cargo: 'Analista Legal',
  remuneracion_mensual: '4500',
  fecha_inicio: '2026-05-01',
  jornada_semanal: '48 horas semanales',
  horario_trabajo: 'Lunes a viernes de 09:00 a 18:00',
}

describe('premium contract library', () => {
  it('construye documento canónico premium para contrato laboral peruano', () => {
    const document = buildPremiumContractDocument({
      contractType: 'LABORAL_INDEFINIDO',
      title: 'Contrato premium',
      formData,
    })

    expect(document?.documentKind).toBe('CONTRACT')
    expect(document?.jurisdiction).toBe('PE')
    expect(document?.clauses.length).toBeGreaterThanOrEqual(12)
    expect(document?.legalBasis).toContain('Ley 29783')
    expect(document?.annexes.map((item) => item.title)).toContain('Política de Seguridad y Salud en el Trabajo')
  })

  it('renderiza HTML premium con cláusulas, base legal y anexos', () => {
    const document = buildPremiumContractDocument({
      contractType: 'LABORAL_INDEFINIDO',
      title: 'Contrato premium',
      formData,
    })
    expect(document).not.toBeNull()

    const html = renderPremiumContractHtml(document!)
    expect(html).toContain('DOCUMENTO LEGAL | PE')
    expect(html).toContain('Analista Legal')
    expect(html).toContain('Base legal:')
    expect(html).toContain('Anexos integrantes')
    expect(html).toContain('Matriz de protección legal')
    expect(html).toContain('Cláusulas críticas')
    expect(html).toContain('Anexos obligatorios')
  })

  it('prioriza premiumDocument sobre borrador IA al renderizar', () => {
    const premiumDocument = buildPremiumContractDocument({
      contractType: 'LABORAL_INDEFINIDO',
      title: 'Contrato IA controlado',
      formData,
    })
    const contentJson = withPremiumContractDocument({
      generadoPor: 'openai',
      clausulas: [{ titulo: 'IA', contenido: 'Texto libre de IA no canónico.' }],
    }, premiumDocument)

    const rendered = renderContract({
      title: 'Contrato IA controlado',
      contractType: 'LABORAL_INDEFINIDO',
      sourceKind: 'ai-draft-based',
      contentJson,
      formData,
    })

    expect(rendered.renderedHtml).toContain('DOCUMENTO LEGAL | PE')
    expect(rendered.renderedHtml).toContain('Analista Legal')
    expect(rendered.renderedHtml).not.toContain('Texto libre de IA no canónico.')
  })
})
