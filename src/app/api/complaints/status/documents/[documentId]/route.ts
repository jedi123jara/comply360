import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storageService } from '@/lib/storage'
import { rateLimit } from '@/lib/rate-limit'
import { verifyComplaintTrackingToken } from '@/lib/complaints/tracking-token'

const documentDownloadLimiter = rateLimit({ interval: 60_000, limit: 30 })

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const rl = await documentDownloadLimiter.check(req)
  if (!rl.success) return rl.response!

  const { documentId } = await params
  const url = new URL(req.url)
  const orgId = url.searchParams.get('org')?.trim()
  const code = url.searchParams.get('code')?.trim().toUpperCase()
  const token = url.searchParams.get('token')?.trim()

  if (!orgId || !code || !token) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
  }

  const document = await prisma.complaintDocument.findFirst({
    where: {
      id: documentId,
      orgId,
      visibleToReporter: true,
      complaint: { code },
    },
    select: {
      url: true,
      storagePath: true,
      complaintId: true,
      complaint: {
        select: {
          trackingTokenHash: true,
        },
      },
    },
  })

  if (!document || !verifyComplaintTrackingToken(token, document.complaint.trackingTokenHash)) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
  }

  const storagePath = document.storagePath ?? pathFromCanonicalUrl(document.url)
  if (!storagePath || !isExpectedComplaintPath(storagePath, orgId, document.complaintId)) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
  }

  const signedUrl = await storageService.downloadFile('documents', storagePath)
  return NextResponse.redirect(signedUrl)
}

function pathFromCanonicalUrl(value: string): string | null {
  const prefix = 'supabase://documents/'
  if (value.startsWith(prefix)) return value.slice(prefix.length)
  return null
}

function isExpectedComplaintPath(storagePath: string, orgId: string, complaintId: string): boolean {
  if (storagePath.includes('..')) return false
  return storagePath.startsWith(`${orgId}/complaints/${complaintId}/`)
}
