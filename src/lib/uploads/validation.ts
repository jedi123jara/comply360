/**
 * Validación centralizada de uploads.
 *
 * Antes (Ola 1, pre-2026-05): los endpoints aceptaban cualquier MIME, cualquier
 * tamaño, y nombres de archivo sin sanitizar. Riesgos:
 *   - Subida de `.svg` con XSS embebido al portal del trabajador → otro
 *     trabajador abre el documento y ejecuta JS bajo el dominio comply360.
 *   - Saturación de Supabase Storage subiendo archivos de 500 MB.
 *   - Path traversal con `../../etc/passwd` en el filename.
 *
 * Este helper se llama desde cada endpoint que recibe `multipart/form-data`.
 *
 * Uso:
 *   import { validateUpload, UPLOAD_PROFILES } from '@/lib/uploads/validation'
 *
 *   const result = validateUpload(file, UPLOAD_PROFILES.workerDocument)
 *   if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
 *
 *   // Usar result.safeName en lugar de file.name al construir paths.
 */

// ─── Tamaños canónicos ───────────────────────────────────────────────────────
export const MB = 1024 * 1024

// ─── Whitelists por tipo de uso ──────────────────────────────────────────────

const IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',  // iPhone fotos
  'image/heif',
] as const

const PDF_MIMES = ['application/pdf'] as const

const DOC_MIMES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
] as const

const SPREADSHEET_MIMES = [
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/csv',
] as const

// MIME types EXPLÍCITAMENTE bloqueados aunque algún profile los acepte por error.
// Defensa en profundidad — no confiar en el browser.
const ALWAYS_BLOCKED_MIMES = new Set<string>([
  'text/html',
  'image/svg+xml',                         // XSS vía SVG
  'application/javascript',
  'application/x-javascript',
  'text/javascript',
  'application/x-msdownload',              // .exe
  'application/x-msdos-program',
  'application/x-sh',
  'application/x-bat',
  'application/x-bytecode.python',
  'application/octet-stream',              // genérico, sospechoso (excepto si profile lo permite explícito)
])

// Extensiones bloqueadas (capa redundante por si el browser miente sobre MIME)
const ALWAYS_BLOCKED_EXTS = new Set<string>([
  'html', 'htm', 'svg', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
  'exe', 'bat', 'sh', 'cmd', 'msi', 'dll', 'app',
  'php', 'py', 'rb', 'pl', 'asp', 'aspx', 'jsp',
  'sys', 'com', 'scr', 'vbs', 'ws', 'wsf',
])

// ─── Profiles ────────────────────────────────────────────────────────────────

export interface UploadProfile {
  /** MIME types permitidos. Si está vacío, se usa la lista por defecto. */
  allowedMimes: readonly string[]
  /** Tamaño máximo en bytes. */
  maxBytes: number
  /** Nombre legible (para mensajes de error). */
  label: string
}

export const UPLOAD_PROFILES = {
  /** Documentos del legajo subidos por admin (DNI, contratos, EMO, etc.) */
  workerDocument: {
    allowedMimes: [...IMAGE_MIMES, ...PDF_MIMES, ...DOC_MIMES],
    maxBytes: 20 * MB,
    label: 'documento del legajo',
  } as UploadProfile,

  /** Documentos subidos por el TRABAJADOR desde su portal — más restrictivo */
  workerPortalUpload: {
    allowedMimes: [...IMAGE_MIMES, ...PDF_MIMES],
    maxBytes: 10 * MB,
    label: 'documento del portal',
  } as UploadProfile,

  /** Contratos para análisis con IA (PDF/DOCX/imagen) */
  contractAnalysis: {
    allowedMimes: [...PDF_MIMES, ...DOC_MIMES, ...IMAGE_MIMES],
    maxBytes: 10 * MB,
    label: 'contrato',
  } as UploadProfile,

  /** Importación masiva de Excel/CSV */
  spreadsheetImport: {
    allowedMimes: SPREADSHEET_MIMES,
    maxBytes: 10 * MB,
    label: 'archivo Excel/CSV',
  } as UploadProfile,

  /** Avatar / foto de perfil — solo imágenes pequeñas */
  avatar: {
    allowedMimes: IMAGE_MIMES,
    maxBytes: 5 * MB,
    label: 'foto de perfil',
  } as UploadProfile,

  /** Bulk PDF — para extraer múltiples contratos de un solo PDF grande */
  bulkPdf: {
    allowedMimes: PDF_MIMES,
    maxBytes: 50 * MB,
    label: 'PDF con múltiples contratos',
  } as UploadProfile,

  /** Genérico — usar sólo cuando no aplique ningún otro profile */
  generic: {
    allowedMimes: [...IMAGE_MIMES, ...PDF_MIMES, ...DOC_MIMES, ...SPREADSHEET_MIMES],
    maxBytes: 20 * MB,
    label: 'archivo',
  } as UploadProfile,
} as const

