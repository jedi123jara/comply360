import {
  Wand2, X, Loader2, Check, AlertTriangle, CheckCircle2, ScrollText, FileText, Download
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { WorkerPicker, type WorkerSummary } from '@/components/contracts/worker-picker'
import { CostSummaryPill } from '@/components/contracts/cost-summary-pill'
import { LiveValidationPanel } from '@/components/contracts/live-validation-panel'

export interface AIContractClause {
  numero: number
  titulo: string
  contenido: string
  obligatoria: boolean
  baseLegal?: string
}

export interface AIGeneratedContract {
  generadoPor: 'ai' | 'simulated'
  modelo: string
  generadoAt: string
  tipoDetectado: string
  tituloContrato: string
  resumen: string
  preambulo?: string
  clausulas: AIContractClause[]
  textoCompleto: string
  htmlCompleto: string
  advertenciasLegales: string[]
  baseLegalPrincipal: string
  anexos?: string[]
}

export interface AiModalProps {
  showAiModal: boolean
  aiContract: AIGeneratedContract | null
  aiLoading: boolean
  aiDescription: string
  empRuc: string
  empRucStatus: 'idle' | 'ok' | 'error'
  empRucLoading: boolean
  empRazonSocial: string
  empRepresentante: string
  empDireccion: string
  trabajadorMode: 'picker' | 'manual'
  orgId: string | null
  selectedWorker: WorkerSummary | null
  trabDni: string
  trabDniStatus: 'idle' | 'ok' | 'error'
  trabDniLoading: boolean
  trabNombre: string
  modalidad: string
  periodoPrueba: string
  fechaInicio: string
  fechaFin: string
  causaObjetiva: string
  cargo: string
  jornada: string
  horario: string
  remuneracion: string
  formaPago: string
  beneficios: string
  costoEmpleador: any
  liveValidation: any
  aiError: string | null
  aiSaving: boolean
  aiSavedId: string | null

  handleResetAi: () => void
  setAiDescription: (val: string) => void
  handleRucChange: (val: string) => void
  setEmpRazonSocial: (val: string) => void
  setEmpRepresentante: (val: string) => void
  setEmpDireccion: (val: string) => void
  setTrabajadorMode: (mode: 'picker' | 'manual') => void
  handleSelectWorker: (worker: WorkerSummary) => void
  handleClearWorker: () => void
  handleDniChange: (val: string) => void
  setTrabNombre: (val: string) => void
  setModalidad: (val: string) => void
  setPeriodoPrueba: (val: string) => void
  setFechaInicio: (val: string) => void
  setFechaFin: (val: string) => void
  setCausaObjetiva: (val: string) => void
  setCargo: (val: string) => void
  setJornada: (val: string) => void
  setHorario: (val: string) => void
  setRemuneracion: (val: string) => void
  setFormaPago: (val: string) => void
  setBeneficios: (val: string) => void
  handleGenerateAi: () => void
  setAiContract: (val: AIGeneratedContract | null) => void
  setAiError: (val: string | null) => void
  setAiSavedId: (val: string | null) => void
  handleDownloadAiContract: () => void
}

export function AiStep(props: AiModalProps) {
  const router = useRouter()
  
  // Destructure for easy drop-in compatibility with the extracted JSX
  const {
    showAiModal, aiContract, aiLoading, aiDescription, empRuc, empRucStatus, empRucLoading, 
    empRazonSocial, empRepresentante, empDireccion, trabajadorMode, orgId, selectedWorker,
    trabDni, trabDniStatus, trabDniLoading, trabNombre, modalidad, periodoPrueba, fechaInicio,
    fechaFin, causaObjetiva, cargo, jornada, horario, remuneracion, formaPago, beneficios,
    costoEmpleador, liveValidation, aiError, aiSaving, aiSavedId,
    handleResetAi, setAiDescription, handleRucChange, setEmpRazonSocial, setEmpRepresentante,
    setEmpDireccion, setTrabajadorMode, handleSelectWorker, handleClearWorker, handleDniChange,
    setTrabNombre, setModalidad, setPeriodoPrueba, setFechaInicio, setFechaFin, setCausaObjetiva,
    setCargo, setJornada, setHorario, setRemuneracion, setFormaPago, setBeneficios,
    handleGenerateAi, setAiContract, setAiError, setAiSavedId, handleDownloadAiContract
  } = props;

  

  return (
    <>
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-7xl max-h-[95vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md">
                  <Wand2 className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Generar contrato con IA</h2>
                  <p className="text-xs text-slate-600">Describe lo que necesitas en lenguaje natural · datos en vivo a la derecha</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetAi}
                className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-600"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body — layout 2-col cuando estamos en form mode (MG2) */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Columna izquierda: form / loading / resultado */}
                <div className={(!aiContract && !aiLoading) ? "lg:col-span-8 space-y-4" : "lg:col-span-12 space-y-4"}>
              {!aiContract && !aiLoading && (
                <>
                  {/* ── Descripción ───────────────────────────────────────── */}
                  <div>
                    <label className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
                      ¿Qué contrato necesitas? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={aiDescription}
                      onChange={e => setAiDescription(e.target.value)}
                      rows={3}
                      placeholder="Ej: Contrato para profesional de marketing y ventas, jornada completa, salario S/3500 mensual, regimen general..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-slate-900 placeholder:text-slate-400 resize-none bg-white"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Mientras más detallado, mejor el resultado.
                    </p>
                  </div>

                  {/* ── Empleador ─────────────────────────────────────────── */}
                  <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">1</span>
                      Datos del Empleador
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1 flex items-center gap-1.5">
                          RUC <span className="text-purple-600 font-normal text-[11px]">→ auto-carga datos</span>
                          {empRuc && empRucStatus === 'idle' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Precargado de tu empresa</span>
                          )}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={empRuc}
                            onChange={e => handleRucChange(e.target.value)}
                            placeholder="20XXXXXXXXX"
                            maxLength={11}
                            className={`w-full px-3 py-2.5 pr-8 border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium transition-colors ${
                              empRucStatus === 'ok' ? 'border-green-400' :
                              empRucStatus === 'error' ? 'border-red-400' :
                              'border-white/10'
                            }`}
                          />
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                            {empRucLoading && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
                            {!empRucLoading && empRucStatus === 'ok' && <Check className="h-4 w-4 text-green-500" />}
                            {!empRucLoading && empRucStatus === 'error' && <X className="h-4 w-4 text-red-400" />}
                          </div>
                        </div>
                        {empRucStatus === 'ok' && <p className="mt-0.5 text-[11px] text-green-700 flex items-center gap-1"><Check className="h-3 w-3"/>Datos cargados desde SUNAT</p>}
                        {empRucStatus === 'error' && <p className="mt-0.5 text-[11px] text-red-600">RUC no encontrado — ingresa manualmente</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
                          Razon Social {empRucStatus === 'ok' && <span className="text-green-600 font-normal">(auto)</span>}
                        </label>
                        <input
                          type="text"
                          value={empRazonSocial}
                          onChange={e => setEmpRazonSocial(e.target.value)}
                          placeholder="Mi Empresa SAC"
                          className="w-full px-3 py-2.5 border border-white/10 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
                          Representante Legal <span className="text-[11px] text-amber-600 font-normal">(ingresar manualmente)</span>
                        </label>
                        <input
                          type="text"
                          value={empRepresentante}
                          onChange={e => setEmpRepresentante(e.target.value)}
                          placeholder="Juan Garcia Lopez — Gerente General"
                          className="w-full px-3 py-2.5 border border-amber-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
                          Direccion {empRucStatus === 'ok' && <span className="text-green-600 font-normal">(auto)</span>}
                        </label>
                        <input
                          type="text"
                          value={empDireccion}
                          onChange={e => setEmpDireccion(e.target.value)}
                          placeholder="Av. Principal 123, Lima"
                          className="w-full px-3 py-2.5 border border-white/10 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Trabajador (QW2: WorkerPicker + fallback manual) ──── */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold text-black font-bold text-[10px] font-bold">2</span>
                      Datos del Trabajador / Locador
                    </h4>

                    {trabajadorMode === 'picker' && !selectedWorker && (
                      <WorkerPicker
                        orgId={orgId}
                        onSelectExisting={handleSelectWorker}
                        onChooseNew={() => setTrabajadorMode('manual')}
                        selectedWorker={null}
                      />
                    )}

                    {selectedWorker && (
                      <WorkerPicker
                        orgId={orgId}
                        onSelectExisting={handleSelectWorker}
                        onChooseNew={() => setTrabajadorMode('manual')}
                        selectedWorker={selectedWorker}
                        onClear={handleClearWorker}
                      />
                    )}

                    {trabajadorMode === 'manual' && !selectedWorker && (
                      <>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600">Trabajador nuevo (no esta en el directorio)</span>
                          <button
                            type="button"
                            onClick={() => setTrabajadorMode('picker')}
                            className="text-blue-700 hover:underline font-semibold"
                          >
                            ← Buscar uno existente
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="ai-trab-dni" className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
                              DNI <span className="text-blue-600 font-normal text-[11px]">→ auto-carga nombre</span>
                            </label>
                            <div className="relative">
                              <input
                                id="ai-trab-dni"
                                type="text"
                                value={trabDni}
                                onChange={e => handleDniChange(e.target.value)}
                                placeholder="12345678"
                                maxLength={8}
                                aria-describedby="ai-trab-dni-status"
                                className={`w-full px-3 py-2.5 pr-8 border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-gold/30/20 focus:border-gold/50 font-medium transition-colors ${
                                  trabDniStatus === 'ok' ? 'border-green-400' :
                                  trabDniStatus === 'error' ? 'border-red-400' :
                                  'border-slate-200'
                                }`}
                              />
                              <div className="absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden="true">
                                {trabDniLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                                {!trabDniLoading && trabDniStatus === 'ok' && <Check className="h-4 w-4 text-green-500" />}
                                {!trabDniLoading && trabDniStatus === 'error' && <X className="h-4 w-4 text-red-400" />}
                              </div>
                            </div>
                            <p id="ai-trab-dni-status" className="sr-only" aria-live="polite">
                              {trabDniStatus === 'ok' && 'DNI valido, nombre cargado desde RENIEC'}
                              {trabDniStatus === 'error' && 'DNI no encontrado'}
                            </p>
                            {trabDniStatus === 'ok' && <p className="mt-0.5 text-[11px] text-green-700 flex items-center gap-1"><Check className="h-3 w-3" aria-hidden="true"/>Nombre cargado desde RENIEC</p>}
                            {trabDniStatus === 'error' && <p className="mt-0.5 text-[11px] text-red-600">DNI no encontrado — ingresa manualmente</p>}
                          </div>
                          <div>
                            <label htmlFor="ai-trab-nombre" className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
                              Nombre Completo {trabDniStatus === 'ok' && <span className="text-green-600 font-normal">(auto)</span>}
                            </label>
                            <input
                              id="ai-trab-nombre"
                              type="text"
                              value={trabNombre}
                              onChange={e => setTrabNombre(e.target.value)}
                              placeholder="Juan Perez Garcia"
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-gold/30/20 focus:border-gold/50 font-medium"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Tipo de Contrato ──────────────────────────────────── */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">3</span>
                      Tipo de Contrato
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Modalidad</label>
                        <select
                          value={modalidad}
                          onChange={e => setModalidad(e.target.value)}
                          className="w-full px-3 py-2.5 border border-white/10 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                        >
                          <option value="">IA lo detecta auto</option>
                          <option value="INDEFINIDO">Plazo Indeterminado</option>
                          <option value="PLAZO_FIJO">Plazo Fijo (Temporal)</option>
                          <option value="PARTTIME">Tiempo Parcial (&lt;4h/dia)</option>
                          <option value="MYPE">Regimen MYPE</option>
                          <option value="LOCACION">Locacion de Servicios</option>
                          <option value="PRACTICAS">Practicas Pre-profesionales</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Periodo de Prueba</label>
                        <select
                          value={periodoPrueba}
                          onChange={e => setPeriodoPrueba(e.target.value)}
                          className="w-full px-3 py-2.5 border border-white/10 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                        >
                          <option value="3">3 meses (estandar)</option>
                          <option value="6">6 meses (trabajador confianza)</option>
                          <option value="12">12 meses (trabajador direccion)</option>
                          <option value="0">Sin periodo de prueba</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Fecha de Inicio</label>
                        <input
                          type="date"
                          value={fechaInicio}
                          onChange={e => setFechaInicio(e.target.value)}
                          className="w-full px-3 py-2.5 border border-white/10 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                        />
                      </div>
                    </div>

                    {/* Campos condicionales para plazo fijo */}
                    {(modalidad === 'PLAZO_FIJO' || modalidad === 'PRACTICAS') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-emerald-200 pt-3">
                        <div>
                          <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Fecha de Vencimiento</label>
                          <input
                            type="date"
                            value={fechaFin}
                            onChange={e => setFechaFin(e.target.value)}
                            className="w-full px-3 py-2.5 border border-white/10 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
                            Causa Objetiva <span className="text-red-500">*</span>
                            <span className="text-[11px] text-gray-500 font-normal ml-1">(D.S. 003-97-TR Art. 53)</span>
                          </label>
                          <input
                            type="text"
                            value={causaObjetiva}
                            onChange={e => setCausaObjetiva(e.target.value)}
                            placeholder="Ej: Incremento extraordinario de actividad comercial"
                            className="w-full px-3 py-2.5 border border-orange-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Condiciones Laborales ─────────────────────────────── */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold">4</span>
                      Condiciones Laborales
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Cargo / Puesto</label>
                        <input
                          type="text"
                          value={cargo}
                          onChange={e => setCargo(e.target.value)}
                          placeholder="Gerente de Marketing"
                          className="w-full px-3 py-2.5 border border-white/10 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Jornada semanal</label>
                        <select
                          value={jornada}
                          onChange={e => setJornada(e.target.value)}
                          className="w-full px-3 py-2.5 border border-white/10 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                        >
                          <option value="48">48 horas (completa)</option>
                          <option value="40">40 horas</option>
                          <option value="24">24 horas</option>
                          <option value="20">20 horas (parcial)</option>
                          <option value="16">16 horas (parcial)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Horario</label>
                        <input
                          type="text"
                          value={horario}
                          onChange={e => setHorario(e.target.value)}
                          placeholder="08:00 - 17:00"
                          className="w-full px-3 py-2.5 border border-white/10 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                        />
                      </div>
                    </div>

                    {/* ── Remuneración ─ */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Remuneracion Mensual S/</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">S/</span>
                          <input
                            type="number"
                            value={remuneracion}
                            onChange={e => setRemuneracion(e.target.value)}
                            placeholder="3500"
                            min="1130"
                            className="w-full pl-8 pr-3 py-2.5 border border-white/10 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                          />
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">Min. RMV: S/ 1,130</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Forma de Pago</label>
                        <select
                          value={formaPago}
                          onChange={e => setFormaPago(e.target.value)}
                          className="w-full px-3 py-2.5 border border-white/10 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                        >
                          <option value="MENSUAL">Mensual</option>
                          <option value="QUINCENAL">Quincenal</option>
                          <option value="SEMANAL">Semanal</option>
                        </select>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">Beneficios adicionales</label>
                        <input
                          type="text"
                          value={beneficios}
                          onChange={e => setBeneficios(e.target.value)}
                          placeholder="Movilidad S/150, bono metas 5%, laptop..."
                          className="w-full px-3 py-2.5 border border-white/10 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                        />
                      </div>
                    </div>

                    {/* QW3: Costo empleador movido al sidebar derecho (MG2) */}
                  </div>

                  {/* QW5: Validacion en vivo movida al sidebar derecho (MG2) */}

                  {aiError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2" role="alert">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                      {aiError}
                    </div>
                  )}

                  {liveValidation.blockers.length > 0 && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2" role="alert">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        Hay {liveValidation.blockers.length} bloqueo{liveValidation.blockers.length === 1 ? '' : 's'} legal{liveValidation.blockers.length === 1 ? '' : 'es'} que debes resolver antes de generar el contrato.
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleGenerateAi}
                    disabled={aiDescription.trim().length < 10 || liveValidation.blockers.length > 0}
                    aria-disabled={aiDescription.trim().length < 10 || liveValidation.blockers.length > 0}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Wand2 className="h-4 w-4" aria-hidden="true" />
                    Generar contrato con IA
                  </button>
                </>
              )}

              {/* Loading */}
              {aiLoading && (
                <div className="flex flex-col items-center text-center py-12">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-purple-400 opacity-20" />
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                      <Loader2 className="h-7 w-7 animate-spin text-white" />
                    </div>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">Redactando tu contrato...</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Analizando descripcion, detectando tipo y generando clausulas legales
                  </p>
                </div>
              )}

              {/* Generated contract preview */}
              {aiContract && !aiLoading && (
                <div className="space-y-4">
                  {/* Header info */}
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-purple-900">{aiContract.tituloContrato}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            aiContract.generadoPor === 'ai'
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-amber-100 text-amber-700 border-amber-300'
                          }`}>
                            {aiContract.generadoPor === 'ai' ? 'IA' : 'Plantilla base'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-purple-700">{aiContract.resumen}</p>
                        <p className="mt-2 text-[11px] text-purple-600">
                          <strong>Tipo detectado:</strong> {aiContract.tipoDetectado.replace(/_/g, ' ')} ·{' '}
                          <strong>Base legal:</strong> {aiContract.baseLegalPrincipal}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {aiContract.advertenciasLegales.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5" /> Advertencias legales
                      </h4>
                      <ul className="space-y-1">
                        {aiContract.advertenciasLegales.map((w, i) => (
                          <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                            <span className="text-amber-500">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Clausulas */}
                  <div className="rounded-xl border border-white/[0.08] bg-white max-h-96 overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-white/[0.08] px-4 py-2 flex items-center gap-2">
                      <ScrollText className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-semibold text-[color:var(--text-secondary)]">
                        {aiContract.clausulas.length} clausulas generadas
                      </span>
                    </div>
                    <div className="p-4 space-y-4">
                      {aiContract.clausulas.map((c, idx) => (
                        <div key={idx} className="border-purple-300 pl-3">
                          <h5 className="text-xs font-bold text-slate-900 uppercase">
                            {c.numero}. {c.titulo}
                            {c.obligatoria && (
                              <span className="ml-2 text-[10px] font-medium text-red-600">(obligatoria)</span>
                            )}
                          </h5>
                          <p className="mt-1 text-xs text-slate-700 leading-relaxed whitespace-pre-line">{c.contenido}</p>
                          {c.baseLegal && (
                            <p className="mt-1 text-[10px] italic text-gray-500">Base: {c.baseLegal}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save status banner */}
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 flex items-center gap-2">
                    {aiSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-green-700" />
                        <p className="text-xs text-green-800">Guardando borrador automáticamente...</p>
                      </>
                    ) : aiSavedId ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-700" />
                        <p className="text-xs text-green-800">
                          <b>Contrato guardado como borrador.</b> Ya puedes cerrarlo y continuarás donde lo dejaste desde la lista de contratos.
                        </p>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <p className="text-xs text-amber-800">El guardado automático aún no está confirmado. Puedes descargar igualmente.</p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => { setAiContract(null); setAiError(null); setAiSavedId(null) }}
                      className="px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] border border-white/10 rounded-lg hover:bg-[color:var(--neutral-50)]"
                    >
                      Volver
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGenerateAi}
                        disabled={aiLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 disabled:opacity-50"
                      >
                        <Wand2 className="h-4 w-4" />
                        Regenerar
                      </button>
                      {aiSavedId && (
                        <button
                          onClick={() => router.push(`/dashboard/contratos/${aiSavedId}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
                        >
                          <FileText className="h-4 w-4" />
                          Ver guardado
                        </button>
                      )}
                      <button
                        onClick={handleDownloadAiContract}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white hover:from-purple-700 hover:to-indigo-700"
                      >
                        <Download className="h-4 w-4" />
                        Descargar DOCX
                      </button>
                    </div>
                  </div>
                </div>
              )}
                </div>
                {/* Columna derecha: sidebar con cost + validation (solo en form mode) */}
                {!aiContract && !aiLoading && (
                  <aside className="lg:col-span-4 lg:sticky lg:top-20 lg:self-start space-y-4">
                    <CostSummaryPill result={costoEmpleador} />
                    <LiveValidationPanel
                      blockers={liveValidation.blockers}
                      warnings={liveValidation.warnings}
                      infos={liveValidation.infos}
                      passed={liveValidation.passed}
                      totalRules={liveValidation.totalRules}
                      loading={liveValidation.loading}
                      error={liveValidation.error}
                    />
                  </aside>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
