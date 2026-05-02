// =============================================
// CONTRACT CLAUSE — RENDERER (puro)
// Generador de Contratos / Chunk 4
//
// Reemplaza placeholders {{key}} por valores. Sin dependencias externas
// para que sea trivialmente testeable y server-safe.
// =============================================

import type { ClauseVariable } from './types'

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g

export interface RenderClauseInput {
  bodyTemplate: string
  variables: ClauseVariable[]
  values: Record<string, string | number>
}

export interface RenderClauseResult {
  text: string
  /** Variables que NO recibieron valor y quedaron como "[FALTA: key]". */
  missing: string[]
  /** Variables que se emplearon en el render. */
  used: string[]
}

/**
 * Reemplaza {{var}} por su valor. Si una variable es required y no tiene
 * valor (ni default ni values[key]), emite "[FALTA: key]" para que sea
 * obvio en preview que falta completar.
 */
export function renderClause(input: RenderClauseInput): RenderClauseResult {
  const missing: string[] = []
  const used: string[] = []

  // Mapa de defaults
  const defaults: Record<string, string | number> = {}
  for (const v of input.variables) {
    if (v.default !== undefined) defaults[v.key] = v.default
  }

  const text = input.bodyTemplate.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const fromValues = input.values[key]
    const value = fromValues !== undefined && fromValues !== '' ? fromValues : defaults[key]
    used.push(key)
    if (value === undefined) {
      missing.push(key)
      return `[FALTA: ${key}]`
    }
    return String(value)
  })

  return { text, missing, used }
}

/**
 * Detecta todos los placeholders únicos presentes en un bodyTemplate.
 * Útil para validar que el seed declara todas las variables que el texto
 * usa.
 */
export function detectPlaceholders(bodyTemplate: string): string[] {
  const set = new Set<string>()
  for (const m of bodyTemplate.matchAll(PLACEHOLDER_RE)) {
    set.add(m[1])
  }
  return Array.from(set).sort()
}

/**
 * Convierte texto plano (con saltos de línea) a HTML envuelto en <p>.
 * Útil para insertar la cláusula en `Contract.contentHtml` de forma que
 * conserve estructura sin XSS.
 */
export function clauseTextToHtml(text: string): string {
  // Encoding mínimo (ya hace algo de defensa contra XSS — el texto viene del
  // catálogo de seeds, no de input de usuario libre). Para input real se
  // recomienda DOMPurify en server, pero el renderTemplate no produce HTML.
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
}
