import type { ContractAnnexCoverageResult } from './annex-coverage'

export type ContractQualityStatus =
  | 'DRAFT_INCOMPLETE'
  | 'READY_FOR_REVIEW'
  | 'LEGAL_REVIEW_REQUIRED'
  | 'READY_FOR_SIGNATURE'
  | 'BLOCKED'

export interface ContractQualityIssue {
  code: string
  title: string
  message: string
  severity: 'BLOCKER' | 'WARNING' | 'INFO'
  category: 'INPUTS' | 'LEGAL_COVERAGE' | 'ANNEXES' | 'VALIDATION' | 'PROVENANCE' | 'AI' | 'RENDER'
  evidence?: Record<string, unknown>
}

export interface ContractQualityResult {
  status: ContractQualityStatus
  score: number
  qualityGateVersion: 'contract-quality-gate-v1'
  checkedAt: string
  blockers: ContractQualityIssue[]
  warnings: ContractQualityIssue[]
  infos: ContractQualityIssue[]
  requiredActions: string[]
  missingInputs: string[]
  missingAnnexes: string[]
  annexEvidence: ContractAnnexCoverageResult['coveredAnnexes']
  failedLegalRules: string[]
  legalCoverage: Array<{
    key: string
    label: string
    covered: boolean
    required: boolean
    baseLegalRequired: boolean
  }>
}

export interface ContractQualityInput {
  id?: string
  type: string
  status?: string | null
  title: string
  contentHtml?: string | null
  contentJson?: unknown
  formData?: Record<string, unknown> | null
  provenance?: string | null
  renderVersion?: string | null
  isFallback?: boolean | null
  aiReviewedAt?: Date | string | null
  annexCoverage?: ContractAnnexCoverageResult | null
  validationBlockers?: Array<{
    ruleCode: string
    title?: string | null
    message: string
    legalBasis?: string | null
  }>
}

export interface ContractRenderQualityMetadata {
  provenance: string
  generationMode: string
  renderVersion: string | null
  isFallback: boolean
}

const QUALITY_VERSION = 'contract-quality-gate-v1' as const

const LABOR_CONTRACT_TYPES = new Set([
  'LABORAL_INDEFINIDO',
  'LABORAL_PLAZO_FIJO',
  'LABORAL_TIEMPO_PARCIAL',
  'CONVENIO_PRACTICAS',
  'ADDENDUM',
])

const REQUIRED_INPUTS_BY_TYPE: Record<string, string[]> = {
  LABORAL_INDEFINIDO: [
    'empleador_razon_social',
    'empleador_ruc',
    'trabajador_nombre',
    'trabajador_dni',
    'cargo',
    'remuneracion',
    'fecha_inicio',
    'jornada',
    'horario',
  ],
  LABORAL_PLAZO_FIJO: [
    'empleador_razon_social',
    'empleador_ruc',
    'trabajador_nombre',
    'trabajador_dni',
    'cargo',
    'remuneracion',
    'fecha_inicio',
    'fecha_fin',
    'causa_objetiva',
    'jornada',
    'horario',
  ],
  LABORAL_TIEMPO_PARCIAL: [
    'empleador_razon_social',
    'empleador_ruc',
    'trabajador_nombre',
    'trabajador_dni',
    'cargo',
    'remuneracion',
    'fecha_inicio',
    'horario',
    'horas_diarias',
  ],
  LOCACION_SERVICIOS: [
    'comitente_razon_social',
    'comitente_ruc',
    'locador_nombre',
    'locador_dni',
    'servicio',
    'honorario',
    'fecha_inicio',
  ],
  CONVENIO_PRACTICAS: [
    'empleador_razon_social',
    'empleador_ruc',
    'trabajador_nombre',
    'trabajador_dni',
    'centro_estudios',
    'plan_formativo',
    'subvencion',
    'fecha_inicio',
    'fecha_fin',
  ],
}

