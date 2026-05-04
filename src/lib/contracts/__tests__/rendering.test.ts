import { describe, expect, it } from 'vitest'
import {
  ContractRenderError,
  renderContract,
  renderContractDocxBuffer,
  renderContractPdfBuffer,
  withContractProvenanceFormData,
  withContractRenderMetadata,
} from '../rendering'
import { buildPremiumContractDocument, withPremiumContractDocument } from '../premium-library'

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

  it('bloquea export oficial cuando hay placeholders pendientes', async () => {
    await expect(renderContractDocxBuffer({
      title: 'Contrato incompleto',
      contractType: 'LABORAL_INDEFINIDO',
      sourceKind: 'html-based',
      contentHtml: '<article><p>Hola {{trabajador_nombre}}</p></article>',
    })).rejects.toMatchObject({
      name: 'ContractRenderError',
      code: 'UNRESOLVED_PLACEHOLDERS',
      details: { unresolvedPlaceholders: ['trabajador_nombre'] },
    } satisfies Partial<ContractRenderError>)
  })

  it('permite previews no oficiales con placeholders pendientes', async () => {
    const buffer = await renderContractDocxBuffer({
      title: 'Preview incompleto',
      contractType: 'LABORAL_INDEFINIDO',
      sourceKind: 'html-based',
      contentHtml: '<article><p>Hola {{trabajador_nombre}}</p></article>',
      allowUnresolvedPlaceholders: true,
    })

    expect(buffer.byteLength).toBeGreaterThan(1000)
  })

  it('renderiza PDF y DOCX oficiales desde documento premium canónico', async () => {
    const formData = {
      empleador_razon_social: 'Empresa SAC',
      empleador_ruc: '20123456789',
      trabajador_nombre: 'Ana Perez',
      trabajador_dni: '12345678',
      cargo: 'Analista Legal',
      remuneracion: '4500',
      fecha_inicio: '2026-05-01',
      jornada: '48 horas semanales',
      horario: 'Lunes a viernes de 09:00 a 18:00',
    }
    const premiumDocument = buildPremiumContractDocument({
      contractType: 'LABORAL_INDEFINIDO',
      title: 'Contrato premium',
      formData,
    })
    const contentJson = withPremiumContractDocument({
      provenance: 'MANUAL_TEMPLATE',
      renderVersion: 'contract-render-v1',
    }, premiumDocument)

    const input = {
      title: 'Contrato premium',
      contractType: 'LABORAL_INDEFINIDO',
      sourceKind: 'template-based' as const,
      contentJson,
      formData,
      orgContext: {
        name: 'Empresa SAC',
        razonSocial: 'Empresa SAC',
        ruc: '20123456789',
      },
      workerContext: {
        fullName: 'Ana Perez',
        dni: '12345678',
        fechaIngreso: '2026-05-01',
      },
    }

    const [pdf, docx] = await Promise.all([
      renderContractPdfBuffer(input),
      renderContractDocxBuffer(input),
    ])

    expect(pdf.byteLength).toBeGreaterThan(1000)
    expect(docx.byteLength).toBeGreaterThan(1000)
  })

  it('bloquea export oficial con marcadores visuales de campos incompletos', async () => {
    await expect(renderContractDocxBuffer({
      title: 'Contrato con marcador',
      contractType: 'LABORAL_INDEFINIDO',
      sourceKind: 'html-based',
      contentHtml: '<article><p>Domicilio: ____________________ [Por completar] ____________________</p></article>',
    })).rejects.toMatchObject({
      name: 'ContractRenderError',
      code: 'INCOMPLETE_OFFICIAL_RENDER',
      details: { incompleteMarkers: ['Por completar'] },
    } satisfies Partial<ContractRenderError>)
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
