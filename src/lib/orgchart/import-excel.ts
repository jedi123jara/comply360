import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'

export type OrgChartImportRowStatus = 'READY' | 'WARNING' | 'ERROR'

export interface OrgChartImportPreviewRow {
  rowNumber: number
  dni: string | null
  workerName: string | null
  workerId: string | null
  workerMatchedName: string | null
  areaName: string | null
  positionTitle: string | null
  managerRef: string | null
  resolvedManager: string | null
  status: OrgChartImportRowStatus
  messages: string[]
}

export interface OrgChartImportPreview {
  fileName: string | null
  sheetName: string | null
  totals: {
    rows: number
    ready: number
    warnings: number
    errors: number
    workersMatched: number
    vacantPositions: number
    unitsToCreate: number
    unitsToReactivate: number
    positionsToCreate: number
    positionsToReparent: number
    assignmentsToCreate: number
    assignmentsToClose: number
  }
  columns: string[]
  rows: OrgChartImportPreviewRow[]
  errors: string[]
}

export interface OrgChartImportApplyResult extends OrgChartImportPreview {
  applied: true
  created: {
    units: number
    positions: number
    assignments: number
  }
  updated: {
    unitsReactivated: number
    positionsReparented: number
  }
  closedAssignments: number
}

interface ImportOptions {
  fileName?: string | null
}

interface ApplyOptions extends ImportOptions {
  userId?: string | null
  ipAddress?: string | null
}

export const ORGCHART_IMPORT_MAX_BYTES = 5 * 1024 * 1024
export const ORGCHART_IMPORT_MAX_ROWS = 500
export const ORGCHART_IMPORT_ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const

interface ParsedWorkbook {
  sheetName: string | null
  columns: string[]
  rows: ParsedImportRow[]
}

interface ParsedImportRow {
  rowNumber: number
  raw: Record<string, string>
  dni: string | null
  workerName: string | null
  areaName: string | null
  positionTitle: string | null
  managerRef: string | null
  level: string | null
  category: string | null
  riskCategory: string | null
  requiresSctr: boolean | null
  requiresMedicalExam: boolean | null
  isCritical: boolean | null
  purpose: string | null
  functions: string[] | null
  responsibilities: string[] | null
  requirements: string[] | null
}

interface WorkerRecord {
  id: string
  dni: string
  firstName: string
  lastName: string
}

interface UnitRecord {
  id: string
  name: string
  slug: string
  isActive: boolean
  validTo: Date | null
}

interface PositionRecord {
  id: string
  orgUnitId: string
  title: string
  reportsToPositionId: string | null
  seats: number
  validTo: Date | null
}

interface AssignmentRecord {
  id: string
  workerId: string
  positionId: string
  isPrimary: boolean
}

interface PreparedRow {
  parsed: ParsedImportRow
  worker: WorkerRecord | null
  positionKey: string | null
  managerPositionKey: string | null
  managerPositionId: string | null
  managerResolvedLabel: string | null
  errors: string[]
  warnings: string[]
}

interface PreparedImport {
  parsed: ParsedWorkbook
  rows: PreparedRow[]
  preview: OrgChartImportPreview
  unitsBySlug: Map<string, UnitRecord>
  positionsByKey: Map<string, PositionRecord>
  activeAssignmentsByWorkerId: Map<string, AssignmentRecord>
}

const COLUMN_ALIASES = {
  dni: ['dni', 'documento', 'doc', 'numero documento', 'numero de documento', 'trabajador dni'],
  workerName: ['trabajador', 'nombre', 'nombre trabajador', 'apellidos y nombres', 'colaborador'],
  areaName: ['area', 'area organizacional', 'unidad', 'departamento', 'gerencia'],
  positionTitle: ['cargo', 'puesto', 'posicion', 'position', 'titulo cargo'],
  managerRef: ['jefe inmediato', 'reporta a', 'superior', 'manager', 'jefe dni o cargo'],
  level: ['nivel', 'level'],
  category: ['categoria', 'categoria cargo', 'familia cargo'],
  riskCategory: ['riesgo', 'categoria riesgo', 'riesgo sst', 'nivel riesgo'],
  requiresSctr: ['sctr', 'requiere sctr'],
  requiresMedicalExam: ['examen medico', 'requiere examen medico', 'emo'],
  isCritical: ['critico', 'cargo critico', 'posicion critica'],
  purpose: ['proposito', 'mision', 'objetivo cargo'],
  functions: ['funciones', 'funciones principales'],
  responsibilities: ['responsabilidades', 'responsabilidades legales'],
  requirements: ['requisitos', 'perfil', 'competencias'],
} satisfies Record<string, string[]>

