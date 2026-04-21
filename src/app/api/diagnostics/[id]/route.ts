import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'

// =============================================
// GET /api/diagnostics/[id] — Get diagnostic detail
// =============================================
export const GET = withAuthParams<{ id: string }>(async (_req, ctx, params) => {
  try {
    const { id } = params
    const orgId = ctx.orgId

    const diagnostic = await prisma.complianceDiagnostic.findUnique({
      where: { id },
    })

    if (!diagnostic) {
      return NextResponse.json({ error: 'Diagnostic not found' }, { status: 404 })
    }

    // Ensure the diagnostic belongs to the authenticated org
    if (diagnostic.orgId !== orgId) {
      return NextResponse.json({ error: 'Diagnostic not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...diagnostic,
      totalMultaRiesgo: Number(diagnostic.totalMultaRiesgo),
    })
  } catch (error) {
    console.error('Diagnostic GET error:', error)
    return NextResponse.json({ error: 'Failed to load diagnostic' }, { status: 500 })
  }
})
