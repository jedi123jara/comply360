import { describe, expect, it } from 'vitest'
import type { StartRouteProgress } from '@/lib/cockpit/data'
import {
  buildCelebration,
  buildStartRoute,
  doneStepKeys,
  joinSpanish,
  newlyCompletedSteps,
  parseCelebrated,
  serializeCelebrated,
  type StartRouteInput,
} from '../start-route'

function progress(overrides: Partial<StartRouteProgress> = {}): StartRouteProgress {
  return {
    orgMissingFields: [],
    resolvedTasks: 0,
    resolvedAlerts: 0,
    multaReducida: 0,
    openAlerts: 0,
    legajoDocs: 0,
    legajoWorker: null,
    ...overrides,
  }
}

function input(overrides: Partial<StartRouteInput> = {}, progressOverrides: Partial<StartRouteProgress> = {}): StartRouteInput {
  return {
    progress: progress(progressOverrides),
    totalWorkers: 0,
    diagnosticScore: null,
    hasDiagnostic: false,
    openTasks: 0,
    focusHref: null,
    ...overrides,
  }
}

const statusOf = (route: ReturnType<typeof buildStartRoute>) =>
  Object.fromEntries(route.steps.map((step) => [step.key, step.done]))

describe('buildStartRoute', () => {
  it('empresa recién creada: solo los datos de empresa están hechos', () => {
    const route = buildStartRoute(input())
    expect(statusOf(route)).toEqual({
      empresa: true,
      trabajadores: false,
      diagnostico: false,
      pendiente: false,
      legajo: false,
    })
    expect(route.doneCount).toBe(1)
    expect(route.total).toBe(5)
    expect(route.complete).toBe(false)
    expect(route.nextStep?.key).toBe('diagnostico')
  })

  it('lista lo que falta de la empresa y la propone como siguiente paso', () => {
    const route = buildStartRoute(input({}, { orgMissingFields: ['RUC', 'sector'] }))
    const empresa = route.steps[0]
    expect(empresa.done).toBe(false)
    expect(empresa.detail).toBe('Falta: RUC y sector.')
    expect(route.nextStep?.key).toBe('empresa')
  })

  it('ya no se pierde el diagnóstico al registrar el primer trabajador', () => {
    const route = buildStartRoute(input({ totalWorkers: 1 }))
    expect(statusOf(route).trabajadores).toBe(true)
    expect(statusOf(route).diagnostico).toBe(false)
    expect(route.nextStep?.key).toBe('diagnostico')
  })

  it('bloquea el legajo sin trabajadores y el pendiente sin nada que resolver', () => {
    const route = buildStartRoute(input())
    const pendiente = route.steps.find((step) => step.key === 'pendiente')!
    const legajo = route.steps.find((step) => step.key === 'legajo')!
    expect(legajo.blockedBy).toBe('Primero registra a un trabajador.')
    expect(pendiente.blockedBy).toMatch(/diagnóstico/)
  })

  it('el pendiente lleva directo a la acción más urgente cuando existe', () => {
    const route = buildStartRoute(
      input({ totalWorkers: 2, hasDiagnostic: true, openTasks: 3, focusHref: '/dashboard/sst' }, { openAlerts: 1 })
    )
    const pendiente = route.steps.find((step) => step.key === 'pendiente')!
    expect(pendiente.blockedBy).toBeNull()
    expect(pendiente.href).toBe('/dashboard/sst')
    expect(pendiente.detail).toBe('Tienes 4 pendientes por resolver.')
  })

  it('cuenta tareas completadas y alertas resueltas como pendientes resueltos, con la multa reducida', () => {
    const route = buildStartRoute(
      input({ totalWorkers: 2, hasDiagnostic: true }, { resolvedTasks: 1, resolvedAlerts: 1, multaReducida: 4950 })
    )
    const pendiente = route.steps.find((step) => step.key === 'pendiente')!
    expect(pendiente.done).toBe(true)
    expect(pendiente.detail).toBe('2 pendientes resueltos: bajaste tu exposición en S/ 4,950.')
  })

  it('el legajo apunta a la pestaña Legajo del trabajador más avanzado', () => {
    const route = buildStartRoute(
      input({ totalWorkers: 1 }, { legajoDocs: 3, legajoWorker: { id: 'w1', name: 'Ana Pérez', legajoScore: 17 } })
    )
    const legajo = route.steps.find((step) => step.key === 'legajo')!
    expect(legajo.done).toBe(true)
    expect(legajo.href).toBe('/dashboard/trabajadores/w1?tab=legajo')
    expect(legajo.detail).toBe('3 documentos subidos. El legajo de Ana Pérez va en 17%.')
  })

  it('ruta completa con los cinco pasos hechos', () => {
    const route = buildStartRoute(
      input(
        { totalWorkers: 3, hasDiagnostic: true, diagnosticScore: 72 },
        { resolvedTasks: 1, legajoDocs: 1, legajoWorker: { id: 'w1', name: 'Ana', legajoScore: 6 } }
      )
    )
    expect(route.complete).toBe(true)
    expect(route.doneCount).toBe(5)
    expect(route.nextStep).toBeNull()
  })
})

