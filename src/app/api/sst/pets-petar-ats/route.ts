import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import {
  addHeader,
  createPDFDoc,
  finalizePDF,
  kv,
  sectionTitle,
  checkPageBreak,
} from '@/lib/pdf/server-pdf'
import {
  TIPO_TRABAJO_LABELS,
  type DocType,
  type PetsInput,
  type PetarInput,
  type AtsInput,
  type TipoTrabajoAltoRiesgo,
} from '@/lib/sst/pets-petar-ats'

/**
 * POST /api/sst/pets-petar-ats
 *
 * Genera (server-side) el PDF de un PETS / PETAR / ATS según el `docType`
 * recibido en el body. Función pura: input → PDF buffer. No persiste el
 * documento en DB; el cliente decide guardarlo en SstRecord si lo necesita.
 *
 * Estructura de respuesta:
 *   - Si Accept incluye application/pdf → retorna binary PDF directo
 *   - Si query format=json → retorna metadata + base64 (debug)
 *
 * Defensa: la auth wrapper garantiza que ctx.orgId está disponible y que el
 * documento se ata a la organización correcta. Se persiste un AuditLog para
 * trazabilidad.
 */

// ── Schemas Zod ────────────────────────────────────────────────────────────

const pasoPetsSchema = z.object({
  numero: z.number().int().min(1),
  descripcion: z.string().min(3).max(500),
  peligros: z.array(z.string()).optional(),
  controles: z.array(z.string()).optional(),
})

const petsSchema = z.object({
  docType: z.literal('PETS'),
  titulo: z.string().min(3).max(150),
  version: z.number().int().min(1).default(1),
  objetivo: z.string().min(10).max(500),
  alcance: z.string().min(5).max(500),
  responsables: z.array(z.string().min(1)).max(20).default([]),
  equipos: z.array(z.string().min(1)).max(50).default([]),
  epp: z.array(z.string().min(1)).max(30).default([]),
  pasos: z.array(pasoPetsSchema).min(1).max(100),
  emergencias: z.array(z.string()).max(20).default([]),
  referenciasLegales: z.array(z.string()).max(20).default([]),
})

const petarSchema = z.object({
  docType: z.literal('PETAR'),
  tipo: z.enum([
    'TRABAJO_EN_ALTURAS',
    'ESPACIO_CONFINADO',
    'TRABAJO_EN_CALIENTE',
    'TRABAJO_ELECTRICO',
    'IZAJE_DE_CARGA',
    'EXCAVACION',
    'OTRO',
  ]),
  descripcion: z.string().min(10).max(800),
  ubicacion: z.string().min(3).max(300),
  fechaInicio: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  fechaFin: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  ejecutores: z
    .array(
      z.object({
        nombre: z.string().min(2),
        dni: z.string().min(8).max(15),
        cargo: z.string().optional(),
      }),
    )
    .min(1)
    .max(50),
  supervisorNombre: z.string().min(3),
  supervisorDni: z.string().min(8).max(15),
  peligros: z.array(z.string().min(1)).min(1).max(30),
  controles: z.array(z.string().min(1)).min(1).max(30),
  eppVerificado: z.array(z.string().min(1)).max(30).default([]),
  equiposVerificados: z
    .array(z.object({ equipo: z.string(), ultimaInspeccion: z.string().optional() }))
    .max(30)
    .default([]),
  aislamientos: z.array(z.string()).max(20).optional(),
  contingencia: z.string().min(10).max(1000),
})

const pasoAtsSchema = z.object({
  numero: z.number().int().min(1),
  paso: z.string().min(3).max(300),
  peligros: z.array(z.string()).default([]),
  controles: z.array(z.string()).default([]),
})

const atsSchema = z.object({
  docType: z.literal('ATS'),
  tarea: z.string().min(5).max(300),
  ejecutores: z
    .array(z.object({ nombre: z.string().min(2), dni: z.string().min(8).max(15) }))
    .min(1)
    .max(30),
  supervisor: z.object({ nombre: z.string().min(3), dni: z.string().min(8).max(15) }),
  ubicacion: z.string().min(3).max(300),
  fecha: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  pasos: z.array(pasoAtsSchema).min(1).max(50),
  epp: z.array(z.string()).max(30).default([]),
  observaciones: z.string().max(800).optional(),
})

