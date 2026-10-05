import { describe, it, expect } from 'vitest'
import {
  CATEGORY_DEFAULT_ACTIONS,
  resolveCalendarEventAction,
  type AlertLookupEntry,
  type EventCategory,
} from '../event-actions'

describe('resolveCalendarEventAction', () => {
  it('eventos estáticos usan el enlace de su categoría', () => {
    expect(resolveCalendarEventAction({ category: 'cts' })).toEqual({
      href: '/dashboard/calculadoras/cts',
      label: 'Calcular CTS',
    })
    expect(resolveCalendarEventAction({ category: 'gratificacion' })?.href).toBe('/dashboard/calculadoras/gratificacion')
    expect(resolveCalendarEventAction({ category: 'afp' })?.href).toBe('/dashboard/calculadoras/aportes')
  })

  it('feriados y cumpleaños son informativos (sin botón)', () => {
    expect(resolveCalendarEventAction({ category: 'feriado' })).toBeNull()
    expect(resolveCalendarEventAction({ category: 'cumpleanos', sourceId: 'birthday-ckw1' })).toBeNull()
  })

  it('contrato por vencer → detalle del contrato', () => {
    expect(resolveCalendarEventAction({ category: 'contrato', sourceId: 'contract-exp-ckc9' })).toEqual({
      href: '/dashboard/contratos/ckc9',
      label: 'Ver contrato',
    })
  })

  it('fin de periodo de prueba y aniversario → trabajador', () => {
    expect(resolveCalendarEventAction({ category: 'prueba', sourceId: 'probation-ckw1' })?.href).toBe(
      '/dashboard/trabajadores/ckw1?tab=contratos',
    )
    expect(resolveCalendarEventAction({ category: 'aniversario', sourceId: 'anniv-ckw1-5' })?.href).toBe(
      '/dashboard/trabajadores/ckw1',
    )
  })

  it('eventos SST Premium → su pantalla concreta', () => {
    expect(resolveCalendarEventAction({ category: 'sst', sourceId: 'sst-emo-cke1' })?.href).toBe('/dashboard/sst/emo/cke1')
    expect(resolveCalendarEventAction({ category: 'sst', sourceId: 'sst-sat-cka1' })?.href).toBe('/dashboard/sst/accidentes/cka1')
    expect(resolveCalendarEventAction({ category: 'sst', sourceId: 'sst-plan-xyz' })?.href).toBe('/dashboard/sst/plan-anual')
    // SstRecord legacy → hub SST
    expect(resolveCalendarEventAction({ category: 'sst', sourceId: 'sst-overdue-ck1' })?.href).toBe('/dashboard/sst')
  })

  it('alertas de trabajador cruzadas → acción exacta del mapeo de alertas', () => {
    const alerts = new Map<string, AlertLookupEntry>([
      ['cka1', { workerId: 'ckw1', type: 'CONTRATO_POR_VENCER', title: 'Contrato por vencer en 5 dias' }],
      ['cka2', { workerId: 'ckw2', type: 'DOCUMENTO_VENCIDO', title: 'SCTR vence en 3 dias' }],
    ])
    expect(resolveCalendarEventAction({ category: 'alerta', sourceId: 'alert-cka1' }, alerts)).toEqual({
      href: '/dashboard/trabajadores/ckw1?tab=contratos',
      label: 'Resolver ahora',
    })
    expect(resolveCalendarEventAction({ category: 'alerta', sourceId: 'alert-cka2' }, alerts)?.href).toBe(
      '/dashboard/trabajadores/ckw2?tab=legajo',
    )
  })

  it('alerta no encontrada → página de alertas', () => {
    expect(resolveCalendarEventAction({ category: 'alerta', sourceId: 'alert-desconocida' }, new Map())).toEqual(
      CATEGORY_DEFAULT_ACTIONS.alerta,
    )
  })

  it('todas las categorías tienen una entrada (aunque sea null)', () => {
    const categories: EventCategory[] = [
      'feriado', 'cts', 'gratificacion', 'afp', 'tregistro', 'contrato', 'sst',
      'cumpleanos', 'alerta', 'aniversario', 'prueba', 'vacaciones', 'firma', 'capacitacion',
    ]
    for (const c of categories) expect(c in CATEGORY_DEFAULT_ACTIONS).toBe(true)
  })
})
