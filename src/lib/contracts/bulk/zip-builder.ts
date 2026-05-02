// =============================================
// BULK ZIP BUILDER (Generador de Contratos / Chunk 7)
//
// Empaqueta una colección de DOCX con un `manifest.json` que incluye
// SHA-256 de cada archivo. Idéntico patrón al chunk #3 de hash-chain
// pero a nivel de bundle: si alguien cambia un .docx en el ZIP sin
// regenerarlo, el manifest lo delata.
// =============================================

import JSZip from 'jszip'
import { createHash } from 'node:crypto'
import type { BulkZipEntry } from './types'

export interface ManifestEntry {
  fileName: string
  sha256: string
  byteLength: number
  contractId?: string
  rowIndex: number
}

export interface BuildZipResult {
  buffer: Buffer
  manifest: {
    generatedAt: string
    totalEntries: number
    entries: ManifestEntry[]
  }
  zipSha256: string
}

/**
 * Construye un ZIP con cada DOCX en `contracts/<filename>` + un manifest
 * en la raíz del ZIP (`manifest.json`). Devuelve el buffer y los hashes
 * para que el caller los persista en `BulkContractJob.zipSha256`.
 */
export async function buildBulkZip(entries: BulkZipEntry[]): Promise<BuildZipResult> {
  const zip = new JSZip()
  const folder = zip.folder('contracts') ?? zip
  const manifestEntries: ManifestEntry[] = []

  for (const e of entries) {
    folder.file(e.fileName, e.buffer)
    manifestEntries.push({
      fileName: `contracts/${e.fileName}`,
      sha256: e.sha256,
      byteLength: e.buffer.byteLength,
      contractId: e.contractId,
      rowIndex: e.rowIndex,
    })
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalEntries: entries.length,
    entries: manifestEntries,
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  }) as Buffer

  const zipSha256 = createHash('sha256').update(buffer).digest('hex')

  return { buffer, manifest, zipSha256 }
}

/** Helper: SHA-256 hex de un Buffer. */
export function sha256OfBuffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}
