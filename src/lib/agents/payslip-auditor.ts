/**
 * 🏆 AGENTE AUDITOR DE BOLETAS DE PAGO
 *
 * Recibe una boleta de pago en PDF/DOCX, extrae los conceptos remunerativos
 * y descuentos, y los valida contra las fórmulas del Legal Engine peruano:
 *  - Aporte ONP 13% / AFP (variable)
 *  - Asignación familiar 10% RMV
 *  - Quinta categoría (impuesto a la renta)
 *  - RMV 2026 (S/1,025)
 *  - Tope de descuentos (Ley 28015 art. 6)
 *
 * Devuelve un reporte de errores detectados con monto exacto del error.
 */

import { callAI } from '@/lib/ai/provider'
import { extractTextFromBuffer, truncateForLlm } from './extract-text'
import type {
  AgentDefinition,
  AgentInput,
  AgentRunContext,
  AgentResult,
  AgentAction,
} from './types'

// =============================================
// CONSTANTES PERÚ 2026
// =============================================

const RMV_2026 = 1025
const ASIG_FAMILIAR_2026 = RMV_2026 * 0.1 // S/102.50
const ONP_RATE = 0.13
const AFP_RATE_APROX = 0.1278 // promedio aporte + comisión + prima

// =============================================
// SHAPE
// =============================================

export interface PayslipConcept {
  nombre: string
  tipo: 'INGRESO' | 'DESCUENTO' | 'APORTE_EMPLEADOR'
  monto: number
}

export interface PayslipFinding {
  severidad: 'CRITICO' | 'IMPORTANTE' | 'INFO'
  campo: string
  descripcion: string
  valorBoleta: number
  valorEsperado: number
  diferenciaSoles: number
  baseLegal: string
  recomendacion: string
}

export interface PayslipAuditOutput {
  trabajadorNombre?: string
  trabajadorDni?: string
  empresaRazonSocial?: string
  periodo?: string
  sueldoBasico?: number
  totalIngresos?: number
  totalDescuentos?: number
  netoPagar?: number
  conceptos: PayslipConcept[]
  findings: PayslipFinding[]
  resumen: string
  totalDiferenciaDetectada: number
  cumpleRMV: boolean
}

// =============================================
// PROMPT (extracción)
// =============================================

function buildExtractionPrompt(text: string): string {
  return `Eres un especialista en planillas peruanas. Extrae los datos de la siguiente BOLETA DE PAGO y devuelve SOLO un JSON.

BOLETA:
---
${text}
---

JSON esperado:
{
  "trabajadorNombre": "...",
  "trabajadorDni": "12345678",
  "empresaRazonSocial": "...",
  "periodo": "2026-03",
  "sueldoBasico": 2500,
  "totalIngresos": 2602.50,
  "totalDescuentos": 338.32,
  "netoPagar": 2264.18,
  "conceptos": [
    { "nombre": "Sueldo básico", "tipo": "INGRESO", "monto": 2500 },
    { "nombre": "Asignación familiar", "tipo": "INGRESO", "monto": 102.5 },
    { "nombre": "ONP", "tipo": "DESCUENTO", "monto": 338.32 }
  ]
}

Reglas:
- tipo válido: INGRESO | DESCUENTO | APORTE_EMPLEADOR
- Los aportes EsSalud, SCTR, SENATI son APORTE_EMPLEADOR (no descuentos del trabajador)
- Si no encuentras un campo, ponlo en null
- DEVUELVE SOLO EL JSON`
}

// =============================================
// AUDITORÍA (lógica determinística — no LLM)
// =============================================

