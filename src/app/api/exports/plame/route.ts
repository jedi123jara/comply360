/**
 * GET /api/exports/plame?periodo=YYYYMM
 *
 * Genera el archivo PLAME (TXT) para todos los trabajadores activos de la
 * organización en el periodo indicado y lo devuelve como descarga.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  generatePlameTxt,
  generatePlameFileName,
  type PlameWorkerRow,
} from '@/lib/exports/plame-generator'

export const runtime = 'nodejs'

/** Mapa Prisma TipoContrato → código tipo trabajador SUNAT */
const TIPO_TRABAJADOR_MAP: Record<string, string> = {
  INDEFINIDO: '21',
  PLAZO_FIJO: '23',
  TIEMPO_PARCIAL: '24',
  INICIO_ACTIVIDAD: '23',
  NECESIDAD_MERCADO: '23',
  RECONVERSION: '23',
  SUPLENCIA: '23',
  EMERGENCIA: '23',
  OBRA_DETERMINADA: '23',
  INTERMITENTE: '23',
  EXPORTACION: '23',
}

/** Mapa Prisma TipoAporte → código régimen pensionario SUNAT */
const REGIMEN_PENSION_MAP: Record<string, '0' | '1' | '2' | '3'> = {
  AFP: '2',
  ONP: '1',
  SIN_APORTE: '0',
}

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') || ''

  if (!/^\d{6}$/.test(periodo)) {
    return NextResponse.json(
      { error: 'Parámetro "periodo" requerido en formato YYYYMM (ej: 202604)' },
      { status: 400 }
    )
  }

  // Cargar org para obtener RUC
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { ruc: true, name: true },
  })
  if (!org?.ruc) {
    return NextResponse.json(
      { error: 'La organización no tiene RUC configurado' },
      { status: 400 }
    )
  }

  // Cargar trabajadores activos
  const workers = await prisma.worker.findMany({
    where: { orgId: ctx.orgId, status: 'ACTIVE' },
    select: {
      dni: true,
      firstName: true,
      lastName: true,
      gender: true,
      birthDate: true,
      fechaIngreso: true,
      fechaCese: true,
      tipoContrato: true,
      tipoAporte: true,
      cuspp: true,
      sueldoBruto: true,
    },
  })

  if (workers.length === 0) {
    return NextResponse.json(
      { error: 'No hay trabajadores activos para exportar' },
      { status: 404 }
    )
  }

  const rows: PlameWorkerRow[] = workers.map(w => {
    // Split lastName en paterno/materno (heurística por espacio)
    const lastParts = (w.lastName || '').trim().split(/\s+/)
    const apellidoPaterno = lastParts[0] || ''
    const apellidoMaterno = lastParts.slice(1).join(' ') || ''

    return {
      tipoDocumento: '1',
      numeroDocumento: w.dni,
      apellidoPaterno,
      apellidoMaterno,
      nombres: w.firstName || '',
      sexo: w.gender === 'F' ? 'F' : 'M',
      fechaNacimiento: w.birthDate ? w.birthDate.toISOString().slice(0, 10) : '',
      fechaIngreso: w.fechaIngreso.toISOString().slice(0, 10),
      fechaCese: w.fechaCese ? w.fechaCese.toISOString().slice(0, 10) : undefined,
      tipoTrabajador: TIPO_TRABAJADOR_MAP[String(w.tipoContrato)] || '21',
      regimenPensionario: REGIMEN_PENSION_MAP[String(w.tipoAporte)] || '0',
      cuspp: w.cuspp || undefined,
      regimenSalud: '01', // EsSalud Regular default
      remuneracionBruta: Number(w.sueldoBruto || 0),
      diasLaborados: 30,
      diasNoLaborados: 0,
      diasSubsidiados: 0,
      periodo,
    }
  })

  let txt: string
  try {
    txt = generatePlameTxt({
      rucEmpleador: org.ruc,
      periodo,
      workers: rows,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error generando PLAME' },
      { status: 500 }
    )
  }

  const fileName = generatePlameFileName({ rucEmpleador: org.ruc, periodo })

  return new NextResponse(txt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=iso-8859-1',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'X-Workers-Count': String(rows.length),
    },
  })
})
