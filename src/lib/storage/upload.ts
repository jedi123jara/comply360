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
async function uploadToSupabase(file: File, subfolder: string): Promise<UploadResult> {
  const { ext } = validateFile(file)
  const safeSubfolder = sanitizeSubfolder(subfolder)
  const filename = generateFilename(ext)
  const storagePath = `${safeSubfolder}/${filename}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const supabaseUrl = process.env.SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!

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
