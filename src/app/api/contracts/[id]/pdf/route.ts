import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { cleanContractContent } from '@/lib/pdf/contract-content-cleaner'
import {
  createContractPDFDoc,
  addCoverPage,
  addContractHeader,
  renderContractBody,
  addSignatureBlock,
  finalizeContractPDF,
  loadOrgLogoBytes,
} from '@/lib/pdf/contract-pdf'

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
    const ciudad = typeof formData.ciudad === 'string' ? formData.ciudad : 'Lima'
    const fechaInicio =
      typeof formData.fecha_inicio === 'string' ? formData.fecha_inicio : null

    // ── Limpiar contenido HTML → texto sanitizado ─────────────────────────
    const plainText = stripHtml(contract.contentHtml ?? '')
    const cleaned = cleanContractContent(plainText)

    // ── Construir PDF ──────────────────────────────────────────────────────
    const orgForPdf = {
      name: org?.name,
      razonSocial: org?.razonSocial,
      ruc: org?.ruc,
    }
    const logo = await loadOrgLogoBytes(org?.logoUrl)
    const headerOpts = { org: orgForPdf, logo }

    const doc = await createContractPDFDoc()

    addCoverPage(doc, {
      title: contract.title || 'Contrato',
      org: orgForPdf,
      logo,
      workerFullName: trabajadorNombre,
      workerDni: trabajadorDni,
      ciudad,
      fechaIngreso: fechaInicio,
    })

    doc.addPage()
    addContractHeader(doc, headerOpts)

    const bodyEndY = renderContractBody(doc, cleaned, {
      startY: 36,
      headerOpts,
    })

    addSignatureBlock(doc, bodyEndY, {
      empleador: {
        razonSocial: org?.razonSocial ?? org?.name ?? '',
        ruc: org?.ruc ?? '',
      },
      trabajador: { fullName: trabajadorNombre, dni: trabajadorDni },
      ciudad,
      fecha: new Date(),
      headerOpts,
    })

    const filename = `contrato-${contract.id.slice(-8)}.pdf`
    return finalizeContractPDF(doc, filename)
  },
)

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li)\s*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
