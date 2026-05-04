import { htmlToDocxBuffer } from '@/lib/contracts/docx/html-to-docx'
import { cleanContractContent } from '@/lib/pdf/contract-content-cleaner'
import {
  addContractHeader,
  addCoverPage,
  addSignatureBlock,
  checkContractPageBreak,
  contractPDFBuffer,
  createContractPDFDoc,
  drawJustifiedParagraph,
  CONTRACT_LAYOUT,
  loadOrgLogoBytes,
  renderContractBody,
  type ContractHeaderOpts,
  type JsPDFContractDoc,
} from '@/lib/pdf/contract-pdf'
import {
  getTemplateById,
  getTemplateByType,
  type ContractTemplateDefinition,
  type ContentBlock,
} from '@/lib/legal-engine/contracts/templates'
import {
  readPremiumContractDocument,
  renderPremiumContractHtml,
  type PremiumContractDocument,
} from './premium-library'

export type ContractRenderSourceKind =
  | 'template-based'
  | 'org-template-based'
  | 'ai-draft-based'
  | 'html-based'
  | 'bulk-row-based'

export type ContractProvenance =
  | 'MANUAL_TEMPLATE'
  | 'ORG_TEMPLATE'
  | 'AI_GENERATED'
  | 'AI_FALLBACK'
  | 'BULK_GENERATED'
  | 'LEGACY'

export interface ContractRenderMetadata {
  sourceKind: ContractRenderSourceKind
  provenance: ContractProvenance
  generationMode: 'deterministic' | 'ai' | 'fallback' | 'legacy'
  renderVersion: 'contract-render-v1'
  isFallback: boolean
  renderedAt: string
  templateId?: string | null
  contractType?: string | null
  unresolvedPlaceholders: string[]
}

export interface ContractRenderOrgContext {
  name?: string | null
  razonSocial?: string | null
  ruc?: string | null
  logoUrl?: string | null
}

export interface ContractRenderWorkerContext {
  fullName?: string | null
  dni?: string | null
  fechaIngreso?: string | Date | null
}

export interface ContractRenderInput {
  title: string
  contractType: string
  sourceKind: ContractRenderSourceKind
  provenance?: ContractProvenance
  templateId?: string | null
  template?: ContractTemplateDefinition | null
  formData?: Record<string, unknown> | null
  contentHtml?: string | null
  contentJson?: unknown
  renderedText?: string | null
  orgContext?: ContractRenderOrgContext | null
  workerContext?: ContractRenderWorkerContext | null
  allowUnresolvedPlaceholders?: boolean
}

export interface ContractRenderResult {
  renderedHtml: string
  renderedText: string
  renderMetadata: ContractRenderMetadata
}

const RENDER_VERSION: ContractRenderMetadata['renderVersion'] = 'contract-render-v1'

export class ContractRenderError extends Error {
  code: 'EMPTY_RENDER' | 'UNRESOLVED_PLACEHOLDERS' | 'INCOMPLETE_OFFICIAL_RENDER'
  details: Record<string, unknown>

  constructor(
    code: ContractRenderError['code'],
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'ContractRenderError'
    this.code = code
    this.details = details
  }
}

export function resolveContractProvenance(input: {
  sourceKind?: ContractRenderSourceKind
  requested?: ContractProvenance | null
  contentJson?: unknown
}): ContractProvenance {
  if (input.requested) return input.requested
  const generatedBy = getNestedString(input.contentJson, ['generadoPor'])
  if (input.sourceKind === 'ai-draft-based') {
    return generatedBy === 'simulated' ? 'AI_FALLBACK' : 'AI_GENERATED'
  }
  if (input.sourceKind === 'org-template-based') return 'ORG_TEMPLATE'
  if (input.sourceKind === 'bulk-row-based') return 'BULK_GENERATED'
  if (input.sourceKind === 'template-based') return 'MANUAL_TEMPLATE'
  return 'LEGACY'
}

