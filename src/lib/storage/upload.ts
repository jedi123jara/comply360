import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const MAX_FILE_SIZE = 4.5 * 1024 * 1024 // 4.5MB (límite plan gratuito Vercel)
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'docx']
const SUPABASE_BUCKET = 'worker-documents'

// Use Supabase Storage when SUPABASE_URL + SUPABASE_SERVICE_KEY are set (production)
const USE_SUPABASE = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
)

export interface UploadResult {
  url: string
  size: number
  mimeType: string
  storage: 'supabase' | 'local'
}

// =============================================
// Shared validation
// =============================================
function validateFile(file: File): { ext: string } {
  if (file.size > MAX_FILE_SIZE) throw new Error('Archivo excede el limite de 4.5MB')
  if (!ALLOWED_TYPES.includes(file.type))
    throw new Error(`Tipo no permitido: ${file.type}. Permitidos: PDF, JPEG, PNG, DOCX`)
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext))
    throw new Error(`Extension no permitida: .${ext}. Permitidas: ${ALLOWED_EXTENSIONS.join(', ')}`)
  return { ext }
}

function sanitizeSubfolder(subfolder: string): string {
  return subfolder.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/]/g, '')
}

function generateFilename(ext: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 10)
  return `${timestamp}-${random}.${ext}`
}

// =============================================
// Supabase Storage upload (production)
// =============================================

// Cache para no preguntar 1000 veces si el bucket existe
let bucketEnsured = false

/**
 * Verifica si el bucket existe; si no, intenta crearlo.
 * Idempotente: corre una sola vez por proceso (cache en memoria).
 *
 * Razón: muchos proyectos Supabase nuevos no tienen el bucket "worker-documents"
 * pre-creado. En vez de fallar con "Bucket not found" sin pista, lo creamos.
 */
async function ensureBucketExists(supabaseUrl: string, serviceKey: string): Promise<void> {
  if (bucketEnsured) return

  // GET /storage/v1/bucket/<name> — si existe devuelve 200, si no 404
  const checkUrl = `${supabaseUrl}/storage/v1/bucket/${SUPABASE_BUCKET}`
  const checkRes = await fetch(checkUrl, {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
  })

  if (checkRes.ok) {
    bucketEnsured = true
    return
  }

  if (checkRes.status !== 404) {
    // Error de conectividad/auth — no intentes crear, deja que el upload falle con su propio error
    return
  }

  // Bucket no existe → crear
  const createUrl = `${supabaseUrl}/storage/v1/bucket`
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: SUPABASE_BUCKET,
      name: SUPABASE_BUCKET,
      public: true, // Documentos accesibles via URL pública (firmadas opcionales)
      file_size_limit: 5 * 1024 * 1024, // 5MB
      allowed_mime_types: ALLOWED_TYPES,
    }),
  })

  if (createRes.ok) {
    bucketEnsured = true
    return
  }

  // Si la respuesta de error dice "already exists" tratamos como ok (race condition)
  const errText = await createRes.text()
  if (errText.toLowerCase().includes('already exists') || errText.toLowerCase().includes('duplicate')) {
    bucketEnsured = true
    return
  }

  // Falló de verdad → no marcamos cache, que reintenten siguiente upload
  throw new Error(
    `No se pudo crear el bucket "${SUPABASE_BUCKET}" en Supabase. Crea el bucket manualmente en Supabase Dashboard → Storage → New bucket → name: ${SUPABASE_BUCKET} → public access. Detalle: ${errText}`,
  )
}

async function uploadToSupabase(file: File, subfolder: string): Promise<UploadResult> {
  const { ext } = validateFile(file)
  const safeSubfolder = sanitizeSubfolder(subfolder)
  const filename = generateFilename(ext)
  const storagePath = `${safeSubfolder}/${filename}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const supabaseUrl = process.env.SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!

  // Garantizar que el bucket existe antes del upload
  await ensureBucketExists(supabaseUrl, serviceKey)

  // Use Supabase REST API directly (no SDK dependency needed)
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${SUPABASE_BUCKET}/${storagePath}`
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': file.type,
      'x-upsert': 'false',
    },
    body: buffer,
  })

  if (!res.ok) {
    const err = await res.text()
    // Mensaje amigable según el error
    if (res.status === 404 || err.toLowerCase().includes('bucket not found')) {
      // Reset cache para que el siguiente intento reintente crear
      bucketEnsured = false
      throw new Error(
        `El bucket "${SUPABASE_BUCKET}" no existe en Supabase. Ve a Supabase Dashboard → Storage → New bucket → name: ${SUPABASE_BUCKET} → marca "Public bucket". También puedes intentar de nuevo en 30s y la app intentará crearlo.`,
      )
    }
    if (res.status === 413 || err.toLowerCase().includes('payload')) {
      throw new Error(
        `El archivo es demasiado grande para subirse. Máximo: 4.5MB. Comprime la imagen o el PDF antes de subir.`,
      )
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `No tienes permisos para subir a Supabase. Verifica que SUPABASE_SERVICE_KEY esté correcta en las variables de entorno.`,
      )
    }
    throw new Error(`Supabase upload failed: ${err}`)
  }

  // Build public URL
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${SUPABASE_BUCKET}/${storagePath}`

  return { url: publicUrl, size: file.size, mimeType: file.type, storage: 'supabase' }
}

// =============================================
// Local filesystem upload (development)
// =============================================
async function uploadToLocal(file: File, subfolder: string): Promise<UploadResult> {
  const { ext } = validateFile(file)
  const safeSubfolder = sanitizeSubfolder(subfolder)
  const filename = generateFilename(ext)
  const dir = path.join(UPLOAD_DIR, safeSubfolder)

  await mkdir(dir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, filename), buffer)

  return {
    url: `/uploads/${safeSubfolder}/${filename}`,
    size: file.size,
    mimeType: file.type,
    storage: 'local',
  }
}

// =============================================
// Public API — auto-selects storage backend
// =============================================
export async function uploadFile(file: File, subfolder: string): Promise<UploadResult> {
  if (USE_SUPABASE) return uploadToSupabase(file, subfolder)
  return uploadToLocal(file, subfolder)
}
