import { describe, it, expect } from 'vitest'
import {
  ALERT_SEVERITY_LABELS,
  WORKER_ALERT_ACTIONS,
  ROUTES,
  alertSeverityLabel,
  cleanAlertDescription,
  describeDaysLeft,
  getWorkerAlertLabel,
  getWorkerAlertConfig,
  isSafeExternalUrl,
  resolveNormAlertAction,
  resolveWorkerAlertAction,
  resolveWorkerAlertActionInProfile,
  workerHref,
} from '../alert-actions'

const WORKER = 'ckworker123'

describe('workerHref', () => {
  it('arma la URL del perfil con y sin pestaña', () => {
    expect(workerHref(WORKER)).toBe(`/dashboard/trabajadores/${WORKER}`)
    expect(workerHref(WORKER, 'legajo')).toBe(`/dashboard/trabajadores/${WORKER}?tab=legajo`)
  })
})

describe('resolveWorkerAlertAction', () => {
  it('documentos → legajo del trabajador', () => {
    for (const type of ['DOCUMENTO_FALTANTE', 'DOCUMENTO_VENCIDO', 'REGISTRO_INCOMPLETO', 'SCTR_VENCIDO']) {
      expect(resolveWorkerAlertAction({ type, workerId: WORKER, title: 'x' })).toEqual({
        kind: 'link',
        href: `/dashboard/trabajadores/${WORKER}?tab=legajo`,
        destination: 'Legajo del trabajador',
      })
    }
  })

  it('contratos → pestaña contratos', () => {
    for (const type of ['CONTRATO_POR_VENCER', 'CONTRATO_VENCIDO', 'CAMBIO_REGIMEN_SIN_ADENDA']) {
      const action = resolveWorkerAlertAction({ type, workerId: WORKER })
      expect(action?.kind).toBe('link')
      expect(action && 'href' in action ? action.href : '').toBe(
        `/dashboard/trabajadores/${WORKER}?tab=contratos`,
      )
    }
  })

  it('vacaciones → pestaña vacaciones', () => {
    const action = resolveWorkerAlertAction({ type: 'VACACIONES_DOBLE_PERIODO', workerId: WORKER })
    expect(action).toMatchObject({ href: `/dashboard/trabajadores/${WORKER}?tab=vacaciones` })
  })

  it('CTS y gratificación → calculadoras (no dependen del trabajador)', () => {
    expect(resolveWorkerAlertAction({ type: 'CTS_PENDIENTE', workerId: WORKER, title: 'Deposito CTS mayo en 5 dias' })).toMatchObject({
      href: ROUTES.calculadoraCts,
    })
    expect(resolveWorkerAlertAction({ type: 'GRATIFICACION_PENDIENTE', workerId: WORKER })).toMatchObject({
      href: ROUTES.calculadoraGratificacion,
    })
  })

  it('detecta el subtipo utilidades guardado como CTS_PENDIENTE', () => {
    const ref = { type: 'CTS_PENDIENTE', workerId: WORKER, title: 'Pago de utilidades vence aprox. en 12 dias' }
    expect(resolveWorkerAlertAction(ref)).toMatchObject({ href: ROUTES.calculadoraUtilidades })
    expect(getWorkerAlertLabel(ref)).toBe('Pago de utilidades')
  })

  it('detecta el subtipo sueldo bajo la RMV guardado como REGISTRO_INCOMPLETO', () => {
    const ref = { type: 'REGISTRO_INCOMPLETO', workerId: WORKER, title: 'Sueldo por debajo de la RMV — Ana Pérez' }
    expect(resolveWorkerAlertAction(ref)).toMatchObject({
      href: `/dashboard/trabajadores/${WORKER}?tab=remuneraciones`,
    })
  })

  it('alertas SST de empresa → pantallas SST', () => {
    expect(resolveWorkerAlertAction({ type: 'IPERC_VENCIDO', workerId: WORKER })).toMatchObject({ href: ROUTES.sstIperc })
    expect(resolveWorkerAlertAction({ type: 'EMO_VENCIDO', workerId: WORKER })).toMatchObject({ href: ROUTES.sstEmo })
    expect(resolveWorkerAlertAction({ type: 'COMITE_MANDATO_VENCE' })).toMatchObject({ href: ROUTES.sstComiteElecciones })
    expect(getWorkerAlertConfig({ type: 'IPERC_VENCIDO' })?.scope).toBe('org')
  })

  it('tipo desconocido → ficha del trabajador, o nada si no hay trabajador', () => {
    expect(resolveWorkerAlertAction({ type: 'TIPO_NUEVO', workerId: WORKER })).toEqual({
      kind: 'link',
      href: `/dashboard/trabajadores/${WORKER}`,
      destination: 'Ficha del trabajador',
    })
    expect(resolveWorkerAlertAction({ type: 'TIPO_NUEVO' })).toBeNull()
  })

  it('tipo de trabajador sin workerId → lista de trabajadores (nunca una URL rota)', () => {
    expect(resolveWorkerAlertAction({ type: 'DOCUMENTO_FALTANTE', workerId: '  ' })).toMatchObject({
      href: ROUTES.trabajadores,
    })
  })

  it('todos los tipos mapeados tienen etiqueta, destino y ruta absoluta del dashboard', () => {
    for (const [type, config] of Object.entries(WORKER_ALERT_ACTIONS)) {
      expect(config.label.length, type).toBeGreaterThan(0)
      expect(config.route.destination.length, type).toBeGreaterThan(0)
      if (config.route.to === 'page') expect(config.route.href.startsWith('/dashboard/'), type).toBe(true)
    }
  })
})

