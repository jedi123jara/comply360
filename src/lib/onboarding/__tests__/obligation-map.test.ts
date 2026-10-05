import { describe, expect, it } from 'vitest'
import {
  buildObligationMap,
  calcularMultaReferencia,
  etiquetaRango,
  normalizarRegimen,
  obligacionesPrincipales,
  rangoDeTrabajadores,
  sugerirRegimen,
  tipoEmpresaSunafilPorRegimen,
  UMBRALES_NORMA,
  type ObligationMap,
} from '../obligation-map'
import {
  PERU_LABOR,
  calcularMultaSunafil,
  calcularMultaSunafilSoles,
} from '@/lib/legal-engine/peru-labor'
import { COMITES_OBLIGATORIOS } from '@/lib/orgchart/comites-obligatorios'
import { getTerm, solesCortos } from '@/lib/glossary'

// 5 de octubre de 2026, 10:00 en Lima (UTC-5).
const HOY = new Date('2026-10-05T15:00:00Z')

const ids = (m: ObligationMap) => m.obligaciones.map((o) => o.id)
const get = (m: ObligationMap, id: string) => {
  const o = m.obligaciones.find((x) => x.id === id)
  if (!o) throw new Error(`no está la obligación ${id}`)
  return o
}
const detalleComite = (id: string, workerCount: number) => {
  const c = COMITES_OBLIGATORIOS.find((x) => x.id === id)
  if (!c) throw new Error(id)
  return c.resolve({ workerCount })
}

// ── Perfil 1: microempresa de 5 trabajadores ────────────────────────────────

describe('perfil microempresa (5 trabajadores, MYPE_MICRO)', () => {
  const map = buildObligationMap({ trabajadores: 5, regimen: 'MYPE_MICRO', sector: 'COMERCIO', hoy: HOY })

  it('no incluye CTS ni gratificación y explica por qué', () => {
    expect(ids(map)).not.toContain('cts')
    expect(ids(map)).not.toContain('gratificacion')
    expect(map.noAplican.map((n) => n.id)).toEqual(['cts', 'gratificacion'])
    for (const n of map.noAplican) expect(n.motivo).toMatch(/REMYPE/)
  })

  it('pide Supervisor de SST (no comité), según el catálogo de comités', () => {
    const sst = get(map, 'sst-organo')
    const esperado = detalleComite('sst', 5)
    expect(sst.titulo).toBe(esperado.resolvedTitle)
    expect(sst.comoTeAplica).toBe(esperado.detail)
    expect(sst.glosarioId).toBe('supervisor-sst')
    expect(sst.prioridad).toBe('alta')
    expect(get(map, 'sistema-sst').comoTeAplica).not.toMatch(/reglamento interno/)
  })

  it('hostigamiento usa el detalle del catálogo para menos de 20', () => {
    expect(get(map, 'hostigamiento').comoTeAplica).toBe(detalleComite('hostigamiento', 5).detail)
  })

  it('no incluye obligaciones de empresas más grandes', () => {
    for (const id of ['rit', 'cuota-discapacidad', 'utilidades', 'brigada-emergencia', 'lactario', 'asistenta-social', 'sctr']) {
      expect(ids(map)).not.toContain(id)
    }
  })

  it('vacaciones de 15 días (desde PERU_LABOR)', () => {
    expect(get(map, 'vacaciones').comoTeAplica).toContain(`${PERU_LABOR.MYPE.MICRO.VACACIONES_DIAS} días`)
    expect(get(map, 'vacaciones').dependeDelRegimen).toBe(true)
  })

  it('la planilla es lo primero y su fecha depende del RUC', () => {
    expect(map.obligaciones[0].id).toBe('planilla-electronica')
    const f = get(map, 'planilla-electronica').proximaFecha
    expect(f).not.toBeNull()
    expect(f?.exacta).toBe(false)
    expect(f?.etiqueta).toBe('Octubre de 2026')
    expect(f?.nota).toMatch(/septiembre/)
    expect(f?.nota).toMatch(/RUC/)
  })

  it('multa máxima con la escala de microempresa', () => {
    expect(map.multaMaxima.tipoEmpresa).toBe('MICRO')
    expect(map.multaMaxima.uit).toBe(calcularMultaSunafil('MICRO', 'MUY_GRAVE', 5))
    expect(map.multaMaxima.soles).toBe(calcularMultaSunafilSoles('MICRO', 'MUY_GRAVE', 5))
    expect(map.multaMaxima.texto).toBe(
      `Una sola infracción muy grave podría costar hasta ${solesCortos(map.multaMaxima.soles)}.`,
    )
  })

  it('las 6 principales', () => {
    expect(obligacionesPrincipales(map).map((o) => o.id)).toEqual([
      'planilla-electronica',
      'sst-organo',
      'seguro-vida-ley',
      'hostigamiento',
      'sistema-sst',
      'boletas',
    ])
  })
})

