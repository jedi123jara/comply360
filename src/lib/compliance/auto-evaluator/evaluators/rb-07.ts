/**
 * RB-07: Aportes AFP/ONP pagados dentro de los primeros 5 días del mes siguiente?
 * Base legal: D.S. 054-97-EF, Art. 34
 *
 * Lógica: el cliente sube constancia AFP/ONP mensual. Validamos vigencia + cobertura.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorRB07: QuestionEvaluator = {
  questionId: 'RB-07',
  evaluate: (ctx) => {
    const afp = isOrgDocumentVigente(ctx, 'AFP_PAGO_CONSTANCIA')
    const onp = isOrgDocumentVigente(ctx, 'ONP_PAGO_CONSTANCIA')
    const tieneAfp = ctx.workers.some((w) => w.tipoAporte === 'AFP')
    const tieneOnp = ctx.workers.some((w) => w.tipoAporte === 'ONP')

    const requiereAfp = tieneAfp
    const requiereOnp = tieneOnp
    const cumple =
      (!requiereAfp || afp.vigente) && (!requiereOnp || onp.vigente)
    const algo = afp.vigente || onp.vigente
    return {
      questionId: 'RB-07',
      answer: cumple ? 'SI' : algo ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence(
          'Constancia AFP',
          requiereAfp
            ? afp.has
              ? afp.vigente
                ? 'Vigente'
                : 'Vencida'
              : 'Falta'
            : 'No aplica'
        ),
        metricEvidence(
          'Constancia ONP',
          requiereOnp
            ? onp.has
              ? onp.vigente
                ? 'Vigente'
                : 'Vencida'
              : 'Falta'
            : 'No aplica'
        ),
        metricEvidence('Trabajadores AFP', ctx.workers.filter((w) => w.tipoAporte === 'AFP').length),
        metricEvidence('Trabajadores ONP', ctx.workers.filter((w) => w.tipoAporte === 'ONP').length),
      ],
      sources: ['OrgDocument.AFP_PAGO_CONSTANCIA', 'OrgDocument.ONP_PAGO_CONSTANCIA'],
    }
  },
}
