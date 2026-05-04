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
import { createContractWithSideEffects } from '../create'

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

      const { contract: created, rendered } = await createContractWithSideEffects({
        orgId: input.orgId,
        userId: input.userId,
        templateId: input.templateId ?? null,
        type: input.contractType,
        status: 'DRAFT',
        title,
        formData: row as unknown as Record<string, unknown>,
        sourceKind: 'bulk-row-based',
        provenance: 'BULK_GENERATED',
        expiresAt: row.fecha_fin ? new Date(row.fecha_fin) : null,
        changeReason: 'Generacion masiva de contrato',
      })

      // Render DOCX
      const buffer = await htmlToDocxBuffer({
        title,
        contentHtml: rendered.renderedHtml,
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
