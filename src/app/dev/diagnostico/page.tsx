'use client'

import DiagnosticoPage from '@/app/dashboard/diagnostico/page'
import { PreviewNotice } from '../_preview/preview-notice'

/**
 * /dev/diagnostico — cuestionario real del diagnóstico con el banco de
 * preguntas real. Enviar las respuestas falla a propósito: aquí no hay base.
 */
const SEARCH_PARAMS = Promise.resolve({})

export default function DevDiagnosticoPage() {
  return (
    <>
      <PreviewNotice title="Diagnóstico (cuestionario)">
        Cuestionario real con las preguntas del banco: Sí, Parcial, No, No sé y No aplica, con «¿Por qué te lo
        preguntamos?». Al final no se guarda nada porque aquí no hay base de datos.
      </PreviewNotice>
      <DiagnosticoPage searchParams={SEARCH_PARAMS} />
    </>
  )
}
