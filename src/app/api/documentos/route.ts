import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'

// =============================================
// Types
// =============================================

type DocStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO'
type DocCategory =
  | 'CONTRATOS_LABORALES'
  | 'POLITICAS_INTERNAS'
  | 'DOCUMENTOS_SST'
  | 'REGISTROS_SUNAFIL'
  | 'BOLETAS_PAGO'
  | 'DOCUMENTOS_PERSONALES'

type FileType = 'PDF' | 'DOC' | 'XLS' | 'IMG' | 'OTHER'

interface Documento {
  id: string
  title: string
  fileName: string
  fileUrl: string
  fileType: FileType
  mimeType: string
  fileSize: number
  category: DocCategory
  status: DocStatus
  uploadDate: string
  expirationDate: string | null
  daysUntilExpiry: number | null
  uploadedBy: string
  isDigitized: boolean
}

interface DocStats {
  total: number
  vigentes: number
  porVencer: number
  vencidos: number
  sinDigitalizar: number
}

// =============================================
// Helpers
// =============================================

function computeDocStatus(expirationDate: string | null): {
  status: DocStatus
  daysUntilExpiry: number | null
} {
  if (!expirationDate) {
    return { status: 'VIGENTE', daysUntilExpiry: null }
  }
  const now = new Date()
  const exp = new Date(expirationDate)
  const diffMs = exp.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    return { status: 'VENCIDO', daysUntilExpiry: diffDays }
  }
  if (diffDays <= 30) {
    return { status: 'POR_VENCER', daysUntilExpiry: diffDays }
  }
  return { status: 'VIGENTE', daysUntilExpiry: diffDays }
}

// =============================================
// GET /api/documentos
// =============================================

export const GET = withAuth(async () => {
  try {
    // In a full implementation, this would query documents from the database.
    // For now, return demo data to support the frontend while DB models are set up.

    const documents: Documento[] = [
      {
        id: 'doc-001',
        title: 'Contrato individual - Maria Lopez',
        fileName: 'contrato_lopez_maria.pdf',
        fileUrl: '/documents/contrato_lopez_maria.pdf',
        fileType: 'PDF',
        mimeType: 'application/pdf',
        fileSize: 2456000,
        category: 'CONTRATOS_LABORALES',
        status: 'VIGENTE',
        uploadDate: '2025-08-15T10:30:00Z',
        expirationDate: '2027-08-15T00:00:00Z',
        daysUntilExpiry: 497,
        uploadedBy: 'Admin',
        isDigitized: true,
      },
      {
        id: 'doc-002',
        title: 'Contrato temporal - Juan Perez',
        fileName: 'contrato_perez_juan.pdf',
        fileUrl: '/documents/contrato_perez_juan.pdf',
        fileType: 'PDF',
        mimeType: 'application/pdf',
        fileSize: 1890000,
        category: 'CONTRATOS_LABORALES',
        status: 'POR_VENCER',
        uploadDate: '2025-03-10T09:00:00Z',
        expirationDate: '2026-04-20T00:00:00Z',
        daysUntilExpiry: 14,
        uploadedBy: 'RRHH',
        isDigitized: true,
      },
      {
        id: 'doc-003',
        title: 'Politica de acoso laboral v2',
        fileName: 'politica_acoso_v2.pdf',
        fileUrl: '/documents/politica_acoso_v2.pdf',
        fileType: 'PDF',
        mimeType: 'application/pdf',
        fileSize: 3200000,
        category: 'POLITICAS_INTERNAS',
        status: 'VIGENTE',
        uploadDate: '2025-06-01T14:00:00Z',
        expirationDate: '2027-06-01T00:00:00Z',
        daysUntilExpiry: 422,
        uploadedBy: 'Legal',
        isDigitized: true,
      },
    ]

    // Recompute statuses based on current date
    const updatedDocs = documents.map(doc => {
      const { status, daysUntilExpiry } = computeDocStatus(doc.expirationDate)
      return { ...doc, status, daysUntilExpiry }
    })

    const stats: DocStats = {
      total: updatedDocs.length,
      vigentes: updatedDocs.filter(d => d.status === 'VIGENTE').length,
      porVencer: updatedDocs.filter(d => d.status === 'POR_VENCER').length,
      vencidos: updatedDocs.filter(d => d.status === 'VENCIDO').length,
      sinDigitalizar: updatedDocs.filter(d => !d.isDigitized).length,
    }

    return NextResponse.json({ documents: updatedDocs, stats })
  } catch (error) {
    console.error('Documentos GET error:', error)
    return NextResponse.json(
      { error: 'Error al cargar documentos' },
      { status: 500 }
    )
  }
})

// =============================================
// DELETE /api/documentos?id=xxx
// =============================================

export const DELETE = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // In a full implementation, delete from DB + storage
    return NextResponse.json({ success: true, deletedId: id })
  } catch (error) {
    console.error('Documentos DELETE error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar documento' },
      { status: 500 }
    )
  }
})
