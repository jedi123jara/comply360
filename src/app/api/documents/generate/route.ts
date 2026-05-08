/**
 * POST /api/documents/generate
 *
 * Genera un documento legal a partir de un template y datos de formulario.
 * Retorna el documento como texto plano o HTML según el formato solicitado.
 *
 * Body:
 *   templateId  string            — ID del template (ej: "plan-anual-sst")
 *   data        Record<string,unknown> — valores del formulario con {{variables}}
 *   format      "text" | "html"   — formato de salida (default: "html")
 *   saveToOrg   boolean           — si true, guarda registro en DB
 *
 * Returns:
 *   { content: string, format: string, templateName: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import {
  getDocumentTemplateById,
  renderDocumentToText,
  renderDocumentToHtml,
} from '@/lib/legal-engine/documents'

// We also support contract templates from the existing engine
import { getTemplateById as getContractTemplateById } from '@/lib/legal-engine/contracts/templates'

type GenerateBody = {
  templateId?: string
  data?: Record<string, unknown>
  format?: 'text' | 'html'
  saveToOrg?: boolean
}

export const POST = withPlanGate('contratos', async (req: NextRequest) => {
  let body: GenerateBody
  try {
    body = (await req.json()) as GenerateBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { templateId, data = {}, format = 'html' } = body

  if (!templateId) {
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
  }

  if (!['text', 'html'].includes(format)) {
    return NextResponse.json({ error: 'format must be "text" or "html"' }, { status: 400 })
  }

  // ── Try document templates first ─────────────────────────────────────────
  const docTemplate = getDocumentTemplateById(templateId)
  if (docTemplate) {
    const content =
      format === 'html'
        ? renderDocumentToHtml(docTemplate, data)
        : renderDocumentToText(docTemplate, data)

    return NextResponse.json({
      content,
      format,
      templateId: docTemplate.id,
      templateName: docTemplate.name,
      legalBasis: docTemplate.legalBasis,
    })
  }

  // ── Try contract templates ────────────────────────────────────────────────
  const contractTemplate = getContractTemplateById(templateId)
  if (contractTemplate) {
    // Render contract template blocks to text/html
    const resolveVars = (text: string): string =>
      text.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
        const v = data[key]
        return v !== undefined && v !== null ? String(v) : `{{${key}}}`
      })

    // SECURITY: Safe condition evaluator — no dynamic code execution (prevents code injection)
    // Supports declarative conditions: "field == 'value'", "field != 'value'", "field > number"
    const evalCond = (condition: string | undefined): boolean => {
      if (!condition) return true
      try {
        const match = condition.match(/^(\w+)\s*(==|!=|>=|<=|>|<)\s*['"]?(.+?)['"]?$/)
        if (!match) return true
        const [, field, op, expected] = match
        const actual = String(data[field] ?? '')
        switch (op) {
          case '==': return actual === expected
          case '!=': return actual !== expected
          case '>':  return Number(actual) > Number(expected)
          case '<':  return Number(actual) < Number(expected)
          case '>=': return Number(actual) >= Number(expected)
          case '<=': return Number(actual) <= Number(expected)
          default: return true
        }
      } catch {
        return true
      }
    }

    if (format === 'text') {
      const parts: string[] = []
      for (const block of contractTemplate.contentBlocks) {
        if (!evalCond(block.condition)) continue
        if (block.title) parts.push(`\n${block.title}\n${'─'.repeat(block.title.length)}`)
        parts.push(resolveVars(block.text))
        parts.push('')
      }
      return NextResponse.json({
        content: parts.join('\n'),
        format: 'text',
        templateId: contractTemplate.id,
        templateName: contractTemplate.name,
        legalBasis: contractTemplate.legalBasis,
      })
    }

    // HTML rendering for contracts
    const escapeHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    const htmlParts: string[] = [
      `<!DOCTYPE html>`,
      `<html lang="es"><head><meta charset="UTF-8"/>`,
      `<title>${escapeHtml(contractTemplate.name)}</title>`,
      `<style>`,
      `body{font-family:Arial,sans-serif;font-size:12pt;color:#1e293b;max-width:800px;margin:0 auto;padding:40px 60px;line-height:1.6}`,
      `h1{font-size:15pt;text-align:center;text-transform:uppercase;color:#1e3a6e;margin-bottom:8px}`,
      `h2{font-size:12pt;text-transform:uppercase;color:#1e3a6e;margin-top:24px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}`,
      `p{margin-top:8px}`,
      `</style></head><body>`,
    ]

    for (const block of contractTemplate.contentBlocks) {
      if (!evalCond(block.condition)) continue
      const resolved = resolveVars(block.text)
      const escaped = escapeHtml(resolved).replace(/\n/g, '<br/>')
      if (!block.title) {
        htmlParts.push(`<h1>${escaped}</h1>`)
      } else {
        htmlParts.push(`<h2>${escapeHtml(block.title)}</h2>`)
        htmlParts.push(`<p>${escaped}</p>`)
      }
    }

    htmlParts.push(`</body></html>`)
    return NextResponse.json({
      content: htmlParts.join('\n'),
      format: 'html',
      templateId: contractTemplate.id,
      templateName: contractTemplate.name,
      legalBasis: contractTemplate.legalBasis,
    })
  }

  return NextResponse.json(
    { error: `Template "${templateId}" not found. Available: plan-anual-sst, ccf-ley-30709, politica-hostigamiento-sexual, reglamento-interno-trabajo, laboral-indefinido, laboral-plazo-fijo, locacion-servicios` },
    { status: 404 }
  )
})

/**
 * GET /api/documents/generate
 * List all available document templates
 */
export const GET = withPlanGate('contratos', async () => {
  const { DOCUMENT_TEMPLATES } = await import('@/lib/legal-engine/documents')
  const { CONTRACT_TEMPLATES } = await import('@/lib/legal-engine/contracts/templates')

  const documentList = DOCUMENT_TEMPLATES.map(t => ({
    id: t.id,
    type: t.type,
    name: t.name,
    description: t.description,
    legalBasis: t.legalBasis,
    mandatoryFrom: t.mandatoryFrom,
    workerThreshold: t.workerThreshold,
    category: 'document',
  }))

  const contractList = CONTRACT_TEMPLATES.map(t => ({
    id: t.id,
    type: t.type,
    name: t.name,
    description: t.description,
    legalBasis: t.legalBasis,
    category: 'contract',
  }))

  return NextResponse.json({
    documents: documentList,
    contracts: contractList,
    total: documentList.length + contractList.length,
  })
})