export function renderContract(input: ContractRenderInput): ContractRenderResult {
  const provenance = resolveContractProvenance({
    sourceKind: input.sourceKind,
    requested: input.provenance,
    contentJson: input.contentJson,
  })
  const generationMode = provenance === 'AI_GENERATED'
    ? 'ai'
    : provenance === 'AI_FALLBACK'
      ? 'fallback'
      : provenance === 'LEGACY'
        ? 'legacy'
        : 'deterministic'

  const formData = input.formData ?? {}
  const template = input.template
    ?? (input.templateId ? getTemplateById(input.templateId) : null)
    ?? getTemplateByType(input.contractType)
    ?? null

  let renderedHtml = ''
  let renderedText = ''
  const premiumDocument = readPremiumContractDocument(input.contentJson)

  if (premiumDocument) {
    renderedHtml = renderPremiumContractHtml(premiumDocument)
    renderedText = htmlToPlainText(renderedHtml)
  } else if (input.sourceKind === 'template-based' && template) {
    renderedHtml = renderTemplateHtml(template, formData)
    renderedText = htmlToPlainText(renderedHtml)
  } else if (input.sourceKind === 'bulk-row-based') {
    renderedHtml = renderBulkHtml(input.title, input.contractType, formData)
    renderedText = htmlToPlainText(renderedHtml)
  } else if (input.sourceKind === 'org-template-based' && input.renderedText) {
    renderedText = input.renderedText
    renderedHtml = textToHtml(input.renderedText)
  } else if (input.sourceKind === 'ai-draft-based') {
    renderedHtml = renderAiHtml(input.title, input.contentJson, input.contentHtml)
    renderedText = htmlToPlainText(renderedHtml)
  } else if (input.contentHtml) {
    renderedHtml = input.contentHtml
    renderedText = htmlToPlainText(renderedHtml)
  } else if (template) {
    renderedHtml = renderTemplateHtml(template, formData)
    renderedText = htmlToPlainText(renderedHtml)
  } else {
    renderedText = input.renderedText ?? input.title
    renderedHtml = textToHtml(renderedText)
  }

  const unresolvedPlaceholders = findUnresolvedPlaceholders(`${renderedHtml}\n${renderedText}`)
  return {
    renderedHtml,
    renderedText,
    renderMetadata: {
      sourceKind: input.sourceKind,
      provenance,
      generationMode,
      renderVersion: RENDER_VERSION,
      isFallback: provenance === 'AI_FALLBACK',
      renderedAt: new Date().toISOString(),
      templateId: input.templateId ?? template?.id ?? null,
      contractType: input.contractType ?? null,
      unresolvedPlaceholders,
    },
  }
}

export async function renderContractDocxBuffer(input: ContractRenderInput): Promise<Buffer> {
  const rendered = renderContract(input)
  assertOfficialRenderReady(rendered, input)
  return htmlToDocxBuffer({
    title: input.title,
    contentHtml: rendered.renderedHtml,
    author: input.orgContext?.razonSocial ?? input.orgContext?.name ?? 'Documento legal',
    company: input.orgContext?.razonSocial ?? input.orgContext?.name ?? 'Documento legal',
  })
}

