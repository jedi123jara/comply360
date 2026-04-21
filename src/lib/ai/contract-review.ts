// =============================================
// AI CONTRACT REVIEW ENGINE — COMPLY360 PERÚ
// Análisis normativo profundo por tipo de contrato
// Normativa: D.Leg. 728, Ley 29783, Ley 27942, Ley 29733, Ley 30709
// =============================================
import { callAI } from './provider'
import { retrieveRelevantLawVector, formatVectorContext } from './rag/vector-retriever'

export interface ContractReviewInput {
  contractHtml: string
  contractType: string
  templateId?: string
}

export interface ContractReviewResult {
  overallScore: number          // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  risks: ContractRisk[]
  suggestions: ContractSuggestion[]
  compliance: ComplianceCheck[]
  clausulasObligatorias: ClausulaObligatoria[]
  resumenEjecutivo: string
  summary: string               // alias para compatibilidad
  multaEstimadaUIT?: number     // multa potencial en UITs
}

export interface ContractRisk {
  id: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: string
  title: string
  description: string
  clause: string
  recommendation: string
  legalBasis?: string
  multaUIT?: number
}

export interface ContractSuggestion {
  type: 'ADD' | 'MODIFY' | 'REMOVE'
  clause: string
  suggestion: string
  reason: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface ComplianceCheck {
  rule: string
  description: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  details: string
  legalBasis: string
  categoria: string
}

export interface ClausulaObligatoria {
  nombre: string
  descripcion: string
  presente: boolean
  baseLegal: string
  textoEncontrado?: string
  obligatoriedad: 'OBLIGATORIA' | 'RECOMENDADA'
}

// ─── System prompt especializado ─────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un abogado laboralista peruano senior con 20 años de experiencia en inspecciones SUNAFIL y cumplimiento normativo laboral.

Tu especialidad es el análisis exhaustivo de contratos laborales peruanos. Revisas cada contrato contra la normativa vigente con precisión quirúrgica.

MARCO NORMATIVO QUE APLICAS:
- D.Leg. 728 + D.S. 003-97-TR (Productividad y Competitividad Laboral) — régimen general
- D.S. 001-97-TR (TUO Ley de CTS)
- Ley 27735 + D.S. 005-2002-TR (Gratificaciones)
- D.Leg. 713 (Vacaciones)
- D.S. 007-2002-TR (Jornada de Trabajo — máx. 8h diarias / 48h semanales)
- Ley 29783 + D.S. 005-2012-TR (Seguridad y Salud en el Trabajo)
- Ley 27942 + D.S. 014-2019-MIMP (Hostigamiento Sexual)
- Ley 29733 + D.S. 003-2013-JUS (Protección de Datos Personales)
- Ley 30709 + D.S. 002-2018-TR (No discriminación remunerativa)
- Ley 32353 / D.Leg. 1086 (Régimen MYPE)
- D.S. 019-2006-TR (Tabla de infracciones y sanciones SUNAFIL)
- UIT 2026 = S/ 5,500 — RMV 2026 = S/ 1,130

CRITERIOS DE EVALUACIÓN:
1. Identifica si están presentes las cláusulas OBLIGATORIAS por ley
2. Detecta cláusulas nulas de pleno derecho (contra norma imperativa)
3. Detecta cláusulas que generan riesgo de desnaturalización
4. Calcula multa estimada en UITs por cada incumplimiento detectado
5. Verifica que los montos y plazos cumplan los mínimos legales

Responde SIEMPRE en JSON válido. Respuestas en español peruano.`

// ─── Prompt por tipo de contrato ─────────────────────────────────────────────

function buildPrompt(input: ContractReviewInput): string {
  const tipoLabel = input.contractType.replace(/_/g, ' ')

  return `Analiza este contrato de tipo "${tipoLabel}" contra la normativa laboral peruana vigente.

TEXTO DEL CONTRATO:
---
${stripHtml(input.contractHtml).slice(0, 12000)}
---

Responde con este JSON exacto:
{
  "overallScore": <0-100, donde 100 = cumplimiento total>,
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "resumenEjecutivo": "<3-4 oraciones: diagnóstico general, principales hallazgos y acción urgente si existe>",
  "multaEstimadaUIT": <número decimal, suma de multas potenciales en UITs>,
  "clausulasObligatorias": [
    {
      "nombre": "<nombre de la cláusula>",
      "descripcion": "<qué debe contener>",
      "presente": <true|false>,
      "baseLegal": "<norma exacta>",
      "textoEncontrado": "<fragmento del contrato que la satisface, o null si ausente>",
      "obligatoriedad": "<OBLIGATORIA|RECOMENDADA>"
    }
  ],
  "compliance": [
    {
      "rule": "<nombre de la verificación>",
      "descripcion": "<qué se verifica>",
      "status": "<PASS|FAIL|WARNING>",
      "details": "<hallazgo concreto>",
      "legalBasis": "<artículo exacto>",
      "categoria": "<Remuneración|Jornada|Protección Social|SST|Datos Personales|Hostigamiento|Igualdad Salarial|Formalidades>"
    }
  ],
  "risks": [
    {
      "severity": "<LOW|MEDIUM|HIGH|CRITICAL>",
      "category": "<categoría>",
      "title": "<título corto del problema>",
      "description": "<descripción precisa del riesgo legal>",
      "clause": "<cláusula o sección donde ocurre, o 'Cláusula faltante'>",
      "recommendation": "<acción correctiva concreta>",
      "legalBasis": "<base legal aplicable>",
      "multaUIT": <multa potencial en UITs según D.S. 019-2006-TR, o 0 si no aplica>
    }
  ],
  "suggestions": [
    {
      "type": "<ADD|MODIFY|REMOVE>",
      "clause": "<nombre de la cláusula>",
      "suggestion": "<texto sugerido o descripción de cambio>",
      "reason": "<por qué es necesario>",
      "priority": "<LOW|MEDIUM|HIGH>"
    }
  ]
}

INSTRUCCIONES ESPECÍFICAS POR TIPO:
${getTypeInstructions(input.contractType)}`
}

function getTypeInstructions(contractType: string): string {
  const base = contractType.toUpperCase()

  if (base.includes('LOCACION')) {
    return `Para LOCACIÓN DE SERVICIOS (Código Civil Art. 1764-1770):
- Verificar AUSENCIA de elementos de subordinación (horario fijo, exclusividad, local del comitente obligatorio)
- Verificar que el objeto sea un resultado específico, no una actividad continua
- Si hay subordinación encubierta → riesgo CRITICAL de desnaturalización (multa: hasta 20 UIT)
- Verificar retención IR 4ta categoría (cuando supera S/ 1,750/mes)
- Verificar inexistencia de beneficios laborales (CTS, gratificaciones, vacaciones) — si los tiene, el contrato ya está desnaturalizado

Cláusulas obligatorias para locación: objeto, honorarios, plazo, entregables, autonomía del locador, datos de ambas partes, IR.`
  }

  if (base.includes('INDEFINIDO') || base.includes('PLAZO_FIJO') || base.includes('TIEMPO_PARCIAL')) {
    return `Para CONTRATOS LABORALES (D.Leg. 728):
Cláusulas OBLIGATORIAS a verificar:
1. Identificación completa de partes (DNI, RUC, domicilio) — Art. 4 D.S. 003-97-TR
2. Fecha de inicio y, si es plazo fijo, fecha de fin con causa objetiva — Art. 53-57 D.Leg. 728
3. Cargo/puesto y funciones específicas — Art. 9 D.Leg. 728
4. Remuneración ≥ RMV S/ 1,130 — Art. 24 Constitución
5. Jornada: ≤ 8h diarias / 48h semanales — D.S. 007-2002-TR Art. 1
6. Período de prueba: máx. 3 meses general, 6 meses cargos de confianza, 12 meses dirección — Art. 10 D.Leg. 728
7. Beneficios sociales: CTS, gratificaciones, vacaciones (o indicar régimen especial)
8. Lugar de prestación del servicio — Art. 9 D.Leg. 728
9. SST: referencia a obligaciones Ley 29783 — Art. 35 Ley 29783
10. Hostigamiento sexual: referencia a política y Ley 27942 — Art. 4 D.S. 014-2019-MIMP
11. Protección de datos personales con consentimiento informado — Ley 29733 Art. 5
12. Igualdad salarial: no discriminación por género — Ley 30709 Art. 3
13. Registro en T-REGISTRO (verificar si se menciona) — Art. 7 D.S. 015-2010-TR
14. Causales de extinción del contrato — Art. 16 D.Leg. 728
15. Para plazo fijo: causa objetiva que justifica la temporalidad — Art. 53 D.Leg. 728

Multas SUNAFIL por incumplimiento (D.S. 019-2006-TR):
- No registrar trabajador en T-REGISTRO: 3-20 UIT (muy grave)
- Remuneración menor a RMV: 3-20 UIT (muy grave)
- Jornada excesiva sin pago de HH.EE: 3-20 UIT
- No depositar CTS: 1-5 UIT (grave)
- No pagar gratificaciones: 1-5 UIT
- Contrato plazo fijo sin causa objetiva: 1-5 UIT`
  }

  if (base.includes('PRACTICAS')) {
    return `Para CONVENIOS DE PRÁCTICAS (Ley 28518):
- Verificar que sea firma de empresa con capacidad de brindar aprendizaje
- Subvención económica ≥ RMV para prácticas profesionales, ≥ 50% RMV para pre-profesionales
- Seguro médico o equivalente obligatorio
- Plazo: pre-profesionales máx. 12 meses por empresa; profesionales máx. 12 meses
- Verificar que no encubra una relación laboral (no subordinación real)`
  }

  return `Para este tipo de contrato, verifica:
- Identificación de partes
- Objeto claro y determinado
- Contraprestación y forma de pago
- Plazo o condición de término
- Obligaciones de cada parte
- Cláusulas de protección de datos si hay datos personales involucrados`
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function reviewContract(input: ContractReviewInput): Promise<ContractReviewResult> {
  try {
    const prompt = buildPrompt(input)

    // ── RAG: recupera normativa relevante al tipo de contrato + temas detectados
    // en el texto. Inyecta como system message antes del prompt para fundamentar
    // la revisión en citas exactas del corpus v1 (handcrafted) + v2 (9 PDFs SUNAFIL).
    let ragSystem: { role: 'system'; content: string } | null = null
    try {
      const tipoLabel = input.contractType.replace(/_/g, ' ').toLowerCase()
      const textoSample = stripHtml(input.contractHtml).slice(0, 600).toLowerCase()
      const ragQuery = `${tipoLabel} remuneracion jornada CTS gratificacion vacaciones SST hostigamiento. ${textoSample}`
      const ragResults = await retrieveRelevantLawVector(ragQuery, { topK: 6, minScore: 0.05 })
      const ragContext = formatVectorContext(ragResults)
      if (ragContext) {
        ragSystem = {
          role: 'system',
          content: `Normativa aplicable relevante (usa estas citas para fundamentar tus hallazgos):\n${ragContext}`,
        }
      }
    } catch (ragErr) {
      console.warn('[ContractReview] RAG retrieval failed, sigo sin contexto:', ragErr)
    }

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...(ragSystem ? [ragSystem] : []),
      { role: 'user' as const, content: prompt },
    ]

    const content = await callAI(messages, {
      temperature: 0.2,
      maxTokens: 5000,
      jsonMode: true,
      feature: 'contract-review',
    })

    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/```\s*([\s\S]*?)\s*```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : content
    const parsed = JSON.parse(jsonStr)

    const risks: ContractRisk[] = (parsed.risks ?? []).map((r: ContractRisk, i: number) => ({
      ...r,
      id: `risk-${i + 1}`,
    }))

    const result: ContractReviewResult = {
      overallScore: Number(parsed.overallScore) || 50,
      riskLevel: parsed.riskLevel || 'MEDIUM',
      risks,
      suggestions: parsed.suggestions ?? [],
      compliance: parsed.compliance ?? [],
      clausulasObligatorias: parsed.clausulasObligatorias ?? [],
      resumenEjecutivo: parsed.resumenEjecutivo ?? parsed.summary ?? '',
      summary: parsed.resumenEjecutivo ?? parsed.summary ?? '',
      multaEstimadaUIT: parsed.multaEstimadaUIT ?? 0,
    }

    return result
  } catch (error) {
    console.error('[ContractReview] AI failed, using simulated review:', error)
    return generateSimulatedReview(input)
  }
}

// ─── Revisión simulada (fallback sin IA) ─────────────────────────────────────

function generateSimulatedReview(input: ContractReviewInput): ContractReviewResult {
  const isLaboral = input.contractType.toUpperCase().includes('LABORAL') ||
                    input.contractType.toUpperCase().includes('INDEFINIDO') ||
                    input.contractType.toUpperCase().includes('PLAZO') ||
                    input.contractType.toUpperCase().includes('PARCIAL')
  const isLocacion = input.contractType.toUpperCase().includes('LOCACION')
  const text = stripHtml(input.contractHtml).toLowerCase()

  const clausulasObligatorias: ClausulaObligatoria[] = isLaboral ? [
    {
      nombre: 'Identificación de partes',
      descripcion: 'DNI, RUC, nombre y domicilio de empleador y trabajador',
      presente: text.includes('dni') || text.includes('ruc'),
      baseLegal: 'D.S. 003-97-TR, Art. 4',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Remuneración',
      descripcion: 'Monto de remuneración mensual no inferior a la RMV (S/ 1,130)',
      presente: text.includes('remuneraci') || text.includes('sueldo') || text.includes('salario'),
      baseLegal: 'Art. 24 Constitución / D.S. 003-97-TR',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Jornada laboral',
      descripcion: 'Horas de trabajo diarias y semanales (máx. 8h/día, 48h/semana)',
      presente: text.includes('jornada') || text.includes('horario') || text.includes('horas'),
      baseLegal: 'D.S. 007-2002-TR, Art. 1',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Período de prueba',
      descripcion: 'Período de prueba (máx. 3 meses para régimen general)',
      presente: text.includes('prueba') || text.includes('periodo de prueba'),
      baseLegal: 'D.Leg. 728, Art. 10 / D.S. 003-97-TR',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Lugar de trabajo',
      descripcion: 'Lugar o lugares donde se prestará el servicio',
      presente: text.includes('lugar') || text.includes('sede') || text.includes('oficina') || text.includes('domicilio'),
      baseLegal: 'D.S. 003-97-TR, Art. 9',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Seguridad y Salud en el Trabajo',
      descripcion: 'Referencia a obligaciones SST del empleador y trabajador (Ley 29783)',
      presente: text.includes('seguridad') || text.includes('sst') || text.includes('salud en el trabajo') || text.includes('29783'),
      baseLegal: 'Ley 29783, Art. 35',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Protección de datos personales',
      descripcion: 'Cláusula de consentimiento para tratamiento de datos del trabajador',
      presente: text.includes('datos personales') || text.includes('29733') || text.includes('protección de datos'),
      baseLegal: 'Ley 29733, Art. 5-7',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Política contra hostigamiento sexual',
      descripcion: 'Referencia a la política interna y Ley 27942',
      presente: text.includes('hostigamiento') || text.includes('27942') || text.includes('acoso'),
      baseLegal: 'Ley 27942 / D.S. 014-2019-MIMP',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Igualdad salarial',
      descripcion: 'Cláusula de no discriminación remunerativa por género (Ley 30709)',
      presente: text.includes('igualdad') || text.includes('30709') || text.includes('discriminaci'),
      baseLegal: 'Ley 30709, Art. 3',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Beneficios sociales',
      descripcion: 'Mención de CTS, gratificaciones y vacaciones (o régimen especial aplicable)',
      presente: text.includes('cts') || text.includes('gratificaci') || text.includes('vacaciones') || text.includes('beneficios'),
      baseLegal: 'D.S. 001-97-TR / Ley 27735 / D.Leg. 713',
      obligatoriedad: 'OBLIGATORIA',
    },
  ] : isLocacion ? [
    {
      nombre: 'Objeto del servicio',
      descripcion: 'Resultado específico a entregar (no actividad continua)',
      presente: text.includes('objeto') || text.includes('servicio') || text.includes('resultado'),
      baseLegal: 'Código Civil, Art. 1764',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Autonomía del locador',
      descripcion: 'Cláusula que explicita que el locador trabaja sin subordinación',
      presente: text.includes('autonom') || text.includes('independen') || text.includes('sin subordin'),
      baseLegal: 'Código Civil, Art. 1764 / D.S. 003-97-TR, Art. 4',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Honorarios y forma de pago',
      descripcion: 'Monto de honorarios y periodicidad/modalidad de pago',
      presente: text.includes('honorario') || text.includes('retribuci') || text.includes('pago'),
      baseLegal: 'Código Civil, Art. 1767',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Plazo o condición de término',
      descripcion: 'Fecha de fin o hito que determina el fin del servicio',
      presente: text.includes('plazo') || text.includes('vencimiento') || text.includes('término'),
      baseLegal: 'Código Civil, Art. 1764',
      obligatoriedad: 'OBLIGATORIA',
    },
    {
      nombre: 'Retención IR 4ta categoría',
      descripcion: 'Mención de retención del impuesto a la renta cuando corresponde',
      presente: text.includes('impuesto') || text.includes('renta') || text.includes('retenci') || text.includes('honorario'),
      baseLegal: 'D.L. 970 - Ley del Impuesto a la Renta',
      obligatoriedad: 'RECOMENDADA',
    },
  ] : []

  const ausentes = clausulasObligatorias.filter(c => !c.presente && c.obligatoriedad === 'OBLIGATORIA')
  const presentes = clausulasObligatorias.filter(c => c.presente)

  // Compliance checks
  const compliance: ComplianceCheck[] = clausulasObligatorias.map(c => ({
    rule: c.nombre,
    descripcion: c.descripcion,
    description: c.descripcion,
    status: c.presente ? 'PASS' : (c.obligatoriedad === 'OBLIGATORIA' ? 'FAIL' : 'WARNING'),
    details: c.presente
      ? `✓ Cláusula presente en el contrato`
      : `✗ No se encontró esta cláusula — es ${c.obligatoriedad.toLowerCase()}`,
    legalBasis: c.baseLegal,
    categoria: getCategoriaCompliance(c.nombre),
  }))

  // Risks from missing clauses
  const risks: ContractRisk[] = ausentes.map((c, i) => ({
    id: `risk-${i + 1}`,
    severity: 'HIGH' as const,
    category: getCategoriaCompliance(c.nombre),
    title: `Falta: ${c.nombre}`,
    description: `El contrato no incluye la cláusula "${c.nombre}" que es obligatoria según ${c.baseLegal}. Esto puede generar nulidad parcial del contrato y multa SUNAFIL.`,
    clause: 'Cláusula faltante',
    recommendation: `Agregar cláusula de ${c.nombre.toLowerCase()} conforme a ${c.baseLegal}.`,
    legalBasis: c.baseLegal,
    multaUIT: 1.5,
  }))

  if (isLocacion && text.includes('horario') && text.includes('fijo')) {
    risks.push({
      id: `risk-${risks.length + 1}`,
      severity: 'CRITICAL',
      category: 'Desnaturalización',
      title: 'Riesgo de desnaturalización: horario fijo',
      description: 'Se detecta la imposición de un horario fijo al locador. Esto es un elemento de subordinación que puede desnaturalizar el contrato civil en una relación laboral encubierta.',
      clause: 'Condiciones del servicio',
      recommendation: 'Eliminar toda referencia a horario fijo. El locador debe tener autonomía para organizar su tiempo.',
      legalBasis: 'D.S. 003-97-TR, Art. 4 — Elementos del contrato de trabajo',
      multaUIT: 20,
    })
  }

  // Score calculation
  const pct = clausulasObligatorias.length > 0
    ? presentes.filter(c => c.obligatoriedad === 'OBLIGATORIA').length /
      clausulasObligatorias.filter(c => c.obligatoriedad === 'OBLIGATORIA').length
    : 0.7
  const overallScore = Math.round(Math.max(20, Math.min(100, pct * 100 - (risks.filter(r => r.severity === 'CRITICAL').length * 10))))

  const riskLevel: ContractReviewResult['riskLevel'] =
    overallScore >= 85 ? 'LOW' :
    overallScore >= 70 ? 'MEDIUM' :
    overallScore >= 50 ? 'HIGH' : 'CRITICAL'

  const multaEstimadaUIT = risks.reduce((sum, r) => sum + (r.multaUIT ?? 0), 0)

  const suggestions: ContractSuggestion[] = ausentes.slice(0, 4).map(c => ({
    type: 'ADD' as const,
    clause: c.nombre,
    suggestion: `Incorporar cláusula de ${c.nombre.toLowerCase()} que cumpla con ${c.baseLegal}.`,
    reason: `Obligatorio por ley — ausencia puede generar nulidad y multa SUNAFIL`,
    priority: 'HIGH' as const,
  }))

  const resumenEjecutivo = ausentes.length === 0
    ? `El contrato presenta un cumplimiento adecuado con la normativa laboral peruana. Score: ${overallScore}/100. Se recomienda revisión periódica para mantener el cumplimiento ante cambios normativos.`
    : `El contrato presenta ${ausentes.length} cláusula(s) obligatoria(s) ausente(s): ${ausentes.slice(0, 3).map(c => c.nombre).join(', ')}${ausentes.length > 3 ? ' y más' : ''}. Score: ${overallScore}/100. Multa potencial estimada: ${multaEstimadaUIT} UIT (S/ ${(multaEstimadaUIT * 5500).toLocaleString('es-PE')}). Se requiere corrección inmediata antes de la firma.`

  return {
    overallScore,
    riskLevel,
    risks,
    suggestions,
    compliance,
    clausulasObligatorias,
    resumenEjecutivo,
    summary: resumenEjecutivo,
    multaEstimadaUIT,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCategoriaCompliance(nombre: string): string {
  const n = nombre.toLowerCase()
  if (n.includes('remuner') || n.includes('sueldo') || n.includes('honorario')) return 'Remuneración'
  if (n.includes('jornada') || n.includes('horario')) return 'Jornada'
  if (n.includes('sst') || n.includes('seguridad') || n.includes('salud')) return 'SST'
  if (n.includes('datos')) return 'Datos Personales'
  if (n.includes('hostigamiento') || n.includes('acoso')) return 'Hostigamiento'
  if (n.includes('igualdad') || n.includes('discrimin')) return 'Igualdad Salarial'
  if (n.includes('beneficio') || n.includes('cts') || n.includes('gratif') || n.includes('vacacion')) return 'Protección Social'
  if (n.includes('desnatur') || n.includes('autonom')) return 'Desnaturalización'
  return 'Formalidades'
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