// ── Perfil 2: pequeña empresa de 30 trabajadores ────────────────────────────

describe('perfil pequeña empresa (30 trabajadores, MYPE_PEQUENA)', () => {
  const map = buildObligationMap({ trabajadores: 30, regimen: 'MYPE_PEQUENA', sector: 'SERVICIOS', hoy: HOY })

  it('CTS al 50 % con depósito el 15 de noviembre', () => {
    const cts = get(map, 'cts')
    expect(cts.proximaFecha).toEqual({
      fecha: '2026-11-15',
      exacta: true,
      etiqueta: '15 de noviembre de 2026',
      diasFaltan: 41,
    })
    expect(cts.comoTeAplica).toContain(`${PERU_LABOR.MYPE.PEQUENA.CTS_PORCENTAJE * 100} %`)
    expect(cts.exigencia).toBe('obligatorio')
    expect(cts.dependeDelRegimen).toBe(true)
  })

  it('gratificación al 50 % con pago el 15 de diciembre', () => {
    const g = get(map, 'gratificacion')
    expect(g.proximaFecha?.fecha).toBe('2026-12-15')
    expect(g.proximaFecha?.diasFaltan).toBe(71)
    expect(g.comoTeAplica).toContain(`${PERU_LABOR.MYPE.PEQUENA.GRATIFICACIONES_PORCENTAJE * 100} %`)
  })

  it('Comité paritario de SST + reglamento interno de SST', () => {
    const sst = get(map, 'sst-organo')
    expect(sst.titulo).toBe(detalleComite('sst', 30).resolvedTitle)
    expect(sst.glosarioId).toBe('comite-sst')
    expect(get(map, 'sistema-sst').comoTeAplica).toMatch(/reglamento interno de SST/)
  })

  it('brigada obligatoria; utilidades y lactario según tu caso; sin RIT ni cuota', () => {
    expect(get(map, 'brigada-emergencia').exigencia).toBe('obligatorio')
    expect(get(map, 'utilidades').exigencia).toBe('segun-tu-caso')
    expect(get(map, 'lactario').exigencia).toBe('segun-tu-caso')
    expect(get(map, 'lactario').comoTeAplica).not.toMatch(/[≥<]/)
    expect(ids(map)).not.toContain('asistenta-social')
    expect(ids(map)).not.toContain('rit')
    expect(ids(map)).not.toContain('cuota-discapacidad')
    expect(map.noAplican).toEqual([])
  })

  it('multa máxima con la escala de pequeña empresa', () => {
    expect(map.multaMaxima.tipoEmpresa).toBe('PEQUENA')
    expect(map.multaMaxima.uit).toBe(calcularMultaSunafil('PEQUENA', 'MUY_GRAVE', 30))
    expect(map.multaMaxima.soles).toBe(calcularMultaSunafilSoles('PEQUENA', 'MUY_GRAVE', 30))
  })

  it('las 6 principales, ordenadas por prioridad y fecha', () => {
    expect(obligacionesPrincipales(map).map((o) => o.id)).toEqual([
      'planilla-electronica',
      'cts',
      'gratificacion',
      'sst-organo',
      'seguro-vida-ley',
      'hostigamiento',
    ])
  })
})

