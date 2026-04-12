'use client'

import { useState, useMemo } from 'react'
import { calcularUtilidades } from '@/lib/legal-engine/calculators/utilidades'
import type { UtilidadesInput, UtilidadesResult, TrabajadorUtilidades } from '@/lib/legal-engine/calculators/utilidades'
import { openWhatsApp } from '@/lib/whatsapp'
import { generatePDFFromHTML, calculationToHTML } from '@/lib/pdf/generate-pdf'
import {
  Calculator,
  Download,
  MessageCircle,
  DollarSign,
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

const SECTORES = [
  { value: 'PESCA', label: 'Pesca', tasa: '10%' },
  { value: 'TELECOMUNICACIONES', label: 'Telecomunicaciones', tasa: '10%' },
  { value: 'INDUSTRIA', label: 'Industria', tasa: '10%' },
  { value: 'MINERIA', label: 'Mineria', tasa: '8%' },
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
      toast({ title: 'Calculo guardado', description: 'Puedes verlo en tu historial', type: 'success' })
    } catch {
      toast({ title: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const selectedSector = SECTORES.find(s => s.value === sector)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* FORM -- Left side */}
      <div className="lg:col-span-2 space-y-6">
        {/* Company data */}
        <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Datos de la Empresa</h2>
              <p className="text-sm text-gray-500">Informacion del ejercicio fiscal</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Renta Anual Neta */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Renta Neta Anual Imponible
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={rentaAnualNeta || ''}
                  onChange={e => setRentaAnualNeta(Number(e.target.value))}
                  placeholder="0.00"
                  min={0}
                  step={10000}
                  className="w-full pl-10 pr-4 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Segun la Declaracion Jurada Anual del IR</p>
            </div>

            {/* Sector */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Sector Economico
              </label>
              <select
                value={sector}
                onChange={e => setSector(e.target.value)}
                className="w-full px-4 py-3 border border-white/10 border-white/10 bg-white/[0.04] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium bg-[#141824] bg-white/[0.04]"
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
                    Tasa de participacion para {selectedSector.label}: {selectedSector.tasa} de la renta neta anual imponible.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workers list */}
        <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Trabajadores</h2>
                <p className="text-sm text-gray-500">{trabajadores.length} trabajador(es)</p>
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
              <div key={i} className="p-4 bg-white/[0.02] bg-white/[0.04] rounded-xl border border-white/[0.06] border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Trabajador {i + 1}
                  </span>
                  {trabajadores.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWorker(i)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={t.nombre}
                    onChange={e => updateWorker(i, 'nombre', e.target.value)}
                    placeholder="Nombre del trabajador"
                    className="w-full px-3 py-2 border border-white/10 border-white/10 bg-white/[0.04] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Dias trabajados
                    </label>
                    <input
                      type="number"
                      value={t.diasTrabajados || ''}
                      onChange={e => updateWorker(i, 'diasTrabajados', Number(e.target.value))}
                      placeholder="360"
                      min={1}
                      max={360}
                      className="w-full px-3 py-2 border border-white/10 border-white/10 bg-white/[0.04] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Rem. anual total
                    </label>
                    <input
                      type="number"
                      value={t.remuneracionTotal || ''}
                      onChange={e => updateWorker(i, 'remuneracionTotal', Number(e.target.value))}
                      placeholder="0.00"
                      min={0}
                      step={1000}
                      className="w-full px-3 py-2 border border-white/10 border-white/10 bg-white/[0.04] rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RESULTS -- Right side */}
      <div className="lg:col-span-3 space-y-6">
        {!result ? (
          <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Ingresa los datos de la empresa y trabajadores
            </h3>
            <p className="text-sm text-gray-400">
              El calculo se actualiza automaticamente en tiempo real
            </p>
          </div>
        ) : (
          <>
            {/* Total Card */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-800 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-purple-200" />
                  <span className="text-sm font-medium text-purple-100 uppercase tracking-wider">
                    Participacion en Utilidades
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-purple-300 text-purple-900">
                  {selectedSector?.label} ({(result.tasaParticipacion * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="text-5xl font-black tracking-tight mb-1">
                S/ {result.montoTotalParticipacion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-purple-200 text-sm mt-1">
                {(result.tasaParticipacion * 100).toFixed(0)}% de S/ {rentaAnualNeta.toLocaleString('es-PE', { minimumFractionDigits: 2 })} (renta neta)
              </p>

              {/* Distribution split */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                  <p className="text-xs font-medium text-purple-200 uppercase tracking-wider mb-1">50% por Dias</p>
                  <p className="text-xl font-black">
                    S/ {result.distribucionPorDias.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                  <p className="text-xs font-medium text-purple-200 uppercase tracking-wider mb-1">50% por Remuneracion</p>
                  <p className="text-xl font-black">
                    S/ {result.distribucionPorRemuneracion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const items = result.detallePorTrabajador.map(t => ({
                      label: t.nombre,
                      amount: t.totalFinal,
                      formula: `Por dias: S/ ${t.porDias.toFixed(2)} + Por rem: S/ ${t.porRemuneracion.toFixed(2)}${t.topeAplicado ? ' (TOPE APLICADO)' : ''}`,
                    }))

                    const warnings = result.detallePorTrabajador
                      .filter(t => t.topeAplicado)
                      .map(t => ({ message: `${t.nombre}: Se aplico tope de 18 remuneraciones mensuales (S/ ${t.tope.toFixed(2)})` }))

                    const content = calculationToHTML({
                      title: 'Distribucion de Utilidades',
                      items,
                      total: result.totalDistribuido,
                      warnings,
                      legalRefs: [
                        { norm: 'D.Leg. 892', description: 'Participacion de los trabajadores en las utilidades de la empresa' },
                        { norm: 'D.S. 009-98-TR', description: 'Reglamento del D.Leg. 892' },
                      ],
                      metadata: {
                        'Renta Neta Anual': `S/ ${rentaAnualNeta.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                        'Sector': selectedSector?.label ?? sector,
                        'Tasa de Participacion': `${(result.tasaParticipacion * 100).toFixed(0)}%`,
                        'Total Participacion': `S/ ${result.montoTotalParticipacion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                        'Total Distribuido': `S/ ${result.totalDistribuido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                        'Remanente': `S/ ${result.remanente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
                        'Plazo Maximo': result.plazoMaximo,
                      },
                    })
                    generatePDFFromHTML({
                      title: `Calculo de Utilidades - ${selectedSector?.label ?? sector}`,
                      filename: 'calculo-utilidades.pdf',
                      content,
                      watermark: 'COMPLY360',
                    })
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#141824] hover:bg-purple-50 text-purple-800 rounded-xl font-bold text-sm transition-colors"
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
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-white/[0.06] border-white/[0.08]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Detalle por Trabajador
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.02] bg-white/[0.04]">
                      <th className="text-left px-4 py-3 font-bold text-gray-300">Trabajador</th>
                      <th className="text-right px-4 py-3 font-bold text-gray-300">Por Dias</th>
                      <th className="text-right px-4 py-3 font-bold text-gray-300">Por Rem.</th>
                      <th className="text-right px-4 py-3 font-bold text-gray-300">Total</th>
                      <th className="text-center px-4 py-3 font-bold text-gray-300">Tope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.detallePorTrabajador.map((t, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] hover:bg-white/[0.04]">
                        <td className="px-4 py-3 font-semibold text-white">{t.nombre}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                          S/ {t.porDias.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                          S/ {t.porRemuneracion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-white">
                          S/ {t.totalFinal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
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
                        S/ {result.totalDistribuido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Remanente and Info */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Informacion Adicional
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-purple-700">
                      S/ {result.remanente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs font-medium text-purple-600">Remanente (topes)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-blue-700">
                      {result.plazoMaximo}
                    </p>
                    <p className="text-xs font-medium text-blue-600">Plazo maximo de pago</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tope warnings */}
            {result.detallePorTrabajador.some(t => t.topeAplicado) && (
              <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Topes Aplicados
                </h3>
                <ul className="space-y-2">
                  {result.detallePorTrabajador.filter(t => t.topeAplicado).map((t, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100/50">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-300">
                        <strong>{t.nombre}:</strong> Utilidades calculadas S/ {t.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })},
                        se aplica tope de 18 remuneraciones mensuales (S/ {t.tope.toLocaleString('es-PE', { minimumFractionDigits: 2 })}).
                        Diferencia: S/ {(t.total - t.tope).toLocaleString('es-PE', { minimumFractionDigits: 2 })}.
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Base Legal */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Base Legal y Formula
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Formula aplicada:</span>
                  <div className="mt-1.5">
                    <code className="block bg-white/[0.02] bg-white/[0.04] px-4 py-3 rounded-xl border border-white/[0.08] border-white/10 text-sm text-gray-200 font-mono leading-relaxed">
                      Utilidades = Renta Neta x Tasa Sector. 50% se distribuye por dias trabajados (proporcional), 50% por remuneracion anual (proporcional). Tope individual: 18 remuneraciones mensuales.
                    </code>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Base legal:</span>
                  <div className="flex items-start gap-2 p-3 bg-white/[0.02] bg-white/[0.04] rounded-lg">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                      D.Leg. 892
                    </span>
                    <p className="text-xs text-gray-600">
                      Participacion de los trabajadores en las utilidades de la empresa. Reglamentado por D.S. 009-98-TR.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