export async function renderContractPdfBuffer(input: ContractRenderInput): Promise<Buffer> {
  const rendered = renderContract(input)
  assertOfficialRenderReady(rendered, input)
  const org = input.orgContext ?? {}
  const worker = input.workerContext ?? workerFromFormData(input.formData ?? {})
  const logo = await loadOrgLogoBytes(org.logoUrl)
  const headerOpts = { org, logo }
  const doc = await createContractPDFDoc()
  const premiumDocument = readPremiumContractDocument(input.contentJson)

  addCoverPage(doc, {
    title: input.title,
    org,
    logo,
    workerFullName: worker.fullName ?? '',
    workerDni: worker.dni ?? '',
    ciudad: String((input.formData ?? {}).ciudad ?? 'Lima'),
    fechaIngreso: worker.fechaIngreso ?? null,
    contractType: input.contractType,
    legalFamily: premiumDocument?.legalFamily ?? null,
    documentVersion: premiumDocument?.version ?? RENDER_VERSION,
  })
  doc.addPage()
  addContractHeader(doc, headerOpts)
  const bodyEndY = premiumDocument
    ? renderPremiumContractPdfBody(doc, premiumDocument, {
        startY: 36,
        headerOpts,
      })
    : renderContractBody(doc, cleanContractContent(htmlToPlainText(rendered.renderedHtml)), {
        startY: 36,
        headerOpts,
      })
  addSignatureBlock(doc, bodyEndY, {
    empleador: {
      razonSocial: org.razonSocial ?? org.name ?? '',
      ruc: org.ruc ?? '',
    },
    trabajador: { fullName: worker.fullName ?? '', dni: worker.dni ?? '' },
    ciudad: String((input.formData ?? {}).ciudad ?? 'Lima'),
    fecha: new Date(),
    headerOpts,
  })

  return Buffer.from(contractPDFBuffer(doc))
}