// ── Perfil 3: régimen general de 120 trabajadores ───────────────────────────

describe('perfil régimen general (120 trabajadores, GENERAL)', () => {
  const map = buildObligationMap({ trabajadores: 120, regimen: 'GENERAL', sector: 'MANUFACTURA', hoy: HOY })

  it('CTS y gratificación completas y obligatorias', () => {
    expect(get(map, 'cts').exigencia).toBe('obligatorio')
    expect(get(map, 'cts').prioridad).toBe('alta')
    expect(get(map, 'gratificacion').comoTeAplica).toMatch(/sueldo completo/)
  })

  it('incluye RIT (más de 100) y cuota de discapacidad (más de 50)', () => {
    expect(get(map, 'rit').comoTeAplica).toContain(String(UMBRALES_NORMA.RIT_MAS_DE))
    expect(get(map, 'cuota-discapacidad').comoTeAplica).toContain('3 %')
  })

  it('lactario y asistenta social quedan según tu caso (falta el número de mujeres)', () => {
    expect(get(map, 'lactario').exigencia).toBe('segun-tu-caso')
    expect(get(map, 'asistenta-social').exigencia).toBe('segun-tu-caso')
  })

  it('SCTR según tu caso en manufactura', () => {
    expect(get(map, 'sctr').exigencia).toBe('segun-tu-caso')
    expect(get(map, 'sctr').prioridad).toBe('baja')
  })

  it('multa máxima con la escala no MYPE', () => {
    expect(map.multaMaxima.tipoEmpresa).toBe('NO_MYPE')
    expect(map.multaMaxima.uit).toBe(calcularMultaSunafil('NO_MYPE', 'MUY_GRAVE', 120))
    expect(map.multaMaxima.soles).toBe(calcularMultaSunafilSoles('NO_MYPE', 'MUY_GRAVE', 120))
    expect(map.multaMaxima.nota).toMatch(/120 trabajadores/)
  })

  it('las 6 principales', () => {
    expect(obligacionesPrincipales(map).map((o) => o.id)).toEqual([
      'planilla-electronica',
      'cts',
      'gratificacion',
      'sst-organo',
      'seguro-vida-ley',
      'hostigamiento',
    ])
  })
})

// ── Reglas transversales ────────────────────────────────────────────────────

