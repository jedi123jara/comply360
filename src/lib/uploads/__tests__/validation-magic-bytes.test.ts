/**
 * Tests para validateUploadWithMagicBytes (FIX #5.D).
 *
 * Verifica que un archivo renombrado a otro tipo (ej. .exe → .pdf) sea
 * rechazado por mismatch de magic bytes vs MIME reportado.
 */

import { describe, it, expect } from 'vitest'
import { validateUploadWithMagicBytes, UPLOAD_PROFILES } from '../validation'

// Helper: crea un File "fake" con bytes específicos al inicio
function fakeFile(name: string, mime: string, bytes: number[]): File {
  // Padding hasta mínimo 64 bytes para que `slice(0, 32).arrayBuffer()` funcione
  const padded = new Uint8Array(64)
  padded.set(bytes, 0)
  return new File([padded], name, { type: mime })
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34] // %PDF-1.4
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00] // DOCX/XLSX
const FAKE_BYTES = [0x4d, 0x5a, 0x90, 0x00] // EXE header (MZ)

describe('validateUploadWithMagicBytes', () => {
  it('acepta PDF real con MIME application/pdf', async () => {
    const f = fakeFile('contrato.pdf', 'application/pdf', PDF_MAGIC)
    const r = await validateUploadWithMagicBytes(f, UPLOAD_PROFILES.workerDocument)
    expect(r.ok).toBe(true)
  })

  it('acepta PNG real con MIME image/png', async () => {
    const f = fakeFile('foto.png', 'image/png', PNG_MAGIC)
    const r = await validateUploadWithMagicBytes(f, UPLOAD_PROFILES.avatar)
    expect(r.ok).toBe(true)
  })

  it('acepta JPEG real con MIME image/jpeg', async () => {
    const f = fakeFile('foto.jpg', 'image/jpeg', JPEG_MAGIC)
    const r = await validateUploadWithMagicBytes(f, UPLOAD_PROFILES.avatar)
    expect(r.ok).toBe(true)
  })

  it('acepta DOCX (zip) con MIME OOXML', async () => {
    const f = fakeFile(
      'contrato.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ZIP_MAGIC,
    )
    const r = await validateUploadWithMagicBytes(f, UPLOAD_PROFILES.contractAnalysis)
    expect(r.ok).toBe(true)
  })

  it('RECHAZA EXE renombrado a .pdf con MIME falso application/pdf', async () => {
    const f = fakeFile('virus.pdf', 'application/pdf', FAKE_BYTES)
    const r = await validateUploadWithMagicBytes(f, UPLOAD_PROFILES.workerDocument)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('MAGIC_BYTES_MISMATCH')
    }
  })

  it('RECHAZA PNG con MIME application/pdf (mismatch)', async () => {
    const f = fakeFile('confused.pdf', 'application/pdf', PNG_MAGIC)
    const r = await validateUploadWithMagicBytes(f, UPLOAD_PROFILES.workerDocument)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('MAGIC_BYTES_MISMATCH')
  })

  it('RECHAZA archivo binario aleatorio con MIME image/jpeg', async () => {
    const f = fakeFile('fake.jpg', 'image/jpeg', [0x00, 0x01, 0x02, 0x03])
    const r = await validateUploadWithMagicBytes(f, UPLOAD_PROFILES.avatar)
    expect(r.ok).toBe(false)
  })

  it('CSV/text se aceptan sin chequeo de magic bytes', async () => {
    const csvBytes = Array.from('nombre,dni\n', (c) => c.charCodeAt(0))
    const f = fakeFile('workers.csv', 'text/csv', csvBytes)
    const r = await validateUploadWithMagicBytes(f, UPLOAD_PROFILES.spreadsheetImport)
    expect(r.ok).toBe(true)
  })
})