describe('getWorkerAlertLabel', () => {
  it('humaniza tipos desconocidos', () => {
    expect(getWorkerAlertLabel({ type: 'ALGO_NUEVO_RARO' })).toBe('Algo nuevo raro')
  })
})

describe('resolveNormAlertAction', () => {
  it('con fuente oficial → abre la norma en otra pestaña', () => {
    expect(
      resolveNormAlertAction({ title: 'Nueva RMV', sourceUrl: 'https://busquedas.elperuano.pe/normaslegales/ds-003-2026-tr' }),
    ).toEqual({
      kind: 'external',
      href: 'https://busquedas.elperuano.pe/normaslegales/ds-003-2026-tr',
      destination: 'Texto oficial de la norma',
    })
  })

  it('sin fuente (o con URL insegura) → asistente con la pregunta lista', () => {
    const action = resolveNormAlertAction({ title: 'Nueva RMV', normCode: 'DS-003-2026-TR', sourceUrl: 'javascript:alert(1)' })
    expect(action.kind).toBe('assistant')
    if (action.kind === 'assistant') {
      expect(action.prompt).toContain('Nueva RMV')
      expect(action.prompt).toContain('DS-003-2026-TR')
    }
  })
})

describe('isSafeExternalUrl', () => {
  it('acepta solo http(s)', () => {
    expect(isSafeExternalUrl('https://gob.pe')).toBe(true)
    expect(isSafeExternalUrl('javascript:void(0)')).toBe(false)
    expect(isSafeExternalUrl('/dashboard')).toBe(false)
    expect(isSafeExternalUrl(null)).toBe(false)
  })
})

describe('cleanAlertDescription', () => {
  it('quita la huella técnica del cron SST', () => {
    expect(cleanAlertDescription('[sst-fp:emo:abc123] El EMO vence pronto.')).toBe('El EMO vence pronto.')
  })
  it('deja intactas las descripciones normales', () => {
    expect(cleanAlertDescription('Faltan 3 documentos.')).toBe('Faltan 3 documentos.')
    expect(cleanAlertDescription(null)).toBe('')
  })
})