const ACTIVE_WORKER_STATUSES = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED'] as const
const ORGCHART_IMPORT_ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])
const ORGCHART_IMPORT_GENERIC_MIME_TYPES = new Set([
  'application/octet-stream',
  'binary/octet-stream',
])

export function validateOrgChartImportFileMetadata(input: {
  fileName?: string | null
  mimeType?: string | null
  size?: number | null
}) {
  const errors: string[] = []
  const extension = importFileExtension(input.fileName)
  if (!extension || !(ORGCHART_IMPORT_ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
    errors.push('Formato no soportado. Usa un archivo .xlsx, .xls o .csv.')
  }

  if (typeof input.size === 'number') {
    if (input.size <= 0) {
      errors.push('El archivo está vacío.')
    }
    if (input.size > ORGCHART_IMPORT_MAX_BYTES) {
      errors.push(`El archivo supera el límite de ${formatMegabytes(ORGCHART_IMPORT_MAX_BYTES)} MB.`)
    }
  }

  const mimeType = normalizeMimeType(input.mimeType)
  if (
    mimeType &&
    !ORGCHART_IMPORT_ALLOWED_MIME_TYPES.has(mimeType) &&
    !ORGCHART_IMPORT_GENERIC_MIME_TYPES.has(mimeType)
  ) {
    errors.push('El tipo de archivo no coincide con Excel o CSV.')
  }

  return errors
}

export async function previewOrgChartImport(
  orgId: string,
  file: Buffer,
  options: ImportOptions = {},
): Promise<OrgChartImportPreview> {
  const prepared = await prepareImport(orgId, file, options)
  return prepared.preview
}

export async function applyOrgChartImport(
  orgId: string,
  file: Buffer,
  options: ApplyOptions = {},
): Promise<OrgChartImportApplyResult> {
  const prepared = await prepareImport(orgId, file, options)
  if (prepared.preview.totals.errors > 0) {
    throw new OrgChartImportValidationError(prepared.preview)
  }

  const appliedAt = new Date()
  const result = await prisma.$transaction(async tx => {
    const created = { units: 0, positions: 0, assignments: 0 }
    const updated = { unitsReactivated: 0, positionsReparented: 0 }
    let closedAssignments = 0

    const unitIdBySlug = new Map<string, string>()
    for (const row of prepared.rows) {
      if (!row.parsed.areaName) continue
      const slug = slugify(row.parsed.areaName) || 'sin-area'
      if (unitIdBySlug.has(slug)) continue

      const existing = prepared.unitsBySlug.get(slug)
      if (existing) {
        if (!existing.isActive || existing.validTo) {
          await tx.orgUnit.update({
            where: { id: existing.id },
            data: { isActive: true, validTo: null, version: { increment: 1 } },
          })
          updated.unitsReactivated++
        }
        unitIdBySlug.set(slug, existing.id)
      } else {
        const unit = await tx.orgUnit.create({
          data: {
            orgId,
            name: row.parsed.areaName,
            slug,
            kind: 'AREA',
            level: 0,
            validFrom: appliedAt,
          },
        })
        await tx.orgUnitClosure.create({
          data: { ancestorId: unit.id, descendantId: unit.id, depth: 0 },
        })
        unitIdBySlug.set(slug, unit.id)
        created.units++
      }
    }

    const positionIdByKey = new Map<string, string>()
    const positionDataByKey = uniquePositionRows(prepared.rows)
    for (const [positionKey, row] of positionDataByKey) {
      const areaSlug = slugify(row.parsed.areaName ?? '') || 'sin-area'
      const unitId = unitIdBySlug.get(areaSlug)
      if (!unitId || !row.parsed.positionTitle) continue

      const existing = prepared.positionsByKey.get(positionKey)
      if (existing) {
        positionIdByKey.set(positionKey, existing.id)
        continue
      }

      const seats = Math.max(1, prepared.rows.filter(item => item.positionKey === positionKey && item.worker).length)
      const position = await tx.orgPosition.create({
        data: {
          orgId,
          orgUnitId: unitId,
          title: row.parsed.positionTitle,
          level: row.parsed.level,
          category: row.parsed.category,
          riskCategory: row.parsed.riskCategory,
          requiresSctr: row.parsed.requiresSctr ?? false,
          requiresMedicalExam: row.parsed.requiresMedicalExam ?? false,
          isCritical: row.parsed.isCritical ?? false,
          isManagerial: isManagerialTitle(row.parsed.positionTitle) || isReferencedAsManager(positionKey, prepared.rows),
          purpose: row.parsed.purpose,
          functions: row.parsed.functions ?? undefined,
          responsibilities: row.parsed.responsibilities ?? undefined,
          requirements: row.parsed.requirements ?? undefined,
          seats,
          validFrom: appliedAt,
        },
      })
      positionIdByKey.set(positionKey, position.id)
      created.positions++
    }

    for (const row of uniquePositionRows(prepared.rows).values()) {
      if (!row.positionKey) continue
      const positionId = positionIdByKey.get(row.positionKey)
      if (!positionId) continue

      const managerId = row.managerPositionKey
        ? positionIdByKey.get(row.managerPositionKey) ?? null
        : row.managerPositionId

      const existing = prepared.positionsByKey.get(row.positionKey)
      if (existing && existing.reportsToPositionId !== managerId) {
        await tx.orgPosition.update({
          where: { id: existing.id },
          data: { reportsToPositionId: managerId },
        })
        updated.positionsReparented++
      } else if (!existing && managerId) {
        await tx.orgPosition.update({
          where: { id: positionId },
          data: { reportsToPositionId: managerId },
        })
      }
    }

    for (const row of prepared.rows) {
      if (!row.worker || !row.positionKey) continue
      const positionId = positionIdByKey.get(row.positionKey)
      if (!positionId) continue

      const current = prepared.activeAssignmentsByWorkerId.get(row.worker.id)
      if (current?.positionId === positionId && current.isPrimary) continue

      if (current) {
        const update = await tx.orgAssignment.updateMany({
          where: { orgId, workerId: row.worker.id, isPrimary: true, endedAt: null },
          data: { endedAt: appliedAt },
        })
        closedAssignments += update.count
      }

      await tx.orgAssignment.create({
        data: {
          orgId,
          workerId: row.worker.id,
          positionId,
          isPrimary: true,
          isInterim: false,
          startedAt: appliedAt,
          capacityPct: 100,
        },
      })
      created.assignments++
    }

    return { created, updated, closedAssignments }
  })

  await prisma.orgStructureChangeLog.create({
    data: {
      orgId,
      type: structureChangeTypeForImport(result),
      entityType: 'OrgChartImport',
      entityId: `import:${appliedAt.toISOString()}`,
      afterJson: {
        fileName: options.fileName ?? null,
        totals: prepared.preview.totals,
        created: result.created,
        updated: result.updated,
        closedAssignments: result.closedAssignments,
      },
      performedById: options.userId ?? null,
      ipAddress: options.ipAddress ?? null,
      reason: 'Importación Excel de estructura organizacional',
    },
  }).catch(() => {})

  await prisma.auditLog.create({
    data: {
      orgId,
      userId: options.userId ?? null,
      action: 'orgchart.import_excel.applied',
      metadataJson: {
        fileName: options.fileName ?? null,
        totals: prepared.preview.totals,
        created: result.created,
        updated: result.updated,
        closedAssignments: result.closedAssignments,
      } as object,
    },
  }).catch(() => {})

  return {
    ...prepared.preview,
    applied: true,
    created: result.created,
    updated: result.updated,
    closedAssignments: result.closedAssignments,
  }
}

export class OrgChartImportValidationError extends Error {
  constructor(public preview: OrgChartImportPreview) {
    super('El archivo tiene errores de validación')
  }
}

export class OrgChartImportFileError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message)
  }
}

