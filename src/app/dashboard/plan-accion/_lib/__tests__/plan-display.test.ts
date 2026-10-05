import { describe, it, expect } from 'vitest'
import { ROUTES } from '@/lib/alerts/alert-actions'
import {
  DEFAULT_PLAN_FILTERS,
  SEVERITY_LABELS,
  countExtraFilters,
  friendlyError,
  friendlyHttpError,
  hasActiveFilters,
  matchesPlanFilters,
  matchesTimeFilter,
  normalizeSearch,
  planAreaLabel,
  planWhyItMatters,
  planWorkerName,
  resolvePlanAction,
  type PlanItemRef,
} from '../plan-display'
import { parseAlertWorkerIds, parseTaskLegalBasis } from '../plan-enrichment'

function item(overrides: Partial<PlanItemRef> = {}): PlanItemRef {
  return {
    source: 'task',
    severity: 'HIGH',
    area: 'contratos_registro',
    title: 'Registrar contratos a plazo fijo',
    description: null,
    routeHref: '/dashboard/contratos',
    routeLabel: 'Ir a contratos',
    lane: 'week',
    assignedTo: null,
    evidenceCount: 0,
    ...overrides,
  }
}

describe('matchesTimeFilter (horizontes acumulativos)', () => {
  it('"Hoy" solo incluye lo de hoy o vencido', () => {
    expect(matchesTimeFilter('today', 'today')).toBe(true)
    expect(matchesTimeFilter('week', 'today')).toBe(false)
  })
  it('"Esta semana" incluye lo de hoy', () => {
    expect(matchesTimeFilter('today', 'week')).toBe(true)
    expect(matchesTimeFilter('week', 'week')).toBe(true)
    expect(matchesTimeFilter('month', 'week')).toBe(false)
  })
  it('"Este mes" incluye lo de la semana, pero no lo de más adelante', () => {
    expect(matchesTimeFilter('week', 'month')).toBe(true)
    expect(matchesTimeFilter('backlog', 'month')).toBe(false)
    expect(matchesTimeFilter('backlog', 'all')).toBe(true)
  })
})

describe('matchesPlanFilters', () => {
  it('busca sin importar tildes ni mayúsculas, también por área legible', () => {
    const training = item({ source: 'training', area: 'SST', title: 'Capacitación pendiente: Inducción SST' })
    expect(matchesPlanFilters(training, { ...DEFAULT_PLAN_FILTERS, query: 'capacitacion' })).toBe(true)
    expect(matchesPlanFilters(training, { ...DEFAULT_PLAN_FILTERS, query: 'seguridad y salud' })).toBe(true)
    expect(matchesPlanFilters(training, { ...DEFAULT_PLAN_FILTERS, query: 'vacaciones' })).toBe(false)
  })

  it('combina tipo, urgencia, plazo y avance', () => {
    const task = item({ severity: 'CRITICAL', lane: 'today', assignedTo: '' })
    expect(matchesPlanFilters(task, { ...DEFAULT_PLAN_FILTERS, source: 'task', severity: 'CRITICAL', time: 'today', progress: 'unassigned' })).toBe(true)
    expect(matchesPlanFilters(task, { ...DEFAULT_PLAN_FILTERS, source: 'alert' })).toBe(false)
    expect(matchesPlanFilters(task, { ...DEFAULT_PLAN_FILTERS, progress: 'ready_to_close' })).toBe(false)
  })

  it('cuenta los filtros escondidos en "Más filtros"', () => {
    expect(countExtraFilters(DEFAULT_PLAN_FILTERS)).toBe(0)
    expect(hasActiveFilters(DEFAULT_PLAN_FILTERS)).toBe(false)
    expect(countExtraFilters({ ...DEFAULT_PLAN_FILTERS, source: 'alert', progress: 'unassigned' })).toBe(2)
    expect(hasActiveFilters({ ...DEFAULT_PLAN_FILTERS, query: '  ' })).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_PLAN_FILTERS, time: 'week' })).toBe(true)
  })
})

describe('normalizeSearch', () => {
  it('quita tildes y pasa a minúsculas', () => {
    expect(normalizeSearch('  Inducción SST ')).toBe('induccion sst')
  })
})

describe('planAreaLabel', () => {
  it('tareas: nombre legible con tildes (nunca el código en mayúsculas)', () => {
    expect(planAreaLabel({ source: 'task', area: 'igualdad_nodiscriminacion' })).toBe('Igualdad y no discriminación')
    expect(planAreaLabel({ source: 'task', area: 'area_nueva_rara' })).toBe('Area nueva rara')
  })
  it('alertas: área según el tipo', () => {
    expect(planAreaLabel({ source: 'alert', area: 'DOCUMENTO_FALTANTE' })).toBe('Legajo del trabajador')
    expect(planAreaLabel({ source: 'alert', area: 'CONTRATO_POR_VENCER' })).toBe('Contratos')
    expect(planAreaLabel({ source: 'alert', area: 'EMO_VENCIDO' })).toBe('Seguridad y salud en el trabajo')
  })
  it('capacitaciones: categoría del curso', () => {
    expect(planAreaLabel({ source: 'training', area: 'HOSTIGAMIENTO' })).toBe('Prevención del hostigamiento sexual')
  })
})

