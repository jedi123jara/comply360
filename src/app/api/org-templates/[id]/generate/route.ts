/**
 * POST /api/org-templates/[id]/generate
 *
 * Merge de un template con los datos de un worker específico y devuelve el
 * documento resultante. Soporta dos formatos:
 *   - default / ?format=json  →  JSON con texto renderizado + diagnósticos
 *   - ?format=pdf             →  PDF descargable (jsPDF server-side)
 *
 * Body:
 *   { workerId: string, persist?: boolean, ciudad?: string }
 *
 * Efectos:
 *   - Si persist=true (default), crea un `Contract` row vinculado al worker
 *     y asocia WorkerContract. También incrementa `usageCount` del template.
 *   - Registra en `AuditLog`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { planHasFeature } from '@/lib/plan-gate'
import {
  isOrgTemplate,
  parseTemplate,
  renderTemplate,
  serializeTemplate,
  TEMPLATE_TYPE_LABEL,
  type OrgMergeData,
  type OrgTemplateMeta,
  type WorkerMergeData,
} from '@/lib/templates/org-template-engine'
import {
  createPDFDoc,
  finalizePDF,
  addHeader,
  checkPageBreak,
} from '@/lib/pdf/server-pdf'

export const runtime = 'nodejs'

async function assertPlanAccess(orgId: string): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, planExpiresAt: true },
  })
  if (!org) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Organización no encontrada', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      ),
    }
  }
  let effectivePlan = org.plan
  if (org.planExpiresAt && new Date(org.planExpiresAt) < new Date()) {
    effectivePlan = 'STARTER'
  }
  if (!planHasFeature(effectivePlan, 'ia_contratos')) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Generar documentos desde plantillas requiere el plan EMPRESA o superior.',
          code: 'PLAN_UPGRADE_REQUIRED',
          requiredPlan: 'EMPRESA',
          currentPlan: effectivePlan,
          upgradeUrl: '/dashboard/planes',
        },
        { status: 403 },
      ),
    }
  }
  return { ok: true }
}

export const POST = withAuthParams<{ id: string }>(async (
  req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  const gate = await assertPlanAccess(ctx.orgId)
  if (!gate.ok) return gate.response

  const url = new URL(req.url)
  const format = (url.searchParams.get('format') ?? 'json').toLowerCase()
  if (!['json', 'pdf'].includes(format)) {
    return NextResponse.json(
      { error: `format inválido. Usa 'json' o 'pdf'.` },
      { status: 400 },
    )
  }

  let body: { workerId?: string; persist?: boolean; ciudad?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const workerId = body.workerId
  if (!workerId || typeof workerId !== 'string') {
    return NextResponse.json({ error: 'workerId es requerido' }, { status: 400 })
  }

  // ── Fetch template ────────────────────────────────────────────────────────
  const doc = await prisma.orgDocument.findUnique({
    where: { id: params.id },
  })
  if (!doc || doc.orgId !== ctx.orgId || !isOrgTemplate(doc)) {
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  }
  const meta = parseTemplate(doc.description) as OrgTemplateMeta

  // ── Fetch worker (in same org) ────────────────────────────────────────────
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: {
      id: true,
      orgId: true,
      firstName: true,
      lastName: true,
      dni: true,
      email: true,
      phone: true,
      address: true,
      position: true,
      department: true,
      regimenLaboral: true,
      tipoContrato: true,
      fechaIngreso: true,
      fechaCese: true,
      sueldoBruto: true,
      asignacionFamiliar: true,
      jornadaSemanal: true,
      birthDate: true,
      nationality: true,
    },
  })
  if (!worker || worker.orgId !== ctx.orgId) {
    return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  }

  // ── Fetch org ─────────────────────────────────────────────────────────────
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: {
      name: true,
      razonSocial: true,
      ruc: true,
      address: true,
      sector: true,
    },
  })

  // Resolver representanteLegal desde el OWNER si existe
  const owner = await prisma.user.findFirst({
    where: { orgId: ctx.orgId, role: 'OWNER' },
    select: { firstName: true, lastName: true },
  })
  const representanteLegal =
    owner?.firstName || owner?.lastName
      ? `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim()
      : null

  // ── Build merge context ───────────────────────────────────────────────────
  const workerData: WorkerMergeData = {
    firstName: worker.firstName,
    lastName: worker.lastName,
    dni: worker.dni,
    email: worker.email,
    phone: worker.phone,
    address: worker.address,
    position: worker.position,
    department: worker.department,
    regimenLaboral: worker.regimenLaboral,
    tipoContrato: worker.tipoContrato,
    fechaIngreso: worker.fechaIngreso,
    fechaCese: worker.fechaCese,
    sueldoBruto: Number(worker.sueldoBruto),
    asignacionFamiliar: worker.asignacionFamiliar,
    jornadaSemanal: worker.jornadaSemanal,
    birthDate: worker.birthDate,
    nationality: worker.nationality,
  }

  const orgData: OrgMergeData = {
    name: org?.name ?? 'Empresa',
    razonSocial: org?.razonSocial ?? null,
    ruc: org?.ruc ?? null,
    address: org?.address ?? null,
    sector: org?.sector ?? null,
    representanteLegal,
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const result = renderTemplate(
    meta.content,
    meta.mappings ?? {},
    { worker: workerData, org: orgData },
    { ciudad: body.ciudad, blankUnmapped: true },
  )

  const documentTypeLabel = TEMPLATE_TYPE_LABEL[meta.documentType] ?? meta.documentType
  const fullWorkerName = `${worker.firstName} ${worker.lastName}`.trim()
  const title = `${documentTypeLabel} - ${fullWorkerName}`
  const persist = body.persist !== false

  // ── Persist (optional) ────────────────────────────────────────────────────
  // Mapear el OrgTemplateType a ContractType válido del schema
  const contractType = mapTemplateTypeToContractType(meta.documentType)

  let contractId: string | undefined
  if (persist) {
    try {
      const contract = await prisma.contract.create({
        data: {
          orgId: ctx.orgId,
          title,
          type: contractType,
          status: 'DRAFT',
          contentHtml: result.rendered
            .split('\n\n')
            .map((p) => `<p>${escapeHtml(p)}</p>`)
            .join('\n'),
          formData: {
            trabajador_nombre: fullWorkerName,
            trabajador_dni: worker.dni,
            cargo: worker.position ?? '',
            remuneracion: String(workerData.sueldoBruto),
            fecha_inicio: new Date(worker.fechaIngreso).toISOString().slice(0, 10),
            templateId: doc.id,
            templateType: meta.documentType,
          },
          createdById: ctx.userId,
        },
        select: { id: true },
      })
      contractId = contract.id

      // Linkear worker ↔ contract
      await prisma.workerContract.create({
        data: {
          workerId: worker.id,
          contractId: contract.id,
        },
      })

      // Incrementar usageCount del template
      const nextMeta: OrgTemplateMeta = {
        ...meta,
        usageCount: (meta.usageCount ?? 0) + 1,
      }
      await prisma.orgDocument.update({
        where: { id: doc.id },
        data: { description: serializeTemplate(nextMeta) },
      })

      // Audit log
      await prisma.auditLog
        .create({
          data: {
            orgId: ctx.orgId,
            userId: ctx.userId,
            action: 'TEMPLATE_GENERATED',
            entityType: 'Contract',
            entityId: contract.id,
            metadataJson: {
              templateId: doc.id,
              workerId: worker.id,
              documentType: meta.documentType,
            },
          },
        })
        .catch(() => {
          // Best-effort — no bloquear
        })
    } catch (err) {
      console.error('[org-templates/generate] persist failed', err)
      // Seguimos para devolver el render al usuario aunque falle el persist
    }
  }

  // ── Respond: JSON ─────────────────────────────────────────────────────────
  if (format === 'json') {
    return NextResponse.json({
      data: {
        rendered: result.rendered,
        title,
        documentType: meta.documentType,
        documentTypeLabel,
        usedPlaceholders: result.usedPlaceholders,
        missingPlaceholders: result.missingPlaceholders,
        warnings: result.missingPlaceholders.length
          ? [
              `${result.missingPlaceholders.length} placeholder(s) no tienen mapeo o valor y quedaron como "____________": ${result.missingPlaceholders.join(', ')}`,
            ]
          : [],
        contractId,
        generatedAt: new Date().toISOString(),
      },
    })
  }

  // ── Respond: PDF ──────────────────────────────────────────────────────────
  const pdfDoc = await createPDFDoc()
  addHeader(
    pdfDoc,
    documentTypeLabel.toUpperCase(),
    { name: org?.name, razonSocial: org?.razonSocial, ruc: org?.ruc },
    fullWorkerName,
  )

  const W = pdfDoc.internal.pageSize.getWidth()
  let y = 54

  pdfDoc.setFontSize(10)
  pdfDoc.setFont('helvetica', 'normal')
  pdfDoc.setTextColor(30, 30, 30)

  const paragraphs = result.rendered.split(/\n\n+/)
  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) {
      y += 3
      continue
    }
    const lines = pdfDoc.text(trimmed, 14, y, { maxWidth: W - 28 }) as unknown as string[]
    const lineCount = Array.isArray(lines) ? lines.length : Math.ceil(trimmed.length / 90)
    y += lineCount * 5
    y += 3
    y = checkPageBreak(pdfDoc, y, 270, {
      title: documentTypeLabel.toUpperCase(),
      org: { name: org?.name, razonSocial: org?.razonSocial, ruc: org?.ruc },
      subtitle: fullWorkerName,
    })
  }

  // Firmas
  y += 12
  y = checkPageBreak(pdfDoc, y, 260, {
    title: documentTypeLabel.toUpperCase(),
    org: { name: org?.name, razonSocial: org?.razonSocial, ruc: org?.ruc },
    subtitle: fullWorkerName,
  })
  pdfDoc.setDrawColor(100, 100, 100)
  pdfDoc.line(14, y, 80, y)
  pdfDoc.line(W - 80, y, W - 14, y)

  pdfDoc.setFontSize(8)
  pdfDoc.setTextColor(80, 80, 80)
  pdfDoc.text('EL EMPLEADOR', 47, y + 5, { align: 'center' })
  pdfDoc.text('EL TRABAJADOR', W - 47, y + 5, { align: 'center' })

  if (org?.razonSocial || org?.name) {
    pdfDoc.text(org.razonSocial ?? org.name ?? '', 47, y + 10, { align: 'center' })
  }
  pdfDoc.text(fullWorkerName, W - 47, y + 10, { align: 'center' })
  pdfDoc.text(`DNI: ${worker.dni}`, W - 47, y + 14, { align: 'center' })

  const slug = documentTypeLabel
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
  const filename = `${slug}-${worker.dni}.pdf`
  return finalizePDF(pdfDoc, filename)
})

// =============================================
// Helpers
// =============================================
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Mapea nuestro OrgTemplateType al ContractType del schema Prisma. */
function mapTemplateTypeToContractType(
  t: OrgTemplateMeta['documentType'],
): 'LABORAL_INDEFINIDO' | 'LABORAL_PLAZO_FIJO' | 'LABORAL_TIEMPO_PARCIAL' | 'LOCACION_SERVICIOS' | 'CONVENIO_PRACTICAS' | 'ADDENDUM' | 'CUSTOM' {
  switch (t) {
    case 'CONTRATO_INDEFINIDO':
    case 'CONTRATO_MYPE':
      return 'LABORAL_INDEFINIDO'
    case 'CONTRATO_PLAZO_FIJO':
      return 'LABORAL_PLAZO_FIJO'
    case 'CONTRATO_TIEMPO_PARCIAL':
      return 'LABORAL_TIEMPO_PARCIAL'
    case 'CONTRATO_LOCACION_SERVICIOS':
      return 'LOCACION_SERVICIOS'
    case 'CONVENIO_PRACTICAS':
      return 'CONVENIO_PRACTICAS'
    case 'ADDENDUM_AUMENTO':
    case 'ADDENDUM_CAMBIO_CARGO':
      return 'ADDENDUM'
    default:
      return 'CUSTOM'
  }
}