const REQUIRED_COVERAGE = [
  { key: 'partes', label: 'Partes y representación', required: true, baseLegalRequired: true, terms: ['partes', 'empleador', 'trabajador', 'ruc', 'dni'] },
  { key: 'objeto', label: 'Objeto, cargo y funciones', required: true, baseLegalRequired: true, terms: ['objeto', 'cargo', 'funciones'] },
  { key: 'modalidad', label: 'Modalidad, plazo o vigencia', required: true, baseLegalRequired: true, terms: ['plazo', 'modalidad', 'vigencia', 'indeterminado'] },
  { key: 'remuneracion', label: 'Remuneración y forma de pago', required: true, baseLegalRequired: true, terms: ['remuneracion', 'remuneración', 'pago'] },
  { key: 'jornada', label: 'Jornada, horario y refrigerio', required: true, baseLegalRequired: true, terms: ['jornada', 'horario', 'refrigerio'] },
  { key: 'beneficios', label: 'Beneficios sociales', required: true, baseLegalRequired: true, terms: ['cts', 'gratificaciones', 'vacaciones', 'essalud'] },
  { key: 'sst', label: 'Seguridad y salud en el trabajo', required: true, baseLegalRequired: true, terms: ['seguridad y salud', 'sst', 'ley 29783'] },
  { key: 'hostigamiento', label: 'Prevención del hostigamiento sexual', required: true, baseLegalRequired: true, terms: ['hostigamiento sexual', 'ley 27942'] },
  { key: 'datos', label: 'Protección de datos personales', required: true, baseLegalRequired: true, terms: ['datos personales', 'ley 29733'] },
  { key: 'confidencialidad', label: 'Confidencialidad', required: true, baseLegalRequired: false, terms: ['confidencialidad', 'información confidencial', 'informacion confidencial'] },
  { key: 'terminacion', label: 'Terminación y causales', required: true, baseLegalRequired: true, terms: ['resolución', 'resolucion', 'terminación', 'terminacion', 'despido', 'renuncia'] },
  { key: 'jurisdiccion', label: 'Jurisdicción y ley aplicable', required: true, baseLegalRequired: false, terms: ['jurisdicción', 'jurisdiccion', 'ley aplicable'] },
]

const REQUIRED_LABOR_ANNEXES = [
  'Política de Seguridad y Salud en el Trabajo',
  'Política de Prevención del Hostigamiento Sexual',
  'Consentimiento Informado para Tratamiento de Datos Personales',
  'Descripción de Puesto o Funciones',
]

const INPUT_ALIASES: Record<string, string[]> = {
  empleador_razon_social: ['empleador_razon_social', 'empleadorRazonSocial', 'empresa_razon_social', 'razon_social'],
  empleador_ruc: ['empleador_ruc', 'empleadorRuc', 'empresa_ruc', 'ruc'],
  trabajador_nombre: ['trabajador_nombre', 'trabajadorNombre', 'nombre_trabajador', 'workerName'],
  trabajador_dni: ['trabajador_dni', 'trabajadorDni', 'dni_trabajador', 'documento_trabajador', 'workerDni'],
  cargo: ['cargo', 'trabajador_cargo', 'puesto', 'position'],
  remuneracion: ['remuneracion', 'remuneracion_mensual', 'sueldo', 'sueldo_bruto', 'salary'],
  fecha_inicio: ['fecha_inicio', 'fechaInicio', 'inicio_contrato', 'startDate'],
  fecha_fin: ['fecha_fin', 'fechaFin', 'fin_contrato', 'endDate'],
  causa_objetiva: ['causa_objetiva', 'causaObjetiva', 'motivo_contratacion'],
  jornada: ['jornada', 'jornada_semanal', 'jornada_horas'],
  horario: ['horario', 'horario_trabajo', 'workSchedule'],
  horas_diarias: ['horas_diarias', 'horasDiarias', 'dailyHours'],
  comitente_razon_social: ['comitente_razon_social', 'cliente_razon_social', 'razon_social'],
  comitente_ruc: ['comitente_ruc', 'cliente_ruc', 'ruc'],
  locador_nombre: ['locador_nombre', 'prestador_nombre', 'trabajador_nombre'],
  locador_dni: ['locador_dni', 'prestador_dni', 'trabajador_dni'],
  servicio: ['servicio', 'servicios', 'alcance_servicio', 'scope'],
  honorario: ['honorario', 'honorarios', 'monto', 'fee'],
  centro_estudios: ['centro_estudios', 'institucion_educativa', 'universidad'],
  plan_formativo: ['plan_formativo', 'planFormativo', 'trainingPlan'],
  subvencion: ['subvencion', 'subvencion_mensual', 'stipend'],
}