async function prepareImport(
  orgId: string,
  file: Buffer,
  options: ImportOptions,
): Promise<PreparedImport> {
  const parsed = parseWorkbook(file)
  const [workers, units, positions, activeAssignments] = await Promise.all([
    prisma.worker.findMany({
      where: { orgId, status: { in: [...ACTIVE_WORKER_STATUSES] } },
      select: { id: true, dni: true, firstName: true, lastName: true },
    }),
    prisma.orgUnit.findMany({
      where: { orgId },
      select: { id: true, name: true, slug: true, isActive: true, validTo: true },
    }),
    prisma.orgPosition.findMany({
      where: { orgId, validTo: null },
      select: { id: true, orgUnitId: true, title: true, reportsToPositionId: true, seats: true, validTo: true },
    }),
    prisma.orgAssignment.findMany({
      where: { orgId, endedAt: null, isPrimary: true },
      select: { id: true, workerId: true, positionId: true, isPrimary: true },
    }),
  ])

  const workersByDni = new Map(workers.map(worker => [normalizeDni(worker.dni), worker]))
  const unitsBySlug = new Map(units.map(unit => [unit.slug, unit]))
  const unitById = new Map(units.map(unit => [unit.id, unit]))
  const positionsByKey = new Map<string, PositionRecord>()
  const positionsByTitle = new Map<string, PositionRecord[]>()
  for (const position of positions) {
    const unit = unitById.get(position.orgUnitId)
    const key = positionKey(unit?.name ?? '', position.title)
    positionsByKey.set(key, position)
    const titleKey = normalizeKey(position.title)
    const list = positionsByTitle.get(titleKey) ?? []
    list.push(position)
    positionsByTitle.set(titleKey, list)
  }

  const activeAssignmentsByWorkerId = new Map(activeAssignments.map(assignment => [assignment.workerId, assignment]))
  const activeAssignmentsByPositionId = new Map(activeAssignments.map(assignment => [assignment.positionId, assignment]))
  const importRowsByDni = new Map<string, ParsedImportRow[]>()
  const importRowsByPositionTitle = new Map<string, ParsedImportRow[]>()

  for (const row of parsed.rows) {
    if (row.dni) {
      const list = importRowsByDni.get(normalizeDni(row.dni)) ?? []
      list.push(row)
      importRowsByDni.set(normalizeDni(row.dni), list)
    }
    if (row.positionTitle) {
      const list = importRowsByPositionTitle.get(normalizeKey(row.positionTitle)) ?? []
      list.push(row)
      importRowsByPositionTitle.set(normalizeKey(row.positionTitle), list)
    }
  }

  const rows: PreparedRow[] = parsed.rows.map(row => {
    const errors: string[] = []
    const warnings: string[] = []

    if (!row.areaName) errors.push('Falta el área.')
    if (!row.positionTitle) errors.push('Falta el cargo.')

    const key = row.areaName && row.positionTitle ? positionKey(row.areaName, row.positionTitle) : null
    const worker = row.dni ? workersByDni.get(normalizeDni(row.dni)) ?? null : null
    if (row.dni && !worker) {
      errors.push(`No existe un trabajador activo con DNI ${row.dni}.`)
    }
    if (!row.dni) {
      warnings.push('Sin DNI: se importará como cargo vacante, sin asignación.')
    }
    if (row.workerName && worker && !namesLookRelated(row.workerName, fullName(worker))) {
      warnings.push(`El nombre del Excel no coincide claramente con ${fullName(worker)}.`)
    }

    const duplicates = row.dni ? importRowsByDni.get(normalizeDni(row.dni)) ?? [] : []
    if (duplicates.length > 1) {
      errors.push('El DNI aparece más de una vez en el archivo.')
    }

    const manager = resolveManager(row, {
      worker,
      importRowsByDni,
      importRowsByPositionTitle,
      positionsByTitle,
      activeAssignmentsByWorkerId,
      activeAssignmentsByPositionId,
      workersByDni,
      unitById,
    })
    errors.push(...manager.errors)
    warnings.push(...manager.warnings)

    if (key && manager.positionKey && key === manager.positionKey) {
      errors.push('El cargo no puede reportarse a sí mismo.')
    }
    if (key && manager.positionId) {
      const existingPosition = positionsByKey.get(key)
      if (existingPosition?.id === manager.positionId) {
        errors.push('El cargo no puede reportarse a sí mismo.')
      }
    }

    const existingPosition = key ? positionsByKey.get(key) : null
    const currentAssignment = worker ? activeAssignmentsByWorkerId.get(worker.id) : null
    if (worker && existingPosition && currentAssignment && currentAssignment.positionId !== existingPosition.id) {
      warnings.push('El trabajador será reasignado y se cerrará su asignación principal vigente.')
    }
    if (worker && !existingPosition && currentAssignment) {
      warnings.push('El trabajador será movido a un cargo nuevo y se cerrará su asignación principal vigente.')
    }
    if (existingPosition && manager.hasExplicitRef && existingPosition.reportsToPositionId !== manager.positionId) {
      warnings.push('El cargo existente cambiará de jefe inmediato.')
    }

    return {
      parsed: row,
      worker,
      positionKey: key,
      managerPositionKey: manager.positionKey,
      managerPositionId: manager.positionId,
      managerResolvedLabel: manager.resolvedLabel,
      errors,
      warnings,
    }
  })

  const cycleKeys = detectImportCycles(rows, positionsByKey, positions)
  if (cycleKeys.size > 0) {
    for (const row of rows) {
      if (row.positionKey && cycleKeys.has(row.positionKey)) {
        row.errors.push('La línea de mando generaría un ciclo jerárquico.')
      }
    }
  }

  const previewRows = rows.map(toPreviewRow)
  const totals = buildTotals(rows, unitsBySlug, positionsByKey, activeAssignmentsByWorkerId)
  const errors = previewRows
    .filter(row => row.status === 'ERROR')
    .flatMap(row => row.messages.map(message => `Fila ${row.rowNumber}: ${message}`))

  return {
    parsed,
    rows,
    preview: {
      fileName: options.fileName ?? null,
      sheetName: parsed.sheetName,
      totals,
      columns: parsed.columns,
      rows: previewRows,
      errors,
    },
    unitsBySlug,
    positionsByKey,
    activeAssignmentsByWorkerId,
  }
}

