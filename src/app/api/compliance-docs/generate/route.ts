/**
 * POST /api/compliance-docs/generate
 *
 * Dispatcher unificado para los 15 generadores de documentos compliance
 * SUNAFIL-Ready. Distinto del legacy /api/documents/generate (que usa
 * templates con variables {{}}); éste llama a funciones TS tipadas para
 * cada tipo de documento y garantiza compliance legal estructural.
 *
 * Body:
 *   type      GeneratorType (ej. 'politica-sst', 'politica-hostigamiento')
 *   params    Parámetros específicos del generador
 *   persist?  boolean (default true) — crea row en OrgDocument
 *
 * Returns:
 *   { document: GeneratedDocument, orgDocumentId?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { OrgDocType } from '@/generated/prisma/client'
import {
  GENERATOR_ORG_DOC_TYPE,
  type GeneratorType,
  type GeneratorOrgContext,
  type GeneratedDocument,
} from '@/lib/generators/types'
import { generarPoliticaSst, type PoliticaSstParams } from '@/lib/generators/politica-sst'
import {
  generarPoliticaHostigamiento,
  type PoliticaHostigamientoParams,
} from '@/lib/generators/politica-hostigamiento'
import {
  generarCuadroCategorias,
  type CuadroCategoriasParams,
} from '@/lib/generators/cuadro-categorias'
import {
  generarActaComiteSst,
  type ActaComiteSstParams,
} from '@/lib/generators/acta-comite-sst'
import {
  generarPlanAnualSst,
  type PlanAnualSstParams,
} from '@/lib/generators/plan-anual-sst'
import { generarIperc, type IpercParams } from '@/lib/generators/iperc'
import {
  generarInduccionSst,
  type InduccionSstParams,
} from '@/lib/generators/induccion-sst'
import {
  generarRegistroAccidentes,
  type RegistroAccidenteParams,
} from '@/lib/generators/registro-accidentes'
import {
  generarReglamentoInterno,
  type ReglamentoInternoParams,
} from '@/lib/generators/reglamento-interno'
import {
  generarCapacitacionSst,
  type CapacitacionSstParams,
} from '@/lib/generators/capacitacion-sst'
import { generarEntregaEpp, type EntregaEppParams } from '@/lib/generators/entrega-epp'
import { generarMapaRiesgos, type MapaRiesgosParams } from '@/lib/generators/mapa-riesgos'
import {
  generarDeclaracionJurada,
  type DeclaracionJuradaParams,
} from '@/lib/generators/declaracion-jurada'
import {
  generarHorarioTrabajoCartel,
  type HorarioCartelParams,
} from '@/lib/generators/horario-trabajo-cartel'
import {
  generarSintesisLegislacion,
  type SintesisLegislacionParams,
} from '@/lib/generators/sintesis-legislacion'

export const runtime = 'nodejs'

const VALID_TYPES: GeneratorType[] = [
  'politica-sst',
  'politica-hostigamiento',
  'cuadro-categorias',
  'acta-comite-sst',
  'plan-anual-sst',
  'iperc',
  'reglamento-interno',
  'capacitacion-sst',
  'induccion-sst',
  'entrega-epp',
  'mapa-riesgos',
  'registro-accidentes',
  'declaracion-jurada',
  'horario-trabajo-cartel',
  'sintesis-legislacion',
]

const IMPLEMENTED_TYPES: GeneratorType[] = [
  'politica-sst',
  'politica-hostigamiento',
  'cuadro-categorias',
  'acta-comite-sst',
  'plan-anual-sst',
  'iperc',
  'induccion-sst',
  'registro-accidentes',
  'reglamento-interno',
  'capacitacion-sst',
  'entrega-epp',
  'mapa-riesgos',
  'declaracion-jurada',
  'horario-trabajo-cartel',
  'sintesis-legislacion',
]

async function fetchOrgContext(orgId: string): Promise<GeneratorOrgContext> {
  const [org, owner, totalWorkers] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, razonSocial: true, ruc: true, sector: true },
    }),
    prisma.user.findFirst({
      where: { orgId, role: 'OWNER' },
      select: { firstName: true, lastName: true, email: true },
    }),
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
  ])

  const ownerName =
    owner?.firstName || owner?.lastName
      ? `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim()
      : undefined

  return {
    razonSocial: org?.razonSocial ?? org?.name ?? 'Empresa',
    ruc: org?.ruc ?? '',
    sector: org?.sector ?? undefined,
    totalWorkers,
    representanteLegal: ownerName,
    cargoRepresentante: 'Representante Legal',
    emailContacto: owner?.email ?? undefined,
  }
}

function dispatchGenerator(
  type: GeneratorType,
  params: unknown,
  org: GeneratorOrgContext,
): GeneratedDocument {
  switch (type) {
    case 'politica-sst':
      return generarPoliticaSst(params as PoliticaSstParams, org)
    case 'politica-hostigamiento':
      return generarPoliticaHostigamiento(params as PoliticaHostigamientoParams, org)
    case 'cuadro-categorias':
      return generarCuadroCategorias(params as CuadroCategoriasParams, org)
    case 'acta-comite-sst':
      return generarActaComiteSst(params as ActaComiteSstParams, org)
    case 'plan-anual-sst':
      return generarPlanAnualSst(params as PlanAnualSstParams, org)
    case 'iperc':
      return generarIperc(params as IpercParams, org)
    case 'induccion-sst':
      return generarInduccionSst(params as InduccionSstParams, org)
    case 'registro-accidentes':
      return generarRegistroAccidentes(params as RegistroAccidenteParams, org)
    case 'reglamento-interno':
      return generarReglamentoInterno(params as ReglamentoInternoParams, org)
    case 'capacitacion-sst':
      return generarCapacitacionSst(params as CapacitacionSstParams, org)
    case 'entrega-epp':
      return generarEntregaEpp(params as EntregaEppParams, org)
    case 'mapa-riesgos':
      return generarMapaRiesgos(params as MapaRiesgosParams, org)
    case 'declaracion-jurada':
      return generarDeclaracionJurada(params as DeclaracionJuradaParams, org)
    case 'horario-trabajo-cartel':
      return generarHorarioTrabajoCartel(params as HorarioCartelParams, org)
    case 'sintesis-legislacion':
      return generarSintesisLegislacion(params as SintesisLegislacionParams, org)
    default:
      throw new Error(`Generador '${type}' aún no implementado`)
  }
}

function deriveValidUntil(
  type: GeneratorType,
  metadata: Record<string, unknown>,
): Date | null {
  const vigenciaAnos =
    (metadata.vigenciaAnos as number | undefined) ??
    (type === 'politica-hostigamiento' ? 2 : 1)
  const valid = new Date()
  valid.setFullYear(valid.getFullYear() + vigenciaAnos)
  return valid
}

export const POST = withPlanGate('reportes_pdf', async (req: NextRequest, ctx: AuthContext) => {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const type = body.type as GeneratorType | undefined
  const params = body.params
  const persist = body.persist !== false

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Tipo inválido. Válidos: ${VALID_TYPES.join(', ')}` },
      { status: 400 },
    )
  }
  if (!IMPLEMENTED_TYPES.includes(type)) {
    return NextResponse.json(
      {
        error: `Generador '${type}' pendiente. Implementados: ${IMPLEMENTED_TYPES.join(', ')}`,
        implemented: IMPLEMENTED_TYPES,
      },
      { status: 501 },
    )
  }
  if (!params || typeof params !== 'object') {
    return NextResponse.json({ error: 'params es requerido' }, { status: 400 })
  }

  try {
    const orgCtx = await fetchOrgContext(ctx.orgId)
    const document = dispatchGenerator(type, params, orgCtx)

    let orgDocumentId: string | undefined
    if (persist) {
      const orgDocType = GENERATOR_ORG_DOC_TYPE[type] as OrgDocType
      const existing = await prisma.orgDocument.findFirst({
        where: { orgId: ctx.orgId, type: orgDocType },
        orderBy: { version: 'desc' },
        select: { version: true },
      })
      const nextVersion = (existing?.version ?? 0) + 1

      const created = await prisma.orgDocument.create({
        data: {
          orgId: ctx.orgId,
          type: orgDocType,
          title: document.title,
          description: `Generado por COMPLY360 (${type}, v${nextVersion}).`,
          version: nextVersion,
          uploadedById: ctx.userId,
          publishedAt: null,
          validUntil: deriveValidUntil(type, document.metadata),
        },
      })
      orgDocumentId = created.id
    }

    return NextResponse.json({
      document,
      orgDocumentId,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[compliance-docs/generate]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar documento' },
      { status: 500 },
    )
  }
})

export const GET = withPlanGate('reportes_pdf', async () => {
  return NextResponse.json({
    implemented: IMPLEMENTED_TYPES,
    pending: VALID_TYPES.filter((t) => !IMPLEMENTED_TYPES.includes(t)),
  })
})

