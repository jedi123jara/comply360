'use client'

import { useState, useMemo } from 'react'
import { calcularUtilidades } from '@/lib/legal-engine/calculators/utilidades'
import type { UtilidadesInput, UtilidadesResult, TrabajadorUtilidades } from '@/lib/legal-engine/calculators/utilidades'
import { openWhatsApp } from '@/lib/whatsapp'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import { formatSoles } from '@/lib/format/peruvian'
import {
  Download,
  MessageCircle,
  Wallet,
  Users,
  Building2,
  Plus,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
  PieChart,
  Calendar,
  Save,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import { ResultadoExplicado } from './shared/resultado-explicado'
import { EstadoVacio } from './shared/ui'

const SECTORES = [
  { value: 'PESCA', label: 'Pesca', tasa: '10%' },
  { value: 'TELECOMUNICACIONES', label: 'Telecomunicaciones', tasa: '10%' },
  { value: 'INDUSTRIA', label: 'Industria', tasa: '10%' },
  { value: 'MINERIA', label: 'Minería', tasa: '8%' },
  { value: 'COMERCIO', label: 'Comercio', tasa: '8%' },
  { value: 'RESTAURANTES', label: 'Restaurantes', tasa: '8%' },
  { value: 'OTROS', label: 'Otros', tasa: '5%' },
]

const EMPTY_WORKER: TrabajadorUtilidades = {
  nombre: '',
  diasTrabajados: 360,
  remuneracionTotal: 0,
}

export function UtilidadesCalculadora() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [rentaAnualNeta, setRentaAnualNeta] = useState<number>(0)
  const [sector, setSector] = useState<string>('COMERCIO')
  const [trabajadores, setTrabajadores] = useState<TrabajadorUtilidades[]>([
    { ...EMPTY_WORKER },
  ])

  const input: UtilidadesInput = {
    rentaAnualNeta,
    sector,
    trabajadores,
  }

  const result = useMemo<UtilidadesResult | null>(() => {
    if (rentaAnualNeta <= 0) return null
    const validWorkers = trabajadores.filter(t => t.nombre.trim() && t.remuneracionTotal > 0)
    if (validWorkers.length === 0) return null
    try {
      return calcularUtilidades({
        rentaAnualNeta,
        sector,
        trabajadores: validWorkers,
      })
    } catch {
      return null
    }
  }, [rentaAnualNeta, sector, trabajadores])

  const addWorker = () => {
    setTrabajadores(prev => [...prev, { ...EMPTY_WORKER }])
  }

  const removeWorker = (index: number) => {
    setTrabajadores(prev => prev.filter((_, i) => i !== index))
  }

  const updateWorker = (index: number, field: keyof TrabajadorUtilidades, value: string | number) => {
    setTrabajadores(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const saveCalculation = async () => {
    if (!result) return
    setSaving(true)
    try {
      const res = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'UTILIDADES', inputs: input }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Cálculo guardado', description: 'Puedes verlo en tu historial', type: 'success' })
    } catch {
      toast({ title: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const selectedSector = SECTORES.find(s => s.value === sector)
  // Texto propio (con tildes y el hito correcto: el VENCIMIENTO de la DJ anual).
  const plazoPago = `${PERU_LABOR.UTILIDADES.PLAZO_PAGO_DIAS} días calendario después del vencimiento de la declaración jurada anual del impuesto a la renta`

  const faltantes = [
    rentaAnualNeta > 0 ? null : 'renta neta anual',
    trabajadores.some(t => t.nombre.trim() && t.remuneracionTotal > 0) ? null : 'al menos un trabajador con nombre y remuneración',
  ].filter((x): x is string => x !== null)

  return (
    <div className="@container">
      <div className="grid grid-cols-1 @4xl:grid-cols-5 gap-6 @4xl:gap-8">
        {/* FORM -- Left side */}
        <div className="@4xl:col-span-2 space-y-6">
          {/* Company data */}
          <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Datos de la empresa</h2>
                <p className="text-sm text-[color:var(--text-tertiary)]">Del año que vas a repartir</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Renta Anual Neta */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                  Renta neta anual (antes de impuestos)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] font-semibold text-sm">S/</span>
                  <input
                    type="number"
                    value={rentaAnualNeta || ''}
                    onChange={e => setRentaAnualNeta(Number(e.target.value))}
                    placeholder="0.00"
                    min={0}
                    step={10000}
                    className="w-full pl-10 pr-4 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
                  />
                </div>
                <p className="text-xs text-[color:var(--text-tertiary)] mt-1">La renta neta imponible de tu declaración anual del impuesto a la renta.</p>
              </div>

              {/* Sector */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                  Actividad de la empresa
                </label>
                <select
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  className="w-full px-4 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium bg-[color:var(--bg-elevated)]"
                >
                  {SECTORES.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label} ({s.tasa})
                    </option>
                  ))}
                </select>
                {selectedSector && (
                  <div className="mt-2 flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-600 font-medium">
                      Tasa de participación para {selectedSector.label}: {selectedSector.tasa} de la renta neta anual imponible.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Workers list */}
          <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Trabajadores</h2>
                  <p className="text-sm text-[color:var(--text-tertiary)]">{trabajadores.length} {trabajadores.length === 1 ? 'trabajador' : 'trabajadores'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={addWorker}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-sm font-bold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>

            <div className="space-y-4">
              {trabajadores.map((t, i) => (
                <div key={i} className="p-4 bg-[color:var(--bg-inset)] rounded-xl border border-[color:var(--border-default)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[color:var(--text-tertiary)] uppercase tracking-wider">
                      Trabajador {i + 1}
                    </span>
                    {trabajadores.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWorker(i)}
                        className="p-1.5 text-[color:var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Nombre</label>
                    <input
                      type="text"
                      value={t.nombre}
                      onChange={e => updateWorker(i, 'nombre', e.target.value)}
                      placeholder="Nombre del trabajador"
                      className="w-full px-3 py-2 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
                        Días trabajados
                      </label>
                      <input
                        type="number"
                        value={t.diasTrabajados || ''}
                        onChange={e => updateWorker(i, 'diasTrabajados', Number(e.target.value))}
                        placeholder="360"
                        min={1}
                        max={360}
                        className="w-full px-3 py-2 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
                        Lo que ganó en el año
                      </label>
                      <input
                        type="number"
                        value={t.remuneracionTotal || ''}
                        onChange={e => updateWorker(i, 'remuneracionTotal', Number(e.target.value))}
                        placeholder="0.00"
                        min={0}
                        step={1000}
                        className="w-full px-3 py-2 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RESULTS -- Right side */}
        <div className="@4xl:col-span-3 space-y-6">
          {!result ? (
            <EstadoVacio titulo="Ingresa los datos de la empresa y de los trabajadores" faltantes={faltantes} />
          ) : (
            <>
              {/* Total Card */}
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-white/80" />
                    <span className="text-sm font-medium text-white/80 uppercase tracking-wider">
                      Participación en Utilidades
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-purple-300 text-purple-900">
                    {selectedSector?.label} ({(result.tasaParticipacion * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight mb-1 tabular-nums">
                  {formatSoles(result.montoTotalParticipacion)}
                </div>
                <p className="text-white/80 text-sm mt-1">
                  {(result.tasaParticipacion * 100).toFixed(0)}% de {formatSoles(rentaAnualNeta)} (renta neta)
                </p>

                {/* Distribution split */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                    <p className="text-xs font-medium text-white/80 uppercase tracking-wider mb-1">50% por Días</p>
                    <p className="text-xl font-black">
                      {formatSoles(result.distribucionPorDias)}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                    <p className="text-xs font-medium text-white/80 uppercase tracking-wider mb-1">50% por Remuneración</p>
                    <p className="text-xl font-black">
                      {formatSoles(result.distribucionPorRemuneracion)}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2.5 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      const items = result.detallePorTrabajador.map(t => ({
                        label: t.nombre,
                        amount: t.totalFinal,
                        formula: `Por días: ${formatSoles(t.porDias)} + Por rem: ${formatSoles(t.porRemuneracion)}${t.topeAplicado ? ' (TOPE APLICADO)' : ''}`,
                      }))

                      const warnings = result.detallePorTrabajador
                        .filter(t => t.topeAplicado)
                        .map(t => ({ message: `${t.nombre}: Se aplico tope de 18 remuneraciones mensuales (${formatSoles(t.tope)})` }))

                      const content = calculationToHTML({
                        title: 'Distribución de Utilidades',
                        items,
                        total: result.totalDistribuido,
                        warnings,
                        legalRefs: [
                          { norm: 'D.Leg. 892', description: 'Participación de los trabajadores en las utilidades de la empresa' },
                          { norm: 'D.S. 009-98-TR', description: 'Reglamento del D.Leg. 892' },
                        ],
                        metadata: {
                          'Renta Neta Anual': formatSoles(rentaAnualNeta),
                          'Sector': selectedSector?.label ?? sector,
                          'Tasa de Participación': `${(result.tasaParticipacion * 100).toFixed(0)}%`,
                          'Total Participación': formatSoles(result.montoTotalParticipacion),
                          'Total Distribuido': formatSoles(result.totalDistribuido),
                          'Remanente': formatSoles(result.remanente),
                          'Plazo Máximo': result.plazoMaximo,
                        },
                      })
                      generatePDFFromHTML({
                        title: `Cálculo de Utilidades - ${selectedSector?.label ?? sector}`,
                        filename: 'calculo-utilidades.pdf',
                        content,
                        watermark: 'COMPLY360',
                      })
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[color:var(--bg-elevated)] hover:bg-purple-50 text-purple-800 rounded-xl font-bold text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => openWhatsApp({
                      type: 'consulta',
                      total: result.montoTotalParticipacion,
                      data: {
                        tipo: 'Utilidades',
                        sector: selectedSector?.label ?? sector,
                        trabajadores: result.detallePorTrabajador.length,
                      },
                    })}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors border border-white/20"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar por WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={saveCalculation}
                    disabled={saving || !result}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </button>
                </div>
              </div>

              {/* Per-worker breakdown */}
              <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[color:var(--border-subtle)]">
                  <h3 className="text-lg font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Detalle por Trabajador
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[color:var(--bg-inset)]">
                        <th className="text-left px-4 py-3 font-bold text-[color:var(--text-secondary)]">Trabajador</th>
                        <th className="text-right px-4 py-3 font-bold text-[color:var(--text-secondary)]">Por Días</th>
                        <th className="text-right px-4 py-3 font-bold text-[color:var(--text-secondary)]">Por Rem.</th>
                        <th className="text-right px-4 py-3 font-bold text-[color:var(--text-secondary)]">Total</th>
                        <th className="text-center px-4 py-3 font-bold text-[color:var(--text-secondary)]">Tope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--border-subtle)]">
                      {result.detallePorTrabajador.map((t, i) => (
                        <tr key={i} className="hover:bg-[color:var(--bg-surface-hover)]">
                          <td className="px-4 py-3 font-semibold text-[color:var(--text-primary)]">{t.nombre}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-[color:var(--text-secondary)]">
                            {formatSoles(t.porDias)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-[color:var(--text-secondary)]">
                            {formatSoles(t.porRemuneracion)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-bold text-[color:var(--text-primary)]">
                            {formatSoles(t.totalFinal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {t.topeAplicado ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                                <AlertTriangle className="w-3 h-3" />
                                Tope
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-purple-50">
                        <td className="px-4 py-3 font-bold text-purple-800">Total Distribuido</td>
                        <td colSpan={2} />
                        <td className="px-4 py-3 text-right tabular-nums font-black text-purple-700 text-lg">
                          {formatSoles(result.totalDistribuido)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Remanente and Info */}
              <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-6">
                <h3 className="text-sm font-bold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Información Adicional
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-purple-700">
                        {formatSoles(result.remanente)}
                      </p>
                      <p className="text-xs font-medium text-purple-600">Remanente (lo que excede los topes)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-blue-700">
                        {plazoPago}
                      </p>
                      <p className="text-xs font-medium text-blue-600">Plazo máximo de pago</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tope warnings */}
              {result.detallePorTrabajador.some(t => t.topeAplicado) && (
                <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-6">
                  <h3 className="text-sm font-bold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Topes Aplicados
                  </h3>
                  <ul className="space-y-2">
                    {result.detallePorTrabajador.filter(t => t.topeAplicado).map((t, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100/50">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-[color:var(--text-secondary)]">
                          <strong>{t.nombre}:</strong> Utilidades calculadas {formatSoles(t.total)},
                          se aplica tope de 18 remuneraciones mensuales ({formatSoles(t.tope)}).
                          Diferencia: {formatSoles(t.total - t.tope)}.
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ResultadoExplicado
                resumen="Un porcentaje de la renta de la empresa, repartido 50% según los días trabajados y 50% según lo que ganó cada trabajador."
                pasos={[
                  `Utilidades a repartir: ${(result.tasaParticipacion * 100).toFixed(0)}% de la renta neta (${formatSoles(rentaAnualNeta)}) = ${formatSoles(result.montoTotalParticipacion)}. El porcentaje depende de la actividad de la empresa (${selectedSector?.label ?? sector}).`,
                  `La mitad (${formatSoles(result.distribucionPorDias)}) se reparte según los días que trabajó cada uno en el año.`,
                  `La otra mitad (${formatSoles(result.distribucionPorRemuneracion)}) se reparte según lo que ganó cada uno en el año.`,
                  ...(result.remanente > 0
                    ? [`A cada trabajador se le paga como máximo ${PERU_LABOR.UTILIDADES.TOPE_REMUNERACIONES} sueldos mensuales. Lo que excede (${formatSoles(result.remanente)}) no se le entrega: la ley le da otro destino (Fondoempleo).`]
                    : []),
                  `Plazo: ${plazoPago}.`,
                ]}
                baseLegal={[
                  {
                    norma: 'D.Leg. 892',
                    enSimple:
                      'Las empresas con más de 20 trabajadores que generan renta de tercera categoría reparten entre 5% y 10% de su renta, según su actividad.',
                  },
                  {
                    norma: 'D.S. 009-98-TR',
                    enSimple: 'Reglamento: cómo se reparte (50% por días y 50% por sueldos) y en qué plazo se paga.',
                  },
                ]}
                nota="Usa la renta neta imponible de tu declaración anual del impuesto a la renta. Si tienes 20 trabajadores o menos, no estás obligado a repartir utilidades."
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
