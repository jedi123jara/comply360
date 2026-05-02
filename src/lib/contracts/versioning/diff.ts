// =============================================
// CONTRACT VERSION DIFF (Generador / Chunk 3)
//
// Diff mínimo entre dos snapshots de contrato. No usamos un JSON Patch
// completo (RFC 6902) en v1 — sumamos cuando sea necesario. Por ahora:
//   - Lista de campos cambiados en formData
//   - Conteo aproximado de caracteres añadidos/quitados en contentHtml
//   - Resumen humano legible
// =============================================

export interface ContractSnapshot {
  contentHtml: string | null
  contentJson: unknown
  formData: Record<string, unknown> | null
}

export interface ContractDiff {
  summary: string
  json: {
    formDataChanges: Array<{
      field: string
      operation: 'add' | 'remove' | 'modify'
      oldValue?: unknown
      newValue?: unknown
    }>
    contentHtmlChanged: boolean
    contentHtmlDelta: { added: number; removed: number } | null
    contentJsonChanged: boolean
  }
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || a === undefined || b === null || b === undefined) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a === 'object') {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  return false
}

export function diffContracts(prev: ContractSnapshot | null, curr: ContractSnapshot): ContractDiff {
  if (!prev) {
    return {
      summary: 'Versión inicial del contrato.',
      json: {
        formDataChanges: [],
        contentHtmlChanged: !!curr.contentHtml,
        contentHtmlDelta: curr.contentHtml ? { added: curr.contentHtml.length, removed: 0 } : null,
        contentJsonChanged: !!curr.contentJson,
      },
    }
  }

  // formData diff
  const prevForm = (prev.formData ?? {}) as Record<string, unknown>
  const currForm = (curr.formData ?? {}) as Record<string, unknown>
  const allKeys = new Set([...Object.keys(prevForm), ...Object.keys(currForm)])
  const formDataChanges: ContractDiff['json']['formDataChanges'] = []
  for (const k of Array.from(allKeys).sort()) {
    const inPrev = k in prevForm
    const inCurr = k in currForm
    if (!inPrev && inCurr) {
      formDataChanges.push({ field: k, operation: 'add', newValue: currForm[k] })
    } else if (inPrev && !inCurr) {
      formDataChanges.push({ field: k, operation: 'remove', oldValue: prevForm[k] })
    } else if (!shallowEqual(prevForm[k], currForm[k])) {
      formDataChanges.push({
        field: k,
        operation: 'modify',
        oldValue: prevForm[k],
        newValue: currForm[k],
      })
    }
  }

  // contentHtml diff (longitudes)
  let contentHtmlDelta: { added: number; removed: number } | null = null
  const prevHtml = prev.contentHtml ?? ''
  const currHtml = curr.contentHtml ?? ''
  const contentHtmlChanged = prevHtml !== currHtml
  if (contentHtmlChanged) {
    const delta = currHtml.length - prevHtml.length
    contentHtmlDelta = {
      added: Math.max(0, delta),
      removed: Math.max(0, -delta),
    }
  }

  const contentJsonChanged = JSON.stringify(prev.contentJson ?? null) !== JSON.stringify(curr.contentJson ?? null)

  // Resumen humano
  const parts: string[] = []
  if (formDataChanges.length > 0) {
    parts.push(`${formDataChanges.length} campo${formDataChanges.length === 1 ? '' : 's'} de formulario`)
  }
  if (contentHtmlChanged) {
    if (contentHtmlDelta) {
      const net = contentHtmlDelta.added - contentHtmlDelta.removed
      parts.push(
        net > 0
          ? `contenido (+${contentHtmlDelta.added} chars)`
          : net < 0
            ? `contenido (${net} chars)`
            : 'contenido reescrito',
      )
    } else parts.push('contenido')
  }
  if (contentJsonChanged) parts.push('estructura JSON')

  const summary = parts.length === 0
    ? 'Sin cambios materiales (sólo metadata).'
    : `Cambios en: ${parts.join(', ')}.`

  return {
    summary,
    json: {
      formDataChanges,
      contentHtmlChanged,
      contentHtmlDelta,
      contentJsonChanged,
    },
  }
}
