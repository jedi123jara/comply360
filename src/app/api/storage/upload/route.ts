import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { storageService, StorageError, type StorageBucket } from '@/lib/storage'

// =============================================
// POST /api/storage/upload - Upload file
// =============================================

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const bucket = (formData.get('bucket') as string) ?? 'documents'
    const subfolder = (formData.get('subfolder') as string) ?? ''

    // ---- Validaciones ----
    if (!file) {
      return NextResponse.json(
        { error: 'No se recibio ningun archivo' },
        { status: 400 }
      )
    }

    if (!file.name || file.size === 0) {
      return NextResponse.json(
        { error: 'El archivo esta vacio o no tiene nombre' },
        { status: 400 }
      )
    }

    // ---- Generar path unico ----
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const fileName = `${timestamp}-${random}.${ext}`

    const filePath = subfolder
      ? `${ctx.orgId}/${subfolder}/${fileName}`
      : `${ctx.orgId}/${fileName}`

    // ---- Subir archivo ----
    const result = await storageService.uploadFile(
      bucket as StorageBucket,
      filePath,
      file,
      {
        orgId: ctx.orgId,
        userId: ctx.userId,
        originalName: file.name,
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