describe('orden, fechas y contenido', () => {
  const perfiles = [
    buildObligationMap({ trabajadores: 5, regimen: 'MYPE_MICRO', sector: 'COMERCIO', hoy: HOY }),
    buildObligationMap({ trabajadores: 30, regimen: 'MYPE_PEQUENA', sector: 'SERVICIOS', hoy: HOY }),
    buildObligationMap({ trabajadores: 120, regimen: 'GENERAL', sector: 'MANUFACTURA', hoy: HOY }),
  ]

  it('la prioridad nunca sube a lo largo de la lista', () => {
    const rank = { alta: 0, media: 1, baja: 2 }
    for (const m of perfiles) {
      const ranks = m.obligaciones.map((o) => rank[o.prioridad])
      expect([...ranks].sort((a, b) => a - b)).toEqual(ranks)
    }
  })

  it('todo id del glosario existe', () => {
    for (const m of perfiles) {
      for (const o of [...m.obligaciones, ...m.noAplican]) {
        if (o.glosarioId) expect(getTerm(o.glosarioId)?.id).toBe(o.glosarioId)
      }
    }
  })

  it('los textos no usan voseo', () => {
    const voseo = /\b(tenés|podés|querés|sabés|hacé|mirá|fijate|decime|contame|dale|che|vos)\b/i
    for (const m of perfiles) {
      for (const o of m.obligaciones) {
        expect(`${o.titulo} ${o.queEs} ${o.comoTeAplica}`).not.toMatch(voseo)
      }
      expect(`${m.multaMaxima.texto} ${m.multaMaxima.nota}`).not.toMatch(voseo)
    }
  })

  it('es pura: misma entrada, mismo resultado', () => {
    const a = buildObligationMap({ trabajadores: 30, regimen: 'MYPE_PEQUENA', sector: 'SERVICIOS', hoy: HOY })
    expect(a).toEqual(perfiles[1])
  })

  it('el día del depósito cuenta como hoy (0 días)', () => {
    const m = buildObligationMap({ trabajadores: 30, regimen: 'GENERAL', hoy: new Date('2026-05-15T14:00:00Z') })
    expect(get(m, 'cts').proximaFecha?.fecha).toBe('2026-05-15')
    expect(get(m, 'cts').proximaFecha?.diasFaltan).toBe(0)
  })

  it('usa la hora de Lima: 15/11 a las 22:00 de Lima sigue siendo el día del depósito', () => {
    // 2026-11-16 03:00 UTC = 2026-11-15 22:00 en Lima.
    const m = buildObligationMap({ trabajadores: 30, regimen: 'GENERAL', hoy: new Date('2026-11-16T03:00:00Z') })
    expect(get(m, 'cts').proximaFecha?.fecha).toBe('2026-11-15')
    expect(m.hoy).toBe('2026-11-15')
  })

  it('después del último depósito del año pasa al año siguiente', () => {
    const m = buildObligationMap({ trabajadores: 30, regimen: 'GENERAL', hoy: new Date('2026-12-20T15:00:00Z') })
    expect(get(m, 'cts').proximaFecha?.fecha).toBe('2027-05-15')
    expect(get(m, 'gratificacion').proximaFecha?.fecha).toBe('2027-07-15')
  })

  it('PLAME: desde el día 26 muestra el mes siguiente (y cruza el año)', () => {
    const m = buildObligationMap({ trabajadores: 5, regimen: 'GENERAL', hoy: new Date('2026-12-27T15:00:00Z') })
    const f = get(m, 'planilla-electronica').proximaFecha
    expect(f?.etiqueta).toBe('Enero de 2027')
    expect(f?.nota).toMatch(/diciembre/)
  })
})

describe('regímenes especiales', () => {
  it('construcción civil: CTS según tu caso y sin fecha; SCTR obligatorio en construcción', () => {
    const m = buildObligationMap({ trabajadores: 25, regimen: 'CONSTRUCCION_CIVIL', sector: 'CONSTRUCCION', hoy: HOY })
    expect(get(m, 'cts').exigencia).toBe('segun-tu-caso')
    expect(get(m, 'cts').proximaFecha).toBeNull()
    expect(get(m, 'gratificacion').proximaFecha?.fecha).toBe('2026-12-15')
    expect(get(m, 'sctr').exigencia).toBe('obligatorio')
    expect(get(m, 'sctr').prioridad).toBe('alta')
    expect(ids(m)).not.toContain('vacaciones')
  })

  it('régimen desconocido se trata como OTRO, con CTS y gratificación según tu caso', () => {
    const m = buildObligationMap({ trabajadores: 8, regimen: 'CAS', hoy: HOY })
    expect(m.regimen).toBe('OTRO')
    expect(get(m, 'cts').exigencia).toBe('segun-tu-caso')
    expect(get(m, 'gratificacion').exigencia).toBe('segun-tu-caso')
    expect(m.multaMaxima.tipoEmpresa).toBe('NO_MYPE')
  })

  it('agrario: CTS con la aclaración de la remuneración diaria', () => {
    const m = buildObligationMap({ trabajadores: 40, regimen: 'AGRARIO', sector: 'AGROINDUSTRIA', hoy: HOY })
    expect(get(m, 'cts').comoTeAplica).toMatch(/remuneración diaria/)
    expect(get(m, 'vacaciones').comoTeAplica).toContain(`${PERU_LABOR.VACACIONES.DIAS_POR_ANO} días`)
  })

  it('número inválido de trabajadores se trata como 1', () => {
    const m = buildObligationMap({ trabajadores: Number.NaN, regimen: 'GENERAL', hoy: HOY })
    expect(m.trabajadores).toBe(1)
    expect(m.multaMaxima.nota).toMatch(/a tu trabajador/)
  })
})

