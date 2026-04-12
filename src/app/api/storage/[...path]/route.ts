import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { storageService, StorageError, type StorageBucket } from '@/lib/storage'

// =============================================
// GET /api/storage/:bucket/:path* - Download/serve file
// Redirects to a signed URL for the requested file.
// =============================================

export const GET = withAuth(
  async (req: NextRequest, ctx: AuthContext) => {
    try {
      // Extract path segments from the URL after /api/storage/
      const url = new URL(req.url)
      const fullPath = url.pathname.replace('/api/storage/', '')
      const segments = fullPath.split('/').filter(Boolean)

      if (segments.length < 2) {
        return NextResponse.json(
          { error: 'Ruta invalida. Formato: /api/storage/{bucket}/{path}' },
          { status: 400 }
        )
      }

      const bucket = segments[0] as StorageBucket
      const filePath = segments.slice(1).join('/')

      // Verificar que el path pertenezca a la org del usuario
      if (!filePath.startsWith(ctx.orgId)) {
        return NextResponse.json(
          { error: 'No tiene permiso para acceder a este archivo' },
          { status: 403 }
        )
      }

      // Obtener URL firmada
      const signedUrl = await storageService.downloadFile(bucket, filePath)

      // Redirigir al URL firmado
      return NextResponse.redirect(signedUrl)
    } catch (error) {
      if (error instanceof StorageError) {
        const status = error.code === 'FILE_NOT_FOUND' ? 404 : 400
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status }
        )
      }

      console.error('[Storage Download] Error:', error)
      return NextResponse.json(
        { error: 'Error interno al descargar el archivo' },
        { status: 500 }
      )
    }
  }
)