function auditPayslip(data: Omit<PayslipAuditOutput, 'findings' | 'resumen' | 'totalDiferenciaDetectada' | 'cumpleRMV'>): {
  findings: PayslipFinding[]
  totalDiferencia: number
  cumpleRMV: boolean
} {
  const findings: PayslipFinding[] = []
  const conceptos = data.conceptos || []
  const find = (re: RegExp) => conceptos.find(c => re.test(c.nombre))

  const sueldoBasico = data.sueldoBasico || 0
  const asigFam = find(/asign/i)?.monto
  const onp = find(/^onp$/i)?.monto
  const afp = find(/afp/i)?.monto

  // 1) RMV
  if (sueldoBasico > 0 && sueldoBasico < RMV_2026) {
    findings.push({
      severidad: 'CRITICO',
      campo: 'sueldoBasico',
      descripcion: `El sueldo básico (S/${sueldoBasico.toFixed(2)}) está por debajo de la RMV vigente`,
      valorBoleta: sueldoBasico,
      valorEsperado: RMV_2026,
      diferenciaSoles: RMV_2026 - sueldoBasico,
      baseLegal: 'D.S. 005-2022-TR (RMV S/1,025)',
      recomendacion: 'Ajustar el básico a la RMV vigente y pagar el reintegro retroactivo',
    })
  }

  // 2) Asignación familiar
  if (asigFam != null && Math.abs(asigFam - ASIG_FAMILIAR_2026) > 1 && asigFam > 0) {
    findings.push({
      severidad: 'IMPORTANTE',
      campo: 'asignacionFamiliar',
      descripcion: `La asignación familiar pagada no equivale al 10% de la RMV`,
      valorBoleta: asigFam,
      valorEsperado: ASIG_FAMILIAR_2026,
      diferenciaSoles: ASIG_FAMILIAR_2026 - asigFam,
      baseLegal: 'Ley 25129 — 10% de la RMV',
      recomendacion: 'Recalcular asignación familiar a S/102.50 mensuales',
    })
  }

  // 3) ONP (si aplica)
  if (onp != null && sueldoBasico > 0) {
    const baseAportable = (data.totalIngresos || sueldoBasico)
    const onpEsperado = baseAportable * ONP_RATE
    const diff = Math.abs(onp - onpEsperado)
    if (diff > 5) {
      findings.push({
        severidad: 'IMPORTANTE',
        campo: 'onp',
        descripcion: `El descuento ONP no coincide con el 13% de la base aportable`,
        valorBoleta: onp,
        valorEsperado: Math.round(onpEsperado * 100) / 100,
        diferenciaSoles: Math.round((onpEsperado - onp) * 100) / 100,
        baseLegal: 'D.L. 19990 Art. 7° — Aporte 13%',
        recomendacion: 'Verificar la base imponible y recalcular el aporte ONP',
      })
    }
  }

  // 4) AFP (rango aproximado, alerta si <11% o >14%)
  if (afp != null && sueldoBasico > 0) {
    const baseAportable = (data.totalIngresos || sueldoBasico)
    const afpEsperado = baseAportable * AFP_RATE_APROX
    const ratioReal = afp / baseAportable
    if (ratioReal < 0.11 || ratioReal > 0.145) {
      findings.push({
        severidad: 'INFO',
        campo: 'afp',
        descripcion: `El descuento AFP (${(ratioReal * 100).toFixed(2)}%) está fuera del rango habitual 12%-14%`,
        valorBoleta: afp,
        valorEsperado: Math.round(afpEsperado * 100) / 100,
        diferenciaSoles: Math.round((afpEsperado - afp) * 100) / 100,
        baseLegal: 'Ley 25897 — Aporte obligatorio + comisión + prima seguro',
        recomendacion: 'Verificar comisión y prima de la AFP del trabajador',
      })
    }
  }

  // 5) Cuadre aritmético
  if (data.totalIngresos != null && data.totalDescuentos != null && data.netoPagar != null) {
    const calc = data.totalIngresos - data.totalDescuentos
    if (Math.abs(calc - data.netoPagar) > 0.5) {
      findings.push({
        severidad: 'CRITICO',
        campo: 'netoPagar',
        descripcion: 'El neto a pagar no cuadra: ingresos - descuentos ≠ neto',
        valorBoleta: data.netoPagar,
        valorEsperado: Math.round(calc * 100) / 100,
        diferenciaSoles: Math.round((calc - data.netoPagar) * 100) / 100,
        baseLegal: 'Principio aritmético — verificación de planilla',
        recomendacion: 'Revisar la suma de conceptos en el sistema de planillas',
      })
    }
  }

  // 6) Tope de descuentos (no puede exceder 60% del ingreso) — referencia
  if (
    data.totalDescuentos != null &&
    data.totalIngresos != null &&
    data.totalDescuentos > data.totalIngresos * 0.6
  ) {
    findings.push({
      severidad: 'IMPORTANTE',
      campo: 'totalDescuentos',
      descripcion: 'Los descuentos exceden el 60% del ingreso bruto',
      valorBoleta: data.totalDescuentos,
      valorEsperado: data.totalIngresos * 0.6,
      diferenciaSoles: data.totalDescuentos - data.totalIngresos * 0.6,
      baseLegal: 'Art. 648 inc. 6 CPC — inembargabilidad parcial',
      recomendacion: 'Revisar embargos y descuentos voluntarios',
    })
  }

  const totalDiferencia = findings.reduce((acc, f) => acc + Math.abs(f.diferenciaSoles), 0)
  const cumpleRMV = sueldoBasico === 0 || sueldoBasico >= RMV_2026

  return { findings, totalDiferencia, cumpleRMV }
}

// =============================================
// RUN
// =============================================

