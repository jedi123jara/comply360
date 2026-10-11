import { describe, expect, it } from 'vitest'
import {
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  compactKey,
  getTerm,
  glossaryAnchor,
  glossaryHref,
  normalizeText,
  searchGlossary,
  solesCortos,
} from '../glossary'
import { PERU_LABOR } from '../legal-engine/peru-labor'
import { REGIMENES } from '@/components/calculadoras/shared/regimen'

describe('glosario — estructura', () => {
  it('tiene entre 30 y 60 términos', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(30)
    expect(GLOSSARY.length).toBeLessThanOrEqual(60)
  })

  it('todos los ids son únicos y en kebab-case', () => {
    const ids = GLOSSARY.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('ningún id, nombre o alias apunta a dos términos distintos', () => {
    const owner = new Map<string, string>()
    for (const entry of GLOSSARY) {
      for (const key of new Set([entry.id, entry.term, ...entry.aliases].map(compactKey))) {
        const previo = owner.get(key)
        expect(previo === undefined || previo === entry.id, `"${key}" está en ${previo} y en ${entry.id}`).toBe(true)
        owner.set(key, entry.id)
      }
    }
  })

  it('cada entrada tiene los campos obligatorios con contenido', () => {
    for (const e of GLOSSARY) {
      expect(e.term.trim(), e.id).not.toBe('')
      expect(e.queEs.trim(), e.id).not.toBe('')
      expect(e.porQueImporta.trim(), e.id).not.toBe('')
      expect(e.baseLegal.trim(), e.id).not.toBe('')
      expect(GLOSSARY_CATEGORIES[e.categoria], e.id).toBeDefined()
    }
  })

  it('los términos relacionados existen y no se apuntan a sí mismos', () => {
    for (const e of GLOSSARY) {
      for (const rel of e.relacionados ?? []) {
        expect(getTerm(rel)?.id, `${e.id} → ${rel}`).toBe(rel)
        expect(rel).not.toBe(e.id)
      }
    }
  })

  it('no hay montos con "NaN" ni "undefined" en los textos', () => {
    for (const e of GLOSSARY) {
      const texto = [e.term, e.queEs, e.porQueImporta, e.ejemplo, e.cuando, e.baseLegal].join(' ')
      expect(texto, e.id).not.toMatch(/NaN|undefined|\[object/)
    }
  })

  it('incluye los términos que usa la plataforma', () => {
    const esperados = [
      'cts', 'gratificacion', 'bonificacion-extraordinaria', 'vacaciones', 'vacaciones-truncas',
      'indemnizacion-vacacional', 'liquidacion', 'asignacion-familiar', 'rmv', 'uit',
      'regimen-general', 'regimen-mype', 'remype', 'regimen-agrario', 'construccion-civil',
      'planilla-electronica', 't-registro', 'plame', 'boleta-de-pago', 'legajo',
      'contrato-indefinido', 'contrato-plazo-fijo', 'periodo-de-prueba', 'locacion-de-servicios',
      'desnaturalizacion', 'sctr', 'essalud', 'essalud-vida', 'afp', 'onp', 'cuspp',
      'seguro-vida-ley', 'sst', 'comite-sst', 'supervisor-sst', 'iperc', 'emo', 'epp', 'rit',
      'hostigamiento-sexual', 'sunafil', 'inspeccion', 'acta-de-infraccion', 'subsanacion', 'multa-sunafil',
    ]
    for (const id of esperados) expect(getTerm(id)?.id, id).toBe(id)
  })

  it('los regímenes de las calculadoras enlazan a términos que existen', () => {
    for (const r of Object.values(REGIMENES)) {
      if (r.glosarioId) expect(getTerm(r.glosarioId)?.id, r.key).toBe(r.glosarioId)
    }
  })
})

describe('glosario — tono (tuteo peruano, nunca voseo)', () => {
  // Formas de voseo frecuentes en copy de producto. Se usan límites de letra
  // Unicode (y no el límite de palabra ASCII) para que funcione con palabras que terminan en tilde.
  const VOSEO_PALABRAS = [
    'vos', 'tenés', 'querés', 'podés', 'sabés', 'hacés', 'decís', 'venís', 'sentís', 'elegís', 'pedís',
    'necesitás', 'pagás', 'calculás', 'revisás', 'mirá', 'decime', 'contame', 'fijate', 'hacé', 'poné',
    'ponele', 'dejá', 'andá', 'corré', 'abrí', 'elegí', 'usá', 'revisá', 'completá', 'cargá', 'agregá',
    'guardá', 'consultá', 'calculá', 'registrá', 'pagá', 'depositá', 'tené', 'che', 'dale',
  ]
  const VOSEO = new RegExp(`(?<!\\p{L})(${VOSEO_PALABRAS.join('|')})(?!\\p{L})`, 'iu')

  it('ninguna entrada usa voseo', () => {
    for (const e of GLOSSARY) {
      const textos = [e.term, e.queEs, e.porQueImporta, e.ejemplo ?? '', e.cuando ?? '', e.baseLegal]
      for (const t of textos) expect(t, `${e.id}: "${t}"`).not.toMatch(VOSEO)
    }
  })

  it('el detector de voseo funciona', () => {
    expect('Si tenés dudas, consultá.').toMatch(VOSEO)
    expect('Mirá el detalle').toMatch(VOSEO)
    expect('Si tienes dudas, consulta. De noche no hay atención.').not.toMatch(VOSEO)
  })
})

describe('glosario — búsqueda sin tildes ni mayúsculas', () => {
  it('normalizeText quita tildes, mayúsculas y espacios de más', () => {
    expect(normalizeText('  Gratificación   EXTRAORDINARIA ')).toBe('gratificacion extraordinaria')
    expect(normalizeText('Período')).toBe('periodo')
  })

  it('encuentra términos escritos sin tildes', () => {
    expect(searchGlossary('gratificacion')[0]?.id).toBe('gratificacion')
    expect(searchGlossary('locacion de servicios')[0]?.id).toBe('locacion-de-servicios')
    expect(searchGlossary('indemnizacion vacacional')[0]?.id).toBe('indemnizacion-vacacional')
    expect(searchGlossary('liquidacion').map((e) => e.id)).toContain('liquidacion')
  })

  it('ignora mayúsculas y encuentra términos con tilde escritos sin ella', () => {
    expect(searchGlossary('INSPECCION').map((e) => e.id)).toContain('inspeccion')
    expect(searchGlossary('Régimen agrario')[0]?.id).toBe('regimen-agrario')
    expect(searchGlossary('regimen agrario')[0]?.id).toBe('regimen-agrario')
  })

  it('las siglas aparecen primero', () => {
    expect(searchGlossary('cts')[0]?.id).toBe('cts')
    expect(searchGlossary('SCTR')[0]?.id).toBe('sctr')
    expect(searchGlossary('uit')[0]?.id).toBe('uit')
    expect(searchGlossary('remype')[0]?.id).toBe('remype')
  })

  it('busca también por alias y sinónimos', () => {
    expect(searchGlossary('sueldo minimo')[0]?.id).toBe('rmv')
    expect(searchGlossary('triple vacacional')[0]?.id).toBe('indemnizacion-vacacional')
    expect(searchGlossary('recibo por honorarios')[0]?.id).toBe('locacion-de-servicios')
    expect(searchGlossary('spp')[0]?.id).toBe('afp')
  })

  it('busca por inicio de palabra, sin falsos positivos dentro de otras palabras', () => {
    expect(searchGlossary('grati')[0]?.id).toBe('gratificacion')
    const vida = searchGlossary('vida').map((e) => e.id)
    expect(vida.slice(0, 2).sort()).toEqual(['essalud-vida', 'seguro-vida-ley'])
    // "actividad" contiene "vida", pero no debe aparecer por eso.
    expect(vida).not.toContain('contrato-plazo-fijo')
  })

  it('con texto vacío devuelve todo el glosario', () => {
    expect(searchGlossary('')).toHaveLength(GLOSSARY.length)
    expect(searchGlossary('   ')).toHaveLength(GLOSSARY.length)
  })

  it('sin coincidencias devuelve una lista vacía', () => {
    expect(searchGlossary('zzzz palabra inexistente')).toEqual([])
  })
})

describe('glosario — getTerm por id y alias', () => {
  it('encuentra por id exacto', () => {
    expect(getTerm('cts')?.id).toBe('cts')
    expect(getTerm('t-registro')?.id).toBe('t-registro')
  })

  it('encuentra por siglas, sin importar mayúsculas ni guiones', () => {
    expect(getTerm('CTS')?.id).toBe('cts')
    expect(getTerm('T-REGISTRO')?.id).toBe('t-registro')
    expect(getTerm('tregistro')?.id).toBe('t-registro')
    expect(getTerm('EsSalud +Vida')?.id).toBe('essalud-vida')
    expect(getTerm('cuspp')?.id).toBe('cuspp')
    expect(getTerm('SPP')?.id).toBe('afp')
  })

  it('encuentra por nombre o alias sin tildes', () => {
    expect(getTerm('Remuneracion Minima Vital')?.id).toBe('rmv')
    expect(getTerm('asignacion familiar')?.id).toBe('asignacion-familiar')
    expect(getTerm('periodo de prueba')?.id).toBe('periodo-de-prueba')
  })

  it('devuelve undefined si no existe', () => {
    expect(getTerm('no-existe')).toBeUndefined()
    expect(getTerm('')).toBeUndefined()
    expect(getTerm(undefined)).toBeUndefined()
  })
})

describe('glosario — montos con las constantes vigentes', () => {
  it('la RMV y la UIT del glosario son las de PERU_LABOR', () => {
    expect(getTerm('rmv')?.queEs).toContain(solesCortos(PERU_LABOR.RMV))
    expect(getTerm('uit')?.queEs).toContain(solesCortos(PERU_LABOR.UIT))
  })

  it('la asignación familiar es el 10 % de la RMV vigente', () => {
    const monto = PERU_LABOR.RMV * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE
    expect(getTerm('asignacion-familiar')?.ejemplo).toContain(solesCortos(monto))
  })

  it('solesCortos usa formato peruano', () => {
    expect(solesCortos(1130)).toBe('S/ 1,130')
    expect(solesCortos(1166.666)).toBe('S/ 1,166.67')
    expect(solesCortos(101.7)).toBe('S/ 101.70')
  })
})

describe('glosario — enlaces', () => {
  it('arma el ancla y el enlace a la página de Ayuda', () => {
    expect(glossaryAnchor('cts')).toBe('glosario-cts')
    expect(glossaryHref('cts')).toBe('/dashboard/ayuda#glosario-cts')
  })
})
