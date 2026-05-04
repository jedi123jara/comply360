import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { renderContractPdfBuffer } from '@/lib/contracts/rendering'

// =============================================
// GET /api/contracts/[id]/pdf — Download contract as PDF
// =============================================
export const GET = withAuthParams<{ id: string }>(
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const orgId = ctx.orgId

    const contract = await prisma.contract.findFirst({
      where: { id: params.id, orgId },
      include: {
        organization: {
          select: { name: true, razonSocial: true, ruc: true, logoUrl: true },
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    const org = contract.organization
    const formData = (contract.formData ?? {}) as Record<string, string | number | null>

    const trabajadorNombre =
      typeof formData.trabajador_nombre === 'string' ? formData.trabajador_nombre : ''
    const trabajadorDni =
      typeof formData.trabajador_dni === 'string' ? formData.trabajador_dni : ''
    const fechaInicio =
      typeof formData.fecha_inicio === 'string' ? formData.fecha_inicio : null

    const buffer = await renderContractPdfBuffer({
      title: contract.title || 'Contrato',
      contractType: contract.type,
      sourceKind: 'html-based',
      contentHtml: contract.contentHtml,
      contentJson: contract.contentJson,
      formData,
      orgContext: {
        name: org?.name,
        razonSocial: org?.razonSocial,
        ruc: org?.ruc,
        logoUrl: org?.logoUrl,
      },
      workerContext: {
        fullName: trabajadorNombre,
        dni: trabajadorDni,
        fechaIngreso: fechaInicio,
      },
    })

    const filename = `contrato-${contract.id.slice(-8)}.pdf`
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  },
)