describe('planWhyItMatters', () => {
  it('alertas: usa el texto del mapeo compartido', () => {
    const why = planWhyItMatters({ source: 'alert', area: 'CONTRATO_VENCIDO', title: 'Contrato vencido' })
    expect(why?.kind).toBe('why')
    expect(why?.text).toContain('indefinido')
  })
  it('tareas: muestra la base legal solo si existe', () => {
    expect(planWhyItMatters(item(), { baseLegal: 'D.Leg. 728, Art. 4' })).toEqual({
      kind: 'law',
      label: 'Base legal',
      text: 'D.Leg. 728, Art. 4',
    })
    expect(planWhyItMatters(item(), { baseLegal: '  ' })).toBeNull()
    expect(planWhyItMatters(item())).toBeNull()
  })
  it('capacitaciones: siempre explica por qué guardar la constancia', () => {
    expect(planWhyItMatters({ source: 'training', area: 'SST', title: 'x' })?.text).toContain('Ley 29783')
    expect(planWhyItMatters({ source: 'training', area: 'GENERAL', title: 'x' })?.text).toContain('constancia')
  })
})

describe('resolvePlanAction (mismo mapeo que Alertas)', () => {
  const alert = item({
    source: 'alert',
    area: 'DOCUMENTO_FALTANTE',
    title: 'Falta DNI',
    routeHref: '/dashboard/alertas?focus=a1',
    routeLabel: 'Resolver alerta',
  })

  it('alerta con trabajador conocido → pestaña exacta de su ficha', () => {
    expect(resolvePlanAction(alert, 'w1')).toEqual({
      href: '/dashboard/trabajadores/w1?tab=legajo',
      label: 'Ir a: Legajo del trabajador',
      destination: 'Legajo del trabajador',
    })
  })

  it('alerta de ficha sin trabajador conocido → ruta de la API (no la lista genérica)', () => {
    expect(resolvePlanAction(alert, null)).toMatchObject({ href: '/dashboard/alertas?focus=a1', destination: null })
  })

  it('alerta que se corrige en otra pantalla → no necesita trabajador', () => {
    const cts = { ...alert, area: 'CTS_PENDIENTE', title: 'Depósito CTS de noviembre' }
    expect(resolvePlanAction(cts, null)).toMatchObject({ href: ROUTES.calculadoraCts })
  })

  it('tareas y capacitaciones → ruta que ya calcula la API', () => {
    expect(resolvePlanAction(item())).toEqual({ href: '/dashboard/contratos', label: 'Ir a contratos', destination: null })
  })
})

describe('planWorkerName', () => {
  it('oculta el trabajador de referencia en alertas de toda la empresa', () => {
    expect(planWorkerName({ source: 'alert', area: 'IPERC_VENCIDO', title: 'x', workerName: 'Ana Pérez' })).toBeNull()
    expect(planWorkerName({ source: 'alert', area: 'DOCUMENTO_FALTANTE', title: 'x', workerName: 'Ana Pérez' })).toBe('Ana Pérez')
    expect(planWorkerName({ source: 'task', area: 'sst', title: 'x' })).toBeNull()
  })
})

describe('mensajes de error', () => {
  it('traduce códigos HTTP y respeta los mensajes de validación del servidor', () => {
    expect(friendlyHttpError(401)).toContain('sesión')
    expect(friendlyHttpError(500, 'Failed to update task')).not.toContain('Failed')
    expect(friendlyHttpError(400, 'Adjunta evidencia antes de cerrar esta acción')).toBe(
      'Adjunta evidencia antes de cerrar esta acción',
    )
    expect(friendlyHttpError(502, null, 'No pudimos subir el archivo.')).toBe('No pudimos subir el archivo.')
  })
  it('un fallo de red se explica como falta de conexión', () => {
    expect(friendlyError(new TypeError('Failed to fetch'), 'x')).toContain('conexión')
    expect(friendlyError(new Error('Detalle claro'), 'x')).toBe('Detalle claro')
    expect(friendlyError('raro', 'Texto por defecto')).toBe('Texto por defecto')
  })
})

describe('SEVERITY_LABELS', () => {
  it('usa "Urgente" como en Alertas', () => {
    expect(SEVERITY_LABELS.CRITICAL).toBe('Urgente')
  })
})

describe('plan-enrichment', () => {
  it('lee la base legal de las tareas, ignorando datos raros', () => {
    expect(
      parseTaskLegalBasis({ tasks: [{ id: 't1', baseLegal: ' Ley 29783 ' }, { id: 't2', baseLegal: null }, 'x'] }),
    ).toEqual({ t1: 'Ley 29783' })
    expect(parseTaskLegalBasis(null)).toEqual({})
  })
  it('lee el trabajador de cada alerta', () => {
    expect(parseAlertWorkerIds({ data: [{ id: 'a1', workerId: 'w1' }, { id: 'a2' }] })).toEqual({ a1: 'w1' })
    expect(parseAlertWorkerIds({ error: 'x' })).toEqual({})
  })
})
