/**
 * GET /api/certificates/[code]/pdf
 *
 * Genera el PDF descargable del certificado de capacitación con:
 *   - Diseño formal centrado tipo "diploma"
 *   - Datos del trabajador + curso + nota
 *   - QR de verificación grande (lector móvil) que apunta a /verify/{code}
 *   - Marco decorativo + logo COMPLY360
 *
 * Cualquier persona con el código puede descargar el PDF — no expone datos
 * nuevos vs la página pública /verify/{code}. Esto facilita compartir la
 * evidencia con SUNAFIL en una inspección.
 */

import { NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'

const CODE_RE = /^CERT-\d{4}-\d{5}$/

const CATEGORY_LABELS: Record<string, string> = {
  SST: 'Seguridad y Salud en el Trabajo',
  HOSTIGAMIENTO: 'Prevención de Hostigamiento Sexual',
  COMPLIANCE: 'Cumplimiento Laboral',
  RRHH: 'Recursos Humanos',
  TECHNICAL: 'Capacitación Técnica',
  GENERAL: 'Capacitación General',
}

export const GET = async (
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) => {
  const { code } = await ctx.params

  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  const cert = await prisma.certificate.findUnique({
    where: { code },
    select: {
      code: true,
      orgId: true,
      workerName: true,
      workerDni: true,
      courseTitle: true,
      courseCategory: true,
      score: true,
      issuedAt: true,
      expiresAt: true,
    },
  })
  if (!cert) {
    return NextResponse.json({ error: 'Certificado no encontrado' }, { status: 404 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: cert.orgId },
    select: { name: true, razonSocial: true, ruc: true },
  })

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://comply360.pe').replace(
    /\/$/,
    '',
  )
  const verifyUrl = `${baseUrl}/verify/${cert.code}`

  // Generar QR como data URL (lo embedeamos directo en el PDF)
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    type: 'image/png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
    color: { dark: '#0f172a', light: '#ffffff' },
  })

  // ── PDF en formato landscape (diploma) ──────────────────────────────────
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth() // 297
  const pageH = doc.internal.pageSize.getHeight() // 210

  // Fondo blanco con marco emerald
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageW, pageH, 'F')

  // Marco exterior decorativo
  doc.setDrawColor(16, 185, 129) // emerald-500
  doc.setLineWidth(1.5)
  doc.rect(8, 8, pageW - 16, pageH - 16)
  doc.setLineWidth(0.3)
  doc.setDrawColor(180, 220, 200)
  doc.rect(11, 11, pageW - 22, pageH - 22)

  // ── Header: COMPLY360 ───────────────────────────────────────────────────
  doc.setTextColor(16, 185, 129)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('COMPLY360 PERÚ', pageW / 2, 22, { align: 'center' })

  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(
    'Plataforma de Compliance Laboral · Ley 29783 · D.S. 005-2012-TR',
    pageW / 2,
    27,
    { align: 'center' },
  )

  // ── Título central ───────────────────────────────────────────────────────
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(36)
  doc.text('CERTIFICADO', pageW / 2, 50, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('La organización abajo identificada certifica que', pageW / 2, 60, {
    align: 'center',
  })

  // ── Nombre del trabajador (estrella) ────────────────────────────────────
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.text(cert.workerName.toUpperCase(), pageW / 2, 78, { align: 'center' })

  if (cert.workerDni) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(`DNI ${cert.workerDni}`, pageW / 2, 85, { align: 'center' })
  }

  // ── Curso + categoría + nota ─────────────────────────────────────────────
  doc.setFontSize(11)
  doc.setTextColor(80, 80, 80)
  doc.text(
    'completó satisfactoriamente la capacitación',
    pageW / 2,
    98,
    { align: 'center' },
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(16, 185, 129)
  // Word-wrap manual del título por si es muy largo
  const titleLines = doc.splitTextToSize(cert.courseTitle, pageW - 80)
  let yTitle = 108
  for (const ln of titleLines) {
    doc.text(ln, pageW / 2, yTitle, { align: 'center' })
    yTitle += 7
  }

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(
    `Categoría: ${CATEGORY_LABELS[cert.courseCategory] ?? cert.courseCategory}`,
    pageW / 2,
    yTitle + 4,
    { align: 'center' },
  )

  // ── Datos de aprobación (3 columnas) ─────────────────────────────────────
  const yData = 145
  const colW = (pageW - 40) / 3
  const cx = [20 + colW / 2, 20 + colW + colW / 2, 20 + 2 * colW + colW / 2]

  function dataCol(x: number, label: string, value: string) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(140, 140, 140)
    doc.text(label.toUpperCase(), x, yData, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text(value, x, yData + 7, { align: 'center' })
  }

  dataCol(cx[0], 'Nota obtenida', `${cert.score}/100`)
  dataCol(
    cx[1],
    'Emitido el',
    cert.issuedAt.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  )
  if (cert.expiresAt) {
    dataCol(
      cx[2],
      'Vence el',
      cert.expiresAt.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    )
  } else {
    dataCol(cx[2], 'Vigencia', 'Indefinida')
  }

  // ── QR de verificación (esquina inferior derecha) ────────────────────────
  const qrSize = 32
  const qrX = pageW - qrSize - 18
  const qrY = pageH - qrSize - 25
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(doc as any).addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'bold')
  doc.text('Verificar autenticidad', qrX + qrSize / 2, qrY + qrSize + 4, {
    align: 'center',
  })
  doc.setFont('helvetica', 'normal')
  doc.text(verifyUrl.replace(/^https?:\/\//, ''), qrX + qrSize / 2, qrY + qrSize + 8, {
    align: 'center',
  })

  // ── Código + organización (izquierda) ────────────────────────────────────
  doc.setFontSize(7)
  doc.setTextColor(140, 140, 140)
  doc.setFont('helvetica', 'normal')
  doc.text('Código del certificado', 20, qrY + 4)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(cert.code, 20, qrY + 11)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(140, 140, 140)
  doc.text('Emitido por', 20, qrY + 19)
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.setFont('helvetica', 'bold')
  doc.text(org?.razonSocial ?? org?.name ?? '—', 20, qrY + 24)
  if (org?.ruc) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`RUC ${org.ruc}`, 20, qrY + 28)
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.setFontSize(6)
  doc.setTextColor(160, 160, 160)
  doc.text(
    'Este certificado tiene valor de evidencia ante SUNAFIL conforme al Art. 27 D.S. 005-2012-TR (Reglamento Ley 29783).',
    pageW / 2,
    pageH - 12,
    { align: 'center' },
  )

  // ── Output ───────────────────────────────────────────────────────────────
  const ab = doc.output('arraybuffer')
  return new NextResponse(ab as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${cert.code}.pdf"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
