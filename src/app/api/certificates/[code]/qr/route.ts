/**
 * GET /api/certificates/[code]/qr
 *
 * Devuelve un PNG con el QR que apunta a la URL pública de verificación
 * (`{APP_URL}/verify/{code}`). Se usa para:
 *   1. Embed en el PDF del certificado (render server-side)
 *   2. Preview dentro del portal del trabajador
 *   3. Compartir como imagen aislada
 *
 * Público: cualquier persona con el código puede pedir el QR. El QR solo
 * codifica una URL pública que ya es accesible — no expone datos nuevos.
 */

import { NextResponse, type NextRequest } from 'next/server'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

// FIX auditoría (SEG-08): rate limit anti-enumeración de códigos secuenciales.
const certQrLimiter = rateLimit({ interval: 60_000, limit: 5 })

const CODE_RE = /^CERT-\d{4}-\d{5}$/

export const GET = async (
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) => {
  const rl = await certQrLimiter.check(req)
  if (!rl.success) return rl.response!

  const { code } = await ctx.params

  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  const exists = await prisma.certificate.findUnique({
    where: { code },
    select: { code: true },
  })

  if (!exists) {
    return NextResponse.json({ error: 'Certificado no encontrado' }, { status: 404 })
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://comply360.pe').replace(/\/$/, '')
  const verifyUrl = `${baseUrl}/verify/${code}`

  const png = await QRCode.toBuffer(verifyUrl, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: { dark: '#0f172a', light: '#ffffff' },
  })

  // Copia a ArrayBuffer fresh — los typings actuales no aceptan
  // Buffer ni Uint8Array<ArrayBufferLike> como BlobPart (divergencia ArrayBuffer
  // vs SharedArrayBuffer). El costo es una copia pequeña (~1KB).
  const ab = new ArrayBuffer(png.byteLength)
  new Uint8Array(ab).set(png)
  const blob = new Blob([ab], { type: 'image/png' })
  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
      'Content-Disposition': `inline; filename="qr-${code}.png"`,
    },
  })
}
