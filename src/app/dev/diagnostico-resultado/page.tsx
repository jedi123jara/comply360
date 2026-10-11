'use client'

import ResultadoPage from '@/app/dashboard/diagnostico/[id]/resultado/page'
import { PreviewNotice } from '../_preview/preview-notice'
import { PREVIEW_DIAGNOSTIC_ID } from '../_preview/diagnostic-mock-data'

/**
 * /dev/diagnostico-resultado — resultado real del diagnóstico con un diagnóstico
 * express de ejemplo (brechas, «Por verificar» y un área que no aplica).
 */
const PARAMS = Promise.resolve({ id: PREVIEW_DIAGNOSTIC_ID })

export default function DevDiagnosticoResultadoPage() {
  return (
    <>
      <PreviewNotice title="Resultado del diagnóstico">
        Página real de resultado con un diagnóstico express calculado por el motor con respuestas de ejemplo:
        algunas «No sé» (quedan por verificar) y un área entera marcada «No aplica».
      </PreviewNotice>
      <ResultadoPage params={PARAMS} />
    </>
  )
}
