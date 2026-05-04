/**
 * Generador de plan del Copiloto IA del Organigrama.
 *
 * Recibe:
 *   - prompt en lenguaje natural
 *   - resumen del estado actual del organigrama (units, positions, workers)
 *
 * Devuelve un `CopilotPlan` validado. Si el LLM falla, devuelve un plan
 * vacío con error visible para el usuario.
 */
import { callAI } from '@/lib/ai/provider'

import { copilotPlanSchema, type CopilotPlan } from './operations'
import { validateCopilotPlan } from './validate-plan'

export interface CopilotGenerationContext {
  units: Array<{ id: string; name: string; kind: string; parentId: string | null }>
  positions: Array<{ id: string; title: string; unitId: string; reportsToPositionId: string | null }>
  workers: Array<{ id: string; firstName: string; lastName: string }>
  workerCount: number
}

export interface CopilotGenerationResult {
  plan: CopilotPlan | null
  warnings: string[]
  error: string | null
}

const SYSTEM_PROMPT = `Eres un experto en diseño organizacional y compliance laboral peruano. Trabajas dentro del módulo Organigrama de Comply360.

El usuario te describe en lenguaje natural cambios que quiere hacer en su organigrama (crear áreas, agregar cargos, mover personas, designar responsables). Tú devuelves un plan estructurado en JSON con las operaciones necesarias para realizarlo.

DEBES devolver UN SOLO objeto JSON con esta estructura:

{
  "rationale": "string corto explicando qué cambios propones y por qué",
  "operations": [
    { "op": "createUnit", "tempKey": "u_xx", "name": "...", "kind": "GERENCIA|AREA|DEPARTAMENTO|EQUIPO|COMITE_LEGAL|BRIGADA|PROYECTO", "parentRef": "<id-real-o-tempKey-o-null>", "description": "opcional" },
    { "op": "createPosition", "tempKey": "p_xx", "title": "...", "unitRef": "<id-real-o-tempKey>", "reportsToRef": "<id-real-o-tempKey-o-null>", "isManagerial": true|false, "isCritical": true|false, "seats": 1, "purpose": "opcional" },
    { "op": "assignWorker", "positionRef": "<id-real-o-tempKey>", "workerId": "<id-real-de-trabajador>", "isPrimary": true, "isInterim": false },
    { "op": "movePosition", "positionId": "<id-real>", "newParentRef": "<id-real-o-tempKey-o-null>" },
    { "op": "requireRole", "roleType": "PRESIDENTE_COMITE_SST|...", "unitRef": "<id-real-o-tempKey-o-null>", "reason": "Ley 29783 art. X" }
  ],
  "legalNotes": [
    "Nota legal relevante 1",
    "Nota legal relevante 2"
  ]
}

REGLAS DURAS:
- Cada operación es atómica y se ejecuta en orden.
- Para crear cosas nuevas usa tempKey ("u_x", "p_x"). Para referenciar lo que ya existe, usa el id real provisto en el contexto.
- parentRef/unitRef/reportsToRef pueden ser: id real existente, tempKey de operación previa, o null (cuando aplica).
- assignWorker.workerId DEBE ser un id real de un trabajador del contexto.
- Si el cambio cruza un umbral legal (ej. agregar gente sube de 19 a 20 trabajadores → necesita Comité SST formal), agrega una operación requireRole y menciónalo en legalNotes.
- Idioma: español peruano neutro, NUNCA voseo argentino.
- NO incluyas explicaciones fuera del JSON. NO uses markdown. Solo el objeto JSON.

ROLES LEGALES VÁLIDOS: PRESIDENTE_COMITE_SST, SECRETARIO_COMITE_SST, REPRESENTANTE_TRABAJADORES_SST, REPRESENTANTE_EMPLEADOR_SST, SUPERVISOR_SST, PRESIDENTE_COMITE_HOSTIGAMIENTO, MIEMBRO_COMITE_HOSTIGAMIENTO, JEFE_INMEDIATO_HOSTIGAMIENTO, BRIGADISTA_PRIMEROS_AUXILIOS, BRIGADISTA_EVACUACION, BRIGADISTA_AMAGO_INCENDIO, DPO_LEY_29733, RT_PLANILLA, RESPONSABLE_IGUALDAD_SALARIAL, ENCARGADO_LIBRO_RECLAMACIONES, MEDICO_OCUPACIONAL, ASISTENTA_SOCIAL, RESPONSABLE_LACTARIO, ENCARGADO_NUTRICION.`

function buildContextSummary(ctx: CopilotGenerationContext): string {
  const lines: string[] = []
  lines.push(`Trabajadores activos: ${ctx.workerCount}`)
  lines.push(`Unidades existentes (id · nombre · kind):`)
  for (const u of ctx.units.slice(0, 60)) {
    const parent = u.parentId ? ` (parent: ${u.parentId})` : ' (raíz)'
    lines.push(`  ${u.id} · ${u.name} · ${u.kind}${parent}`)
  }
  if (ctx.units.length > 60) lines.push(`  … +${ctx.units.length - 60} más`)
  lines.push(`Cargos existentes (id · título · unitId):`)
  for (const p of ctx.positions.slice(0, 80)) {
    lines.push(`  ${p.id} · ${p.title} · ${p.unitId}`)
  }
  if (ctx.positions.length > 80) lines.push(`  … +${ctx.positions.length - 80} más`)
  lines.push(`Trabajadores disponibles (id · nombre) — primeros 30:`)
  for (const w of ctx.workers.slice(0, 30)) {
    lines.push(`  ${w.id} · ${w.firstName} ${w.lastName}`)
  }
  if (ctx.workers.length > 30) lines.push(`  … +${ctx.workers.length - 30} más`)
  return lines.join('\n')
}

export async function generateCopilotPlan(
  userPrompt: string,
  ctx: CopilotGenerationContext,
): Promise<CopilotGenerationResult> {
  const contextSummary = buildContextSummary(ctx)
  const prompt = `${userPrompt}\n\n--- ESTADO ACTUAL DEL ORGANIGRAMA ---\n${contextSummary}`

  let raw: string
  try {
    raw = await callAI(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      {
        feature: 'doc-generator',
        temperature: 0.2,
        maxTokens: 3000,
        jsonMode: true,
      },
    )
  } catch (err) {
    return {
      plan: null,
      warnings: [],
      error: err instanceof Error ? err.message : 'AI provider error',
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { plan: null, warnings: [], error: 'IA devolvió JSON inválido' }
  }

  const zResult = copilotPlanSchema.safeParse(parsed)
  if (!zResult.success) {
    return {
      plan: null,
      warnings: [],
      error: `Estructura inválida: ${zResult.error.issues.slice(0, 3).map((i) => i.message).join('; ')}`,
    }
  }

  const realIds = {
    unitIds: new Set(ctx.units.map((u) => u.id)),
    positionIds: new Set(ctx.positions.map((p) => p.id)),
    workerIds: new Set(ctx.workers.map((w) => w.id)),
  }
  const validation = validateCopilotPlan(zResult.data, realIds)
  if (!validation.valid) {
    return {
      plan: null,
      warnings: validation.warnings,
      error: `Plan inválido: ${validation.errors.slice(0, 3).join('; ')}`,
    }
  }

  return { plan: zResult.data, warnings: validation.warnings, error: null }
}