function parseWorkbook(file: Buffer): ParsedWorkbook {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(file, { type: 'buffer', cellDates: true })
  } catch {
    throw new OrgChartImportFileError('No se pudo leer el archivo. Verifica que sea un Excel o CSV válido.')
  }

  const sheetName = workbook.SheetNames[0] ?? null
  if (!sheetName) {
    throw new OrgChartImportFileError('El archivo no contiene hojas para importar.')
  }

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new OrgChartImportFileError('No se pudo leer la primera hoja del archivo.')
  }

  const dataRowsInRange = worksheetDataRowCount(sheet)
  if (dataRowsInRange > ORGCHART_IMPORT_MAX_ROWS) {
    throw new OrgChartImportFileError(
      `El archivo contiene ${dataRowsInRange} filas. El máximo permitido es ${ORGCHART_IMPORT_MAX_ROWS}.`,
      413,
    )
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
    blankrows: false,
  })

  const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : []
  const rows = rawRows
    .map((raw, index) => parseRow(raw, index + 2))
    .filter(row => row.areaName || row.positionTitle || row.dni || row.workerName || row.managerRef)

  if (rows.length === 0) {
    throw new OrgChartImportFileError('El archivo no contiene filas de estructura para importar.')
  }
  if (rows.length > ORGCHART_IMPORT_MAX_ROWS) {
    throw new OrgChartImportFileError(
      `El archivo contiene ${rows.length} filas útiles. El máximo permitido es ${ORGCHART_IMPORT_MAX_ROWS}.`,
      413,
    )
  }

  return { sheetName, columns, rows }
}

