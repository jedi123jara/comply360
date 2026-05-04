import { describe, it, expect } from 'vitest'
import {
  validateUpload,
  sanitizeFileName,
  UPLOAD_PROFILES,
  MB,
} from '../validation'

/**
 * Helper para construir un File mock compatible con browser File API.
 * vitest-environment 'jsdom' o 'happy-dom' provee File globalmente.
 */
function mockFile(opts: {
  name: string
  type?: string
  size?: number
}): File {
  const content = 'x'.repeat(opts.size ?? 100)
  const file = new File([content], opts.name, {
    type: opts.type ?? 'application/octet-stream',
  })
  // Override `size` cuando queremos simular archivos enormes sin alocar GBs.
  if (opts.size != null && opts.size !== content.length) {
    Object.defineProperty(file, 'size', { value: opts.size, configurable: true })
  }
  return file
}

describe('sanitizeFileName', () => {
  it('mantiene nombres normales', () => {
    expect(sanitizeFileName('contrato_juan.pdf')).toBe('contrato_juan.pdf')
    expect(sanitizeFileName('DNI-12345678.png')).toBe('DNI-12345678.png')
  })

  it('elimina path traversal', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd')
    expect(sanitizeFileName('..\\..\\windows\\system.dll')).toBe('system.dll')
    expect(sanitizeFileName('/etc/passwd')).toBe('passwd')
  })

  it('reemplaza caracteres peligrosos', () => {
    expect(sanitizeFileName('archivo con espacios.pdf')).toBe('archivo_con_espacios.pdf')
    expect(sanitizeFileName('arch<script>.pdf')).toBe('arch_script_.pdf')
    expect(sanitizeFileName("arch'or'1=1.pdf")).toBe('arch_or_1_1.pdf')
  })

  it('quita prefijos peligrosos', () => {
    expect(sanitizeFileName('.hidden.pdf')).toBe('hidden.pdf')
    expect(sanitizeFileName('_underscore.pdf')).toBe('underscore.pdf')
    expect(sanitizeFileName('---guion.pdf')).toBe('guion.pdf')
  })

  it('trunca nombres muy largos a 200 chars', () => {
    const long = 'a'.repeat(500) + '.pdf'
    const result = sanitizeFileName(long)
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('cae a "archivo" si queda vacío', () => {
    expect(sanitizeFileName('???.@@@')).toMatch(/^[\w._-]+$/)
    expect(sanitizeFileName('')).toBe('archivo')
  })

  it('preserva caracteres unicode normalizándolos', () => {
    // ñ y tildes peruanas → se reemplazan por _ (ASCII-safe)
    const result = sanitizeFileName('señor_pérez.pdf')
    expect(result).toMatch(/^[\w._-]+$/)
    expect(result).toContain('.pdf')
  })
})

describe('validateUpload — workerDocument profile', () => {
  const profile = UPLOAD_PROFILES.workerDocument

  it('acepta JPEG válido', () => {
    const r = validateUpload(mockFile({ name: 'dni.jpg', type: 'image/jpeg' }), profile)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.safeName).toBe('dni.jpg')
      expect(r.mime).toBe('image/jpeg')
      expect(r.ext).toBe('jpg')
    }
  })

  it('acepta PDF válido', () => {
    const r = validateUpload(mockFile({ name: 'contrato.pdf', type: 'application/pdf' }), profile)
    expect(r.ok).toBe(true)
  })

  it('acepta DOCX válido', () => {
    const r = validateUpload(
      mockFile({
        name: 'cv.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      profile,
    )
    expect(r.ok).toBe(true)
  })

  it('rechaza archivo null/undefined', () => {
    const r = validateUpload(null, profile)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('NO_FILE')
  })

  it('rechaza archivo vacío', () => {
    const r = validateUpload(mockFile({ name: 'empty.pdf', type: 'application/pdf', size: 0 }), profile)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('EMPTY')
  })

  it('rechaza archivo > 20 MB', () => {
    const r = validateUpload(
      mockFile({ name: 'gigante.pdf', type: 'application/pdf', size: 25 * MB }),
      profile,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('TOO_LARGE')
      expect(r.error).toContain('20 MB')
    }
  })
})

describe('validateUpload — bloqueos absolutos', () => {
  const profile = UPLOAD_PROFILES.workerDocument

  it.each([
    'image/svg+xml',     // XSS clásico
    'text/html',
    'application/javascript',
    'application/x-msdownload',
    'application/x-sh',
  ])('rechaza MIME bloqueado %s aunque profile no lo liste', (mime) => {
    const r = validateUpload(mockFile({ name: 'malo.bin', type: mime }), profile)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(['BLOCKED_MIME', 'MIME_NOT_ALLOWED']).toContain(r.code)
    }
  })

  it.each(['html', 'svg', 'js', 'exe', 'bat', 'sh', 'php', 'py'])(
    'rechaza extensión %s aunque MIME parezca válido',
    (ext) => {
      const r = validateUpload(
        mockFile({ name: `malo.${ext}`, type: 'application/pdf' }), // miente sobre el MIME
        profile,
      )
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.code).toBe('BLOCKED_EXT')
    },
  )

  it('rechaza .svg específicamente (XSS vector más común)', () => {
    const r = validateUpload(
      mockFile({ name: 'avatar.svg', type: 'image/svg+xml' }),
      UPLOAD_PROFILES.avatar,
    )
    expect(r.ok).toBe(false)
  })
})

describe('validateUpload — workerPortalUpload (más restrictivo)', () => {
  const profile = UPLOAD_PROFILES.workerPortalUpload

  it('acepta JPG hasta 10 MB', () => {
    const r = validateUpload(
      mockFile({ name: 'dni.jpg', type: 'image/jpeg', size: 8 * MB }),
      profile,
    )
    expect(r.ok).toBe(true)
  })

  it('rechaza JPG de 12 MB (excede 10)', () => {
    const r = validateUpload(
      mockFile({ name: 'dni.jpg', type: 'image/jpeg', size: 12 * MB }),
      profile,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('TOO_LARGE')
  })

  it('rechaza DOCX (no aceptado en portal worker)', () => {
    const r = validateUpload(
      mockFile({
        name: 'doc.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      profile,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('MIME_NOT_ALLOWED')
  })
})

describe('validateUpload — sanitización integrada', () => {
  it('devuelve safeName limpio incluso con file.name peligroso', () => {
    const r = validateUpload(
      mockFile({ name: '../../etc/passwd.pdf', type: 'application/pdf' }),
      UPLOAD_PROFILES.workerDocument,
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.safeName).toBe('passwd.pdf')
      expect(r.safeName).not.toContain('..')
      expect(r.safeName).not.toContain('/')
    }
  })
})

describe('validateUpload — spreadsheetImport', () => {
  it('acepta xlsx', () => {
    const r = validateUpload(
      mockFile({
        name: 'workers.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      UPLOAD_PROFILES.spreadsheetImport,
    )
    expect(r.ok).toBe(true)
  })

  it('acepta CSV', () => {
    const r = validateUpload(
      mockFile({ name: 'workers.csv', type: 'text/csv' }),
      UPLOAD_PROFILES.spreadsheetImport,
    )
    expect(r.ok).toBe(true)
  })

  it('rechaza PDF en spreadsheetImport', () => {
    const r = validateUpload(
      mockFile({ name: 'workers.pdf', type: 'application/pdf' }),
      UPLOAD_PROFILES.spreadsheetImport,
    )
    expect(r.ok).toBe(false)
  })
})
