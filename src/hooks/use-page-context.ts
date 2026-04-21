'use client'

import { usePathname, useParams } from 'next/navigation'
import { useMemo } from 'react'
import { NAV_HUBS, resolveActiveHub, type NavHub } from '@/lib/constants'

/**
 * Entidad central de la página actual, extraída de la ruta.
 * El copilot usa esto para inyectar contexto al chat automáticamente.
 */
export interface PageContext {
  hub: NavHub
  /** Pathname completo. */
  pathname: string
  /** ID del recurso principal en la ruta (workerId, contractId, etc.) si aplica. */
  entityId: string | null
  /** Tipo de entidad detectada por la ruta. */
  entityType:
    | 'worker'
    | 'contract'
    | 'diagnostic'
    | 'complaint'
    | 'sst'
    | 'document'
    | 'inspection'
    | null
  /** Etiqueta humana para mostrar en el copilot ("Perfil de Juan García"). */
  humanLabel: string
  /** Sugerencias contextuales rápidas para el copilot. */
  suggestions: readonly { label: string; prompt: string }[]
}

/**
 * Heurística: detecta el tipo de entidad a partir del segmento padre + param.
 */
function detectEntity(
  pathname: string,
  params: Record<string, string | string[] | undefined>
): { type: PageContext['entityType']; id: string | null } {
  // Extract [id] param (common name in dynamic routes)
  const rawId =
    (typeof params.id === 'string' && params.id) ||
    (Array.isArray(params.id) && params.id[0]) ||
    null

  if (!rawId) return { type: null, id: null }

  if (pathname.includes('/trabajadores/')) return { type: 'worker', id: rawId }
  if (pathname.includes('/contratos/')) return { type: 'contract', id: rawId }
  if (pathname.includes('/diagnostico/')) return { type: 'diagnostic', id: rawId }
  if (pathname.includes('/denuncias/')) return { type: 'complaint', id: rawId }
  if (pathname.includes('/sst/')) return { type: 'sst', id: rawId }
  if (pathname.includes('/expedientes/') || pathname.includes('/documentos/'))
    return { type: 'document', id: rawId }
  if (pathname.includes('/inspeccion-en-vivo/')) return { type: 'inspection', id: rawId }

  return { type: null, id: rawId }
}

/**
 * Sugerencias contextuales por tipo de entidad / hub.
 * El copilot las muestra como "quick actions" cuando abre.
 */
function buildSuggestions(
  entityType: PageContext['entityType'],
  hubKey: string
): readonly { label: string; prompt: string }[] {
  if (entityType === 'worker') {
    return [
      { label: 'Calcular liquidación', prompt: 'Calcula la liquidación de beneficios sociales de este trabajador' },
      { label: 'Generar carta de cese', prompt: 'Redacta una carta de cese laboral por mutuo disenso' },
      { label: 'Revisar legajo', prompt: '¿Qué documentos faltan en el legajo de este trabajador?' },
      { label: 'Ver alertas', prompt: '¿Qué alertas activas tiene este trabajador y cómo las resuelvo?' },
    ]
  }
  if (entityType === 'contract') {
    return [
      { label: 'Analizar cláusulas de riesgo', prompt: 'Analiza este contrato y lista las cláusulas con riesgo SUNAFIL' },
      { label: 'Sugerir renovación', prompt: 'Genera una carta de renovación para este contrato' },
      { label: 'Comparar con plantilla', prompt: 'Compara este contrato con la plantilla estándar del régimen laboral aplicable' },
    ]
  }
  if (entityType === 'diagnostic') {
    return [
      { label: 'Plan de acción', prompt: 'Genera un plan de acción priorizado para las brechas detectadas' },
      { label: 'Explicar multa', prompt: 'Explícame cómo se calcula la multa SUNAFIL estimada' },
    ]
  }
  if (entityType === 'complaint') {
    return [
      { label: 'Medidas de protección', prompt: 'Lista las medidas de protección requeridas por Ley 27942 para esta denuncia' },
      { label: 'Cronograma legal', prompt: '¿Cuáles son los plazos legales del proceso de investigación?' },
    ]
  }
  // Defaults por hub
  if (hubKey === 'riesgo') {
    return [
      { label: 'Top alertas críticas', prompt: 'Dame el top de alertas críticas que debo resolver hoy' },
      { label: 'Simular SUNAFIL', prompt: '¿Qué tan preparada está mi empresa para un simulacro SUNAFIL?' },
    ]
  }
  if (hubKey === 'equipo') {
    return [
      { label: 'Top trabajadores en riesgo', prompt: 'Lista los 5 trabajadores con mayor riesgo de compliance' },
      { label: 'Contratos por vencer', prompt: '¿Qué contratos vencen en los próximos 30 días?' },
    ]
  }
  if (hubKey === 'contratos-docs') {
    return [
      { label: 'Generar contrato', prompt: 'Quiero generar un contrato. Guíame por los campos obligatorios' },
      { label: 'Buscar plantilla', prompt: 'Muéstrame todas las plantillas de contrato disponibles' },
    ]
  }
  // Fallback genérico
  return [
    { label: '¿Qué debo hacer hoy?', prompt: 'Dame las 3 acciones más urgentes de compliance para esta semana' },
    { label: 'Mi score', prompt: '¿Cuál es mi score de compliance y cómo subirlo?' },
  ]
}

function humanLabelFor(
  entityType: PageContext['entityType'],
  entityId: string | null,
  hub: NavHub
): string {
  if (entityType === 'worker' && entityId) return 'Perfil de trabajador'
  if (entityType === 'contract' && entityId) return 'Contrato abierto'
  if (entityType === 'diagnostic' && entityId) return 'Diagnóstico SUNAFIL'
  if (entityType === 'complaint' && entityId) return 'Denuncia'
  if (entityType === 'sst' && entityId) return 'Registro SST'
  if (entityType === 'document' && entityId) return 'Documento abierto'
  return hub.label
}

/**
 * Hook principal: devuelve el contexto de la página actual.
 * Reactivo a cambios de pathname. Sin fetch — solo parsing de la ruta.
 */
export function usePageContext(): PageContext {
  const pathname = usePathname() ?? '/dashboard'
  const rawParams = useParams() ?? {}
  // useParams can return undefined keys; cast to strict record for our helper
  const params = rawParams as Record<string, string | string[] | undefined>

  return useMemo(() => {
    const hub = resolveActiveHub(pathname)
    const entity = detectEntity(pathname, params)
    return {
      hub,
      pathname,
      entityId: entity.id,
      entityType: entity.type,
      humanLabel: humanLabelFor(entity.type, entity.id, hub),
      suggestions: buildSuggestions(entity.type, hub.key),
    }
  }, [pathname, params])
}

/**
 * Mapa de iconos → componentes Lucide. Usado por sidebar y command palette.
 * Import mapping — lo centralizamos aquí para que ambos compartan la misma fuente.
 */
export { NAV_HUBS }