function parseRow(raw: Record<string, unknown>, rowNumber: number): ParsedImportRow {
  const normalized = normalizeRawRow(raw)
  return {
    rowNumber,
    raw: normalized.raw,
    dni: normalizeDni(getCell(normalized, 'dni')) || null,
    workerName: cleanText(getCell(normalized, 'workerName')),
    areaName: cleanText(getCell(normalized, 'areaName')),
    positionTitle: cleanText(getCell(normalized, 'positionTitle')),
    managerRef: cleanText(getCell(normalized, 'managerRef')),
    level: cleanText(getCell(normalized, 'level')),
    category: cleanText(getCell(normalized, 'category')),
    riskCategory: cleanText(getCell(normalized, 'riskCategory')),
    requiresSctr: parseBoolean(getCell(normalized, 'requiresSctr')),
    requiresMedicalExam: parseBoolean(getCell(normalized, 'requiresMedicalExam')),
    isCritical: parseBoolean(getCell(normalized, 'isCritical')),
    purpose: cleanText(getCell(normalized, 'purpose')),
    functions: splitList(getCell(normalized, 'functions')),
    responsibilities: splitList(getCell(normalized, 'responsibilities')),
    requirements: splitList(getCell(normalized, 'requirements')),
  }
}

function normalizeRawRow(raw: Record<string, unknown>) {
  const cells = new Map<string, string>()
  const rawStrings: Record<string, string> = {}
  for (const [header, value] of Object.entries(raw)) {
    const headerText = String(header).trim()
    const key = normalizeHeader(headerText)
    const cell = cellToString(value)
    cells.set(key, cell)
    rawStrings[headerText] = cell
  }
  return { cells, raw: rawStrings }
}

function getCell(row: ReturnType<typeof normalizeRawRow>, field: keyof typeof COLUMN_ALIASES) {
  for (const alias of COLUMN_ALIASES[field]) {
    const value = row.cells.get(normalizeHeader(alias))
    if (value !== undefined && value.trim() !== '') return value
  }
  return ''
}

