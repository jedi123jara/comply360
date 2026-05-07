/**
 * Edita prisma/schema.prisma para agregar `organization Organization @relation(...)`
 * a los 32 modelos huérfanos identificados.
 *
 * Estrategia: para cada modelo, encontrar la línea con `orgId String...` y
 * agregar la relación dentro del mismo modelo (después de las columnas,
 * antes del primer `@@`).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const schemaPath = join(__dirname, '..', '..', 'prisma', 'schema.prisma')
let raw = readFileSync(schemaPath, 'utf-8')

// Modelos a procesar (mapeo Prisma model name)
const MODELS = [
  'AiBudgetCounter',
  'AiUsage',
  'Attendance',
  'AttendanceApproval',
  'AttendanceAttempt',
  'AttendanceEvidence',
  'AttendanceJustification',
  'BulkContractJob',
  'Certificate',
  'CeseRecord',
  'ComplianceScore',
  'ContractValidation',
  'ContractVersion',
  'Enrollment',
  'GamificationEvent',
  'Geofence',
  'MerkleAnchor',
  'NpsFeedback',
  'OrgComplianceSeal',
  'PuestoTrabajo',
  'ScheduledReport',
  'SindicalRecord',
  'SstRecord',
  'SunatQueryCache',
  'Tercero',
  'WebhookDelivery',
  'WebhookSubscription',
  'WorkerAlert',
  'WorkerDependent',
  'WorkerHistoryEvent',
  'WorkflowRun',
  'Workflow',
]

let added = 0
let skipped = 0

for (const modelName of MODELS) {
  // Encontrar el inicio del modelo
  const startRegex = new RegExp(`^model\\s+${modelName}\\s*\\{`, 'm')
  const startMatch = startRegex.exec(raw)
  if (!startMatch) {
    console.log(`  ✗ ${modelName}: not found`)
    continue
  }

  const startIdx = startMatch.index
  // Encontrar el cierre del bloque del modelo (matching brace)
  let depth = 0
  let endIdx = -1
  for (let i = startIdx; i < raw.length; i++) {
    if (raw[i] === '{') depth++
    if (raw[i] === '}') {
      depth--
      if (depth === 0) {
        endIdx = i
        break
      }
    }
  }
  if (endIdx === -1) {
    console.log(`  ✗ ${modelName}: matching brace not found`)
    continue
  }

  const block = raw.slice(startIdx, endIdx + 1)

  // Skip si ya tiene la relación
  if (/\bOrganization\s+@relation\b/.test(block)) {
    skipped++
    continue
  }

  // Detectar si orgId es nullable
  const orgIdMatch = block.match(/orgId\s+String(\?)?/)
  if (!orgIdMatch) {
    console.log(`  ✗ ${modelName}: no tiene campo orgId String`)
    continue
  }
  const isNullable = orgIdMatch[1] === '?'

  // Insertar `organization` antes del primer `@@` (índice o map)
  // Si no hay @@, antes del closing brace.
  const relationLine = isNullable
    ? `  organization Organization? @relation(fields: [orgId], references: [id], onDelete: Restrict)\n`
    : `  organization Organization  @relation(fields: [orgId], references: [id], onDelete: Restrict)\n`

  // Buscar la posición de inserción dentro del bloque
  const blockEndOffset = endIdx - startIdx
  const innerBlock = raw.slice(startIdx, endIdx)
  // Buscar primer @@ (sin espacios al inicio de línea)
  const atAtMatch = innerBlock.match(/\n\s*@@/m)
  let insertPos: number
  if (atAtMatch) {
    insertPos = startIdx + (atAtMatch.index ?? 0) + 1 // +1 para skip el \n inicial
  } else {
    // Antes del closing brace
    insertPos = endIdx
  }

  raw = raw.slice(0, insertPos) + relationLine + raw.slice(insertPos)
  added++
  console.log(`  ✓ ${modelName}${isNullable ? ' (nullable)' : ''}`)
}

writeFileSync(schemaPath, raw, 'utf-8')

console.log(`\n═══════════════════════════════════════════════════════════════`)
console.log(`  RESULTADO: ${added} relaciones agregadas, ${skipped} ya tenían`)
console.log(`═══════════════════════════════════════════════════════════════`)