describe('resolveWorkerAlertActionInProfile', () => {
  it('si se corrige en una pestaña de la ficha → cambia de pestaña, sin navegar', () => {
    expect(resolveWorkerAlertActionInProfile({ type: 'DOCUMENTO_FALTANTE', title: 'x' })).toEqual({
      kind: 'tab',
      tab: 'legajo',
      destination: 'Legajo del trabajador',
    })
    expect(resolveWorkerAlertActionInProfile({ type: 'CONTRATO_VENCIDO' })).toMatchObject({ kind: 'tab', tab: 'contratos' })
    expect(resolveWorkerAlertActionInProfile({ type: 'T_REGISTRO_NO_PRESENTADO' })).toMatchObject({ kind: 'tab', tab: 'info' })
  })

  it('CTS y gratificación → pestaña Beneficios (ya calcula el monto de esa persona)', () => {
    expect(resolveWorkerAlertActionInProfile({ type: 'CTS_PENDIENTE', title: 'Depósito CTS mayo' })).toMatchObject({
      kind: 'tab',
      tab: 'beneficios',
    })
    expect(resolveWorkerAlertActionInProfile({ type: 'GRATIFICACION_PENDIENTE' })).toMatchObject({
      kind: 'tab',
      tab: 'beneficios',
    })
  })

  it('los subtipos respetan su propio destino (utilidades → calculadora, sueldo bajo RMV → remuneraciones)', () => {
    expect(
      resolveWorkerAlertActionInProfile({ type: 'CTS_PENDIENTE', title: 'Pago de utilidades vence en 12 días' }),
    ).toEqual({ kind: 'link', href: ROUTES.calculadoraUtilidades, destination: 'Calculadora de utilidades' })
    expect(
      resolveWorkerAlertActionInProfile({ type: 'REGISTRO_INCOMPLETO', title: 'Sueldo por debajo de la RMV' }),
    ).toMatchObject({ kind: 'tab', tab: 'remuneraciones' })
  })

  it('lo que se corrige en otra pantalla → mismo enlace que en Alertas', () => {
    expect(resolveWorkerAlertActionInProfile({ type: 'EMO_VENCIDO' })).toMatchObject({ kind: 'link', href: ROUTES.sstEmo })
    expect(resolveWorkerAlertActionInProfile({ type: 'IPERC_VENCIDO' })).toMatchObject({ kind: 'link', href: ROUTES.sstIperc })
    expect(resolveWorkerAlertActionInProfile({ type: 'AFP_EN_MORA' })).toMatchObject({
      kind: 'link',
      href: ROUTES.calculadoraAportes,
    })
  })

  it('tipo desconocido → sin botón (su destino genérico es la ficha, donde ya está)', () => {
    expect(resolveWorkerAlertActionInProfile({ type: 'TIPO_NUEVO' })).toBeNull()
  })
})

describe('alertSeverityLabel', () => {
  it('usa "Urgente" (nunca "Crítica") y cae a "Media" si no reconoce el valor', () => {
    expect(ALERT_SEVERITY_LABELS.CRITICAL).toBe('Urgente')
    expect(alertSeverityLabel('CRITICAL')).toBe('Urgente')
    expect(alertSeverityLabel('high')).toBe('Alta')
    expect(alertSeverityLabel('RARA')).toBe('Media')
    expect(alertSeverityLabel(null)).toBe('Media')
  })
})

describe('describeDaysLeft', () => {
  it('expresa el plazo en palabras', () => {
    expect(describeDaysLeft(null)).toBe('Sin fecha límite')
    expect(describeDaysLeft(5)).toBe('Vence en 5 días')
    expect(describeDaysLeft(1)).toBe('Vence mañana')
    expect(describeDaysLeft(0)).toBe('Vence hoy')
    expect(describeDaysLeft(-1)).toBe('Venció ayer')
    expect(describeDaysLeft(-2)).toBe('Venció hace 2 días')
  })
})
