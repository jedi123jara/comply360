import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiKeyService } from '@/lib/api-keys'
import { createContractWithSideEffects } from '@/lib/contracts/create'
import type { ContractType } from '@/generated/prisma/client'

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

const VALID_CONTRACT_TYPES = new Set<ContractType>([
  'LABORAL_INDEFINIDO',
  'LABORAL_PLAZO_FIJO',
  'LABORAL_TIEMPO_PARCIAL',
  'LOCACION_SERVICIOS',
  'CONFIDENCIALIDAD',
  'NO_COMPETENCIA',
  'POLITICA_HOSTIGAMIENTO',
  'POLITICA_SST',
  'REGLAMENTO_INTERNO',
  'ADDENDUM',
  'CONVENIO_PRACTICAS',
  'CUSTOM',
])

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
    const { title, type, expiresAt, templateId, formData, contentHtml, contentJson } = body

    if (!title || !type) {
      return NextResponse.json(
        { error: 'title y type son requeridos' },
        { status: 400 }
      )
    }

    if (!VALID_CONTRACT_TYPES.has(type)) {
      return NextResponse.json(
        { error: 'type inválido', validTypes: Array.from(VALID_CONTRACT_TYPES) },
        { status: 400 },
      )
    }

    const { contract } = await createContractWithSideEffects({
      orgId: validation.orgId,
      userId: 'api-key',
      title,
      type,
      templateId: templateId ?? null,
      formData: isRecord(formData) ? formData : null,
      contentHtml: typeof contentHtml === 'string' ? contentHtml : null,
      contentJson: contentJson ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: 'DRAFT',
      provenance: templateId ? 'MANUAL_TEMPLATE' : 'LEGACY',
      changeReason: 'Creacion desde API publica v1',
    })

    return NextResponse.json({ data: contract }, { status: 201 })
  } catch (error) {
    console.error('[api/v1/contracts] POST error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
