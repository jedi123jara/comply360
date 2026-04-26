/**
 * Word-level diff sin librerías externas (~80 LOC).
 *
 * Implementa el algoritmo Longest Common Subsequence (LCS) — versión
 * simplificada del clásico Hunt-McIlroy. Suficiente para textos de
 * contratos (~5000 palabras) sin overhead de `diff-match-patch` (100KB+).
 *
 * Salida: array de tokens etiquetados como 'equal' | 'added' | 'removed'.
 * El componente UI puede renderizar cada token con estilos distintos.
 *
 * Uso:
 *   const tokens = diffWords(originalText, fixedText)
 *   tokens.forEach(t => render(t.type, t.value))
 *
 * Performance: O(M*N) donde M y N son # de palabras. Para 5000 palabras
 * son 25M operaciones, aceptable en cliente moderno (~100-300ms).
 * Para textos >10000 palabras considerar `diff-match-patch`.
 */

export interface DiffToken {
  type: 'equal' | 'added' | 'removed'
  value: string
}

/** Tokeniza preservando whitespace para reconstruir el texto original. */
function tokenize(text: string): string[] {
  // Split por whitespace pero preservando los separadores
  const tokens: string[] = []
  const parts = text.split(/(\s+)/)
  for (const part of parts) {
    if (part) tokens.push(part)
  }
  return tokens
}

/**
 * LCS table builder — clásico DP O(M*N) en tiempo y espacio.
 * Para textos grandes, swap a Hirschberg's algorithm para O(M+N) espacio.
 */
function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  // Inicializar matriz (m+1) x (n+1) con ceros
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  return dp
}

/**
 * Construye los tokens diff backtraceando la tabla LCS.
 * Returns los tokens en ORDEN del texto final (original + added intercalados).
 */
function backtrace(
  a: string[],
  b: string[],
  dp: number[][],
): DiffToken[] {
  const tokens: DiffToken[] = []
  let i = a.length
  let j = b.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      tokens.unshift({ type: 'equal', value: a[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.unshift({ type: 'added', value: b[j - 1] })
      j--
    } else if (i > 0) {
      tokens.unshift({ type: 'removed', value: a[i - 1] })
      i--
    }
  }

  // Coalesce tokens consecutivos del mismo tipo (más eficiente para render)
  const merged: DiffToken[] = []
  for (const t of tokens) {
    const last = merged[merged.length - 1]
    if (last && last.type === t.type) {
      last.value += t.value
    } else {
      merged.push({ ...t })
    }
  }
  return merged
}

/**
 * Diff word-by-word entre dos strings. Retorna array de tokens.
 *
 * Ejemplo:
 *   diffWords('hola mundo', 'hola perú')
 *   // [
 *   //   { type: 'equal', value: 'hola ' },
 *   //   { type: 'removed', value: 'mundo' },
 *   //   { type: 'added', value: 'perú' },
 *   // ]
 */
export function diffWords(original: string, fixed: string): DiffToken[] {
  const a = tokenize(original)
  const b = tokenize(fixed)
  const dp = lcsTable(a, b)
  return backtrace(a, b, dp)
}

/**
 * Strip HTML básico — para diff de strings con markup.
 * No intenta parser real; solo quita tags y entidades comunes.
 */
export function stripHtmlForDiff(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|br)\s*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Estadísticas rápidas del diff (para badges de cambios). */
export interface DiffStats {
  addedWords: number
  removedWords: number
  equalWords: number
  /** Porcentaje de cambio (0-100). */
  changePercent: number
}

export function diffStats(tokens: DiffToken[]): DiffStats {
  let added = 0
  let removed = 0
  let equal = 0
  for (const t of tokens) {
    const wordCount = t.value.split(/\s+/).filter(Boolean).length
    if (t.type === 'added') added += wordCount
    else if (t.type === 'removed') removed += wordCount
    else equal += wordCount
  }
  const total = added + removed + equal
  return {
    addedWords: added,
    removedWords: removed,
    equalWords: equal,
    changePercent: total > 0 ? Math.round(((added + removed) / total) * 100) : 0,
  }
}