function renderPremiumContractPdfBody(
  doc: JsPDFContractDoc,
  premiumDocument: PremiumContractDocument,
  opts: { startY: number; headerOpts: ContractHeaderOpts },
): number {
  const W = doc.internal.pageSize.getWidth()
  const x = CONTRACT_LAYOUT.marginX
  const maxWidth = W - CONTRACT_LAYOUT.marginX * 2
  const lh = CONTRACT_LAYOUT.lineHeight
  let y = opts.startY
  let clauseNumber = 1

  doc.setFont('times', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  doc.text('CUERPO CONTRACTUAL', x, y)
  y += 7
  doc.setDrawColor(220, 220, 220)
  doc.line(x, y, x + maxWidth, y)
  y += 9

  for (const section of premiumDocument.sections) {
    y = checkContractPageBreak(doc, y + 4, lh * 4, opts.headerOpts)
    doc.setFont('times', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(20, 70, 60)
    doc.text(section.title.toUpperCase(), x, y)
    y += 7

    for (const clause of section.clauses) {
      y = checkContractPageBreak(doc, y + 4, lh * 4, opts.headerOpts)
      doc.setFont('times', 'bold')
      doc.setFontSize(CONTRACT_LAYOUT.clauseTitleFontSize)
      doc.setTextColor(...CONTRACT_LAYOUT.textColor)
      doc.text(`${clauseNumber}. ${clause.title}`, x, y)
      y += lh + 1

      doc.setFont('times', 'normal')
      doc.setFontSize(CONTRACT_LAYOUT.bodyFontSize)
      doc.setTextColor(...CONTRACT_LAYOUT.textColor)
      for (const paragraph of clause.body.split(/\n\s*\n+/).filter(Boolean)) {
        y = checkContractPageBreak(doc, y, undefined, opts.headerOpts)
        y = drawJustifiedParagraph(doc, paragraph, x, y, maxWidth, lh)
        y += CONTRACT_LAYOUT.paragraphGap
      }

      y = checkContractPageBreak(doc, y, undefined, opts.headerOpts)
      doc.setFont('times', 'italic')
      doc.setFontSize(CONTRACT_LAYOUT.baseLegalFontSize)
      doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
      const basis = `Base legal: ${clause.legalBasis.join('; ')}`
      const basisLines = doc.splitTextToSize(basis, maxWidth)
      doc.text(basisLines, x, y)
      y += basisLines.length * 4 + 3
      clauseNumber += 1
    }
  }

  y = renderPremiumAnnexes(doc, y + 6, premiumDocument, opts.headerOpts)
  y = renderPremiumProtectionMatrix(doc, y + 8, premiumDocument, opts.headerOpts)
  y = renderPremiumDocumentControl(doc, y + 8, premiumDocument, opts.headerOpts)
  return y
}

function renderPremiumAnnexes(
  doc: JsPDFContractDoc,
  y: number,
  premiumDocument: PremiumContractDocument,
  headerOpts: ContractHeaderOpts,
): number {
  if (premiumDocument.annexes.length === 0) return y
  const W = doc.internal.pageSize.getWidth()
  const x = CONTRACT_LAYOUT.marginX
  const maxWidth = W - CONTRACT_LAYOUT.marginX * 2
  const lh = CONTRACT_LAYOUT.lineHeight
  y = checkContractPageBreak(doc, y, lh * 5, headerOpts)
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(20, 70, 60)
  doc.text('ANEXOS INTEGRANTES', x, y)
  y += 8

  doc.setFont('times', 'normal')
  doc.setFontSize(CONTRACT_LAYOUT.bodyFontSize)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  y = drawJustifiedParagraph(
    doc,
    'Los anexos listados forman parte integrante del contrato y deben conservarse como evidencia verificable para sustentar la emisión, firma y fiscalización del documento.',
    x,
    y,
    maxWidth,
    lh,
  )
  y += 5

  premiumDocument.annexes.forEach((annex, index) => {
    y = checkContractPageBreak(doc, y, lh * 4, headerOpts)
    doc.setFont('times', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...CONTRACT_LAYOUT.textColor)
    doc.text(`${index + 1}. ${annex.title}`, x, y)
    y += lh

    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    y = drawJustifiedParagraph(doc, annex.reason, x + 4, y, maxWidth - 4, lh)
    y += 1

    doc.setFont('times', 'italic')
    doc.setFontSize(CONTRACT_LAYOUT.baseLegalFontSize)
    doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
    doc.text(doc.splitTextToSize(`Base legal: ${annex.legalBasis.join('; ')}`, maxWidth - 4), x + 4, y)
    y += 7
  })

  return y
}

function renderPremiumProtectionMatrix(
  doc: JsPDFContractDoc,
  y: number,
  premiumDocument: PremiumContractDocument,
  headerOpts: ContractHeaderOpts,
): number {
  const W = doc.internal.pageSize.getWidth()
  const x = CONTRACT_LAYOUT.marginX
  const maxWidth = W - CONTRACT_LAYOUT.marginX * 2
  const lh = CONTRACT_LAYOUT.lineHeight
  y = checkContractPageBreak(doc, y, lh * 8, headerOpts)

  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(20, 70, 60)
  doc.text('MATRIZ DE PROTECCIÓN LEGAL', x, y)
  y += 8

  doc.setFont('times', 'normal')
  doc.setFontSize(CONTRACT_LAYOUT.bodyFontSize)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  y = drawJustifiedParagraph(
    doc,
    'Esta matriz resume los frentes de protección incorporados al contrato para reducir riesgos de nulidad, desnaturalización, contingencia inspectiva y pérdida de evidencia.',
    x,
    y,
    maxWidth,
    lh,
  )
  y += 5

  const criticalClauses = premiumDocument.riskControls.filter((control) => control.severity === 'BLOCKER')
  const requiredAnnexes = premiumDocument.annexes.filter((annex) => annex.required)
  const rows = [
    ['Cláusulas críticas', `${criticalClauses.length} controles determinísticos`, criticalClauses.slice(0, 4).map((item) => item.label).join('; ')],
    ['Anexos obligatorios', `${requiredAnnexes.length} anexos requeridos`, requiredAnnexes.map((item) => item.title).join('; ')],
    ['Base legal', `${premiumDocument.legalBasis.length} referencias trazables`, premiumDocument.legalBasis.slice(0, 5).join('; ')],
  ]

  const col1 = 38
  const col2 = 42
  const col3 = maxWidth - col1 - col2
  y = drawMatrixRow(doc, y, ['Frente', 'Cobertura', 'Evidencia'], [col1, col2, col3], true, headerOpts)
  for (const row of rows) {
    y = drawMatrixRow(doc, y, row, [col1, col2, col3], false, headerOpts)
  }

  return y + 3
}

function drawMatrixRow(
  doc: JsPDFContractDoc,
  y: number,
  cells: string[],
  widths: number[],
  header: boolean,
  headerOpts: ContractHeaderOpts,
): number {
  const x = CONTRACT_LAYOUT.marginX
  const padding = 2.5
  const lineHeight = 4.3
  const wrapped = cells.map((cell, index) => doc.splitTextToSize(cell, widths[index] - padding * 2))
  const height = Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + padding * 2
  y = checkContractPageBreak(doc, y, height + 6, headerOpts)

  let cellX = x
  doc.setDrawColor(...CONTRACT_LAYOUT.hairlineColor)
  if (header) doc.setFillColor(244, 246, 245)
  widths.forEach((width, index) => {
    if (header) doc.rect(cellX, y, width, height, 'FD')
    else doc.rect(cellX, y, width, height)
    doc.setFont('times', header ? 'bold' : 'normal')
    doc.setFontSize(header ? 8.8 : 8.5)
    doc.setTextColor(...CONTRACT_LAYOUT.textColor)
    doc.text(wrapped[index], cellX + padding, y + padding + 3)
    cellX += width
  })
  return y + height
}

function renderPremiumDocumentControl(
  doc: JsPDFContractDoc,
  y: number,
  premiumDocument: PremiumContractDocument,
  headerOpts: ContractHeaderOpts,
): number {
  const W = doc.internal.pageSize.getWidth()
  const x = CONTRACT_LAYOUT.marginX
  const maxWidth = W - CONTRACT_LAYOUT.marginX * 2
  const lh = CONTRACT_LAYOUT.lineHeight
  y = checkContractPageBreak(doc, y, lh * 6, headerOpts)

  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(20, 70, 60)
  doc.text('CONTROL DOCUMENTAL', x, y)
  y += 8

  const rows = [
    ['Versión canónica', premiumDocument.version],
    ['Jurisdicción', premiumDocument.jurisdiction],
    ['Familia legal', premiumDocument.legalFamily],
    ['Cláusulas críticas', String(premiumDocument.clauses.length)],
    ['Anexos requeridos', String(premiumDocument.annexes.filter((annex) => annex.required).length)],
  ]

  for (const [label, value] of rows) {
    y = checkContractPageBreak(doc, y, lh * 2, headerOpts)
    doc.setFont('times', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...CONTRACT_LAYOUT.textColor)
    doc.text(`${label}:`, x, y)
    doc.setFont('times', 'normal')
    doc.text(value, x + 42, y)
    y += 5.5
  }

  y += 3
  doc.setFont('times', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
  y = drawJustifiedParagraph(
    doc,
    'La emisión oficial de este contrato se encuentra condicionada a la validación de datos críticos, ausencia de placeholders, cobertura legal mínima, anexos requeridos y trazabilidad del motor de render.',
    x,
    y,
    maxWidth,
    4.4,
  )
  return y + 4
}

export function withContractRenderMetadata(
  contentJson: unknown,
  metadata: ContractRenderMetadata,
): Record<string, unknown> {
  const base = isRecord(contentJson) ? contentJson : {}
  return {
    ...base,
    renderMetadata: metadata,
    provenance: metadata.provenance,
    generationMode: metadata.generationMode,
    renderVersion: metadata.renderVersion,
    isFallback: metadata.isFallback,
  }
}

export function withContractProvenanceFormData(
  formData: Record<string, unknown> | null | undefined,
  metadata: ContractRenderMetadata,
): Record<string, unknown> {
  return {
    ...(formData ?? {}),
    _provenance: metadata.provenance,
    _generationMode: metadata.generationMode,
    _renderVersion: metadata.renderVersion,
    _isFallback: metadata.isFallback,
  }
}

function renderTemplateHtml(
  template: ContractTemplateDefinition,
  formData: Record<string, unknown>,
): string {
  const body = template.contentBlocks
    .map((block) => renderContentBlock(block, formData))
    .filter(Boolean)
    .join('\n')
  const employer = String(formData.empleador_razon_social ?? '____________')
  const worker = String(formData.trabajador_nombre ?? '____________')
  return legalDocumentShell({
    title: template.name,
    body,
    signatures: signatureTable(employer, worker),
  })
}

function renderContentBlock(block: ContentBlock, formData: Record<string, unknown>): string {
  if (block.condition && !evaluateCondition(block.condition, formData)) return ''
  const text = resolveTemplateText(block.text, formData)
  const title = block.title
    ? `<h2>${escapeHtml(block.title)}</h2>`
    : ''
  return `<section>${title}<p>${escapeHtml(text).replace(/\n/g, '<br/>')}</p></section>`
}

function renderBulkHtml(
  title: string,
  contractType: string,
  formData: Record<string, unknown>,
): string {
  const fechaFin = formData.fecha_fin
    ? `<p><strong>Fecha de fin:</strong> ${escapeHtml(String(formData.fecha_fin))}</p>`
    : ''
  const causa = contractType === 'LABORAL_PLAZO_FIJO' && formData.causa_objetiva
    ? `<h2>III. Causa objetiva</h2><p>${escapeHtml(String(formData.causa_objetiva))}</p>`
    : ''
  return legalDocumentShell({
    title,
    body: `
      <h2>I. Identificacion del trabajador</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(String(formData.trabajador_nombre ?? ''))}</p>
      <p><strong>DNI:</strong> ${escapeHtml(String(formData.trabajador_dni ?? ''))}</p>
      <p><strong>Cargo:</strong> ${escapeHtml(String(formData.cargo ?? ''))}</p>
      <h2>II. Condiciones laborales</h2>
      <p><strong>Fecha de inicio:</strong> ${escapeHtml(String(formData.fecha_inicio ?? ''))}</p>
      ${fechaFin}
      <p><strong>Remuneracion:</strong> S/ ${escapeHtml(String(formData.remuneracion ?? ''))}</p>
      ${formData.jornada_semanal ? `<p><strong>Jornada semanal:</strong> ${escapeHtml(String(formData.jornada_semanal))}h</p>` : ''}
      ${causa}
    `,
    signatures: signatureTable(
      String(formData.empleador_razon_social ?? 'EL EMPLEADOR'),
      String(formData.trabajador_nombre ?? 'EL TRABAJADOR'),
    ),
  })
}

function renderAiHtml(title: string, contentJson: unknown, contentHtml?: string | null): string {
  if (contentHtml && contentHtml.trim().length > 0) return contentHtml
  const data = isRecord(contentJson) ? contentJson : {}
  const preambulo = typeof data.preambulo === 'string' ? data.preambulo : ''
  const clausulas = Array.isArray(data.clausulas) ? data.clausulas : []
  const body = [
    preambulo ? `<p>${escapeHtml(preambulo)}</p>` : '',
    ...clausulas.map((raw, idx) => {
      const clause = isRecord(raw) ? raw : {}
      const titleText = String(clause.titulo ?? `Clausula ${idx + 1}`)
      const content = String(clause.contenido ?? '')
      const baseLegal = clause.baseLegal
        ? `<p><em>Base legal: ${escapeHtml(String(clause.baseLegal))}</em></p>`
        : ''
      return `<section><h2>${escapeHtml(titleText)}</h2><p>${escapeHtml(content)}</p>${baseLegal}</section>`
    }),
  ].join('\n')
  return legalDocumentShell({ title, body })
}

function legalDocumentShell(input: { title: string; body: string; signatures?: string }): string {
  return `
<article class="contract-document" data-render-version="${RENDER_VERSION}">
  <header>
    <h1>${escapeHtml(input.title.toUpperCase())}</h1>
  </header>
  ${input.body}
  ${input.signatures ?? ''}
</article>`.trim()
}

function signatureTable(employer: string, worker: string): string {
  return `
<table>
  <tr>
    <td><strong>EL EMPLEADOR</strong><br/>${escapeHtml(employer)}</td>
    <td><strong>EL TRABAJADOR</strong><br/>${escapeHtml(worker)}</td>
  </tr>
</table>`
}

function resolveTemplateText(text: string, formData: Record<string, unknown>): string {
  return text.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (_match, key: string) => {
    const value = formData[key]
    if (value === undefined || value === null || value === '') return `{{${key}}}`
    return String(value)
  })
}

function evaluateCondition(condition: string, formData: Record<string, unknown>): boolean {
  try {
    const keys = Object.keys(formData)
    const values = Object.values(formData)
    const fn = new Function(...keys, `return (${condition})`)
    return Boolean(fn(...values))
  } catch {
    return false
  }
}

function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|section|tr)\s*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function findUnresolvedPlaceholders(text: string): string[] {
  const seen = new Set<string>()
  const re = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) seen.add(match[1])
  return [...seen]
}