// ─── Resultado de validación ─────────────────────────────────────────────────

export type ValidateUploadOk = {
  ok: true
  /** Nombre sanitizado seguro para usar en paths */
  safeName: string
  /** Extensión normalizada (lowercase, sin punto) */
  ext: string
  /** MIME confirmado (puede ser distinto al reportado por el browser si lo corrigió) */
  mime: string
  /** Tamaño en bytes */
  size: number
}

export type ValidateUploadErr = {
  ok: false
  error: string
  /** Código estable para que el frontend pueda diferenciar */
  code: 'NO_FILE' | 'EMPTY' | 'TOO_LARGE' | 'BLOCKED_MIME' | 'BLOCKED_EXT' | 'MIME_NOT_ALLOWED'
}

export type ValidateUploadResult = ValidateUploadOk | ValidateUploadErr

// ─── Sanitización de nombres ─────────────────────────────────────────────────

/**
 * Sanitiza un nombre de archivo para uso seguro en paths.
 * - Quita rutas (..., \, /)
 * - Solo deja [a-zA-Z0-9._-]
 * - Trunca a 200 chars
 * - Si queda vacío después, devuelve 'archivo'
 */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^\w.\- ]/g, '_')      // chars peligrosos → _
    .replace(/\s+/g, '_')            // espacios → _
    .replace(/_+/g, '_')             // múltiples _ → uno solo
    .replace(/^[._-]+/, '')          // no empezar con . _ -
    .slice(0, 200)
  return cleaned || 'archivo'
}

// ─── Validador principal ─────────────────────────────────────────────────────

/**
 * Valida un File contra un UploadProfile. Devuelve un Result tipado.
 *
 * NO confía en `file.type` ciegamente: cruza con extensión y blocklist absoluta.
 */
export function validateUpload(
  file: File | null | undefined,
  profile: UploadProfile,
): ValidateUploadResult {
  if (!file) {
    return { ok: false, error: 'No se recibió ningún archivo', code: 'NO_FILE' }
  }

  if (!file.name || file.size === 0) {
    return { ok: false, error: 'El archivo está vacío', code: 'EMPTY' }
  }

  if (file.size > profile.maxBytes) {
    const maxMb = Math.round(profile.maxBytes / MB)
    return {
      ok: false,
      error: `El ${profile.label} no debe superar ${maxMb} MB (recibido: ${(file.size / MB).toFixed(1)} MB)`,
      code: 'TOO_LARGE',
    }
  }

  const reportedMime = (file.type || '').toLowerCase()
  const ext = (file.name.split('.').pop() ?? '').toLowerCase()

  // Capa 1: extensión bloqueada (defensa absoluta — siempre rechaza)
  if (ALWAYS_BLOCKED_EXTS.has(ext)) {
    return {
      ok: false,
      error: `Tipo de archivo no permitido (.${ext}). No se aceptan ejecutables ni scripts.`,
      code: 'BLOCKED_EXT',
    }
  }

  // Capa 2: MIME bloqueado absolutamente (incluso si el profile lo aceptara)
  if (reportedMime && ALWAYS_BLOCKED_MIMES.has(reportedMime)) {
    return {
      ok: false,
      error: `Tipo de archivo no permitido (${reportedMime}).`,
      code: 'BLOCKED_MIME',
    }
  }

  // Capa 3: MIME tiene que estar en el whitelist del profile
  if (!profile.allowedMimes.includes(reportedMime)) {
    return {
      ok: false,
      error: `Tipo de archivo no permitido para ${profile.label}. Acepta: ${humanReadableMimeList(profile.allowedMimes)}.`,
      code: 'MIME_NOT_ALLOWED',
    }
  }

  return {
    ok: true,
    safeName: sanitizeFileName(file.name),
    ext,
    mime: reportedMime,
    size: file.size,
  }
}

/**
 * Convierte una lista de MIMEs a una descripción legible para humanos.
 * Ej: ["image/jpeg", "application/pdf"] → "JPEG, PDF"
 */
function humanReadableMimeList(mimes: readonly string[]): string {
  const map: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/heic': 'HEIC',
    'image/heif': 'HEIF',
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'text/csv': 'CSV',
  }
  const labels = Array.from(new Set(mimes.map(m => map[m] ?? m)))
  return labels.join(', ')
}
