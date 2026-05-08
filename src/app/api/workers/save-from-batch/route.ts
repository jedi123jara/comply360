/**
 * POST /api/workers/save-from-batch
 *
 * Recibe sessionId + workerIndex + workerData (aprobado/editado por el usuario).
 * 1. Recupera la sesión batch en memoria (buffer del PDF original + mapa de páginas).
 * 2. Extrae SOLO las páginas del contrato del trabajador aprobado usando pdf-lib.
 * 3. Crea el registro Worker en Prisma.
 * 4. Guarda el sub-PDF en storage y crea un WorkerDocument vinculado al trabajador.
 * 5. Devuelve { workerId, documentId, documentUrl }.
 *
 * Si el trabajador ya existe (DNI repetido en la org) devuelve 409.
 * Si la sesión expiró devuelve 410 (Gone).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { getBatchSession } from '@/lib/agents/batch-session-store'
import { extractPdfPagesToBuffer } from '@/lib/agents/extract-text'
import { uploadFile } from '@/lib/storage/upload'
import { prisma } from '@/lib/prisma'
import { generateWorkerAlerts } from '@/lib/alerts/alert-engine'
import { validateContractData } from '@/lib/agents/contract-validator'

export const runtime = 'nodejs'
export const maxDuration = 60

export const POST = withPlanGate('workers', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const { sessionId, workerIndex, workerData } = body as {
      sessionId: string
      workerIndex: number
      workerData: Record<string, unknown>
    }

    if (!sessionId || workerIndex == null || !workerData) {
      return NextResponse.json(
        { error: 'sessionId, workerIndex y workerData son requeridos' },
        { status: 400 }
      )
    }

    // 1. Recuperar sesión
    const session = getBatchSession(sessionId)
    if (!session) {
      return NextResponse.json(
        {
          error:
            'Sesión de importación no encontrada o expirada. Vuelve a subir el PDF para continuar.',
        },
        { status: 410 }
      )
    }

    // Verificar que la sesión pertenece a esta org
    if (session.orgId !== ctx.orgId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // 2. Buscar el contrato en la sesión
    const contract = session.contracts.find(c => c.index === workerIndex)
    if (!contract) {
      return NextResponse.json(
        { error: `No se encontró el contrato con índice ${workerIndex} en la sesión` },
        { status: 404 }
      )
    }

    // 3. Validar datos mínimos del trabajador
    const {
      dni,
      firstName,
      lastName,
      email,
      phone,
      birthDate,
      gender,
      nationality,
      address,
      position,
      department,
      regimenLaboral = 'GENERAL',
      tipoContrato = 'INDEFINIDO',
      fechaIngreso,
      fechaFin, // → se guarda como fechaCese (fecha fin de contrato plazo fijo)
      sueldoBruto,
      asignacionFamiliar = false,
      jornadaSemanal = 48,
      tipoAporte,
      afpNombre,
    } = workerData as {
      dni?: string
      firstName?: string
      lastName?: string
      email?: string
      phone?: string
      birthDate?: string
      gender?: string
      nationality?: string
      address?: string
      position?: string
      department?: string
      regimenLaboral?: string
      tipoContrato?: string
      fechaIngreso?: string
      fechaFin?: string
      sueldoBruto?: number
      asignacionFamiliar?: boolean
      jornadaSemanal?: number
      tipoAporte?: string
      afpNombre?: string
    }

    if (!dni || !/^\d{8}$/.test(dni)) {
      return NextResponse.json({ error: 'DNI inválido (debe tener 8 dígitos)' }, { status: 400 })
    }
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'Nombres y apellidos son obligatorios' },
        { status: 400 }
      )
    }
    if (!fechaIngreso) {
      return NextResponse.json({ error: 'Fecha de ingreso es obligatoria' }, { status: 400 })
    }
    if (sueldoBruto == null || Number(sueldoBruto) <= 0) {
      return NextResponse.json(
        { error: 'Sueldo bruto es obligatorio y debe ser mayor a 0' },
        { status: 400 }
      )
    }

    // 4. Buscar trabajador existente por DNI en la org
    const existing = await prisma.worker.findUnique({
      where: { orgId_dni: { orgId: ctx.orgId, dni } },
    })

    const isDuplicate = !!existing

    // 5. Extraer las páginas físicas del contrato
    let pdfBuffer: Buffer | null = null
    let documentUrl: string | null = null
    let documentId: string | null = null

    try {
      pdfBuffer = await extractPdfPagesToBuffer(
        session.pdfBuffer,
        contract.startPage,
        contract.endPage
      )
    } catch (pdfErr) {
      console.error('[SaveFromBatch] Error extrayendo páginas PDF:', pdfErr)
    }

    let worker: { id: string }

    if (isDuplicate) {
      // ── DUPLICADO: Actualizar datos faltantes del trabajador existente ──
      // Solo sobrescribir campos que estén vacíos/null en el registro actual
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {}

      if (!existing.email && email) updates.email = email
      if (!existing.phone && phone) updates.phone = phone
      if (!existing.birthDate && birthDate) updates.birthDate = new Date(birthDate)
      if (!existing.gender && gender) updates.gender = gender
      if (!existing.nationality && nationality) updates.nationality = nationality
      if (!existing.address && address) updates.address = address
      if (!existing.position && position) updates.position = position
      if (!existing.department && department) updates.department = department
      if (!existing.afpNombre && afpNombre) updates.afpNombre = afpNombre

      // Estos campos siempre se actualizan si vienen del contrato nuevo
      // (el contrato importado puede tener datos más recientes)
      if (regimenLaboral && regimenLaboral !== 'GENERAL') {
        updates.regimenLaboral = regimenLaboral
      }
      if (tipoContrato && tipoContrato !== existing.tipoContrato) {
        updates.tipoContrato = tipoContrato
      }
      if (tipoAporte && tipoAporte !== 'AFP') {
        updates.tipoAporte = tipoAporte
      }
      // Actualizar sueldo solo si el nuevo es mayor (posible aumento)
      if (sueldoBruto && Number(sueldoBruto) > Number(existing.sueldoBruto)) {
        updates.sueldoBruto = Number(sueldoBruto)
      }
      // Actualizar fecha de ingreso solo si la nueva es más antigua
      if (fechaIngreso && new Date(fechaIngreso) < existing.fechaIngreso) {
        updates.fechaIngreso = new Date(fechaIngreso)
      }
      // Actualizar fecha de cese si viene y no tenía
      if (fechaFin && !existing.fechaCese) {
        updates.fechaCese = new Date(fechaFin)
      }
      if (asignacionFamiliar && !existing.asignacionFamiliar) {
        updates.asignacionFamiliar = true
      }

      if (Object.keys(updates).length > 0) {
        await prisma.worker.update({
          where: { id: existing.id },
          data: updates,
        })
      }

      worker = existing
    } else {
      // ── NUEVO: Crear el trabajador ─────────────────────────────────────
      worker = await prisma.worker.create({
        data: {
          orgId: ctx.orgId,
          dni,
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          gender: (gender as 'MASCULINO' | 'FEMENINO' | null) || null,
          nationality: nationality || 'peruana',
          address: address || null,
          position: position || null,
          department: department || null,
          regimenLaboral: (regimenLaboral as 'GENERAL') || 'GENERAL',
          tipoContrato: (tipoContrato as 'INDEFINIDO') || 'INDEFINIDO',
          fechaIngreso: new Date(fechaIngreso),
          fechaCese: fechaFin ? new Date(fechaFin) : null,
          sueldoBruto: Number(sueldoBruto),
          asignacionFamiliar: Boolean(asignacionFamiliar),
          jornadaSemanal: Number(jornadaSemanal) || 48,
          tiempoCompleto: Number(jornadaSemanal) >= 48,
          tipoAporte: (tipoAporte as 'AFP') || 'AFP',
          afpNombre: afpNombre || null,
          status: 'ACTIVE',
          legajoScore: 0,
        },
      })
    }

    // 7. Guardar el sub-PDF como documento del trabajador (nuevo o existente)
    if (pdfBuffer) {
      try {
        const fileName = `contrato_${worker.id}_pag${contract.startPage}-${contract.endPage}.pdf`
        const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' })
        const fileObj = new File([blob], fileName, { type: 'application/pdf' })

        const uploadResult = await uploadFile(fileObj, `workers/${worker.id}/contratos`)
        documentUrl = uploadResult.url

        const doc = await prisma.workerDocument.create({
          data: {
            workerId: worker.id,
            category: 'INGRESO',
            documentType: 'contrato_trabajo',
            title: `Contrato laboral (importado PDF — págs. ${contract.startPage}–${contract.endPage})`,
            fileUrl: documentUrl,
            fileSize: pdfBuffer.length,
            mimeType: 'application/pdf',
            isRequired: true,
            status: 'UPLOADED',
          },
        })
        documentId = doc.id

        // Actualizar legajoScore si es nuevo o si no tenía contrato
        if (!isDuplicate) {
          await prisma.worker.update({
            where: { id: worker.id },
            data: { legajoScore: { increment: 20 } },
          })
        }
      } catch (docErr) {
        console.error('[SaveFromBatch] Error guardando documento del contrato:', docErr)
      }
    }

    // 8. Validar irregularidades y guardar como alertas del trabajador
    const observations = validateContractData({
      dni, firstName, lastName, position,
      regimenLaboral, tipoContrato,
      fechaIngreso, fechaFin,
      sueldoBruto: Number(sueldoBruto),
      jornadaSemanal: Number(jornadaSemanal) || 48,
      asignacionFamiliar: Boolean(asignacionFamiliar),
      tipoAporte,
    })

    const contractObs = observations.filter(o => o.type === 'error' || o.type === 'warning')
    if (contractObs.length > 0) {
      try {
        await prisma.workerAlert.createMany({
          data: contractObs.map(o => ({
            workerId: worker.id,
            orgId: ctx.orgId,
            type: 'REGISTRO_INCOMPLETO' as const,
            severity: o.type === 'error' ? ('HIGH' as const) : ('MEDIUM' as const),
            title: `Observación: ${o.field}`,
            description: `${o.message}${o.baseLegal ? ` (${o.baseLegal})` : ''}`,
          })),
        })
      } catch (obsErr) {
        console.error('[SaveFromBatch] Error guardando observaciones:', obsErr)
      }
    }

    // Regenerar alertas
    try {
      await generateWorkerAlerts(worker.id)
    } catch (alertErr) {
      console.error('[SaveFromBatch] generateWorkerAlerts failed', { workerId: worker.id, alertErr })
    }

    return NextResponse.json(
      {
        success: true,
        workerId: worker.id,
        workerName: `${firstName} ${lastName}`,
        isDuplicate,
        updatedFields: isDuplicate ? 'Datos faltantes actualizados' : undefined,
        observations: contractObs.length,
        documentId,
        documentUrl,
        pagesExtracted:
          pdfBuffer !== null
            ? { startPage: contract.startPage, endPage: contract.endPage }
            : null,
      },
      { status: isDuplicate ? 200 : 201 }
    )
  } catch (e) {
    console.error('[SaveFromBatch] error', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error inesperado' },
      { status: 500 }
    )
  }
})