export function runContractQualityGate(input: ContractQualityInput): ContractQualityResult {
  const issues: ContractQualityIssue[] = []
  const formData = input.formData ?? {}
  const contentJson = isRecord(input.contentJson) ? input.contentJson : {}
  const normalizedText = normalizeText(`${input.title}\n${htmlToText(input.contentHtml ?? '')}\n${JSON.stringify(contentJson)}`)

  const missingInputs = requiredInputsFor(input.type)
    .filter((key) => !hasInputValue(formData, key))

  for (const key of missingInputs) {
    issues.push(issue('INPUT_MISSING', 'Dato crítico incompleto', `Falta completar "${humanizeKey(key)}".`, 'BLOCKER', 'INPUTS', { field: key }))
  }

  const markerLabels = findIncompleteMarkers(`${input.contentHtml ?? ''}\n${normalizedText}`)
  for (const label of markerLabels) {
    issues.push(issue('INCOMPLETE_MARKER', 'Marcador incompleto en el contrato', `El documento contiene un marcador pendiente: ${label}.`, 'BLOCKER', 'RENDER', { marker: label }))
  }

  const placeholders = findPlaceholders(`${input.contentHtml ?? ''}\n${JSON.stringify(contentJson)}`)
  for (const placeholder of placeholders) {
    issues.push(issue('PLACEHOLDER_PENDING', 'Placeholder sin resolver', `El placeholder "{{${placeholder}}}" sigue pendiente.`, 'BLOCKER', 'RENDER', { placeholder }))
  }

  if (!input.contentHtml || htmlToText(input.contentHtml).trim().length < 300) {
    issues.push(issue('CONTENT_TOO_SHORT', 'Contenido contractual insuficiente', 'El contrato no tiene cuerpo legal suficiente para emisión oficial.', 'BLOCKER', 'RENDER'))
  }

  if (!input.provenance || input.provenance === 'LEGACY') {
    issues.push(issue('PROVENANCE_WEAK', 'Procedencia documental débil', 'El contrato no tiene procedencia premium/controlada suficiente.', 'WARNING', 'PROVENANCE'))
  }
  if (!input.renderVersion) {
    issues.push(issue('RENDER_VERSION_MISSING', 'Versión de render ausente', 'El contrato no acredita versión del motor de render.', 'BLOCKER', 'PROVENANCE'))
  }

  if (input.isFallback && !input.aiReviewedAt) {
    issues.push(issue('AI_FALLBACK_UNREVIEWED', 'Fallback IA sin revisión', 'El contrato fue generado por fallback y requiere revisión normativa antes de emisión.', 'BLOCKER', 'AI'))
  }

  for (const blocker of input.validationBlockers ?? []) {
    issues.push(issue(
      'VALIDATION_BLOCKER',
      blocker.title ?? blocker.ruleCode,
      blocker.message,
      'BLOCKER',
      'VALIDATION',
      { ruleCode: blocker.ruleCode, legalBasis: blocker.legalBasis },
    ))
  }

  if (input.type === 'LABORAL_PLAZO_FIJO' && weakCauseObjective(getInputValue(formData, 'causa_objetiva'))) {
    issues.push(issue('WEAK_CAUSE_OBJECTIVE', 'Causa objetiva insuficiente', 'El contrato a plazo fijo requiere una causa objetiva específica, verificable y no genérica.', 'BLOCKER', 'LEGAL_COVERAGE'))
  }

  if (input.type === 'LOCACION_SERVICIOS' && hasSubordinationRisk(normalizedText, formData)) {
    issues.push(issue('SERVICE_SUBORDINATION_RISK', 'Riesgo de desnaturalización laboral', 'La locación contiene señales de subordinación laboral y requiere redacción correctiva o revisión legal.', 'BLOCKER', 'LEGAL_COVERAGE'))
  }

  const legalCoverage = REQUIRED_COVERAGE.map((item) => {
    const covered = item.terms.some((term) => normalizedText.includes(normalizeText(term)))
    return {
      key: item.key,
      label: item.label,
      required: item.required,
      baseLegalRequired: item.baseLegalRequired,
      covered,
    }
  })

  if (LABOR_CONTRACT_TYPES.has(input.type)) {
    for (const coverage of legalCoverage.filter((item) => item.required && !item.covered)) {
      issues.push(issue('LEGAL_COVERAGE_MISSING', 'Cláusula crítica ausente', `Falta cobertura contractual: ${coverage.label}.`, 'BLOCKER', 'LEGAL_COVERAGE', { coverage: coverage.key }))
    }
  }

  const baseLegalCount = countBaseLegalReferences(normalizedText)
  const requiredBaseLegalCount = LABOR_CONTRACT_TYPES.has(input.type) ? 8 : 3
  if (baseLegalCount < requiredBaseLegalCount) {
    issues.push(issue('BASE_LEGAL_INSUFFICIENT', 'Base legal insuficiente', `El contrato debe citar base legal específica en cláusulas críticas (${baseLegalCount}/${requiredBaseLegalCount}).`, 'BLOCKER', 'LEGAL_COVERAGE', { baseLegalCount, requiredBaseLegalCount }))
  }

  const missingAnnexes = resolveMissingAnnexes(input, contentJson, normalizedText)
  for (const annex of missingAnnexes) {
    issues.push(issue(
      'ANNEX_MISSING',
      'Anexo obligatorio pendiente',
      `Falta evidencia documental vigente para el anexo obligatorio: ${annex}.`,
      'BLOCKER',
      'ANNEXES',
      { annex, source: input.annexCoverage ? 'DOCUMENT_EVIDENCE' : 'DECLARED_CONTENT' },
    ))
  }

  const blockers = issues.filter((item) => item.severity === 'BLOCKER')
  const warnings = issues.filter((item) => item.severity === 'WARNING')
  const infos = issues.filter((item) => item.severity === 'INFO')
  const score = calculateScore(blockers, warnings, legalCoverage)
  const status = resolveStatus({ blockers, warnings, score, input })

  return {
    status,
    score,
    qualityGateVersion: QUALITY_VERSION,
    checkedAt: new Date().toISOString(),
    blockers,
    warnings,
    infos,
    requiredActions: [...new Set(blockers.map(actionForIssue))],
    missingInputs,
    missingAnnexes,
    annexEvidence: input.annexCoverage?.coveredAnnexes ?? [],
    failedLegalRules: blockers
      .filter((item) => item.category === 'VALIDATION' || item.category === 'LEGAL_COVERAGE')
      .map((item) => item.code),
    legalCoverage,
  }
}

