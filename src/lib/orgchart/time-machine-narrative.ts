/**
 * Generador de narrativa "Esta semana en tu organización" para Time Machine.
 *
 * Toma el diff entre dos snapshots y produce un resumen humano de lo que
 * pasó. Si la IA está disponible, lo redacta como un párrafo natural; si
 * no, cae a una versión determinística basada en plantillas.
 */
import { callAI } from '@/lib/ai/provider'

import type { OrgChartTree } from './types'

export interface NarrativeInput {
  fromLabel: string
  fromDate: string
  toLabel: string
  toDate: string
  addedUnits: Array<{ name: string }>
  removedUnits: Array<{ name: string }>
  addedAssignments: Array<{ workerName: string; positionTitle: string }>
  removedAssignments: Array<{ workerName: string; positionTitle: string }>
  addedRoles: Array<{ roleType: string; workerName: string }>
}

export interface NarrativeResult {
  text: string
  highlights: string[]
  source: 'ai' | 'deterministic'
}

const SYSTEM_PROMPT = `Eres un analista de RRHH peruano. Recibes un resumen de cambios estructurales del organigrama de una empresa entre dos snapshots y redactas un párrafo conciso (3-5 frases, máximo 600 caracteres) que cuenta la historia de lo que pasó. Tono profesional, breve, español peruano neutro (NUNCA voseo). Devuelve SOLO el párrafo, sin markdown ni explicaciones extra.`

/**
 * Función pura para narrativa determinística — exportada para tests.
 */
export function buildDeterministicNarrative(input: NarrativeInput): NarrativeResult {
  const parts: string[] = []
  const highlights: string[] = []

  if (input.addedUnits.length > 0) {
    parts.push(
      `Se crearon ${input.addedUnits.length} unidad${input.addedUnits.length === 1 ? '' : 'es'} (${input.addedUnits
        .slice(0, 3)
        .map((u) => u.name)
        .join(', ')}${input.addedUnits.length > 3 ? '…' : ''}).`,
    )
    highlights.push(`+${input.addedUnits.length} unidades`)
  }
  if (input.removedUnits.length > 0) {
    parts.push(
      `Se desactivaron ${input.removedUnits.length} unidad${input.removedUnits.length === 1 ? '' : 'es'}.`,
    )
    highlights.push(`−${input.removedUnits.length} unidades`)
  }
  if (input.addedAssignments.length > 0) {
    parts.push(
      `${input.addedAssignments.length} persona${input.addedAssignments.length === 1 ? '' : 's'} se incorporó al organigrama.`,
    )
    highlights.push(`+${input.addedAssignments.length} personas`)
  }
  if (input.removedAssignments.length > 0) {
    parts.push(
      `${input.removedAssignments.length} salieron del organigrama.`,
    )
    highlights.push(`−${input.removedAssignments.length} salidas`)
  }
  if (input.addedRoles.length > 0) {
    parts.push(
      `Se designaron ${input.addedRoles.length} responsables legales (${input.addedRoles
        .slice(0, 2)
        .map((r) => r.roleType.replace(/_/g, ' '))
        .join(', ')}${input.addedRoles.length > 2 ? '…' : ''}).`,
    )
    highlights.push(`${input.addedRoles.length} roles legales`)
  }

  if (parts.length === 0) {
    return {
      text: `No hubo cambios estructurales relevantes entre ${input.fromLabel} y ${input.toLabel}.`,
      highlights: [],
      source: 'deterministic',
    }
  }

  return {
    text: parts.join(' '),
    highlights,
    source: 'deterministic',
  }
}

/**
 * Genera la narrativa completa, intentando IA primero y cayendo al modo
 * determinístico si la IA falla.
 */
