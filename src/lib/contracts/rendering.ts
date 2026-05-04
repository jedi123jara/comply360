import { htmlToDocxBuffer } from '@/lib/contracts/docx/html-to-docx'
import { cleanContractContent } from '@/lib/pdf/contract-content-cleaner'
import {
  addContractHeader,
  addCoverPage,
  addSignatureBlock,
  contractPDFBuffer,
  createContractPDFDoc,
  loadOrgLogoBytes,
  renderContractBody,
} from '@/lib/pdf/contract-pdf'
import {
  getTemplateById,
  getTemplateByType,
  type ContractTemplateDefinition,
  type ContentBlock,
} from '@/lib/legal-engine/contracts/templates'

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
}

export interface ContractRenderResult {
  renderedHtml: string
  renderedText: string
  renderMetadata: ContractRenderMetadata
}

const RENDER_VERSION: ContractRenderMetadata['renderVersion'] = 'contract-render-v1'

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

  if (input.sourceKind === 'template-based' && template) {
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
  return htmlToDocxBuffer({
    title: input.title,
    contentHtml: rendered.renderedHtml,
    author: 'COMPLY360',
    company: input.orgContext?.razonSocial ?? input.orgContext?.name ?? 'COMPLY360',
    footer: 'Generado por COMPLY360',
  })
}

export async function renderContractPdfBuffer(input: ContractRenderInput): Promise<Buffer> {
  const rendered = renderContract(input)
  const org = input.orgContext ?? {}
  const worker = input.workerContext ?? workerFromFormData(input.formData ?? {})
  const logo = await loadOrgLogoBytes(org.logoUrl)
  const headerOpts = { org, logo }
  const doc = await createContractPDFDoc()

  addCoverPage(doc, {
    title: input.title,
    org,
    logo,
    workerFullName: worker.fullName ?? '',
    workerDni: worker.dni ?? '',
    ciudad: String((input.formData ?? {}).ciudad ?? 'Lima'),
    fechaIngreso: worker.fechaIngreso ?? null,
  })
  doc.addPage()
  addContractHeader(doc, headerOpts)
  const bodyEndY = renderContractBody(doc, cleanContractContent(htmlToPlainText(rendered.renderedHtml)), {
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
