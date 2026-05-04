/**
 * GET /api/org-documents
 *
 * Lista TODOS los OrgDocument de la org (no solo los con acknowledgmentRequired).
 * Sirve para que el admin pueda elegir docs existentes y marcarlos como
 * "requiere firma" desde /dashboard/documentos-firma.
 *
 * Query params:
 *   - excludeAck (bool, default true): excluye los que ya tienen acknowledgmentRequired=true
 *   - type (string, opcional): filtra por OrgDocType
 *
 * Auth: MEMBER+ (cualquier rol del dashboard).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'
import { isOrgTemplate } from '@/lib/templates/org-template-engine'

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const excludeAck = searchParams.get('excludeAck') !== 'false'
  const type = searchParams.get('type')

  const where: Prisma.OrgDocumentWhereInput = {
    orgId: ctx.orgId,
  }
  if (excludeAck) {
    where.acknowledgmentRequired = false
  }
  if (type) {
    // Cast — type es enum OrgDocType
    where.type = type as Prisma.OrgDocumentWhereInput['type']
  }

  const docs = await prisma.orgDocument.findMany({
    where,
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      version: true,
      isPublishedToWorkers: true,
      acknowledgmentRequired: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  })
  const documents = docs.filter((doc) => !isOrgTemplate(doc))

  return NextResponse.json({
    documents,
    total: documents.length,
  })
})
