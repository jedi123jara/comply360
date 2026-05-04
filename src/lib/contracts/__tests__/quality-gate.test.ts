import { describe, expect, it } from 'vitest'
import { runContractQualityGate } from '../quality-gate'

const completeLaborHtml = `
  <article>
    <h1>Contrato de trabajo a plazo indeterminado</h1>
    <p>Las partes son el empleador con RUC y el trabajador con DNI. Base legal: Ley 728.</p>
    <p>El objeto del contrato define cargo y funciones esenciales. Base legal: Ley 728.</p>
    <p>La modalidad es plazo indeterminado con vigencia desde la fecha de inicio. Base legal: Ley 728.</p>
    <p>La remuneración y forma de pago quedan pactadas mensualmente. Base legal: Ley 728.</p>
    <p>La jornada, horario y refrigerio respetan los máximos legales. Base legal: D.S. 007-2002-TR.</p>
    <p>El trabajador accede a CTS, gratificaciones, vacaciones y EsSalud. Base legal: Ley 27735.</p>
    <p>La seguridad y salud en el trabajo se rige por la Ley 29783. Base legal: Ley 29783.</p>
    <p>La prevención del hostigamiento sexual se rige por la Ley 27942. Base legal: Ley 27942.</p>
    <p>Los datos personales se tratan conforme a la Ley 29733. Base legal: Ley 29733.</p>
    <p>La confidencialidad protege información confidencial del empleador.</p>
    <p>La terminación, despido, renuncia o resolución se sujeta a ley aplicable.</p>
    <p>La jurisdicción será la autoridad competente en Perú.</p>
    <p>Anexos: Política de Seguridad y Salud en el Trabajo; Política de Prevención del Hostigamiento Sexual; Consentimiento Informado para Tratamiento de Datos Personales; Descripción de Puesto o Funciones.</p>
  </article>
`

const completeFormData = {
  empleador_razon_social: 'Empresa SAC',
  empleador_ruc: '20123456789',
  trabajador_nombre: 'Ana Perez',
  trabajador_dni: '12345678',
  cargo: 'Analista',
  remuneracion_mensual: '3500',
  fecha_inicio: '2026-05-01',
  jornada_semanal: '48 horas',
  horario_trabajo: 'Lunes a viernes',
}

describe('runContractQualityGate', () => {
  it('permite emitir un contrato laboral completo con cobertura, base legal y anexos', () => {
    const result = runContractQualityGate({
      type: 'LABORAL_INDEFINIDO',
      title: 'Contrato laboral completo',
      contentHtml: completeLaborHtml,
      contentJson: {},
      formData: completeFormData,
      provenance: 'MANUAL_TEMPLATE',
      renderVersion: 'contract-render-v1',
    })

    expect(result.status).toBe('READY_FOR_SIGNATURE')
    expect(result.blockers).toHaveLength(0)
    expect(result.score).toBeGreaterThanOrEqual(90)
  })

  it('bloquea placeholders y marcadores incompletos', () => {
    const result = runContractQualityGate({
      type: 'LABORAL_INDEFINIDO',
      title: 'Contrato incompleto',
      contentHtml: `${completeLaborHtml}<p>{{trabajador_nombre}}</p><p>[Por completar]</p>`,
      contentJson: {},
      formData: completeFormData,
      provenance: 'MANUAL_TEMPLATE',
      renderVersion: 'contract-render-v1',
    })

    expect(result.status).toBe('DRAFT_INCOMPLETE')
    expect(result.blockers.map((item) => item.code)).toContain('PLACEHOLDER_PENDING')
    expect(result.blockers.map((item) => item.code)).toContain('INCOMPLETE_MARKER')
  })

  it('bloquea plazo fijo con causa objetiva genérica', () => {
    const result = runContractQualityGate({
      type: 'LABORAL_PLAZO_FIJO',
      title: 'Contrato plazo fijo',
      contentHtml: completeLaborHtml,
      contentJson: {},
      formData: {
        ...completeFormData,
        fecha_fin: '2026-12-31',
        causa_objetiva: 'necesidad de mercado',
      },
      provenance: 'MANUAL_TEMPLATE',
      renderVersion: 'contract-render-v1',
    })

    expect(result.blockers.map((item) => item.code)).toContain('WEAK_CAUSE_OBJECTIVE')
  })

  it('exige revisión si una salida fallback IA no fue revisada', () => {
    const result = runContractQualityGate({
      type: 'LABORAL_INDEFINIDO',
      title: 'Contrato IA fallback',
      contentHtml: completeLaborHtml,
      contentJson: {},
      formData: completeFormData,
      provenance: 'AI_FALLBACK',
      renderVersion: 'contract-render-v1',
      isFallback: true,
    })

    expect(result.blockers.map((item) => item.code)).toContain('AI_FALLBACK_UNREVIEWED')
  })

  it('usa la cobertura de anexos reales cuando se entrega evidencia documental', () => {
    const result = runContractQualityGate({
      type: 'LABORAL_INDEFINIDO',
      title: 'Contrato con anexos no acreditados',
      contentHtml: completeLaborHtml,
      contentJson: {},
      formData: completeFormData,
      provenance: 'MANUAL_TEMPLATE',
      renderVersion: 'contract-render-v1',
      annexCoverage: {
        checkedAt: new Date().toISOString(),
        requiredAnnexes: [],
        coveredAnnexes: [],
        missingAnnexes: ['Política de Seguridad y Salud en el Trabajo'],
        workerLinked: true,
      },
    })

    expect(result.blockers.map((item) => item.code)).toContain('ANNEX_MISSING')
    expect(result.missingAnnexes).toEqual(['Política de Seguridad y Salud en el Trabajo'])
  })
})