function resolveManager(
  row: ParsedImportRow,
  context: {
    worker: WorkerRecord | null
    importRowsByDni: Map<string, ParsedImportRow[]>
    importRowsByPositionTitle: Map<string, ParsedImportRow[]>
    positionsByTitle: Map<string, PositionRecord[]>
    activeAssignmentsByWorkerId: Map<string, AssignmentRecord>
    activeAssignmentsByPositionId: Map<string, AssignmentRecord>
    workersByDni: Map<string, WorkerRecord>
    unitById: Map<string, UnitRecord>
  },
): {
  positionKey: string | null
  positionId: string | null
  resolvedLabel: string | null
  hasExplicitRef: boolean
  errors: string[]
  warnings: string[]
} {
  const ref = cleanText(row.managerRef)
  if (!ref) {
    return { positionKey: null, positionId: null, resolvedLabel: null, hasExplicitRef: false, errors: [], warnings: [] }
  }

  const errors: string[] = []
  const warnings: string[] = []
  const dni = normalizeDni(ref)

  if (dni) {
    const imported = context.importRowsByDni.get(dni) ?? []
    if (imported.length === 1) {
      const managerRow = imported[0]
      if (managerRow.areaName && managerRow.positionTitle) {
        return {
          positionKey: positionKey(managerRow.areaName, managerRow.positionTitle),
          positionId: null,
          resolvedLabel: `${managerRow.positionTitle} (${managerRow.areaName})`,
          hasExplicitRef: true,
          errors,
          warnings,
        }
      }
    }

    const worker = context.workersByDni.get(dni)
    const activeAssignment = worker ? context.activeAssignmentsByWorkerId.get(worker.id) : null
    if (activeAssignment) {
      return {
        positionKey: null,
        positionId: activeAssignment.positionId,
        resolvedLabel: fullName(worker!),
        hasExplicitRef: true,
        errors,
        warnings,
      }
    }
  }

  const scopedRef = parseScopedPositionRef(ref)
  if (scopedRef) {
    return {
      positionKey: positionKey(scopedRef.areaName, scopedRef.positionTitle),
      positionId: null,
      resolvedLabel: `${scopedRef.positionTitle} (${scopedRef.areaName})`,
      hasExplicitRef: true,
      errors,
      warnings,
    }
  }

  const importedByTitle = context.importRowsByPositionTitle.get(normalizeKey(ref)) ?? []
  const importedKeys = uniqueStrings(
    importedByTitle
      .filter(item => item.areaName && item.positionTitle)
      .map(item => positionKey(item.areaName!, item.positionTitle!)),
  )
  if (importedKeys.length === 1) {
    const managerRow = importedByTitle.find(item => item.areaName && item.positionTitle)
    return {
      positionKey: importedKeys[0],
      positionId: null,
      resolvedLabel: managerRow ? `${managerRow.positionTitle} (${managerRow.areaName})` : ref,
      hasExplicitRef: true,
      errors,
      warnings,
    }
  }
  if (importedKeys.length > 1) {
    errors.push(`Jefe inmediato ambiguo: "${ref}" aparece en varias áreas.`)
    return { positionKey: null, positionId: null, resolvedLabel: null, hasExplicitRef: true, errors, warnings }
  }

  const existingByTitle = context.positionsByTitle.get(normalizeKey(ref)) ?? []
  if (existingByTitle.length === 1) {
    const position = existingByTitle[0]
    const unit = context.unitById.get(position.orgUnitId)
    return {
      positionKey: null,
      positionId: position.id,
      resolvedLabel: `${position.title} (${unit?.name ?? 'área existente'})`,
      hasExplicitRef: true,
      errors,
      warnings,
    }
  }
  if (existingByTitle.length > 1) {
    errors.push(`Jefe inmediato ambiguo: "${ref}" existe en varias áreas. Usa DNI o "Área :: Cargo".`)
    return { positionKey: null, positionId: null, resolvedLabel: null, hasExplicitRef: true, errors, warnings }
  }

  errors.push(`No se pudo resolver el jefe inmediato "${ref}".`)
  return { positionKey: null, positionId: null, resolvedLabel: null, hasExplicitRef: true, errors, warnings }
}

function detectImportCycles(
  rows: PreparedRow[],
  existingPositionsByKey: Map<string, PositionRecord>,
  existingPositions: PositionRecord[],
) {
  const positionIdByKey = new Map<string, string>()
  const syntheticKeyById = new Map<string, string>()
  for (const row of rows) {
    if (!row.positionKey) continue
    const existing = existingPositionsByKey.get(row.positionKey)
    const id = existing?.id ?? `new:${row.positionKey}`
    positionIdByKey.set(row.positionKey, id)
    syntheticKeyById.set(id, row.positionKey)
  }

  const parentById = new Map<string, string | null>()
  for (const position of existingPositions) {
    parentById.set(position.id, position.reportsToPositionId)
  }
  for (const row of rows) {
    if (!row.positionKey) continue
    const id = positionIdByKey.get(row.positionKey)
    if (!id) continue
    const parentId = row.managerPositionKey
      ? positionIdByKey.get(row.managerPositionKey) ?? null
      : row.managerPositionId
    parentById.set(id, parentId)
  }

  const cycleKeys = new Set<string>()
  for (const [key, id] of positionIdByKey) {
    const path = new Set<string>()
    let cursor: string | null | undefined = id
    while (cursor) {
      if (path.has(cursor)) {
        for (const item of path) {
          const cycleKey = syntheticKeyById.get(item)
          if (cycleKey) cycleKeys.add(cycleKey)
        }
        cycleKeys.add(key)
        break
      }
      path.add(cursor)
      cursor = parentById.get(cursor)
    }
  }
  return cycleKeys
}

