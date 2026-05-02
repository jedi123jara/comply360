// =============================================
// BULK RUNNER — orquesta la generación masiva
// Generador de Contratos / Chunk 7
//
// Crea un Contract por cada fila válida, renderiza su DOCX y empaqueta
// todo en un ZIP. Ejecución síncrona (sin Redis). El BulkContractJob
// queda persistido como audit trail.
// =============================================

import { prisma } from '@/lib/prisma'
import { Prisma, type ContractType } from '@/generated/prisma/client'
import { logAudit } from '@/lib/audit'
import { htmlToDocxBuffer } from '@/lib/contracts/docx/html-to-docx'
import { buildBulkZip, sha256OfBuffer } from './zip-builder'
import type { BulkContractRow, BulkZipEntry } from './types'

interface RunnerInput {
  orgId: string
  userId: string
  rows: BulkContractRow[]
  contractType: ContractType
  templateId?: string
  titleTemplate?: string
  sourceFileName?: string
}

export interface RunnerResult {
  jobId: string
  zipBuffer: Buffer
  zipSha256: string
  totalRows: number
  succeededRows: number
  failedRows: number
  errors: Array<{ rowIndex: number; message: string }>
}

const TYPE_LABELS: Record<string, string> = {
  LABORAL_INDEFINIDO: 'Plazo Indeterminado',
  LABORAL_PLAZO_FIJO: 'Plazo Fijo',
  LABORAL_TIEMPO_PARCIAL: 'Tiempo Parcial',
}

/**
 * Construye un fragmento HTML mínimo a partir de una fila — fallback cuando
 * no hay template asociado. Cubre los datos clave del trabajador y permite
 * descargar un .docx legible. Las plantillas reales (chunk #4 + #6) se
 * deben usar después por separado.
 */
function buildContentHtml(row: BulkContractRow, contractType: string): string {
  const lines = [
    `<h2>I. Identificación del trabajador</h2>`,
    `<p><b>Nombre:</b> ${escapeHtml(row.trabajador_nombre)}</p>`,
    `<p><b>DNI:</b> ${escapeHtml(row.trabajador_dni)}</p>`,
    `<p><b>Cargo:</b> ${escapeHtml(row.cargo)}</p>`,
    `<h2>II. Condiciones laborales</h2>`,
    `<p><b>Fecha de inicio:</b> ${escapeHtml(row.fecha_inicio)}</p>`,
  ]
  if (row.fecha_fin) lines.push(`<p><b>Fecha de fin:</b> ${escapeHtml(row.fecha_fin)}</p>`)
  lines.push(`<p><b>Remuneración:</b> S/ ${row.remuneracion.toFixed(2)}</p>`)
  if (row.jornada_semanal) lines.push(`<p><b>Jornada semanal:</b> ${row.jornada_semanal}h</p>`)
  if (contractType === 'LABORAL_PLAZO_FIJO' && row.causa_objetiva) {
    lines.push(`<h2>III. Causa objetiva</h2><p>${escapeHtml(row.causa_objetiva)}</p>`)
  }
  return lines.join('\n')
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function safeFileName(s: string): string {
  return s.replace(/[^a-zA-Z0-9 ._-]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export async function runBulkGeneration(input: RunnerInput): Promise<RunnerResult> {
  // 1. Crear el job (PROCESSING)
  const job = await prisma.bulkContractJob.create({
    data: {
      orgId: input.orgId,
      createdById: input.userId,
      status: 'PROCESSING',
      contractType: input.contractType,
      templateId: input.templateId ?? null,
      sourceFileName: input.sourceFileName ?? null,
      totalRows: input.rows.length,
      startedAt: new Date(),
    },
  })

  const errors: RunnerResult['errors'] = []
  const entries: BulkZipEntry[] = []
  let succeeded = 0

  // 2. Iterar filas — un Contract por fila
  for (let i = 0; i < input.rows.length; i++) {
    const row = input.rows[i]
    const rowIndex = i + 1
    try {
      const title = (input.titleTemplate ?? 'Contrato {{TYPE}} — {{NAME}}')
        .replace('{{TYPE}}', TYPE_LABELS[input.contractType] ?? input.contractType)
        .replace('{{NAME}}', row.trabajador_nombre)

      const contentHtml = buildContentHtml(row, input.contractType)

      // Crear Contract (esto dispara los chunks 1, 3, 5 vía fire-and-forget)
      const created = await prisma.contract.create({
        data: {
          orgId: input.orgId,
          createdById: input.userId,
          templateId: input.templateId ?? null,
          type: input.contractType,
          status: 'DRAFT',
          title,
          formData: row as unknown as Prisma.InputJsonValue,
          contentHtml,
          ...(row.fecha_fin ? { expiresAt: new Date(row.fecha_fin) } : {}),
        },
        select: { id: true },
      })

      // Render DOCX
      const buffer = await htmlToDocxBuffer({
        title,
        contentHtml,
      })

      const fileName = safeFileName(`${row.trabajador_dni} - ${row.trabajador_nombre}.docx`)
      entries.push({
        fileName,
        buffer,
        sha256: sha256OfBuffer(buffer),
        contractId: created.id,
        rowIndex,
      })
      succeeded++
    } catch (err) {
      errors.push({
        rowIndex,
        message: err instanceof Error ? err.message : 'Error desconocido',
      })
    }
  }

  // 3. Empaquetar ZIP
  const zipResult = await buildBulkZip(entries)

  // 4. Marcar el job COMPLETED
  await prisma.bulkContractJob.update({
    where: { id: job.id },
    data: {
      status: errors.length === input.rows.length ? 'FAILED' : 'COMPLETED',
      succeededRows: succeeded,
      failedRows: errors.length,
      errors: errors.length > 0 ? (errors as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      zipSha256: zipResult.zipSha256,
      zipByteLength: zipResult.buffer.byteLength,
      finishedAt: new Date(),
    },
  })

  await logAudit({
    orgId: input.orgId,
    userId: input.userId,
    action: 'contract.bulk.generated',
    entityType: 'BulkContractJob',
    entityId: job.id,
    metadata: {
      total: input.rows.length,
      succeeded,
      failed: errors.length,
      contractType: input.contractType,
    },
  })

  return {
    jobId: job.id,
    zipBuffer: zipResult.buffer,
    zipSha256: zipResult.zipSha256,
    totalRows: input.rows.length,
    succeededRows: succeeded,
    failedRows: errors.length,
    errors,
  }
}