export function isContractQualityPassing(result: ContractQualityResult): boolean {
  return result.status === 'READY_FOR_SIGNATURE'
}

export function withContractQualityMetadata(
  contentJson: unknown,
  quality: ContractQualityResult,
): Record<string, unknown> {
  return {
    ...(isRecord(contentJson) ? contentJson : {}),
    quality,
    qualityStatus: quality.status,
    qualityScore: quality.score,
    qualityGateVersion: quality.qualityGateVersion,
    lastQualityCheckAt: quality.checkedAt,
    missingInputs: quality.missingInputs,
    missingAnnexes: quality.missingAnnexes,
    annexEvidence: quality.annexEvidence,
    failedLegalRules: quality.failedLegalRules,
  }
}

export function readContractRenderQualityMetadata(
  contentJson: unknown,
  formData: unknown,
): ContractRenderQualityMetadata {
  const json = isRecord(contentJson) ? contentJson : {}
  const form = isRecord(formData) ? formData : {}
  const renderMetadata = isRecord(json.renderMetadata) ? json.renderMetadata : {}
  const provenance = firstString(
    json.provenance,
    form._provenance,
    renderMetadata.provenance,
    'LEGACY',
  )
  return {
    provenance,
    generationMode: firstString(
      json.generationMode,
      form._generationMode,
      renderMetadata.generationMode,
      provenance === 'LEGACY' ? 'legacy' : 'deterministic',
    ),
    renderVersion: firstStringOrNull(
      json.renderVersion,
      form._renderVersion,
      renderMetadata.renderVersion,
    ),
    isFallback: firstBoolean(json.isFallback, form._isFallback, renderMetadata.isFallback),
  }
}

function requiredInputsFor(type: string): string[] {
  return REQUIRED_INPUTS_BY_TYPE[type] ?? [
    'empleador_razon_social',
    'empleador_ruc',
    'trabajador_nombre',
    'trabajador_dni',
  ]
}

function hasInputValue(formData: Record<string, unknown>, key: string): boolean {
  return !isBlank(getInputValue(formData, key))
}

function getInputValue(formData: Record<string, unknown>, key: string): unknown {
  for (const candidate of INPUT_ALIASES[key] ?? [key]) {
    if (!isBlank(formData[candidate])) return formData[candidate]
  }
  return undefined
}

function issue(
  code: string,
  title: string,
  message: string,
  severity: ContractQualityIssue['severity'],
  category: ContractQualityIssue['category'],
  evidence?: Record<string, unknown>,
): ContractQualityIssue {
  return { code, title, message, severity, category, evidence }
}

