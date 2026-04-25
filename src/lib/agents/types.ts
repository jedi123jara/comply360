/**
 * Agent Runtime — Tipos base
 *
 * Un "Agente" en COMPLY360 es una unidad de IA especializada que recibe un input
 * (típicamente un documento + parámetros), ejecuta un análisis con LLM + RAG legal
 * peruano, y devuelve un resultado estructurado + acciones recomendadas.
 *
 * Diseño:
 *  - Stateless por defecto (la persistencia de runs se añadirá en una iteración futura)
 *  - Reusa el AI provider abstraction de src/lib/ai/provider.ts
 *  - Reusa parsers de PDF/DOCX (pdf-parse, mammoth) ya instalados en sesión anterior
 */

export type AgentInputType = 'pdf' | 'docx' | 'text' | 'json'

export interface AgentInput {
  /** Tipo del input principal */
  type: AgentInputType
  /** Buffer del archivo (cuando type = pdf|docx) */
  fileBuffer?: Buffer
  /** Nombre del archivo original */
  fileName?: string
  /** Texto plano (cuando type = text) */
  text?: string
  /** Parámetros adicionales del agente */
  params?: Record<string, unknown>
}

export interface AgentRunContext {
  /** Org ID del tenant que ejecuta el agente — siempre requerido para multi-tenancy */
  orgId: string
  /** User ID que disparó el agente */
  userId: string
  /** ID único del run para tracing */
  runId: string
}

export interface AgentResult<T = unknown> {
  /** Identificador del agente que se ejecutó */
  agentSlug: string
  /** Run ID para trazabilidad */
  runId: string
  /** Estado del run */
  status: 'success' | 'partial' | 'error'
  /** Confianza del resultado (0-100) */
  confidence: number
  /** Datos estructurados específicos del agente */
  data: T
  /** Resumen legible para el usuario */
  summary: string
  /** Advertencias o datos faltantes */
  warnings: string[]
  /** Acciones recomendadas (qué hacer con este resultado) */
  recommendedActions: AgentAction[]
  /** Modelo de IA usado */
  model: string
  /** Duración en ms */
  durationMs: number
  /** Errores no fatales (cuando status = 'partial') */
  errors?: string[]
}

export interface AgentAction {
  /** Identificador único de la acción */
  id: string
  /** Etiqueta visible al usuario */
  label: string
  /** Descripción de qué hace */
  description: string
  /** Tipo de acción para que el front sepa cómo renderizarla */
  type: 'navigate' | 'download' | 'create' | 'agent-call' | 'external'
  /** Payload específico del tipo */
  payload?: Record<string, unknown>
  /** Severidad/prioridad: critical (rojo), important (naranja), info (azul) */
  priority?: 'critical' | 'important' | 'info'
}

export interface AgentDefinition<TInput = AgentInput, TOutput = unknown> {
  /** Slug único en URL */
  slug: string
  /** Nombre legible */
  name: string
  /** Descripción corta */
  description: string
  /** Categoría visible en la consola */
  category: 'sunafil' | 'contratos' | 'nomina' | 'compliance' | 'workforce'
  /** Icono lucide-react */
  icon: string
  /** Status: stable | beta | experimental */
  status: 'stable' | 'beta' | 'experimental'
  /** Tipos de input que acepta */
  acceptedInputs: AgentInputType[]
  /** Costo estimado en tokens (para mostrar al usuario) */
  estimatedTokens: number
  /** Función de ejecución principal */
  run: (input: TInput, ctx: AgentRunContext) => Promise<AgentResult<TOutput>>
  /**
   * Schema Zod opcional para validar `result.data`. Si falla la validación,
   * el runtime degrada el `status` a `'partial'` y agrega un warning, en
   * lugar de fallar la corrida entera. Permite blindar contratos de agentes
   * sin romper los que aún no tienen schema.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outputSchema?: { safeParse(value: unknown): { success: boolean; error?: any; data?: unknown } }
}