describe('helpers', () => {
  it('tipo de empresa SUNAFIL según el régimen', () => {
    expect(tipoEmpresaSunafilPorRegimen('MYPE_MICRO')).toBe('MICRO')
    expect(tipoEmpresaSunafilPorRegimen('MYPE_PEQUENA')).toBe('PEQUENA')
    expect(tipoEmpresaSunafilPorRegimen('GENERAL')).toBe('NO_MYPE')
    expect(tipoEmpresaSunafilPorRegimen('AGRARIO')).toBe('NO_MYPE')
    expect(normalizarRegimen(null)).toBe('OTRO')
  })

  it('calcularMultaReferencia coincide con el motor de multas', () => {
    const r = calcularMultaReferencia(12, 'MYPE_PEQUENA')
    expect(r.soles).toBe(calcularMultaSunafilSoles('PEQUENA', 'MUY_GRAVE', 12))
  })

  it('rango de trabajadores compatible con Organization.sizeRange', () => {
    expect(rangoDeTrabajadores(1)).toBe('1-10')
    expect(rangoDeTrabajadores(10)).toBe('1-10')
    expect(rangoDeTrabajadores(11)).toBe('11-50')
    expect(rangoDeTrabajadores(50)).toBe('11-50')
    expect(rangoDeTrabajadores(100)).toBe('51-100')
    expect(rangoDeTrabajadores(200)).toBe('101-200')
    expect(rangoDeTrabajadores(201)).toBe('200+')
    expect(etiquetaRango('11-50')).toBe('11 a 50 trabajadores')
    expect(etiquetaRango('200+')).toBe('Más de 200 trabajadores')
  })

  it('sugerirRegimen usa los topes de PERU_LABOR y exige REMYPE para MYPE', () => {
    const micro = sugerirRegimen({ trabajadores: PERU_LABOR.MYPE.MICRO.TRABAJADORES_MAX })
    expect(micro.regimen).toBe('MYPE_MICRO')
    expect(micro.requiereRemype).toBe(true)

    const pequena = sugerirRegimen({ trabajadores: PERU_LABOR.MYPE.MICRO.TRABAJADORES_MAX + 1 })
    expect(pequena.regimen).toBe('MYPE_PEQUENA')

    const general = sugerirRegimen({ trabajadores: PERU_LABOR.MYPE.PEQUENA.TRABAJADORES_MAX + 1 })
    expect(general.regimen).toBe('GENERAL')
    expect(general.requiereRemype).toBe(false)

    expect(micro.limitesVentas.microSoles).toBe(PERU_LABOR.MYPE.MICRO.VENTAS_MAX_UIT_ANUALES * PERU_LABOR.UIT)
    expect(micro.limitesVentas.pequenaUit).toBe(PERU_LABOR.MYPE.PEQUENA.VENTAS_MAX_UIT_ANUALES)
  })

  it('sugerirRegimen avisa del régimen agrario y de construcción civil según el sector', () => {
    expect(sugerirRegimen({ trabajadores: 30, sector: 'AGROINDUSTRIA' }).avisoSector).toMatch(/agrario/)
    expect(sugerirRegimen({ trabajadores: 30, sector: 'CONSTRUCCION' }).avisoSector).toMatch(/construcción civil/)
    expect(sugerirRegimen({ trabajadores: 30, sector: 'COMERCIO' }).avisoSector).toBeNull()
  })
})