function resolveStatus(input: {
  blockers: ContractQualityIssue[]
  warnings: ContractQualityIssue[]
  score: number
  input: ContractQualityInput
}): ContractQualityStatus {
  if (input.blockers.length > 0) {
    return input.blockers.some((item) => item.category === 'INPUTS' || item.category === 'RENDER')
      ? 'DRAFT_INCOMPLETE'
      : 'BLOCKED'
  }
  if (input.warnings.length > 0 || input.score < 90) return 'LEGAL_REVIEW_REQUIRED'
  return 'READY_FOR_SIGNATURE'
}

function calculateScore(
  blockers: ContractQualityIssue[],
  warnings: ContractQualityIssue[],
  coverage: ContractQualityResult['legalCoverage'],
): number {
  const coveredRequired = coverage.filter((item) => item.required && item.covered).length
  const required = Math.max(coverage.filter((item) => item.required).length, 1)
  const coverageScore = (coveredRequired / required) * 100
  return Math.max(0, Math.round(coverageScore - blockers.length * 12 - warnings.length * 4))
}

function actionForIssue(issueItem: ContractQualityIssue): string {
  switch (issueItem.category) {
    case 'INPUTS':
      return 'Completar datos críticos del contrato.'
    case 'LEGAL_COVERAGE':
      return 'Agregar o corregir cláusulas críticas con base legal específica.'
    case 'ANNEXES':
      return 'Adjuntar o declarar anexos obligatorios del contrato.'
    case 'VALIDATION':
      return 'Resolver bloqueos de validación legal antes de emitir.'
    case 'PROVENANCE':
      return 'Re-renderizar el contrato con el motor premium actual.'
    case 'AI':
      return 'Enviar el contrato a revisión normativa antes de emitir.'
    case 'RENDER':
      return 'Eliminar placeholders y marcadores incompletos del documento.'
  }
}

function weakCauseObjective(value: unknown): boolean {
  const text = normalizeText(String(value ?? ''))
  if (text.length < 40) return true
  return [
    'incremento de actividad',
    'necesidad de mercado',
    'servicio temporal',
    'campana',
    'campaña',
  ].some((generic) => text === normalizeText(generic) || text.startsWith(`${normalizeText(generic)}.`))
}

function hasSubordinationRisk(text: string, formData: Record<string, unknown>): boolean {
  const joined = `${text} ${normalizeText(JSON.stringify(formData))}`
  const signals = [
    'horario fijo',
    'jornada',
    'subordinacion',
    'subordinación',
    'exclusividad',
    'supervision directa',
    'supervisión directa',
    'centro de trabajo',
    'amonestacion',
    'amonestación',
  ]
  return signals.filter((signal) => joined.includes(normalizeText(signal))).length >= 2
}

function hasAnnex(contentJson: Record<string, unknown>, text: string, annex: string): boolean {
  const normalizedAnnex = normalizeText(annex)
  const annexes = [
    ...stringArray(contentJson.anexos),
    ...stringArray(contentJson.annexes),
    ...stringArray(isRecord(contentJson.premiumDocument) ? contentJson.premiumDocument.annexes : undefined),
  ]
  return annexes.some((item) => normalizeText(item).includes(normalizedAnnex.slice(0, 18)))
    || text.includes(normalizedAnnex.slice(0, 18))
}

function resolveMissingAnnexes(
  input: ContractQualityInput,
  contentJson: Record<string, unknown>,
  normalizedText: string,
): string[] {
  if (input.annexCoverage) return input.annexCoverage.missingAnnexes
  if (!LABOR_CONTRACT_TYPES.has(input.type)) return []
  return REQUIRED_LABOR_ANNEXES.filter((annex) => !hasAnnex(contentJson, normalizedText, annex))
}

function countBaseLegalReferences(text: string): number {
  return (text.match(/base legal|d\.s\.|d\.leg|ley \d{4,5}|codigo civil|código civil/g) ?? []).length
}

function findPlaceholders(text: string): string[] {
  const seen = new Set<string>()
  const re = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) seen.add(match[1])
  return [...seen]
}

function findIncompleteMarkers(text: string): string[] {
  const markers = new Set<string>()
  if (/\[\s*por\s+completar\s*\]/i.test(text)) markers.add('Por completar')
  const labeledBlankRe = /_{6,}\s*\[([^\]]+)\]\s*_{6,}/g
  let match: RegExpExecArray | null
  while ((match = labeledBlankRe.exec(text)) !== null) {
    if (match[1]) markers.add(match[1].trim())
  }
  return [...markers]
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|section|tr)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ')
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim().length === 0
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value
  }
  return 'LEGACY'
}

function firstStringOrNull(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

function firstBoolean(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === 'boolean') return value
  }
  return false
}