const bodySchema = z.union([petsSchema, petarSchema, atsSchema])

// ── Renderizadores PDF ─────────────────────────────────────────────────────

interface OrgInfo {
  name: string
  razonSocial: string | null
  ruc: string | null
}

function listSection(
  doc: ReturnType<typeof createPDFDoc> extends Promise<infer T> ? T : never,
  title: string,
  items: string[],
  y: number,
  headerArgs: Parameters<typeof checkPageBreak>[3],
): number {
  if (items.length === 0) return y
  y = checkPageBreak(doc, y, items.length * 5 + 10, headerArgs)
  y = sectionTitle(doc, title, y)
  doc.setFontSize(9)
  for (const it of items) {
    y = checkPageBreak(doc, y, 5, headerArgs)
    const lines = doc.splitTextToSize(`• ${it}`, 180)
    for (const ln of lines) {
      doc.text(ln, 16, y)
      y += 5
    }
  }
  return y + 3
}

async function renderPets(
  input: PetsInput,
  org: OrgInfo,
  docTitle: string,
): Promise<Uint8Array> {
  const doc = await createPDFDoc()
  addHeader(doc, docTitle, org, `PETS · v${input.version} · ${TYPE_LABELS.PETS}`)
  const headerArgs = { title: docTitle, org, subtitle: `PETS v${input.version}` }
  let y = 56

  y = sectionTitle(doc, '1. Identificación', y)
  y = kv(doc, 'Procedimiento', input.titulo, 14, y)
  y = kv(doc, 'Versión', String(input.version), 14, y)
  y = kv(
    doc,
    'Fecha elaboración',
    (input.fechaElaboracion ?? new Date()).toLocaleDateString('es-PE'),
    14,
    y,
  )
  if (input.proximaRevision) {
    y = kv(
      doc,
      'Próxima revisión',
      input.proximaRevision.toLocaleDateString('es-PE'),
      14,
      y,
    )
  }
  y += 3

  y = sectionTitle(doc, '2. Objetivo', y)
  doc.setFontSize(9)
  for (const ln of doc.splitTextToSize(input.objetivo, 180)) {
    y = checkPageBreak(doc, y, 5, headerArgs)
    doc.text(ln, 14, y)
    y += 5
  }
  y += 3

  y = checkPageBreak(doc, y, 20, headerArgs)
  y = sectionTitle(doc, '3. Alcance', y)
  for (const ln of doc.splitTextToSize(input.alcance, 180)) {
    y = checkPageBreak(doc, y, 5, headerArgs)
    doc.text(ln, 14, y)
    y += 5
  }
  y += 3

  y = listSection(doc, '4. Responsables', input.responsables, y, headerArgs)
  y = listSection(doc, '5. Equipos / herramientas', input.equipos, y, headerArgs)
  y = listSection(doc, '6. EPP obligatorio', input.epp, y, headerArgs)

  // 7. Pasos
  y = checkPageBreak(doc, y, 20, headerArgs)
  y = sectionTitle(doc, '7. Procedimiento paso a paso', y)
  doc.setFontSize(9)
  for (const p of input.pasos) {
    y = checkPageBreak(doc, y, 16, headerArgs)
    doc.setFont('helvetica', 'bold')
    doc.text(`Paso ${p.numero}.`, 14, y)
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(p.descripcion, 165)
    let yp = y
    for (let i = 0; i < descLines.length; i++) {
      if (i === 0) {
        doc.text(descLines[i], 30, yp)
      } else {
        yp += 5
        y = checkPageBreak(doc, yp, 5, headerArgs)
        if (y !== yp) yp = y
        doc.text(descLines[i], 30, yp)
      }
    }
    y = yp + 5
    if (p.peligros && p.peligros.length > 0) {
      y = checkPageBreak(doc, y, 5, headerArgs)
      doc.setTextColor(180, 80, 0)
      doc.text(`Peligros: ${p.peligros.join('; ')}`, 30, y)
      doc.setTextColor(60, 60, 60)
      y += 5
    }
    if (p.controles && p.controles.length > 0) {
      y = checkPageBreak(doc, y, 5, headerArgs)
      doc.setTextColor(16, 120, 80)
      doc.text(`Controles: ${p.controles.join('; ')}`, 30, y)
      doc.setTextColor(60, 60, 60)
      y += 5
    }
    y += 2
  }

  y = listSection(doc, '8. Acciones ante emergencias', input.emergencias, y, headerArgs)
  y = listSection(doc, '9. Referencias legales', input.referenciasLegales, y, headerArgs)

  // Firmas
  y = checkPageBreak(doc, y, 50, headerArgs)
  y = sectionTitle(doc, '10. Firmas', y)
  doc.setDrawColor(180, 188, 200)
  doc.line(20, y + 14, 90, y + 14)
  doc.line(110, y + 14, 180, y + 14)
  doc.setFontSize(8)
  doc.text('Elaborado por', 22, y + 19)
  doc.text('Aprobado por (Comité SST / Gerencia)', 112, y + 19)
  doc.setFontSize(7)
  doc.setTextColor(140, 140, 140)
  doc.text('Nombre, cargo y fecha', 22, y + 24)
  doc.text('Nombre, cargo y fecha', 112, y + 24)

  return doc.output('arraybuffer') as unknown as Uint8Array
}

