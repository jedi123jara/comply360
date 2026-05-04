import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { storageService, StorageError, type StorageBucket } from '@/lib/storage'
import { validateUpload, UPLOAD_PROFILES } from '@/lib/uploads/validation'

// =============================================
// POST /api/storage/upload - Upload file
// =============================================

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const bucket = (formData.get('bucket') as string) ?? 'documents'
    const subfolder = (formData.get('subfolder') as string) ?? ''

    // ---- Validación centralizada (Ola 1 — seguridad) ----
    // Usa el profile genérico: imágenes + PDFs + DOCX + XLSX hasta 20 MB.
    // Bloquea SVG, JS, EXE, PHP, etc. independiente del MIME reportado.
    const validation = validateUpload(file, UPLOAD_PROFILES.generic)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 })
    }

    // ---- Generar path unico (usando safeName para evitar path traversal) ----
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const fileName = `${timestamp}-${random}.${validation.ext}`

    const filePath = subfolder
      ? `${ctx.orgId}/${subfolder}/${fileName}`
      : `${ctx.orgId}/${fileName}`

    // ---- Subir archivo (file ya validado arriba) ----
    const result = await storageService.uploadFile(
      bucket as StorageBucket,
      filePath,
      file as File,
      {
        orgId: ctx.orgId,
        userId: ctx.userId,
        originalName: validation.safeName,
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        path: result.path,
        bucket: result.bucket,
        size: result.size,
        mimeType: result.mimeType,
        storage: result.storage,
      },
    })
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    console.error('[Storage Upload] Error:', error)
    return NextResponse.json(
      { error: 'Error interno al subir el archivo' },
      { status: 500 }
    )
  }
})