function buildTotals(
  rows: PreparedRow[],
  unitsBySlug: Map<string, UnitRecord>,
  positionsByKey: Map<string, PositionRecord>,
  activeAssignmentsByWorkerId: Map<string, AssignmentRecord>,
): OrgChartImportPreview['totals'] {
  const previewRows = rows.map(toPreviewRow)
  const validRows = rows.filter(row => row.errors.length === 0)
  const uniqueAreaSlugs = uniqueStrings(
    validRows
      .map(row => row.parsed.areaName)
      .filter((value): value is string => Boolean(value))
      .map(area => slugify(area) || 'sin-area'),
  )
  const uniquePositionKeys = uniqueStrings(
    validRows.map(row => row.positionKey).filter((value): value is string => Boolean(value)),
  )

  let assignmentsToCreate = 0
  let assignmentsToClose = 0
  for (const row of validRows) {
    if (!row.worker || !row.positionKey) continue
    const existingPosition = positionsByKey.get(row.positionKey)
    const current = activeAssignmentsByWorkerId.get(row.worker.id)
    if (!existingPosition || current?.positionId !== existingPosition.id || !current.isPrimary) {
      assignmentsToCreate++
    }
    if (current && (!existingPosition || current.positionId !== existingPosition.id)) {
      assignmentsToClose++
    }
  }

  let positionsToReparent = 0
  for (const row of uniquePositionRows(validRows).values()) {
    if (!row.positionKey) continue
    const existingPosition = positionsByKey.get(row.positionKey)
    if (!existingPosition) continue
    const managerId = row.managerPositionId
    if (row.managerPositionKey) {
      const importedExisting = positionsByKey.get(row.managerPositionKey)
      if (importedExisting && existingPosition.reportsToPositionId !== importedExisting.id) {
        positionsToReparent++
      }
      if (!importedExisting && existingPosition.reportsToPositionId !== null) {
        positionsToReparent++
      }
    } else if (existingPosition.reportsToPositionId !== managerId) {
      positionsToReparent++
    }
  }

  return {
    rows: rows.length,
    ready: previewRows.filter(row => row.status === 'READY').length,
    warnings: previewRows.filter(row => row.status === 'WARNING').length,
    errors: previewRows.filter(row => row.status === 'ERROR').length,
    workersMatched: validRows.filter(row => row.worker).length,
    vacantPositions: validRows.filter(row => !row.worker).length,
    unitsToCreate: uniqueAreaSlugs.filter(slug => !unitsBySlug.has(slug)).length,
    unitsToReactivate: uniqueAreaSlugs.filter(slug => {
      const unit = unitsBySlug.get(slug)
      return Boolean(unit && (!unit.isActive || unit.validTo))
    }).length,
    positionsToCreate: uniquePositionKeys.filter(key => !positionsByKey.has(key)).length,
    positionsToReparent,
    assignmentsToCreate,
    assignmentsToClose,
  }
}

function toPreviewRow(row: PreparedRow): OrgChartImportPreviewRow {
  const messages = [...row.errors, ...row.warnings]
  return {
    rowNumber: row.parsed.rowNumber,
    dni: row.parsed.dni,
    workerName: row.parsed.workerName,
    workerId: row.worker?.id ?? null,
    workerMatchedName: row.worker ? fullName(row.worker) : null,
    areaName: row.parsed.areaName,
    positionTitle: row.parsed.positionTitle,
    managerRef: row.parsed.managerRef,
    resolvedManager: row.managerResolvedLabel,
    status: row.errors.length > 0 ? 'ERROR' : row.warnings.length > 0 ? 'WARNING' : 'READY',
    messages,
  }
}

function uniquePositionRows(rows: PreparedRow[]) {
  const map = new Map<string, PreparedRow>()
  for (const row of rows) {
    if (row.errors.length > 0 || !row.positionKey) continue
    if (!map.has(row.positionKey)) map.set(row.positionKey, row)
  }
  return map
}

