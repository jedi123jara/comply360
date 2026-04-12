import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiKeyService } from '@/lib/api-keys'

/**
 * Public API v1 — Workers
 * Authentication: Bearer API key
 *
 * GET  /api/v1/workers — List workers
 * POST /api/v1/workers — Create worker
 */

function getApiKey(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth) return null
  return auth.startsWith('Bearer ') ? auth.slice(7) : auth
}

export async function GET(req: NextRequest) {
  const key = getApiKey(req)
  if (!key) {
    return NextResponse.json(
      { error: 'Header Authorization con API key es requerido' },
      { status: 401 }
    )
  }

  const validation = apiKeyService.validateApiKey(key)
  if (!validation.valid || !validation.orgId) {
    return NextResponse.json(
      { error: validation.error || 'API key invalida' },
      { status: 401 }
    )
  }

  if (!apiKeyService.hasPermission(validation.permissions!, 'workers:read')) {
    return NextResponse.json(
      { error: 'API key no tiene permiso workers:read' },
      { status: 403 }
    )
  }

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 100)
  const status = url.searchParams.get('status')
  const department = url.searchParams.get('department')
  const search = url.searchParams.get('search')

  const where: Record<string, unknown> = { orgId: validation.orgId }
  if (status) where.status = status
  if (department) where.department = department
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { dni: { contains: search } },
    ]
  }

  try {
    const [workers, total] = await Promise.all([
      prisma.worker.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dni: true,
          position: true,
          department: true,
          fechaIngreso: true,
          status: true,
          regimenLaboral: true,
          tipoContrato: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.worker.count({ where }),
    ])

    return NextResponse.json({
      data: workers,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('[api/v1/workers] GET error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const key = getApiKey(req)
  if (!key) {
    return NextResponse.json(
      { error: 'Header Authorization con API key es requerido' },
      { status: 401 }
    )
  }

  const validation = apiKeyService.validateApiKey(key)
  if (!validation.valid || !validation.orgId) {
    return NextResponse.json(
      { error: validation.error || 'API key invalida' },
      { status: 401 }
    )
  }

  if (!apiKeyService.hasPermission(validation.permissions!, 'workers:write')) {
    return NextResponse.json(
      { error: 'API key no tiene permiso workers:write' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const { firstName, lastName, dni, position, department, fechaIngreso, regimenLaboral, tipoContrato, sueldoBruto } = body

    if (!firstName || !lastName || !dni) {
      return NextResponse.json(
        { error: 'firstName, lastName y dni son campos requeridos' },
        { status: 400 }
      )
    }

    if (!/^\d{8}$/.test(dni)) {
      return NextResponse.json(
        { error: 'DNI debe tener exactamente 8 digitos' },
        { status: 400 }
      )
    }

    // Check duplicate DNI in org
    const existing = await prisma.worker.findFirst({
      where: { dni, orgId: validation.orgId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un trabajador con este DNI en la organizacion' },
        { status: 409 }
      )
    }

    const worker = await prisma.worker.create({
      data: {
        orgId: validation.orgId,
        firstName,
        lastName,
        dni,
        position: position || null,
        department: department || null,
        fechaIngreso: fechaIngreso ? new Date(fechaIngreso) : new Date(),
        sueldoBruto: sueldoBruto || 1130,
        regimenLaboral: regimenLaboral || 'GENERAL',
        tipoContrato: tipoContrato || 'INDEFINIDO',
        status: 'ACTIVE',
      },
    })

    return NextResponse.json({ data: worker }, { status: 201 })
  } catch (error) {
    console.error('[api/v1/workers] POST error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