describe('celebraciones', () => {
  it('sin marca previa no celebra nada (no sabemos si se acaba de completar)', () => {
    const route = buildStartRoute(input({ totalWorkers: 2 }))
    expect(newlyCompletedSteps(route, null)).toEqual([])
  })

  it('celebra solo los pasos hechos que no estaban celebrados', () => {
    const route = buildStartRoute(input({ totalWorkers: 2, hasDiagnostic: true }))
    expect(newlyCompletedSteps(route, new Set(['empresa', 'trabajadores']))).toEqual(['diagnostico'])
    expect(newlyCompletedSteps(route, new Set(doneStepKeys(route)))).toEqual([])
  })

  it('el mensaje del pendiente usa la multa real si existe, y no inventa cifra si no', () => {
    const conMulta = input({ totalWorkers: 1, hasDiagnostic: true }, { resolvedTasks: 1, multaReducida: 2475.4 })
    const routeConMulta = buildStartRoute(conMulta)
    expect(buildCelebration(['pendiente'], routeConMulta, conMulta)).toEqual({
      keys: ['pendiente'],
      title: 'Resolviste tu primer pendiente',
      detail: 'Bajaste tu exposición a multas en S/ 2,475.',
    })

    const sinMulta = input({ totalWorkers: 1, hasDiagnostic: true }, { resolvedAlerts: 1 })
    const celebration = buildCelebration(['pendiente'], buildStartRoute(sinMulta), sinMulta)
    expect(celebration?.detail).not.toMatch(/S\//)
  })

  it('varios pasos a la vez: un solo mensaje, del más avanzado, nombrando los demás', () => {
    const data = input({ totalWorkers: 1, hasDiagnostic: true, diagnosticScore: 64 })
    const route = buildStartRoute(data)
    const celebration = buildCelebration(['trabajadores', 'diagnostico'], route, data)
    expect(celebration?.keys).toEqual(['diagnostico', 'trabajadores'])
    expect(celebration?.title).toBe('Registraste a tu primer trabajador')
    expect(celebration?.detail).toBe(
      'Desde hoy vigilamos sus contratos, vacaciones y vencimientos. También completaste: el diagnóstico.'
    )
  })

  it('primer trabajador vs. varios trabajadores', () => {
    const uno = input({ totalWorkers: 1 })
    expect(buildCelebration(['trabajadores'], buildStartRoute(uno), uno)?.title).toBe('Registraste a tu primer trabajador')
    const varios = input({ totalWorkers: 12 })
    expect(buildCelebration(['trabajadores'], buildStartRoute(varios), varios)?.title).toBe(
      'Registraste a tus primeros 12 trabajadores'
    )
  })

  it('sin pasos nuevos no hay mensaje', () => {
    const data = input()
    expect(buildCelebration([], buildStartRoute(data), data)).toBeNull()
  })
})

describe('marca de "ya celebré"', () => {
  it('ignora valores corruptos o desconocidos', () => {
    expect(parseCelebrated(null)).toBeNull()
    expect(parseCelebrated('no-es-json')).toEqual(new Set())
    expect(parseCelebrated('{"a":1}')).toEqual(new Set())
    expect(parseCelebrated('["empresa","hackeo",3]')).toEqual(new Set(['empresa']))
  })

  it('serializa en el orden de la ruta y sin duplicados', () => {
    expect(serializeCelebrated(['legajo', 'empresa', 'legajo'])).toBe('["empresa","legajo"]')
  })
})

describe('joinSpanish', () => {
  it('une listas con comas y "y"', () => {
    expect(joinSpanish([])).toBe('')
    expect(joinSpanish(['RUC'])).toBe('RUC')
    expect(joinSpanish(['RUC', 'sector'])).toBe('RUC y sector')
    expect(joinSpanish(['RUC', 'sector', 'régimen laboral'])).toBe('RUC, sector y régimen laboral')
  })
})
