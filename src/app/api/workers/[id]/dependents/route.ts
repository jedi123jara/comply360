/**
 * /api/workers/[id]/dependents
 *
 * GET  — listar dependientes activos del trabajador
 * POST — crear nuevo dependiente
 *
 * Ola 1 — Compliance crítico: registrar cónyuges/hijos/parientes con DNI cruzable
 * para validar asignación familiar (Ley 25129) y derecho-habientes EsSalud
 * (Ley 27657). Sin DNI verificable, multa SUNAFIL 23.11 UIT por asignación falsa.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { syncComplianceScore } from '@/lib/compliance/sync-score'

const VALID_RELACIONES = [
  'CONYUGE',
  'CONVIVIENTE',
  'HIJO',
  'HIJO_ADOPTIVO',
  'HIJO_DISCAPACITADO',
  'PADRE',
  'MADRE',
  'HERMANO_DISCAPACITADO',
  'OTRO',
] as const

const VALID_DOC_TIPOS = ['DNI', 'CE', 'PASAPORTE', 'PARTIDA_NACIMIENTO'] as const

// =============================================
// GET /api/workers/[id]/dependents
// =============================================
export const GET = withAuthParams<{ id: string }>(async (_req: NextRequest, ctx: AuthContext, params) => {
  const { id } = params
  const orgId = ctx.orgId

  // Verifica que el worker pertenece a la org y no está soft-deleted
  const worker = await prisma.worker.findUnique({
    where: { id },
    select: { id: true, orgId: true, deletedAt: true, asignacionFamiliar: true },
  })
  if (!worker || worker.orgId !== orgId || worker.deletedAt) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  const dependents = await prisma.workerDependent.findMany({
    where: { workerId: id, deletedAt: null },
    orderBy: { birthDate: 'desc' },
  })

  // Cuenta dependientes que justifican asignación familiar (hijos < 18 o estudios superiores)
  const ahora = new Date()
  const justificanAsigFam = dependents.filter(d => {
    if (!d.esBeneficiarioAsigFam) return false
    if (d.relacion === 'CONYUGE' || d.relacion === 'CONVIVIENTE') return false
    const edadAnos = (ahora.getTime() - new Date(d.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return edadAnos < 18 || d.relacion === 'HIJO_DISCAPACITADO'
  }).length

  return NextResponse.json({
    data: dependents.map(d => ({
      ...d,
      birthDate: d.birthDate.toISOString(),
      verifiedAt: d.verifiedAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    meta: {
      total: dependents.length,
      justificanAsigFam,
      // Disonancia: tiene `asignacionFamiliar=true` en Worker pero NO hay
      // dependientes que la justifiquen → riesgo SUNAFIL.
      disonancia: worker.asignacionFamiliar && justificanAsigFam === 0,
    },
  })
})

// =============================================
// POST /api/workers/[id]/dependents
// =============================================
export const POST = withAuthParams<{ id: string }>(async (req: NextRequest, ctx: AuthContext, params) => {
  const { id } = params
  const orgId = ctx.orgId

  const worker = await prisma.worker.findUnique({
    where: { id },
    select: { id: true, orgId: true, deletedAt: true },
  })
  if (!worker || worker.orgId !== orgId || worker.deletedAt) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  let body: {
    relacion?: string
    documentoTipo?: string
    documentoNum?: string
    fullName?: string
    birthDate?: string
    actaUrl?: string
    esBeneficiarioEsalud?: boolean
    esBeneficiarioAsigFam?: boolean
    notas?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  // Validaciones
  if (!body.relacion || !VALID_RELACIONES.includes(body.relacion as typeof VALID_RELACIONES[number])) {
    return NextResponse.json(
      { error: `relacion debe ser uno de: ${VALID_RELACIONES.join(', ')}` },
      { status: 400 },
    )
  }
  const docTipo = body.documentoTipo ?? 'DNI'
  if (!VALID_DOC_TIPOS.includes(docTipo as typeof VALID_DOC_TIPOS[number])) {
    return NextResponse.json(
      { error: `documentoTipo debe ser uno de: ${VALID_DOC_TIPOS.join(', ')}` },
      { status: 400 },
    )
  }
  if (!body.documentoNum || typeof body.documentoNum !== 'string') {
    return NextResponse.json({ error: 'documentoNum es requerido' }, { status: 400 })
  }
  if (docTipo === 'DNI' && !/^\d{8}$/.test(body.documentoNum)) {
    return NextResponse.json({ error: 'DNI debe tener 8 dígitos' }, { status: 400 })
  }
  if (!body.fullName || body.fullName.trim().length < 2) {
    return NextResponse.json({ error: 'fullName es requerido' }, { status: 400 })
  }
  if (!body.birthDate) {
    return NextResponse.json({ error: 'birthDate es requerido' }, { status: 400 })
  }
  const birth = new Date(body.birthDate)
  if (isNaN(birth.getTime()) || birth >= new Date()) {
    return NextResponse.json({ error: 'birthDate debe ser una fecha pasada válida' }, { status: 400 })
  }

  try {
    const dep = await prisma.workerDependent.create({
      data: {
        workerId: id,
        orgId,
        relacion: body.relacion as 'HIJO',
        documentoTipo: docTipo,
        documentoNum: body.documentoNum,
        fullName: body.fullName.trim(),
        birthDate: birth,
        actaUrl: body.actaUrl ?? null,
        esBeneficiarioEsalud: body.esBeneficiarioEsalud ?? true,
        esBeneficiarioAsigFam: body.esBeneficiarioAsigFam ?? false,
        notas: body.notas ?? null,
      },
    })

    // Recalcular score de compliance (si tiene impacto)
    syncComplianceScore(orgId).catch(() => {})

    return NextResponse.json({ data: dep }, { status: 201 })
  } catch (err) {
    // Constraint unique violado → ya existe ese documento para ese worker
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('Unique') || errMsg.includes('worker_dependents_worker_id_documento')) {
      return NextResponse.json(
        { error: `Ya existe un dependiente con ${docTipo} ${body.documentoNum} para este trabajador` },
        { status: 409 },
      )
    }
    console.error('[dependents/POST] failed', err)
    return NextResponse.json({ error: 'No se pudo crear el dependiente' }, { status: 500 })
  }
})