async function renderPetar(
  input: PetarInput,
  org: OrgInfo,
  docTitle: string,
): Promise<Uint8Array> {
  const doc = await createPDFDoc()
  addHeader(doc, docTitle, org, `PETAR · ${TIPO_TRABAJO_LABELS[input.tipo]}`)
  const headerArgs = { title: docTitle, org, subtitle: 'PETAR' }
  let y = 56

  // Identificación
  y = sectionTitle(doc, '1. Identificación del trabajo', y)
  y = kv(doc, 'Tipo de trabajo', TIPO_TRABAJO_LABELS[input.tipo], 14, y)
  y = kv(doc, 'Ubicación', input.ubicacion, 14, y)
  y = kv(
    doc,
    'Inicio',
    input.fechaInicio.toLocaleString('es-PE'),
    14,
    y,
  )
  y = kv(doc, 'Fin estimado', input.fechaFin.toLocaleString('es-PE'), 14, y)
  y += 3

  // Descripción
  y = checkPageBreak(doc, y, 16, headerArgs)
  y = sectionTitle(doc, '2. Descripción del trabajo', y)
  doc.setFontSize(9)
  for (const ln of doc.splitTextToSize(input.descripcion, 180)) {
    y = checkPageBreak(doc, y, 5, headerArgs)
    doc.text(ln, 14, y)
    y += 5
  }
  y += 3

  // Ejecutores
  y = checkPageBreak(doc, y, 30, headerArgs)
  y = sectionTitle(doc, '3. Ejecutores autorizados', y)
  doc.setFontSize(8)
  doc.setFillColor(238, 242, 247)
  doc.rect(14, y, 182, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.text('Nombre', 16, y + 4)
  doc.text('DNI', 110, y + 4)
  doc.text('Cargo', 145, y + 4)
  doc.setFont('helvetica', 'normal')
  y += 6
  for (const e of input.ejecutores) {
    y = checkPageBreak(doc, y, 6, headerArgs)
    doc.text(e.nombre.slice(0, 50), 16, y + 4)
    doc.text(e.dni, 110, y + 4)
    doc.text(e.cargo ?? '—', 145, y + 4)
    doc.setDrawColor(230, 235, 240)
    doc.line(14, y + 6, 196, y + 6)
    y += 6
  }
  y += 2
  y = kv(doc, 'Supervisor', `${input.supervisorNombre} (DNI ${input.supervisorDni})`, 14, y)
  y += 3

  y = listSection(doc, '4. Peligros identificados', input.peligros, y, headerArgs)
  y = listSection(doc, '5. Controles aplicados', input.controles, y, headerArgs)
  y = listSection(doc, '6. EPP verificado', input.eppVerificado, y, headerArgs)

  // Equipos verificados (con fecha)
  if (input.equiposVerificados.length > 0) {
    y = checkPageBreak(doc, y, 14, headerArgs)
    y = sectionTitle(doc, '7. Equipos verificados', y)
    doc.setFontSize(9)
    for (const eq of input.equiposVerificados) {
      y = checkPageBreak(doc, y, 5, headerArgs)
      const txt = eq.ultimaInspeccion
        ? `• ${eq.equipo} — última inspección: ${eq.ultimaInspeccion}`
        : `• ${eq.equipo}`
      doc.text(txt, 16, y)
      y += 5
    }
    y += 3
  }

  if (input.aislamientos && input.aislamientos.length > 0) {
    y = listSection(doc, '8. Aislamientos / LOTO', input.aislamientos, y, headerArgs)
  }

  // Contingencia
  y = checkPageBreak(doc, y, 16, headerArgs)
  y = sectionTitle(doc, '9. Plan de contingencia', y)
  doc.setFontSize(9)
  for (const ln of doc.splitTextToSize(input.contingencia, 180)) {
    y = checkPageBreak(doc, y, 5, headerArgs)
    doc.text(ln, 14, y)
    y += 5
  }
  y += 5

  // Autorización con cuadros de firma + checkbox
  y = checkPageBreak(doc, y, 60, headerArgs)
  y = sectionTitle(doc, '10. Autorización (a firmar ANTES de iniciar el trabajo)', y)
  doc.setFontSize(9)
  doc.setTextColor(150, 30, 30)
  doc.text(
    '⚠ NO INICIAR el trabajo sin la firma de los 3 responsables.',
    14,
    y,
  )
  doc.setTextColor(60, 60, 60)
  y += 8

  doc.setDrawColor(180, 188, 200)
  doc.line(20, y + 14, 80, y + 14)
  doc.line(90, y + 14, 150, y + 14)
  doc.line(160, y + 14, 195, y + 14)
  doc.setFontSize(8)
  doc.text('Supervisor SST', 22, y + 19)
  doc.text('Ejecutor responsable', 92, y + 19)
  doc.text('Aprobador final', 162, y + 19)
  doc.setFontSize(7)
  doc.setTextColor(140, 140, 140)
  doc.text('Nombre, hora', 22, y + 24)
  doc.text('Nombre, hora', 92, y + 24)
  doc.text('Nombre, hora', 162, y + 24)

  return doc.output('arraybuffer') as unknown as Uint8Array
}

async function renderAts(
  input: AtsInput,
  org: OrgInfo,
  docTitle: string,
): Promise<Uint8Array> {
  const doc = await createPDFDoc()
  addHeader(doc, docTitle, org, `ATS · Análisis de Trabajo Seguro`)
  const headerArgs = { title: docTitle, org, subtitle: 'ATS' }
  let y = 56

  y = sectionTitle(doc, '1. Identificación', y)
  y = kv(doc, 'Tarea', input.tarea, 14, y)
  y = kv(doc, 'Ubicación', input.ubicacion, 14, y)
  y = kv(doc, 'Fecha', input.fecha.toLocaleDateString('es-PE'), 14, y)
  y = kv(
    doc,
    'Supervisor',
    `${input.supervisor.nombre} (DNI ${input.supervisor.dni})`,
    14,
    y,
  )
  y += 3

  // Equipo ejecutor
  y = checkPageBreak(doc, y, 30, headerArgs)
  y = sectionTitle(doc, '2. Equipo ejecutor', y)
  doc.setFontSize(8)
  doc.setFillColor(238, 242, 247)
  doc.rect(14, y, 182, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.text('Nombre', 16, y + 4)
  doc.text('DNI', 130, y + 4)
  doc.setFont('helvetica', 'normal')
  y += 6
  for (const e of input.ejecutores) {
    y = checkPageBreak(doc, y, 6, headerArgs)
    doc.text(e.nombre.slice(0, 60), 16, y + 4)
    doc.text(e.dni, 130, y + 4)
    doc.setDrawColor(230, 235, 240)
    doc.line(14, y + 6, 196, y + 6)
    y += 6
  }
  y += 3

  y = listSection(doc, '3. EPP requerido', input.epp, y, headerArgs)

  // Pasos con peligros y controles
  y = checkPageBreak(doc, y, 20, headerArgs)
  y = sectionTitle(doc, '4. Análisis paso a paso', y)
  doc.setFontSize(8)
  for (const p of input.pasos) {
    y = checkPageBreak(doc, y, 18, headerArgs)
    doc.setFont('helvetica', 'bold')
    doc.text(`${p.numero}. ${p.paso.slice(0, 90)}`, 14, y + 4)
    doc.setFont('helvetica', 'normal')
    y += 6
    if (p.peligros.length > 0) {
      y = checkPageBreak(doc, y, 5, headerArgs)
      doc.setTextColor(180, 80, 0)
      doc.text(`  Peligros: ${p.peligros.join('; ')}`, 14, y + 3)
      doc.setTextColor(60, 60, 60)
      y += 5
    }
    if (p.controles.length > 0) {
      y = checkPageBreak(doc, y, 5, headerArgs)
      doc.setTextColor(16, 120, 80)
      doc.text(`  Controles: ${p.controles.join('; ')}`, 14, y + 3)
      doc.setTextColor(60, 60, 60)
      y += 5
    }
    y += 2
  }

  if (input.observaciones) {
    y = checkPageBreak(doc, y, 16, headerArgs)
    y = sectionTitle(doc, '5. Observaciones', y)
    doc.setFontSize(9)
    for (const ln of doc.splitTextToSize(input.observaciones, 180)) {
      y = checkPageBreak(doc, y, 5, headerArgs)
      doc.text(ln, 14, y)
      y += 5
    }
    y += 3
  }

  // Firmas
  y = checkPageBreak(doc, y, 30, headerArgs)
  y = sectionTitle(doc, '6. Conformidad', y)
  doc.setFontSize(8)
  doc.text(
    'Los firmantes declaran conocer los peligros y controles antes de iniciar la tarea.',
    14,
    y + 4,
  )
  y += 12
  doc.setDrawColor(180, 188, 200)
  doc.line(20, y + 14, 90, y + 14)
  doc.line(110, y + 14, 180, y + 14)
  doc.text('Supervisor', 22, y + 19)
  doc.text('Ejecutor (representante)', 112, y + 19)

  return doc.output('arraybuffer') as unknown as Uint8Array
}

const TYPE_LABELS: Record<DocType, string> = {
  PETS: 'Procedimiento Escrito de Trabajo Seguro',
  PETAR: 'Permiso Escrito de Trabajo de Alto Riesgo',
  ATS: 'Análisis de Trabajo Seguro',
}

// ── Handler ────────────────────────────────────────────────────────────────

export const POST = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { name: true, razonSocial: true, ruc: true },
  })
  const orgInfo: OrgInfo = {
    name: org?.name ?? 'Organización',
    razonSocial: org?.razonSocial ?? null,
    ruc: org?.ruc ?? null,
  }

  let pdfBytes: Uint8Array
  let title = ''

  if (data.docType === 'PETS') {
    title = `PETS — ${data.titulo}`
    pdfBytes = await renderPets(
      {
        ...data,
        fechaElaboracion: new Date(),
      },
      orgInfo,
      title,
    )
  } else if (data.docType === 'PETAR') {
    title = `PETAR — ${TIPO_TRABAJO_LABELS[data.tipo as TipoTrabajoAltoRiesgo]}`
    pdfBytes = await renderPetar(
      {
        ...data,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: new Date(data.fechaFin),
      },
      orgInfo,
      title,
    )
  } else {
    title = `ATS — ${data.tarea}`
    pdfBytes = await renderAts(
      {
        ...data,
        fecha: new Date(data.fecha),
      },
      orgInfo,
      title,
    )
  }

  // Audit log para evidencia
  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: `sst.${data.docType.toLowerCase()}.generated`,
        entityType: data.docType,
        entityId: 'doc',
        metadataJson: { title, tipo: data.docType },
      },
    })
    .catch(() => undefined)

  // Convert Uint8Array → ArrayBuffer puro (los typings de NextResponse exigen ArrayBuffer)
  const pdfArrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer

  return new NextResponse(pdfArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${data.docType.toLowerCase()}-${Date.now()}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
})
