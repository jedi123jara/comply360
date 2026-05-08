// =============================================
// File Storage Service - Supabase Storage + Local Fallback
// =============================================

import { writeFile, readFile, unlink, mkdir, readdir } from 'fs/promises'
import path from 'path'

// =============================================
// Configuration
// =============================================

export type StorageBucket = 'documents' | 'contracts' | 'signatures' | 'avatars'

const BUCKET_CONFIG: Record<StorageBucket, { maxSizeMB: number }> = {
  documents: { maxSizeMB: 10 },
  contracts: { maxSizeMB: 10 },
  signatures: { maxSizeMB: 5 },
  avatars: { maxSizeMB: 5 },
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
}

const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg'])

const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'tmp', 'storage')

export interface FileMetadata {
  orgId?: string
  userId?: string
  entityType?: string
  entityId?: string
  [key: string]: string | undefined
}

export interface UploadResult {
  bucket: StorageBucket
  path: string
  url: string
  size: number
  mimeType: string
  storage: 'supabase' | 'local'
}

export interface FileInfo {
  name: string
  path: string
  size?: number
  createdAt?: string
  updatedAt?: string
}

// =============================================
// Validation helpers
// =============================================

function isDevMode(): boolean {
  return !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY
}

function getSupabaseConfig(): { url: string; serviceKey: string } {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos para almacenamiento en produccion')
  }
  return { url, serviceKey }
}

function validateBucket(bucket: string): asserts bucket is StorageBucket {
  if (!(bucket in BUCKET_CONFIG)) {
    throw new StorageError(
      `Bucket invalido: ${bucket}. Permitidos: ${Object.keys(BUCKET_CONFIG).join(', ')}`,
      'INVALID_BUCKET'
    )
  }
}