export async function generateTimeMachineNarrative(
  input: NarrativeInput,
): Promise<NarrativeResult> {
  // Versión determinística siempre disponible como fallback.
  const fallback = buildDeterministicNarrative(input)

  // Si no hay nada que contar, no llamamos a la IA.
  if (fallback.highlights.length === 0) return fallback

  const userPrompt = [
    `Snapshot inicial: ${input.fromLabel} (${input.fromDate})`,
    `Snapshot final: ${input.toLabel} (${input.toDate})`,
    '',
    `Unidades agregadas: ${input.addedUnits.length}${input.addedUnits.length > 0 ? ` — ${input.addedUnits.map((u) => u.name).join(', ')}` : ''}`,
    `Unidades removidas: ${input.removedUnits.length}${input.removedUnits.length > 0 ? ` — ${input.removedUnits.map((u) => u.name).join(', ')}` : ''}`,
    `Asignaciones agregadas: ${input.addedAssignments.length}`,
    `Asignaciones removidas: ${input.removedAssignments.length}`,
    `Roles legales designados: ${input.addedRoles.length}`,
    '',
    'Redacta un párrafo conciso narrando esta evolución.',
  ].join('\n')

  try {
    const text = await callAI(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      {
        feature: 'doc-generator',
        temperature: 0.4,
        maxTokens: 350,
        jsonMode: false,
      },
    )
    return {
      text: text.trim().slice(0, 800),
      highlights: fallback.highlights,
      source: 'ai',
    }
  } catch {
    return fallback
  }
}

/**
 * Helper para construir el `NarrativeInput` desde dos OrgChartTree (no
 * payloads del snapshot service).
 */
export function buildNarrativeInputFromTrees(
  fromTree: OrgChartTree,
  toTree: OrgChartTree,
  fromMeta: { label: string; createdAt: string | Date },
  toMeta: { label: string; createdAt: string | Date },
): NarrativeInput {
  const fromUnitIds = new Set(fromTree.units.map((u) => u.id))
  const toUnitIds = new Set(toTree.units.map((u) => u.id))

  const addedUnits = toTree.units
    .filter((u) => !fromUnitIds.has(u.id))
    .map((u) => ({ name: u.name }))
  const removedUnits = fromTree.units
    .filter((u) => !toUnitIds.has(u.id))
    .map((u) => ({ name: u.name }))

  const fromAssignKey = (a: { workerId: string; positionId: string }) =>
    `${a.workerId}::${a.positionId}`
  const fromAssigns = new Set(fromTree.assignments.map(fromAssignKey))
  const toAssigns = new Set(toTree.assignments.map(fromAssignKey))

  const addedAssignments = toTree.assignments
    .filter((a) => !fromAssigns.has(fromAssignKey(a)))
    .map((a) => {
      const pos = toTree.positions.find((p) => p.id === a.positionId)
      return {
        workerName: `${a.worker.firstName} ${a.worker.lastName}`,
        positionTitle: pos?.title ?? '—',
      }
    })

  const removedAssignments = fromTree.assignments
    .filter((a) => !toAssigns.has(fromAssignKey(a)))
    .map((a) => {
      const pos = fromTree.positions.find((p) => p.id === a.positionId)
      return {
        workerName: `${a.worker.firstName} ${a.worker.lastName}`,
        positionTitle: pos?.title ?? '—',
      }
    })

  const fromRoleKey = (r: { roleType: string; workerId: string }) =>
    `${r.roleType}::${r.workerId}`
  const fromRoles = new Set(fromTree.complianceRoles.map(fromRoleKey))
  const addedRoles = toTree.complianceRoles
    .filter((r) => !fromRoles.has(fromRoleKey(r)))
    .map((r) => ({
      roleType: r.roleType,
      workerName: `${r.worker.firstName} ${r.worker.lastName}`,
    }))

  return {
    fromLabel: fromMeta.label,
    fromDate: new Date(fromMeta.createdAt).toLocaleDateString('es-PE'),
    toLabel: toMeta.label,
    toDate: new Date(toMeta.createdAt).toLocaleDateString('es-PE'),
    addedUnits,
    removedUnits,
    addedAssignments,
    removedAssignments,
    addedRoles,
  }
}
