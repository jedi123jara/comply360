/**
 * API Authentication Middleware — Validacion de API keys para endpoints publicos /api/v1/*
 *
 * Extrae la API key del header Authorization (Bearer token) o del header X-API-Key,
 * valida la clave y retorna el orgId y permisos asociados.
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiKeyService, type ApiPermission } from '@/lib/api-keys'

// =============================================
// TYPES
// =============================================

export interface ApiAuthContext {
  orgId: string
  keyId: string
  permissions: ApiPermission[]
}

export type ApiRouteHandler = (
  req: NextRequest,
  ctx: ApiAuthContext,
) => Promise<NextResponse>

// =============================================
// CORE VALIDATION
// =============================================

/**
 * Extrae y valida la API key de una request.
 * Busca en: Authorization: Bearer <key> o X-API-Key: <key>
 */
export function validateApiRequest(
  req: NextRequest,
): { success: true; ctx: ApiAuthContext } | { success: false; response: NextResponse } {
  // Extract key from headers
  let apiKey: string | null = null

  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    apiKey = authHeader.slice(7).trim()
  }

  if (!apiKey) {
    apiKey = req.headers.get('x-api-key')
  }

  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Autenticacion requerida',
          message: 'Incluye tu API key en el header Authorization (Bearer <key>) o X-API-Key.',
          docs: '/docs/api',
        },
        { status: 401 },
      ),
    }
  }

  // Validate key
  const validation = apiKeyService.validateApiKey(apiKey)

  if (!validation.valid) {
    const status = validation.error?.includes('Limite') ? 429 : 401
    return {
      success: false,
      response: NextResponse.json(
        {
          error: status === 429 ? 'Limite de solicitudes excedido' : 'API key invalida',
          message: validation.error,
        },
        { status },
      ),
    }
  }

  return {
    success: true,
    ctx: {
      orgId: validation.orgId!,
      keyId: validation.keyId!,
      permissions: validation.permissions!,
    },
  }
}

// =============================================
// ROUTE WRAPPER
// =============================================

/**
 * Wrapper para proteger rutas /api/v1/* con autenticacion por API key.
 * Verifica que la API key tenga el permiso requerido.
 *
 * Uso:
 *   export const GET = withApiKey('workers:read', async (req, ctx) => { ... })
 */
export function withApiKey(
  requiredPermission: ApiPermission,
  handler: ApiRouteHandler,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = validateApiRequest(req)

    if (!result.success) {
      return result.response
    }

    const { ctx } = result

    // Check specific permission
    if (!apiKeyService.hasPermission(ctx.permissions, requiredPermission)) {
      return NextResponse.json(
        {
          error: 'Permiso denegado',
          message: `Esta API key no tiene el permiso "${requiredPermission}". Permisos actuales: ${ctx.permissions.join(', ')}.`,
        },
        { status: 403 },
      )
    }

    try {
      return await handler(req, ctx)
    } catch (error) {
      console.error('Error en API v1:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 },
      )
    }
  }
}