function assertOfficialRenderReady(
  rendered: ContractRenderResult,
  input: ContractRenderInput,
): void {
  const text = rendered.renderedText.trim()
  const html = rendered.renderedHtml.trim()
  if (!html || !text) {
    throw new ContractRenderError(
      'EMPTY_RENDER',
      'El contrato no tiene contenido renderizable para exportar.',
      { sourceKind: input.sourceKind, title: input.title },
    )
  }

  if (input.allowUnresolvedPlaceholders) return

  const incompleteMarkers = findIncompleteOfficialMarkers(`${rendered.renderedHtml}\n${rendered.renderedText}`)
  if (incompleteMarkers.length > 0) {
    throw new ContractRenderError(
      'INCOMPLETE_OFFICIAL_RENDER',
      'El contrato contiene campos incompletos o marcadores de edición y no puede exportarse como artefacto oficial.',
      {
        sourceKind: input.sourceKind,
        provenance: rendered.renderMetadata.provenance,
        incompleteMarkers,
      },
    )
  }

  const unresolved = uniqueStrings([
    ...rendered.renderMetadata.unresolvedPlaceholders,
    ...missingPlaceholdersFrom(input.contentJson),
  ])
  if (unresolved.length > 0) {
    throw new ContractRenderError(
      'UNRESOLVED_PLACEHOLDERS',
      'El contrato conserva placeholders sin resolver y no puede exportarse como artefacto oficial.',
      {
        sourceKind: input.sourceKind,
        provenance: rendered.renderMetadata.provenance,
        unresolvedPlaceholders: unresolved,
      },
    )
  }
}

