import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/contracts - List contracts from DB
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const orgId = ctx.orgId

    const where = {
      orgId,
      ...(status ? { status: status as 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SIGNED' | 'EXPIRED' | 'ARCHIVED' } : {}),
      ...(type ? { type: type as 'LABORAL_INDEFINIDO' } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          status: true,
          title: true,
          aiRiskScore: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      prisma.contract.count({ where }),
    ])

    return NextResponse.json({
      data: contracts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
  }
})

// =============================================
// POST /api/contracts - Create contract
// =============================================
const VALID_CONTRACT_TYPES = new Set<string>([
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

type PrismaContractType =
  | 'LABORAL_INDEFINIDO'
  | 'LABORAL_PLAZO_FIJO'
  | 'LABORAL_TIEMPO_PARCIAL'
  | 'LOCACION_SERVICIOS'
  | 'CONFIDENCIALIDAD'
  | 'NO_COMPETENCIA'
  | 'POLITICA_HOSTIGAMIENTO'
  | 'POLITICA_SST'
  | 'REGLAMENTO_INTERNO'
  | 'ADDENDUM'
  | 'CONVENIO_PRACTICAS'
  | 'CUSTOM'

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const { templateId, type, title, formData, contentHtml, contentJson } = body

    if (!type || !title) {
      return NextResponse.json(
        { error: 'type and title are required' },
        { status: 400 }
      )
    }

    const normalizedType = VALID_CONTRACT_TYPES.has(String(type))
      ? (String(type) as PrismaContractType)
      : ('CUSTOM' as PrismaContractType)

    const orgId = ctx.orgId
    let userId = ctx.userId

    // Fallback robusto: si el userId es el placeholder de desarrollo ('demo-user')
    // o simplemente no existe en la DB, buscamos (o creamos) el usuario real de la org.
    const isDemoUser = userId === 'demo-user' || userId === 'demo'
    if (isDemoUser) {
      let realUser = await prisma.user.findFirst({
        where: { orgId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
      if (!realUser && process.env.NODE_ENV === 'development') {
        // Auto-seed demo org + user if they somehow still don't exist
        await prisma.organization.upsert({
          where: { id: 'org-demo' },
          create: { id: 'org-demo', name: 'Empresa Demo S.A.C.', plan: 'PRO', alertEmail: 'demo@comply360.pe', onboardingCompleted: true },
          update: {},
        })
        realUser = await prisma.user.upsert({
          where: { clerkId: ctx.clerkId || 'demo-clerk-id' },
          create: { clerkId: ctx.clerkId || 'demo-clerk-id', orgId: 'org-demo', email: ctx.email || 'demo@comply360.pe', firstName: 'Demo', lastName: 'User', role: 'OWNER' },
          update: { orgId: 'org-demo' },
          select: { id: true },
        })
      }
      if (realUser) {
        userId = realUser.id
      } else {
        return NextResponse.json(
          { error: 'No se encontró un usuario válido en la organización. Completa el onboarding primero.' },
          { status: 422 }
        )
      }
    }

    // Verificar que el userId efectivamente existe en la tabla users (evita FK violation)
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!userExists) {
      const fallbackUser = await prisma.user.findFirst({
        where: { orgId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
      if (!fallbackUser) {
        return NextResponse.json(
          { error: 'Usuario no encontrado. Vuelve a iniciar sesión.' },
          { status: 401 }
        )
      }
      userId = fallbackUser.id
    }

    const contract = await prisma.contract.create({
      data: {
        orgId,
        createdById: userId,
        templateId: templateId || null,
        type: normalizedType,
        status: 'DRAFT',
        title,
        formData: formData || null,
        contentHtml: typeof contentHtml === 'string' ? contentHtml : null,
        contentJson: contentJson ?? null,
      },
    })

    // ──────────────────────────────────────────────────────────
    // Auto-create Worker from contract formData when the contract
    // is a labor type and has DNI + name in formData.
    // Silently skips if worker already exists (unique [orgId, dni]).
    // ──────────────────────────────────────────────────────────
    const LABOR_TYPES = new Set([
      'LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO', 'LABORAL_TIEMPO_PARCIAL',
      'CONVENIO_PRACTICAS',
    ])

    if (LABOR_TYPES.has(normalizedType) && formData && typeof formData === 'object') {
      const fd = formData as Record<string, unknown>
      const dniRaw = String(fd.trabajador_dni ?? '').trim().replace(/\D/g, '')
      const nombreRaw = String(fd.trabajador_nombre ?? '').trim()

      if (dniRaw.length >= 8 && nombreRaw.length > 0) {
        try {
          // Parse nombre → firstName / lastName
          // Supports "APELLIDO APELLIDO, NOMBRE NOMBRE" or "NOMBRE APELLIDO"
          let firstName = ''
          let lastName = ''
          if (nombreRaw.includes(',')) {
            const [last, first] = nombreRaw.split(',').map(s => s.trim())
            lastName = last
            firstName = first
          } else {
            const parts = nombreRaw.split(' ')
            firstName = parts[0] ?? ''
            lastName = parts.slice(1).join(' ') || parts[0]
          }

          // Detect regimenLaboral from contract type
          const regimen =
            normalizedType === 'CONVENIO_PRACTICAS' ? ('MODALIDAD_FORMATIVA' as const)
            : ('GENERAL' as const)

          // Map contract type to tipoContrato
          const tipoContrato =
            normalizedType === 'LABORAL_PLAZO_FIJO' ? ('PLAZO_FIJO' as const)
            : normalizedType === 'LABORAL_TIEMPO_PARCIAL' ? ('TIEMPO_PARCIAL' as const)
            : normalizedType === 'CONVENIO_PRACTICAS' ? ('OBRA_DETERMINADA' as const)
            : ('INDEFINIDO' as const)

          const fechaIngreso = fd.fecha_inicio
            ? new Date(String(fd.fecha_inicio))
            : new Date()
          const sueldoBruto = fd.remuneracion ? Number(fd.remuneracion) : 0

          // Upsert worker — if same DNI already exists in org, update position/salary
          const worker = await prisma.worker.upsert({
            where: { orgId_dni: { orgId, dni: dniRaw } },
            create: {
              orgId,
              dni: dniRaw,
              firstName,
              lastName,
              position: fd.cargo ? String(fd.cargo) : null,
              regimenLaboral: regimen,
              tipoContrato,
              fechaIngreso,
              sueldoBruto,
              status: 'ACTIVE',
              legajoScore: 0,
            },
            update: {
              // Update position/salary if they changed
              ...(fd.cargo ? { position: String(fd.cargo) } : {}),
              ...(fd.remuneracion ? { sueldoBruto } : {}),
            },
            select: { id: true },
          })

          // Link contract to worker (idempotent)
          await prisma.workerContract.upsert({
            where: { workerId_contractId: { workerId: worker.id, contractId: contract.id } },
            create: { workerId: worker.id, contractId: contract.id },
            update: {},
          })

          // Upsert WorkerDocument contrato_trabajo → VERIFIED
          const existingDoc = await prisma.workerDocument.findFirst({
            where: { workerId: worker.id, documentType: 'contrato_trabajo' },
            select: { id: true },
          })
          if (!existingDoc) {
            await prisma.workerDocument.create({
              data: {
                workerId: worker.id,
                category: 'INGRESO',
                documentType: 'contrato_trabajo',
                title,
                isRequired: true,
                status: 'VERIFIED',
                verifiedAt: new Date(),
                verifiedBy: userId,
              },
            })
          }

          // Recalculate legajoScore
          const REQUIRED_DOC_TYPES = [
            'contrato_trabajo', 'cv', 'dni_copia', 'declaracion_jurada',
            'boleta_pago', 't_registro', 'vacaciones_goce', 'capacitacion_registro',
            'examen_medico_ingreso', 'examen_medico_periodico', 'induccion_sst',
            'entrega_epp', 'iperc_puesto', 'capacitacion_sst', 'reglamento_interno',
            'afp_onp_afiliacion', 'essalud_registro', 'cts_deposito',
          ]
          const uploadedDocs = await prisma.workerDocument.findMany({
            where: { workerId: worker.id, status: { in: ['UPLOADED', 'VERIFIED'] } },
            select: { documentType: true },
          })
          const uploaded = new Set(uploadedDocs.map(d => d.documentType))
          const score = Math.round(
            (REQUIRED_DOC_TYPES.filter(t => uploaded.has(t)).length / REQUIRED_DOC_TYPES.length) * 100
          )
          await prisma.worker.update({ where: { id: worker.id }, data: { legajoScore: score } })

        } catch (workerErr) {
          // Non-fatal — contract was already saved, just log
          console.warn('[POST /api/contracts] Auto-worker creation failed (non-fatal):', workerErr)
        }
      }
    }

    return NextResponse.json({ data: contract }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/contracts] Error creating contract:', error)
    // En desarrollo, exponemos el mensaje real para facilitar el debug
    const message =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : 'Failed to create contract'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