function validateFileType(mimeType: string, fileName: string): void {
  if (!ALLOWED_MIME_TYPES[mimeType]) {
    throw new StorageError(
      `Tipo de archivo no permitido: ${mimeType}. Permitidos: PDF, DOCX, XLSX, PNG, JPG`,
      'INVALID_FILE_TYPE'
    )
  }

  const ext = fileName.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new StorageError(
      `Extension no permitida: .${ext ?? '(sin extension)'}. Permitidas: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
      'INVALID_EXTENSION'
    )
  }
}

function validateFileSize(size: number, bucket: StorageBucket): void {
  const config = BUCKET_CONFIG[bucket]
  const maxBytes = config.maxSizeMB * 1024 * 1024
  if (size > maxBytes) {
    throw new StorageError(
      `El archivo excede el limite de ${config.maxSizeMB}MB para el bucket '${bucket}'`,
      'FILE_TOO_LARGE'
    )
  }
}

function sanitizePath(filePath: string): string {
  return filePath.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/\.]/g, '')
}

// =============================================
// Custom Error
// =============================================

export class StorageError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'StorageError'
    this.code = code
  }
}

// =============================================
// StorageService class
// =============================================

export class StorageService {
  /**
   * Upload a file to the specified bucket.
   * Uses Supabase in production, local filesystem in dev.
   */
  async uploadFile(
    bucket: StorageBucket,
    filePath: string,
    file: File,
    metadata?: FileMetadata
  ): Promise<UploadResult> {
    validateBucket(bucket)
    validateFileType(file.type, file.name)
    validateFileSize(file.size, bucket)

    const safePath = sanitizePath(filePath)
    const buffer = Buffer.from(await file.arrayBuffer())

    if (isDevMode()) {
      return this.uploadLocal(bucket, safePath, buffer, file.type, file.size)
    }

    return this.uploadSupabase(bucket, safePath, buffer, file.type, file.size, metadata)
  }

  /**
   * Download a file - returns a signed URL (Supabase) or local file URL.
   */
  async downloadFile(bucket: StorageBucket, filePath: string): Promise<string> {
    validateBucket(bucket)
    const safePath = sanitizePath(filePath)

    if (isDevMode()) {
      return this.getLocalUrl(bucket, safePath)
    }

    return this.getSignedUrl(bucket, safePath)
  }

  /**
   * Delete a file from the specified bucket.
   */
  async deleteFile(bucket: StorageBucket, filePath: string): Promise<void> {
    validateBucket(bucket)
    const safePath = sanitizePath(filePath)

    if (isDevMode()) {
      return this.deleteLocal(bucket, safePath)
    }

    return this.deleteSupabase(bucket, safePath)
  }

  /**
   * List files in a bucket with optional prefix filter.
   */
  async listFiles(bucket: StorageBucket, prefix?: string): Promise<FileInfo[]> {
    validateBucket(bucket)

    if (isDevMode()) {
      return this.listLocal(bucket, prefix)
    }

    return this.listSupabase(bucket, prefix)
  }

  /**
   * Get a public URL for a file (no expiration).
   *
   * @deprecated FIX #0.1: los buckets ahora son PRIVADOS por defecto. Este
   * método se mantiene solo para compatibilidad pero NO debe usarse para
   * documentos sensibles (boletas, DNI, EMO, contratos). Para descarga
   * autenticada usar `downloadFile()` que devuelve signed URL con TTL 1h.
   *
   * Para evitar romper consumidores legacy, devuelve la URL "pública"
   * pero el bucket privado responderá 404/403 — fail-closed correcto.
   */
  getPublicUrl(bucket: StorageBucket, filePath: string): string {
    validateBucket(bucket)
    const safePath = sanitizePath(filePath)

    if (isDevMode()) {
      return `/tmp/storage/${bucket}/${safePath}`
    }

    const { url } = getSupabaseConfig()
    return `${url}/storage/v1/object/public/${bucket}/${safePath}`
  }

  // =============================================
  // Supabase implementation
  // =============================================

  private async uploadSupabase(
    bucket: StorageBucket,
    filePath: string,
    buffer: Buffer,
    mimeType: string,
    size: number,
    metadata?: FileMetadata
  ): Promise<UploadResult> {
    const { url, serviceKey } = getSupabaseConfig()

    const uploadUrl = `${url}/storage/v1/object/${bucket}/${filePath}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': mimeType,
      'x-upsert': 'false',
    }

    if (metadata) {
      headers['x-metadata'] = JSON.stringify(metadata)
    }

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: new Uint8Array(buffer),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new StorageError(
        `Error al subir archivo a Supabase: ${errText}`,
        'UPLOAD_FAILED'
      )
    }

    // FIX #0.1: NO devolver URL pública. Buckets son privados; el caller
    // pide signed URL on-demand vía `downloadFile(bucket, path)`. Devolvemos
    // un identificador canónico `supabase://${bucket}/${path}` para que
    // los consumidores sepan firmar.
    const canonicalUrl = `supabase://${bucket}/${filePath}`

    return {
      bucket,
      path: filePath,
      url: canonicalUrl,
      size,
      mimeType,
      storage: 'supabase',
    }
  }

  private async getSignedUrl(bucket: StorageBucket, filePath: string): Promise<string> {
    const { url, serviceKey } = getSupabaseConfig()

    const signUrl = `${url}/storage/v1/object/sign/${bucket}/${filePath}`
    const res = await fetch(signUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 3600 }), // 1 hora
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new StorageError(
        `Error al obtener URL firmada: ${errText}`,
        'SIGNED_URL_FAILED'
      )
    }

    const data = (await res.json()) as { signedURL: string }
    return `${url}${data.signedURL}`
  }

  private async deleteSupabase(bucket: StorageBucket, filePath: string): Promise<void> {
    const { url, serviceKey } = getSupabaseConfig()

    const deleteUrl = `${url}/storage/v1/object/${bucket}/${filePath}`
    const res = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
      },
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new StorageError(
        `Error al eliminar archivo: ${errText}`,
        'DELETE_FAILED'
      )
    }
  }

  private async listSupabase(bucket: StorageBucket, prefix?: string): Promise<FileInfo[]> {
    const { url, serviceKey } = getSupabaseConfig()

    const listUrl = `${url}/storage/v1/object/list/${bucket}`
    const body: Record<string, unknown> = { limit: 100, offset: 0 }
    if (prefix) {
      body.prefix = sanitizePath(prefix)
    }

    const res = await fetch(listUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new StorageError(
        `Error al listar archivos: ${errText}`,
        'LIST_FAILED'
      )
    }

    const items = (await res.json()) as Array<{
      name: string
      id?: string
      metadata?: { size?: number }
      created_at?: string
      updated_at?: string
    }>

    return items.map((item) => ({
      name: item.name,
      path: prefix ? `${prefix}/${item.name}` : item.name,
      size: item.metadata?.size,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }))
  }

  // =============================================
  // Local filesystem implementation (dev fallback)
  // =============================================

  private async uploadLocal(
    bucket: StorageBucket,
    filePath: string,
    buffer: Buffer,
    mimeType: string,
    size: number
  ): Promise<UploadResult> {
    const dir = path.join(LOCAL_STORAGE_DIR, bucket, path.dirname(filePath))
    await mkdir(dir, { recursive: true })

    const fullPath = path.join(LOCAL_STORAGE_DIR, bucket, filePath)
    await writeFile(fullPath, buffer)

    console.log(`[StorageService][DEV] Archivo guardado localmente: ${fullPath}`)

    return {
      bucket,
      path: filePath,
      url: `/tmp/storage/${bucket}/${filePath}`,
      size,
      mimeType,
      storage: 'local',
    }
  }

  private async getLocalUrl(bucket: StorageBucket, filePath: string): Promise<string> {
    const fullPath = path.join(LOCAL_STORAGE_DIR, bucket, filePath)
    try {
      await readFile(fullPath)
      return `/tmp/storage/${bucket}/${filePath}`
    } catch {
      throw new StorageError(
        `Archivo no encontrado: ${bucket}/${filePath}`,
        'FILE_NOT_FOUND'
      )
    }
  }

  private async deleteLocal(bucket: StorageBucket, filePath: string): Promise<void> {
    const fullPath = path.join(LOCAL_STORAGE_DIR, bucket, filePath)
    try {
      await unlink(fullPath)
      console.log(`[StorageService][DEV] Archivo eliminado: ${fullPath}`)
    } catch {
      throw new StorageError(
        `Archivo no encontrado para eliminar: ${bucket}/${filePath}`,
        'FILE_NOT_FOUND'
      )
    }
  }

  private async listLocal(bucket: StorageBucket, prefix?: string): Promise<FileInfo[]> {
    const dir = path.join(LOCAL_STORAGE_DIR, bucket, prefix ?? '')
    try {
      const files = await readdir(dir)
      return files.map((name) => ({
        name,
        path: prefix ? `${prefix}/${name}` : name,
      }))
    } catch {
      return []
    }
  }
}

// =============================================
// Default singleton instance
// =============================================

export const storageService = new StorageService()
