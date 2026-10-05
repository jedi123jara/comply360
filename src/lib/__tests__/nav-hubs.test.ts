import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import path from 'node:path'
import {
  CALCULATOR_TYPES,
  NAV_HUBS,
  NAV_URL_ONLY_ROUTES,
  buildNavBreadcrumbs,
  navHrefMatches,
  resolveActiveHub,
  resolveNavLocation,
} from '@/lib/constants'

/** Ruta del dashboard → page.tsx que debería existir. */
function pageFileFor(href: string): string {
  return path.resolve(__dirname, '../../app', `.${href}`, 'page.tsx')
}

const hub = (key: string) => NAV_HUBS.find((h) => h.key === key)!
const visibleHrefs = (key: string) => hub(key).items.filter((i) => !i.hidden).map((i) => i.href)
const allItems = NAV_HUBS.flatMap((h) => h.items.map((item) => ({ ...item, hubKey: h.key })))
const labels = (pathname: string) => buildNavBreadcrumbs(pathname).map((c) => c.label)

describe('NAV_HUBS / estructura por tareas', () => {
  it('tiene 7 grupos, en orden y con nombres del cliente', () => {
    expect(NAV_HUBS.map((h) => [h.key, h.label])).toEqual([
      ['cockpit', 'Inicio'],
      ['equipo', 'Mi personal'],
      ['planilla', 'Planilla y pagos'],
      ['contratos-docs', 'Contratos y documentos'],
      ['riesgo', 'Inspección SUNAFIL'],
      ['sst', 'Seguridad y salud (SST)'],
      ['config', 'Ajustes y ayuda'],
    ])
  })

  it('cada grupo tiene ícono, ruta raíz, descripción y al menos un ítem visible', () => {
    for (const h of NAV_HUBS) {
      expect(h.icon).toBeTruthy()
      expect(h.rootHref).toMatch(/^\/dashboard/)
      expect(h.description.length).toBeGreaterThan(10)
      expect(h.items.some((i) => !i.hidden)).toBe(true)
    }
  })

  it('las llaves de grupos son únicas', () => {
    const keys = NAV_HUBS.map((h) => h.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('cada href aparece una sola vez (menú, ocultos y solo-URL)', () => {
    const hrefs = [...allItems.map((i) => i.href), ...NAV_URL_ONLY_ROUTES.map((r) => r.href)]
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('toda página listada existe (no hay enlaces rotos)', () => {
    for (const item of allItems) {
      expect(existsSync(pageFileFor(item.href)), `${item.href} no tiene page.tsx`).toBe(true)
    }
    for (const route of NAV_URL_ONLY_ROUTES) {
      if (route.hasPage === false) continue
      expect(existsSync(pageFileFor(route.href)), `${route.href} no tiene page.tsx`).toBe(true)
    }
  })

  it('la ruta raíz de cada grupo es una de sus páginas', () => {
    for (const h of NAV_HUBS) {
      expect(h.items.map((i) => i.href)).toContain(h.rootHref)
    }
  })

  it('Inicio: Resumen, Pendientes y Calendario', () => {
    expect(visibleHrefs('cockpit')).toEqual([
      '/dashboard',
      '/dashboard/plan-accion',
      '/dashboard/calendario',
    ])
  })

  it('Mi personal incluye locadores con honorarios y terceros como secundarios', () => {
    const items = hub('equipo').items.filter((i) => !i.hidden)
    const hrefs = items.map((i) => i.href)
    expect(hrefs).toContain('/dashboard/trabajadores')
    expect(hrefs).toContain('/dashboard/capacitaciones')
    expect(hrefs).toContain('/dashboard/relaciones-colectivas')
    const prestadores = hrefs.indexOf('/dashboard/prestadores')
    expect(hrefs.slice(prestadores + 1, prestadores + 3)).toEqual([
      '/dashboard/honorarios',
      '/dashboard/terceros',
    ])
    expect(items.filter((i) => i.secondary).map((i) => i.href)).toEqual([
      '/dashboard/honorarios',
      '/dashboard/terceros',
    ])
  })

  it('Planilla y pagos: planilla, boletas, liquidaciones y calculadoras', () => {
    expect(visibleHrefs('planilla')).toEqual([
      '/dashboard/planilla',
      '/dashboard/boletas',
      '/dashboard/liquidaciones',
      '/dashboard/calculadoras',
    ])
  })

  it('Inspección SUNAFIL: 5 tareas, de "¿Estoy listo?" a "Inspección en curso"', () => {
    expect(visibleHrefs('riesgo')).toEqual([
      '/dashboard/diagnostico',
      '/dashboard/simulacro',
      '/dashboard/sunafil-ready',
      '/dashboard/riesgo-laboral',
      '/dashboard/inspeccion-en-vivo',
    ])
  })

  it('SST muestra como máximo 7 ítems y el resto queda fuera del menú', () => {
    const visible = visibleHrefs('sst')
    expect(visible.length).toBeLessThanOrEqual(7)
    expect(visible[0]).toBe('/dashboard/sst')
    for (const href of [
      '/dashboard/sst/sedes',
      '/dashboard/sst/visitas',
      '/dashboard/sst/comite/elecciones',
      '/dashboard/sst/onboarding',
      '/dashboard/sst/score',
      '/dashboard/sst/memoria-anual',
      '/dashboard/sst/pets-petar-ats',
    ]) {
      expect(visible).not.toContain(href)
    }
  })

  it('ARCO pasa a Ajustes como "Privacidad de datos"', () => {
    const arco = hub('config').items.find((i) => i.href === '/dashboard/sst/arco')
    expect(arco?.label).toBe('Privacidad de datos (ARCO)')
    expect(arco?.hidden).toBeFalsy()
    expect(visibleHrefs('sst')).not.toContain('/dashboard/sst/arco')
  })

  it('saca del menú y del buscador lo experimental, lo duplicado y lo que redirige', () => {
    const listed = allItems.map((i) => i.href)
    for (const href of [
      '/dashboard/teletrabajo',
      '/dashboard/casilla-sunafil',
      '/dashboard/gamificacion',
      '/dashboard/configuracion/marca-blanca',
      '/dashboard/configuracion/automatizaciones/agentes',
      '/dashboard/configuracion/automatizaciones/workflows',
      '/dashboard/marketplace',
      '/dashboard/api-docs',
      '/dashboard/certificacion',
      '/dashboard/expedientes',
      '/dashboard/ia-laboral',
      '/dashboard/configuracion/integraciones',
      '/dashboard/configuracion/facturacion',
    ]) {
      expect(listed, href).not.toContain(href)
    }
  })

  it('las páginas ocultas apuntan a un padre visible del mismo grupo', () => {
    for (const h of NAV_HUBS) {
      const visible = new Set(h.items.filter((i) => !i.hidden).map((i) => i.href))
      for (const item of h.items) {
        if (!item.parentHref) continue
        expect(item.hidden, `${item.href} tiene padre pero no está oculto`).toBe(true)
        expect(visible.has(item.parentHref), `${item.href} → ${item.parentHref}`).toBe(true)
      }
    }
    for (const route of NAV_URL_ONLY_ROUTES) {
      expect(NAV_HUBS.some((h) => h.key === route.hubKey), route.href).toBe(true)
      if (route.parentHref) {
        expect(visibleHrefs(route.hubKey), route.href).toContain(route.parentHref)
      }
    }
  })

  it('todo ítem con sigla entre paréntesis explica la sigla en su ayuda', () => {
    for (const item of allItems) {
      if (/\([A-ZÁÉÍÓÚ]{2,}/.test(item.label)) {
        expect(item.hint, `${item.label} necesita hint`).toBeTruthy()
      }
    }
  })

  it('los ítems visibles con nombre técnico llevan ayuda en lenguaje simple', () => {
    const visibles = allItems.filter((i) => !i.hidden)
    const sinAyuda = visibles.filter((i) => !i.hint).map((i) => i.href)
    expect(sinAyuda).toEqual([])
  })

  it('no quedan nombres internos ni voseo en el menú', () => {
    const textos = [
      ...NAV_HUBS.flatMap((h) => [h.label, h.description]),
      ...allItems.flatMap((i) => [i.label, i.hint ?? '']),
    ].join(' | ')
    expect(textos).not.toMatch(/Field audit|Workflows|SUNAFIL-Ready|Generadores IA|Tareas de compliance|\bConfig\b/)
    expect(textos).not.toMatch(/\b(tenés|podés|querés|hacé|fijate|mirá|decime|sabés|andá|dejá)\b/i)
  })
})

describe('resolveNavLocation — un solo ítem activo', () => {
  it('la coincidencia más específica gana (sin doble activo)', () => {
    expect(resolveNavLocation('/dashboard/sst').activeHref).toBe('/dashboard/sst')
    expect(resolveNavLocation('/dashboard/sst/emo').activeHref).toBe('/dashboard/sst/emo')
    expect(resolveNavLocation('/dashboard/sst/emo/nuevo').activeHref).toBe('/dashboard/sst/emo')
    expect(resolveNavLocation('/dashboard/configuracion/empresa').activeHref).toBe(
      '/dashboard/configuracion/empresa'
    )
    const plantillas = resolveNavLocation('/dashboard/configuracion/empresa/plantillas/abc123')
    expect(plantillas.hub.key).toBe('contratos-docs')
    expect(plantillas.activeHref).toBe('/dashboard/configuracion/empresa/plantillas')
  })

  it('solo /dashboard exacto ilumina Resumen', () => {
    expect(resolveNavLocation('/dashboard').activeHref).toBe('/dashboard')
    expect(resolveNavLocation('/dashboard/trabajadores').activeHref).toBe('/dashboard/trabajadores')
    expect(resolveNavLocation('/dashboard/no-existe').activeHref).toBeNull()
  })

  it('respeta los límites de segmento (/sst/iperc no captura /sst/iperc-bases)', () => {
    expect(navHrefMatches('/dashboard/sst/iperc-bases/x', '/dashboard/sst/iperc')).toBe(false)
    expect(navHrefMatches('/dashboard/sst/iperc/x', '/dashboard/sst/iperc')).toBe(true)
    // La matriz IPERC (solo URL) ilumina "Riesgos por puesto".
    const matriz = resolveNavLocation('/dashboard/sst/iperc-bases/clx123abc456')
    expect(matriz.hub.key).toBe('sst')
    expect(matriz.activeHref).toBe('/dashboard/sst/iperc')
  })

  it('una página oculta ilumina a su padre visible', () => {
    expect(resolveNavLocation('/dashboard/sst/sedes/abc123def456').activeHref).toBe('/dashboard/sst')
    expect(resolveNavLocation('/dashboard/sst/comite/elecciones').activeHref).toBe('/dashboard/sst/comite')
    expect(resolveNavLocation('/dashboard/sst/pets-petar-ats').activeHref).toBe('/dashboard/sst/iperc')
    expect(resolveNavLocation('/dashboard/alertas').activeHref).toBe('/dashboard/plan-accion')
  })

  it('una página oculta sin padre no ilumina nada, pero abre su grupo', () => {
    const reportes = resolveNavLocation('/dashboard/reportes')
    expect(reportes.hub.key).toBe('cockpit')
    expect(reportes.activeHref).toBeNull()
    const teletrabajo = resolveNavLocation('/dashboard/teletrabajo')
    expect(teletrabajo.hub.key).toBe('equipo')
    expect(teletrabajo.activeHref).toBeNull()
  })
})

describe('resolveActiveHub', () => {
  it('/dashboard y sus pendientes van a Inicio', () => {
    expect(resolveActiveHub('/dashboard').key).toBe('cockpit')
    expect(resolveActiveHub('/dashboard/plan-accion').key).toBe('cockpit')
    expect(resolveActiveHub('/dashboard/calendario').key).toBe('cockpit')
    expect(resolveActiveHub('/dashboard/alertas').key).toBe('cockpit')
    expect(resolveActiveHub('/dashboard/decisiones/contratar').key).toBe('cockpit')
  })

  it('personal, locadores y capacitaciones van a Mi personal', () => {
    expect(resolveActiveHub('/dashboard/trabajadores/abc123').key).toBe('equipo')
    expect(resolveActiveHub('/dashboard/prestadores/nuevo').key).toBe('equipo')
    expect(resolveActiveHub('/dashboard/honorarios').key).toBe('equipo')
    expect(resolveActiveHub('/dashboard/capacitaciones/curso-x').key).toBe('equipo')
    expect(resolveActiveHub('/dashboard/terceros/sindical').key).toBe('equipo')
    expect(resolveActiveHub('/dashboard/configuracion/asistencia').key).toBe('equipo')
  })

  it('planilla, boletas y calculadoras van a Planilla y pagos', () => {
    expect(resolveActiveHub('/dashboard/planilla').key).toBe('planilla')
    expect(resolveActiveHub('/dashboard/boletas').key).toBe('planilla')
    expect(resolveActiveHub('/dashboard/calculadoras/cts').key).toBe('planilla')
  })

  it('contratos, documentos y generadores van a Contratos y documentos', () => {
    expect(resolveActiveHub('/dashboard/contratos').key).toBe('contratos-docs')
    expect(resolveActiveHub('/dashboard/documentos').key).toBe('contratos-docs')
    expect(resolveActiveHub('/dashboard/documentos-firma').key).toBe('contratos-docs')
    expect(resolveActiveHub('/dashboard/generadores/politica-sst').key).toBe('contratos-docs')
  })

  it('todo lo de SUNAFIL va a Inspección SUNAFIL', () => {
    expect(resolveActiveHub('/dashboard/centro-sunafil').key).toBe('riesgo')
    expect(resolveActiveHub('/dashboard/diagnostico/abc123/resultado').key).toBe('riesgo')
    expect(resolveActiveHub('/dashboard/simulacro').key).toBe('riesgo')
    expect(resolveActiveHub('/dashboard/sunafil-ready').key).toBe('riesgo')
    expect(resolveActiveHub('/dashboard/cumplimiento-documental').key).toBe('riesgo')
    expect(resolveActiveHub('/dashboard/inspeccion-en-vivo/abc123').key).toBe('riesgo')
    expect(resolveActiveHub('/dashboard/casilla-sunafil').key).toBe('riesgo')
  })

  it('/dashboard/sst y sus subrutas van a SST, salvo ARCO', () => {
    expect(resolveActiveHub('/dashboard/sst').key).toBe('sst')
    expect(resolveActiveHub('/dashboard/sst/sedes').key).toBe('sst')
    expect(resolveActiveHub('/dashboard/sst/comite/elecciones').key).toBe('sst')
    expect(resolveActiveHub('/dashboard/sst/iperc').key).toBe('sst')
    expect(resolveActiveHub('/dashboard/sst/arco').key).toBe('config')
  })

  it('ajustes, plan y automatizaciones van a Ajustes y ayuda', () => {
    expect(resolveActiveHub('/dashboard/configuracion').key).toBe('config')
    expect(resolveActiveHub('/dashboard/planes').key).toBe('config')
    expect(resolveActiveHub('/dashboard/integraciones').key).toBe('config')
    expect(resolveActiveHub('/dashboard/ayuda').key).toBe('config')
    expect(resolveActiveHub('/dashboard/configuracion/facturacion').key).toBe('config')
    expect(resolveActiveHub('/dashboard/configuracion/automatizaciones/agentes').key).toBe('config')
    expect(resolveActiveHub('/dashboard/configuracion/automatizaciones/workflows').key).toBe('config')
  })

  it('ruta desconocida retorna Inicio como respaldo', () => {
    expect(resolveActiveHub('/foo/bar').key).toBe('cockpit')
  })
})

describe('buildNavBreadcrumbs', () => {
  it('grupo › página', () => {
    expect(labels('/dashboard')).toEqual(['Inicio', 'Resumen'])
    expect(labels('/dashboard/trabajadores')).toEqual(['Mi personal', 'Trabajadores'])
    expect(labels('/dashboard/sst/emo')).toEqual(['Seguridad y salud (SST)', 'Exámenes médicos (EMO)'])
  })

  it('grupo › página › subpágina con título legible', () => {
    expect(labels('/dashboard/trabajadores/clx9abc123def/editar')).toEqual([
      'Mi personal',
      'Trabajadores',
      'Detalle',
      'Editar',
    ])
    expect(labels('/dashboard/calculadoras/horas-extras')).toEqual([
      'Planilla y pagos',
      'Calculadoras',
      'Horas extras',
    ])
    expect(labels('/dashboard/capacitaciones/curso-x')).toEqual([
      'Mi personal',
      'Capacitaciones',
      'Curso x',
    ])
  })

  it('las páginas ocultas muestran a su padre como paso previo', () => {
    expect(labels('/dashboard/sst/sedes')).toEqual(['Seguridad y salud (SST)', 'Resumen', 'Sedes de trabajo'])
    expect(labels('/dashboard/configuracion/facturacion')).toEqual([
      'Ajustes y ayuda',
      'Plan y pago',
      'Facturación',
    ])
  })

  it('los niveles sin página propia no son enlace', () => {
    const crumbs = buildNavBreadcrumbs('/dashboard/configuracion/automatizaciones/workflows')
    expect(crumbs.map((c) => c.label)).toEqual(['Ajustes y ayuda', 'Automatizaciones', 'Flujos automáticos'])
    expect(crumbs[1].href).toBeNull()
    expect(crumbs[2].href).toBe('/dashboard/configuracion/automatizaciones/workflows')
  })

  it('acepta nombres externos para subpáginas (asistentes guiados)', () => {
    const crumbs = buildNavBreadcrumbs('/dashboard/decisiones/contratar', (_s, href) =>
      href === '/dashboard/decisiones/contratar' ? 'Contratar a alguien' : undefined
    )
    expect(crumbs.map((c) => c.label)).toEqual(['Inicio', '¿Qué quieres hacer?', 'Contratar a alguien'])
  })

  it('cada miga enlazable apunta a una ruta del mismo camino', () => {
    const pathname = '/dashboard/sst/emo/clx9abc123def'
    for (const crumb of buildNavBreadcrumbs(pathname)) {
      if (crumb.href) expect(pathname.startsWith(crumb.href)).toBe(true)
    }
  })
})

describe('CALCULATOR_TYPES — textos con tildes', () => {
  it('no quedan palabras sin tilde en nombres ni descripciones', () => {
    const textos = CALCULATOR_TYPES.flatMap((c) => [c.label, c.description]).join(' ')
    expect(textos).not.toMatch(
      /\b(Liquidacion|Gratificacion|Indemnizacion|Calculo|Compensacion|Estimacion|bonificacion|indemnizacion|segun|tamano|record)\b/
    )
    expect(textos).toContain('Liquidación')
    expect(textos).toContain('tamaño')
  })
})
