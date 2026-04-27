/**
 * POST /api/mi-portal/acknowledgments
 *
 * Worker firma electrónicamente un documento (acuse de recibo).
 *
 * Body: {
 *   documentId: string
 *   documentVersion: number      // versión exacta que está firmando
 *   signatureMethod: 'SIMPLE' | 'OTP_EMAIL' | 'BIOMETRIC'
 *   signatureProof?: object       // metadata del método (ej: credentialId WebAuthn)
 *   scrolledToEnd: boolean        // evidencia de lectura — debe ser true para firmar
 *   readingTimeMs: number         // tiempo en página — recomendado >= 30000ms
 * }
 *
 * El endpoint extrae IP + userAgent del request automáticamente.
 *
 * Auth: Worker.
 *
 * Respuesta exitosa: { ok: true, ackId, newAck, version }
 *
 * GET /api/mi-portal/acknowledgments
 *
 * Devuelve histórico de firmas del worker (paginado, ordenado por fecha desc).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { recordAcknowledgment } from '@/lib/documents/acknowledgments'
import type { SignatureMethod } from '@/lib/documents/acknowledgments'

const VALID_METHODS: SignatureMethod[] = ['SIMPLE', 'OTP_EMAIL', 'BIOMETRIC']

export const POST = withWorkerAuth(async (req: NextRequest, ctx) => {
  let body: {
    documentId?: string
    documentVersion?: number
    signatureMethod?: string
    signatureProof?: Record<string, unknown>
    scrolledToEnd?: boolean
    readingTimeMs?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  // Validaciones
  if (!body.documentId || typeof body.documentId !== 'string') {
    return NextResponse.json({ error: 'documentId requerido' }, { status: 400 })
  }
  if (typeof body.documentVersion !== 'number' || body.documentVersion < 1) {
    return NextResponse.json({ error: 'documentVersion debe ser número positivo' }, { status: 400 })
  }
  if (!body.signatureMethod || !VALID_METHODS.includes(body.signatureMethod as SignatureMethod)) {
    return NextResponse.json(
      { error: `signatureMethod debe ser uno de: ${VALID_METHODS.join(', ')}` },
      { status: 400 },
    )
  }
  if (body.scrolledToEnd !== true) {
    // Hard requirement — sin lectura no hay firma válida
    return NextResponse.json(
      {
        error: 'Debes leer el documento completo antes de firmarlo. Haz scroll hasta el final.',
        code: 'NOT_READ',
      },
      { status: 400 },
    )
  }

  // Resolver el Worker.id desde el User autenticado
  const worker = await prisma.worker.findFirst({
    where: { userId: ctx.userId, orgId: ctx.orgId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!worker) {
    return NextResponse.json(
      { error: 'No estás vinculado a una empresa activa', code: 'NO_WORKER_LINK' },
      { status: 403 },
    )
  }

  // Extraer IP + userAgent del request
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    null
  const userAgent = req.headers.get('user-agent') ?? null

  const result = await recordAcknowledgment({
    orgId: ctx.orgId,
    workerId: worker.id,
    documentId: body.documentId,
    documentVersion: body.documentVersion,
    signatureMethod: body.signatureMethod as SignatureMethod,
    signatureProof: body.signatureProof ?? null,
    ip,
    userAgent,
    scrolledToEnd: body.scrolledToEnd,
    readingTimeMs: body.readingTimeMs ?? null,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, code: result.code },
      { status: result.code === 'VERSION_MISMATCH' ? 409 : 400 },
    )
  }

  return NextResponse.json({
    ok: true,
    ackId: result.ackId,
    newAck: result.newAck,
    documentVersion: body.documentVersion,
    message: result.newAck
      ? '✓ Firma registrada con valor legal'
      : 'Ya tenías firma registrada para esta versión',
  })
})

// ─── GET histórico de firmas ────────────────────────────────────────────────

export const GET = withWorkerAuth(async (_req, ctx) => {
  const worker = await prisma.worker.findFirst({
    where: { userId: ctx.userId, orgId: ctx.orgId },
    select: { id: true },
  })
  if (!worker) {
    return NextResponse.json({ acks: [], total: 0 })
  }

  const acks = await prisma.documentAcknowledgment.findMany({
    where: { workerId: worker.id },
    orderBy: { acknowledgedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      acknowledgedAt: true,
      documentVersion: true,
      signatureMethod: true,
      document: {
        select: { id: true, title: true, type: true, version: true },
      },
    },
  })

  return NextResponse.json({ acks, total: acks.length })
})
