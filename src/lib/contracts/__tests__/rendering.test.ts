import { describe, expect, it } from 'vitest'
import {
  renderContract,
  withContractProvenanceFormData,
  withContractRenderMetadata,
} from '../rendering'

describe('renderContract', () => {
  it('marca generación IA fallback como procedencia explícita', () => {
    const rendered = renderContract({
      title: 'Contrato IA',
      contractType: 'LABORAL_INDEFINIDO',
      sourceKind: 'ai-draft-based',
      contentJson: {
        generadoPor: 'simulated',
        clausulas: [{ titulo: 'Primera', contenido: 'Contenido generado por fallback.' }],
      },
    })

    expect(rendered.renderedHtml).toContain('Contenido generado por fallback.')
    expect(rendered.renderMetadata.provenance).toBe('AI_FALLBACK')
    expect(rendered.renderMetadata.generationMode).toBe('fallback')
    expect(rendered.renderMetadata.isFallback).toBe(true)
    expect(rendered.renderMetadata.renderVersion).toBe('contract-render-v1')
  })

  it('conserva placeholders no resueltos como metadata auditable', () => {
    const rendered = renderContract({
      title: 'Contrato base',
      contractType: 'LABORAL_INDEFINIDO',
      sourceKind: 'html-based',
      contentHtml: '<article>Hola {{trabajador_nombre}}</article>',
    })

    expect(rendered.renderMetadata.provenance).toBe('LEGACY')
    expect(rendered.renderMetadata.unresolvedPlaceholders).toEqual(['trabajador_nombre'])
  })
})

describe('contract render metadata helpers', () => {
  it('inyectan procedencia en contentJson y formData sin perder datos existentes', () => {
    const rendered = renderContract({
      title: 'Contrato masivo',
      contractType: 'LABORAL_PLAZO_FIJO',
      sourceKind: 'bulk-row-based',
      formData: { trabajador_nombre: 'Ana Perez' },
    })

    expect(withContractRenderMetadata({ foo: 'bar' }, rendered.renderMetadata)).toMatchObject({
      foo: 'bar',
      provenance: 'BULK_GENERATED',
      generationMode: 'deterministic',
      renderVersion: 'contract-render-v1',
      isFallback: false,
    })
    expect(withContractProvenanceFormData(
      { trabajador_nombre: 'Ana Perez' },
      rendered.renderMetadata,
    )).toMatchObject({
      trabajador_nombre: 'Ana Perez',
      _provenance: 'BULK_GENERATED',
      _generationMode: 'deterministic',
      _renderVersion: 'contract-render-v1',
      _isFallback: false,
    })
  })
})