function isReferencedAsManager(positionKeyValue: string, rows: PreparedRow[]) {
  return rows.some(row => row.managerPositionKey === positionKeyValue)
}

function namesLookRelated(input: string, expected: string) {
  const inputTokens = new Set(normalizeKey(input).split(' ').filter(token => token.length >= 3))
  const expectedTokens = normalizeKey(expected).split(' ').filter(token => token.length >= 3)
  if (inputTokens.size === 0 || expectedTokens.length === 0) return true
  return expectedTokens.some(token => inputTokens.has(token))
}

function parseScopedPositionRef(input: string) {
  const parts = input
    .split(/::|>|\/|\\/g)
    .map(part => cleanText(part))
    .filter((part): part is string => Boolean(part))
  if (parts.length < 2) return null
  return { areaName: parts[0], positionTitle: parts.slice(1).join(' ') }
}

function fullName(worker: WorkerRecord) {
  return `${worker.firstName} ${worker.lastName}`.trim()
}

function positionKey(areaName: string, positionTitle: string) {
  return `${slugify(areaName) || 'sin-area'}::${normalizeKey(positionTitle)}`
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function normalizeHeader(input: string) {
  return normalizeKey(input).replace(/[^a-z0-9]+/g, ' ').trim()
}

function normalizeKey(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDni(input: string | null) {
  if (!input) return ''
  return input.replace(/\D/g, '')
}

function cleanText(input: string | null | undefined) {
  const value = (input ?? '').replace(/\s+/g, ' ').trim()
  return value || null
}

function cellToString(value: unknown) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

function parseBoolean(input: string | null | undefined) {
  const value = normalizeKey(input ?? '')
  if (!value) return null
  if (['si', 's', 'yes', 'y', 'true', '1', 'x'].includes(value)) return true
  if (['no', 'n', 'false', '0'].includes(value)) return false
  return null
}

function splitList(input: string | null | undefined) {
  const value = cleanText(input)
  if (!value) return null
  const items = value
    .split(/\r?\n|;|\u2022/g)
    .map(item => cleanText(item))
    .filter((item): item is string => Boolean(item))
  return items.length > 0 ? items : null
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values))
}

function isManagerialTitle(title: string) {
  return /(gerente|jefe|director|coordinador|supervisor|lider|líder|head|chief|presidente|ceo|cfo|cto)/i.test(title)
}

function importFileExtension(fileName: string | null | undefined) {
  const match = (fileName ?? '').toLowerCase().trim().match(/\.[a-z0-9]+$/)
  return match?.[0] ?? null
}

function normalizeMimeType(mimeType: string | null | undefined) {
  return (mimeType ?? '').split(';')[0].trim().toLowerCase()
}

function worksheetDataRowCount(sheet: XLSX.WorkSheet) {
  const ref = sheet['!ref']
  if (!ref) return 0
  const range = XLSX.utils.decode_range(ref)
  return Math.max(0, range.e.r - range.s.r)
}

function formatMegabytes(bytes: number) {
  return Math.round(bytes / 1024 / 1024)
}

function structureChangeTypeForImport(result: {
  created: { units: number; positions: number; assignments: number }
  updated: { unitsReactivated: number; positionsReparented: number }
  closedAssignments: number
}) {
  if (result.closedAssignments > 0) return 'ASSIGNMENT_REASSIGN'
  if (result.created.assignments > 0) return 'ASSIGNMENT_CREATE'
  if (result.updated.positionsReparented > 0) return 'POSITION_REPARENT'
  if (result.created.positions > 0) return 'POSITION_CREATE'
  if (result.created.units > 0) return 'UNIT_CREATE'
  return 'UNIT_UPDATE'
}

export const ORGCHART_IMPORT_TEMPLATE_HEADERS = [
  'DNI',
  'Trabajador',
  'Área',
  'Cargo',
  'Jefe inmediato',
  'Nivel',
  'Categoría',
  'Riesgo SST',
  'SCTR',
  'Examen médico',
  'Cargo crítico',
  'Propósito',
  'Funciones',
  'Responsabilidades',
  'Requisitos',
]

export function orgChartImportTemplateCsv() {
  const example = [
    '12345678',
    'Apellido Nombre',
    'Operaciones',
    'Jefe de Operaciones',
    '',
    'Jefatura',
    'Operativo',
    'ALTO',
    'Sí',
    'Sí',
    'Sí',
    'Dirigir la operación diaria',
    'Supervisar equipos; Aprobar turnos',
    'Cumplir normas SST; Reportar incidentes',
    'Experiencia mínima 3 años',
  ]
  return [ORGCHART_IMPORT_TEMPLATE_HEADERS, example]
    .map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
