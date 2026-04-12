/**
 * Text Cleaner — limpieza de texto extraído de PDF/OCR antes de enviar al LLM
 *
 * Normaliza artefactos comunes de:
 *  - pdf-parse (marcadores de página, form feeds)
 *  - OCR (ligaduras, caracteres mal reconocidos)
 *  - PDFs escaneados (basura Unicode, bytes NUL)
 */

/**
 * Limpieza completa de texto de contrato para enviar al LLM.
 * Aplica todas las transformaciones en orden.
 */
export function cleanContractText(raw: string): string {
  let text = raw

  // 1. Eliminar bytes NUL y caracteres de control (excepto tab, newline, CR)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')

  // 2. Normalización Unicode — recomponer caracteres descompuestos por OCR
  text = text.normalize('NFKC')

  // 3. Reemplazar ligaduras comunes que OCR/PDF insertan
  text = text
    .replace(/\uFB01/g, 'fi')  // ﬁ
    .replace(/\uFB02/g, 'fl')  // ﬂ
    .replace(/\uFB00/g, 'ff')  // ﬀ
    .replace(/\uFB03/g, 'ffi') // ﬃ
    .replace(/\uFB04/g, 'ffl') // ﬄ

  // 4. Eliminar form feeds (separadores de página de pdf-parse v1)
  text = text.replace(/\f/g, '\n')

  // 5. Eliminar marcadores de página de pdf-parse v2: "-- X of Y --"
  text = text.replace(/\n*-- \d+ of \d+ --\n*/g, '\n\n')

  // 6. Eliminar repeticiones de header/footer de página
  //    Patrón: "Página X de Y" o "Pag. X/Y" repetido
  text = text.replace(/P[áa]gina?\s*\.?\s*\d+\s*(de|\/)\s*\d+/gi, '')

  // 7. Eliminar líneas que son solo guiones, asteriscos o underscores (separadores decorativos)
  text = text.replace(/^[\s\-_*=]{10,}$/gm, '')

  // 8. Colapsar múltiples espacios en uno
  text = text.replace(/[^\S\n]{2,}/g, ' ')

  // 9. Colapsar 3+ newlines consecutivas en 2 (mantener párrafos pero no gaps enormes)
  text = text.replace(/\n{3,}/g, '\n\n')

  // 10. Trim por línea (eliminar espacios al inicio/fin de cada línea)
  text = text.split('\n').map(line => line.trim()).join('\n')

  // 11. Trim global
  text = text.trim()

  return text
}
