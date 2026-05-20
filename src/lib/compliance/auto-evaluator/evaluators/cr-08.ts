/**
 * CR-08: Practicantes pre-profesionales y profesionales con convenio escrito registrado?
 * Base legal: Ley 28518, Art. 46
 *
 * Lógica: si la org tiene practicantes (MODALIDAD_FORMATIVA), debe existir al menos un
 * OrgDocument(CONVENIO_PRACTICAS_REGISTRADO_MTPE) por cada uno, o un acreditado global.
 */
import type { QuestionEvaluator } from '../types'
import { workersPracticantes } from '../context'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorCR08: QuestionEvaluator = {
  questionId: 'CR-08',
  evaluate: (ctx) => {
    const practicantes = workersPracticantes(ctx)
    if (practicantes.length === 0) {
      return {
        questionId: 'CR-08',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Practicantes en modalidad formativa', 0)],
        sources: ['Worker.regimenLaboral'],
      }
    }
    const conConvenio = isOrgDocumentVigente(ctx, 'CONVENIO_PRACTICAS_REGISTRADO_MTPE')
    return {
      questionId: 'CR-08',
      answer: conConvenio.has ? 'PARCIAL' : 'NO',
      confidence: 80,
      evidence: [
        metricEvidence('Practicantes', practicantes.length),
        metricEvidence(
          'Convenio registrado MTPE',
          conConvenio.has ? (conConvenio.vigente ? 'Subido' : 'Vencido') : 'Falta'
        ),
        metricEvidence('Acción sugerida', 'Subir CONVENIO_PRACTICAS_REGISTRADO_MTPE por cada practicante'),
      ],
      sources: ['Worker.regimenLaboral', 'OrgDocument.CONVENIO_PRACTICAS_REGISTRADO_MTPE'],
    }
  },
}
