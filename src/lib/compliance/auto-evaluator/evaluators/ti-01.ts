/**
 * TI-01: Empresas tercerizadoras inscritas en Registro SUNAFIL?
 * Base legal: D.Leg. 1038, Art. 5; D.S. 006-2008-TR, Art. 4
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorTI01: QuestionEvaluator = {
  questionId: 'TI-01',
  evaluate: (ctx) => {
    const tercerizadoras = ctx.terceros.filter(
      (t) => t.tipoServicio === 'TERCERIZACION' && t.isActive
    )
    if (tercerizadoras.length === 0) {
      return {
        questionId: 'TI-01',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Empresas tercerizadoras activas', 0)],
        sources: ['Tercero'],
      }
    }
    const registro = isOrgDocumentVigente(ctx, 'REGISTRO_SUNAFIL_TERCERIZADORA')
    // El registro SUNAFIL es UNO por tercerizadora — idealmente subimos uno por cada
    // Tercero, pero aquí solo verificamos que exista al menos uno.
    return {
      questionId: 'TI-01',
      answer: registro.vigente ? 'PARCIAL' : 'NO',
      confidence: 75,
      evidence: [
        metricEvidence('Tercerizadoras activas', tercerizadoras.length),
        metricEvidence(
          'Registros SUNAFIL subidos',
          registro.has ? (registro.vigente ? 'Al menos 1 vigente' : 'Vencido') : 'Faltan'
        ),
        metricEvidence('Acción', 'Sube constancia SUNAFIL por cada tercerizadora'),
      ],
      sources: ['Tercero', 'OrgDocument.REGISTRO_SUNAFIL_TERCERIZADORA'],
    }
  },
}
