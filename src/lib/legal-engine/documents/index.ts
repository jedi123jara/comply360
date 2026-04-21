// =============================================
// DOCUMENT TEMPLATE REGISTRY — COMPLY360 PERÚ
// =============================================

export type { DocumentField, DocumentSection, DocumentBlock, DocumentType, DocumentTemplateDefinition } from './types'
export { CCF_TEMPLATE } from './categorias-funciones'
export { HOSTIGAMIENTO_SEXUAL_TEMPLATE } from './hostigamiento-sexual'
export { PLAN_SST_TEMPLATE } from './plan-sst'
export { RIT_TEMPLATE } from './rit'

import type { DocumentTemplateDefinition } from './types'
import { CCF_TEMPLATE } from './categorias-funciones'
import { HOSTIGAMIENTO_SEXUAL_TEMPLATE } from './hostigamiento-sexual'
import { PLAN_SST_TEMPLATE } from './plan-sst'
import { RIT_TEMPLATE } from './rit'

/** Registry of all available document templates */
export const DOCUMENT_TEMPLATES: DocumentTemplateDefinition[] = [
  CCF_TEMPLATE,
  HOSTIGAMIENTO_SEXUAL_TEMPLATE,
  PLAN_SST_TEMPLATE,
  RIT_TEMPLATE,
]

/** Look up a document template by id */
export function getDocumentTemplateById(id: string): DocumentTemplateDefinition | undefined {
  return DOCUMENT_TEMPLATES.find(t => t.id === id)
}

/** Look up a document template by type */
export function getDocumentTemplateByType(type: string): DocumentTemplateDefinition | undefined {
  return DOCUMENT_TEMPLATES.find(t => t.type === type)
}

/**
 * Resolve {{variable}} placeholders in a text string using the provided data map.
 * Unknown variables are left as-is.
 */
export function resolveVariables(text: string, data: Record<string, unknown>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = data[key]
    if (value === undefined || value === null) return `{{${key}}}`
    return String(value)
  })
}

/**
 * Evaluate a condition expression against a data record.
 * Returns true if the block should be shown, false otherwise.
 * Catches evaluation errors and defaults to showing the block.
 */
export function evaluateCondition(
  condition: string | undefined,
  data: Record<string, unknown>
): boolean {
  if (!condition) return true
  try {
    // Build a safe evaluation context from the data object keys
    const keys = Object.keys(data)
    const values = keys.map(k => data[k])
    const fn = new Function(...keys, `"use strict"; return (${condition});`)
    return Boolean(fn(...values))
  } catch {
    return true // Default: show the block if condition cannot be evaluated
  }
}

/**
 * Render a document template to a plain-text string.
 * Resolves all variables and filters conditional blocks.
 */
export function renderDocumentToText(
  template: DocumentTemplateDefinition,
  data: Record<string, unknown>
): string {
  const parts: string[] = []

  for (const block of template.blocks) {
    if (!evaluateCondition(block.condition, data)) continue

    if (block.title) {
      parts.push(`\n${block.title}\n`)
      parts.push('─'.repeat(block.title.length))
    }

    const resolved = resolveVariables(block.text, data)
    parts.push(resolved)
    parts.push('\n')
  }

  return parts.join('\n')
}

/**
 * Render a document template to an HTML string.
 * Resolves all variables, filters conditional blocks and applies basic formatting.
 */
export function renderDocumentToHtml(
  template: DocumentTemplateDefinition,
  data: Record<string, unknown>
): string {
  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const htmlParts: string[] = [
    `<!DOCTYPE html>`,
    `<html lang="es">`,
    `<head>`,
    `<meta charset="UTF-8" />`,
    `<title>${escapeHtml(template.name)}</title>`,
    `<style>`,
    `  body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 40px 60px; line-height: 1.6; }`,
    `  h1 { font-size: 15pt; text-align: center; text-transform: uppercase; color: #1e3a6e; margin-bottom: 4px; }`,
    `  h2 { font-size: 12pt; text-transform: uppercase; color: #1e3a6e; margin-top: 24px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }`,
    `  .header-block { text-align: center; margin-bottom: 32px; }`,
    `  .clause { margin-bottom: 20px; }`,
    `  .signature-block { margin-top: 40px; }`,
    `  pre { font-family: inherit; white-space: pre-wrap; word-wrap: break-word; font-size: 10pt; }`,
    `  @media print { body { padding: 20px 40px; } }`,
    `</style>`,
    `</head>`,
    `<body>`,
  ]

  for (const block of template.blocks) {
    if (!evaluateCondition(block.condition, data)) continue

    const resolved = resolveVariables(block.text, data)
    const escapedText = escapeHtml(resolved).replace(/\n/g, '<br/>')

    const cssClass =
      block.blockType === 'header'
        ? 'header-block'
        : block.blockType === 'signature'
          ? 'signature-block'
          : 'clause'

    if (block.blockType === 'header') {
      htmlParts.push(`<div class="${cssClass}">`)
      // First line becomes h1, rest is body text
      const lines = resolved.split('\n')
      htmlParts.push(`<h1>${escapeHtml(lines[0] ?? '')}</h1>`)
      if (lines.length > 1) {
        const rest = escapeHtml(lines.slice(1).join('\n')).replace(/\n/g, '<br/>')
        htmlParts.push(`<p>${rest}</p>`)
      }
      htmlParts.push(`</div>`)
    } else {
      htmlParts.push(`<div class="${cssClass}">`)
      if (block.title) {
        htmlParts.push(`<h2>${escapeHtml(block.title)}</h2>`)
      }
      htmlParts.push(`<p>${escapedText}</p>`)
      htmlParts.push(`</div>`)
    }
  }

  htmlParts.push(`</body></html>`)
  return htmlParts.join('\n')
}