function findIncompleteOfficialMarkers(text: string): string[] {
  const markers = new Set<string>()
  if (/\[\s*por\s+completar\s*\]/i.test(text)) markers.add('Por completar')
  const labeledBlankRe = /_{6,}\s*\[([^\]]+)\]\s*_{6,}/g
  let match: RegExpExecArray | null
  while ((match = labeledBlankRe.exec(text)) !== null) {
    const label = match[1]?.trim()
    if (label) markers.add(label)
  }
  return [...markers]
}

function missingPlaceholdersFrom(value: unknown): string[] {
  if (!isRecord(value)) return []
  const direct = stringArray(value.missingPlaceholders)
  const nested = isRecord(value.renderMetadata)
    ? stringArray(value.renderMetadata.unresolvedPlaceholders)
    : []
  return [...direct, ...nested]
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function workerFromFormData(formData: Record<string, unknown>): ContractRenderWorkerContext {
  return {
    fullName: typeof formData.trabajador_nombre === 'string' ? formData.trabajador_nombre : '',
    dni: typeof formData.trabajador_dni === 'string' ? formData.trabajador_dni : '',
    fechaIngreso: typeof formData.fecha_inicio === 'string' ? formData.fecha_inicio : null,
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getNestedString(value: unknown, path: string[]): string | null {
  let current: unknown = value
  for (const key of path) {
    if (!isRecord(current)) return null
    current = current[key]
  }
  return typeof current === 'string' ? current : null
}
