import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiKeyService } from '@/lib/api-keys'

/**
 * Public API v1 — Contracts
 * Authentication: Bearer API key
 *
 * GET  /api/v1/contracts — List contracts
 * POST /api/v1/contracts — Create contract
 */

function getApiKey(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth) return null
  return auth.startsWith('Bearer ') ? auth.slice(7) : auth
}

export async function GET(req: NextRequest) {
  const key = getApiKey(req)
  if (!key) {
    return NextResponse.json({ error: 'Authorization requerido' }, { status: 401 })
  }

  const validation = apiKeyService.validateApiKey(key)
  if (!validation.valid || !validation.orgId) {
    return NextResponse.json({ error: validation.error }, { status: 401 })
  }

  if (!apiKeyService.hasPermission(validation.permissions!, 'contracts:read')) {
    return NextResponse.json({ error: 'Permiso contracts:read requerido' }, { status: 403 })
  }

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 100)
  const status = url.searchParams.get('status')
  const type = url.searchParams.get('type')

  const where: Record<string, unknown> = { orgId: validation.orgId }
  if (status) where.status = status
  if (type) where.type = type

  try {
    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          expiresAt: true,
          signedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contract.count({ where }),
    ])

    return NextResponse.json({
      data: contracts,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error) {
    console.error('[api/v1/contracts] GET error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const key = getApiKey(req)
  if (!key) {
    return NextResponse.json({ error: 'Authorization requerido' }, { status: 401 })
  }

  const validation = apiKeyService.validateApiKey(key)
  if (!validation.valid || !validation.orgId) {
    return NextResponse.json({ error: validation.error }, { status: 401 })
  }

  if (!apiKeyService.hasPermission(validation.permissions!, 'contracts:write')) {
    return NextResponse.json({ error: 'Permiso contracts:write requerido' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { title, type, expiresAt } = body

    if (!title || !type) {
      return NextResponse.json(
        { error: 'title y type son requeridos' },
        { status: 400 }
      )
    }

    // Need a createdById - use a placeholder for API-created contracts
    const contract = await prisma.contract.create({
      data: {
        orgId: validation.orgId,
        createdById: 'api', // API-created
        title,
        type,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'DRAFT',
      },
    })

    return NextResponse.json({ data: contract }, { status: 201 })
  } catch (error) {
    console.error('[api/v1/contracts] POST error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