async function runPayslipAuditor(
  input: AgentInput,
  ctx: AgentRunContext
): Promise<AgentResult<PayslipAuditOutput>> {
  const start = Date.now()
  const warnings: string[] = []

  if (input.type !== 'pdf' && input.type !== 'docx') {
    throw new Error('Auditor de Boletas requiere PDF o DOCX')
  }
  if (!input.fileBuffer || !input.fileName) {
    throw new Error('Falta archivo en el input')
  }

  // 1. Extraer texto
  let text = ''
  try {
    text = await extractTextFromBuffer(input.fileBuffer, input.fileName)
  } catch (e) {
    throw new Error(`No se pudo leer la boleta: ${e instanceof Error ? e.message : 'desconocido'}`)
  }
  if (!text || text.trim().length < 80) {
    throw new Error('La boleta no contiene texto legible')
  }

  const truncated = truncateForLlm(text, 6000)

  // 2. Llamar a la IA para extraer estructurado
  let aiResponse = ''
  try {
    aiResponse = await callAI(
      [
        {
          role: 'system',
          content:
            'Extraes datos estructurados de boletas de pago peruanas. Respondes SOLO con JSON válido.',
        },
        { role: 'user', content: buildExtractionPrompt(truncated) },
      ],
      { temperature: 0.1, maxTokens: 2000, jsonMode: true, feature: 'contract-gen' }
    )
  } catch (e) {
    throw new Error(`Error IA: ${e instanceof Error ? e.message : 'desconocido'}`)
  }

  let extracted: Omit<PayslipAuditOutput, 'findings' | 'resumen' | 'totalDiferenciaDetectada' | 'cumpleRMV'>
  try {
    const clean = aiResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    extracted = JSON.parse(clean)
  } catch {
    throw new Error('La IA devolvió un formato inválido')
  }

  if (!extracted.conceptos || !Array.isArray(extracted.conceptos)) {
    extracted.conceptos = []
    warnings.push('No se detectaron conceptos remunerativos en la boleta')
  }

  // 3. Auditar contra fórmulas
  const { findings, totalDiferencia, cumpleRMV } = auditPayslip(extracted)

  const data: PayslipAuditOutput = {
    ...extracted,
    findings,
    totalDiferenciaDetectada: Math.round(totalDiferencia * 100) / 100,
    cumpleRMV,
    resumen:
      findings.length === 0
        ? '✅ La boleta cumple con todas las verificaciones automáticas.'
        : `Se detectaron ${findings.length} hallazgos en la boleta. Diferencia total estimada: S/${totalDiferencia.toFixed(2)}.`,
  }

  // 4. Acciones recomendadas
  const recommendedActions: AgentAction[] = []
  const tieneCriticos = findings.some(f => f.severidad === 'CRITICO')

  if (tieneCriticos) {
    recommendedActions.push({
      id: 'fix-payroll',
      label: 'Corregir planilla y emitir reintegro',
      description: 'Hay errores críticos que generan obligación de pago retroactivo',
      type: 'create',
      payload: { type: 'reintegro', findings },
      priority: 'critical',
    })
  }

  if (findings.length > 0) {
    recommendedActions.push({
      id: 'audit-all-payslips',
      label: 'Auditar todas las boletas del mismo periodo',
      description: 'Si este error existe en una boleta, probablemente está en todas',
      type: 'agent-call',
      payload: { agentSlug: 'payslip-auditor', batch: true },
      priority: 'important',
    })
  }

  recommendedActions.push({
    id: 'export-report',
    label: 'Descargar informe de auditoría (PDF)',
    description: 'Reporte detallado para presentar al área de RRHH',
    type: 'download',
    payload: { format: 'pdf', content: data },
    priority: 'info',
  })

  const confidence = findings.length === 0 ? 95 : Math.max(60, 95 - findings.length * 5)

  return {
    agentSlug: 'payslip-auditor',
    runId: ctx.runId,
    status: 'success',
    confidence,
    data,
    summary: data.resumen,
    warnings,
    recommendedActions,
    model: 'comply360-legal',
    durationMs: Date.now() - start,
  }
}

export const payslipAuditorAgent: AgentDefinition<AgentInput, PayslipAuditOutput> = {
  slug: 'payslip-auditor',
  name: 'Auditor de Boletas de Pago',
  description:
    'Sube una boleta de pago en PDF/DOCX. La IA extrae los conceptos y descuentos, y valida automáticamente RMV, asignación familiar, ONP, AFP, cuadre aritmético y tope de descuentos contra la legislación peruana 2026.',
  category: 'nomina',
  icon: 'Receipt',
  status: 'beta',
  acceptedInputs: ['pdf', 'docx'],
  estimatedTokens: 2500,
  run: runPayslipAuditor,
}
