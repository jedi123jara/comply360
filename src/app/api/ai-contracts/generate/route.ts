import { NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import { generateContract, type ContractGenInput } from '@/lib/ai/contract-generator'
import { z } from 'zod'

export const maxDuration = 120

const PostSchema = z.object({
  description: z.string().min(10, 'Describe con mas detalle lo que necesitas').max(2000),
  // Empleador
  empleadorRazonSocial: z.string().optional(),
  empleadorRuc: z.string().optional(),
  empleadorRepresentante: z.string().optional(),
  empleadorDireccion: z.string().optional(),
  // Trabajador
  trabajadorNombre: z.string().optional(),
  trabajadorDni: z.string().optional(),
  // Tipo contrato
  modalidadContrato: z.string().optional(),
  causaObjetiva: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  periodoPruebaMeses: z.number().optional(),
  // Condiciones
  cargo: z.string().optional(),
  jornadaHoras: z.number().optional(),
  horario: z.string().optional(),
  remuneracion: z.number().optional(),
  formaPago: z.string().optional(),
  beneficiosAdicionales: z.string().optional(),
})

export const POST = withPlanGate('ia_contratos', async (req) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud invalido' }, { status: 400 })
  }

  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos invalidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const input: ContractGenInput = parsed.data

  try {
    const contract = await generateContract(input)
    return NextResponse.json({ contract })
  } catch (err) {
    console.error('[POST /api/ai-contracts/generate] Error inesperado:', err)
    return NextResponse.json(
      { error: 'Error generando el contrato. Intenta de nuevo.' },
      { status: 500 }
    )
  }
})
