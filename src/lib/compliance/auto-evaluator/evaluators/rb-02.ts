/**
 * RB-02: CTS depositada en plazo (15 mayo / 15 noviembre)?
 * Base legal: D.S. 001-97-TR, Art. 21-22
 *
 * Lógica: el cliente sube constancia de depósito CTS por periodo (MAY-OCT o NOV-ABR).
 * Si subió la del último periodo cerrado, es SI; si no, NO.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorRB02: QuestionEvaluator = {
  questionId: 'RB-02',
  evaluate: (ctx) => {
    const month = ctx.now.getMonth() + 1
    // Si estamos pasado mayo o noviembre, debió subirse constancia.
    const ventana = month > 5 && month < 12 ? 'MAY-OCT' : 'NOV-ABR'
    const cts = isOrgDocumentVigente(ctx, 'CTS_DEPOSITO_CONSTANCIA')
    return {
      questionId: 'RB-02',
      answer: cts.vigente ? 'SI' : cts.has ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Periodo CTS evaluado', ventana),
        metricEvidence(
          'Constancia CTS',
          cts.has ? (cts.vigente ? 'Vigente' : 'Vencida') : 'Falta subir'
        ),
        metricEvidence('Acción', 'Sube la constancia bancaria de depósito CTS'),
      ],
      sources: ['OrgDocument.CTS_DEPOSITO_CONSTANCIA'],
    }
  },
}
