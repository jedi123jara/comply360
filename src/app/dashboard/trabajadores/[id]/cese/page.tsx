'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Scale,
  Shield,
  XCircle,
  Send,
  Banknote,
  Calendar,
  User,
  ChevronRight,
  Download,
  Ban,
  BookOpen,
  Copy,
  Check,
  ClipboardList,
  Timer,
  ListChecks,
} from 'lucide-react'
import { cn, displayWorkerName } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────

type TipoCese =
  | 'RENUNCIA_VOLUNTARIA'
  | 'DESPIDO_CAUSA_JUSTA'
  | 'DESPIDO_ARBITRARIO'
  | 'MUTUO_DISENSO'
  | 'TERMINO_CONTRATO'
  | 'NO_RENOVACION'
  | 'FALLECIMIENTO'
  | 'JUBILACION'
  | 'PERIODO_PRUEBA'

type EtapaCese =
  | 'INICIADO'
  | 'CARTA_PREAVISO'
  | 'PERIODO_DESCARGOS'
  | 'CARTA_DESPIDO'
  | 'LIQUIDACION_CALCULADA'
  | 'LIQUIDACION_PAGADA'
  | 'COMPLETADO'
  | 'ANULADO'

interface CeseRecord {
  id: string
  tipoCese: TipoCese
  causaDetalle?: string
  fechaInicioProceso: string
  fechaCese: string
  fechaCartaPreaviso?: string
  fechaLimiteDescargos?: string
  fechaCartaDespido?: string
  fechaPagoLiquidacion?: string
  sueldoBruto: number
  ctsMonto: number
  vacacionesMonto: number
  gratificacionMonto: number
  indemnizacionMonto: number
  totalLiquidacion: number
  detalleJson?: Record<string, unknown>
  etapa: EtapaCese
  observaciones?: string
}

interface WorkerInfo {
  id: string
  firstName: string
  lastName: string
  dni: string
  position?: string
  department?: string
  regimenLaboral: string
  tipoContrato: string
  fechaIngreso: string
  sueldoBruto: number
  asignacionFamiliar: boolean
  status: string
}

interface BaseLegal {
  norma: string
  articulo: string
  descripcion: string
}

interface FaltaGrave {
  id: string
  texto: string
  articulo: string
}

// ─── Constants ──────────────────────────────────────────────────────────

const TIPO_CESE_OPTIONS: { value: TipoCese; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'RENUNCIA_VOLUNTARIA',
    label: 'Renuncia Voluntaria',
    desc: 'Art. 18 D.S. 003-97-TR — Preaviso de 30 dias',
    icon: <FileText className="h-5 w-5 text-emerald-600" />,
  },
  {
    value: 'DESPIDO_CAUSA_JUSTA',
    label: 'Despido por Causa Justa',
    desc: 'Art. 22-25 D.Leg. 728 — Falta grave comprobada',
    icon: <Scale className="h-5 w-5 text-red-400" />,
  },
  {
    value: 'DESPIDO_ARBITRARIO',
    label: 'Despido Arbitrario',
    desc: 'Art. 34 D.Leg. 728 — Genera indemnizacion obligatoria',
    icon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
  },
  {
    value: 'MUTUO_DISENSO',
    label: 'Mutuo Disenso',
    desc: 'Art. 19 D.S. 003-97-TR — Acuerdo de ambas partes',
    icon: <Shield className="h-5 w-5 text-green-400" />,
  },
  {
    value: 'TERMINO_CONTRATO',
    label: 'Termino de Contrato',
    desc: 'Art. 16.c — Vencimiento del plazo pactado',
    icon: <Calendar className="h-5 w-5 text-gray-400" />,
  },
  {
    value: 'NO_RENOVACION',
    label: 'No Renovacion',
    desc: 'Contrato temporal no renovado',
    icon: <Ban className="h-5 w-5 text-gray-400" />,
  },
  {
    value: 'FALLECIMIENTO',
    label: 'Fallecimiento',
    desc: 'Art. 16.a D.S. 003-97-TR',
    icon: <XCircle className="h-5 w-5 text-gray-500" />,
  },
  {
    value: 'JUBILACION',
    label: 'Jubilacion',
    desc: 'Art. 16.f D.S. 003-97-TR',
    icon: <User className="h-5 w-5 text-purple-400" />,
  },
  {
    value: 'PERIODO_PRUEBA',
    label: 'Periodo de Prueba',
    desc: 'Art. 10 D.Leg. 728 — Primeros 3 meses',
    icon: <Clock className="h-5 w-5 text-gray-400" />,
  },
]

const ETAPA_LABELS: Record<EtapaCese, string> = {
  INICIADO: 'Iniciado',
  CARTA_PREAVISO: 'Carta de Preaviso',
  PERIODO_DESCARGOS: 'Periodo de Descargos',
  CARTA_DESPIDO: 'Carta de Despido',
  LIQUIDACION_CALCULADA: 'Liquidacion Calculada',
  LIQUIDACION_PAGADA: 'Liquidacion Pagada',
  COMPLETADO: 'Completado',
  ANULADO: 'Anulado',
}

const REGIMEN_LABELS: Record<string, string> = {
  GENERAL: 'Regimen General (D.Leg. 728)',
  MYPE_MICRO: 'Microempresa (Ley 32353)',
  MYPE_PEQUENA: 'Pequena Empresa (Ley 32353)',
  AGRARIO: 'Regimen Agrario',
  CAS: 'CAS',
  CONSTRUCCION_CIVIL: 'Construccion Civil',
  DOMESTICO: 'Trabajador del Hogar',
  MODALIDAD_FORMATIVA: 'Modalidad Formativa',
  TELETRABAJO: 'Teletrabajo',
}

const FALTAS_GRAVES: FaltaGrave[] = [
  { id: 'F01', texto: 'Incumplimiento de obligaciones de trabajo (Art. 25.a)', articulo: 'Art. 25.a' },
  { id: 'F02', texto: 'Disminucion deliberada y reiterada del rendimiento', articulo: 'Art. 25.a' },
  { id: 'F03', texto: 'Apropiacion consumada o frustrada de bienes del empleador', articulo: 'Art. 25.b' },
  { id: 'F04', texto: 'Uso o entrega a terceros de informacion reservada', articulo: 'Art. 25.c' },
  { id: 'F05', texto: 'Sustraccion o utilizacion no autorizada de documentos', articulo: 'Art. 25.d' },
  { id: 'F06', texto: 'Concurrencia reiterada en estado de embriaguez o drogadiccion', articulo: 'Art. 25.e' },
  { id: 'F07', texto: 'Violacion del secreto profesional', articulo: 'Art. 25.f' },
  { id: 'F08', texto: 'Actos de violencia, falta grave de palabra en agravio del empleador', articulo: 'Art. 25.g' },
  { id: 'F09', texto: 'Dano intencional a edificios, bienes, instalaciones del empleador', articulo: 'Art. 25.h' },
  { id: 'F10', texto: 'Abandono de trabajo por mas de 3 dias consecutivos', articulo: 'Art. 25.i' },
  { id: 'F11', texto: 'Ausencias injustificadas por mas de 5 dias en periodo de 30 dias', articulo: 'Art. 25.i' },
  { id: 'F12', texto: 'Hostigamiento sexual comprobado', articulo: 'Art. 25.j (Ley 27942)' },
]

const CHECKLIST_DESPIDO_CAUSA_JUSTA = [
  'Carta de Preaviso firmada por el trabajador',
  'Escrito de descargos del trabajador (o acta de negativa)',
  'Carta de Despido firmada por el trabajador',
  'Liquidacion de beneficios sociales calculada',
  'Comprobante de pago de liquidacion',
  'Comunicacion a AFP/ONP del cese',
  'Comunicacion a EsSalud del cese',
]

const CHECKLIST_RENUNCIA_VOLUNTARIA = [
  'Carta de renuncia firmada por el trabajador',
  'Carta de aceptacion de renuncia (y exoneracion si aplica)',
  'Liquidacion de beneficios sociales',
  'Comprobante de pago de liquidacion',
  'Comunicacion a AFP/ONP',
  'Comunicacion a EsSalud',
]

const CHECKLIST_DESPIDO_ARBITRARIO = [
  'Carta de despido entregada al trabajador',
  'Liquidacion con indemnizacion calculada (1.5 rem x anos, tope 12)',
  'Comprobante de pago de liquidacion',
  'Comunicacion a AFP/ONP del cese',
]

const CHECKLIST_DEFAULT = [
  'Liquidacion de beneficios sociales calculada',
  'Comprobante de pago de liquidacion',
  'Comunicacion a AFP/ONP del cese',
  'Comunicacion a EsSalud del cese',
]

// ─── Utility functions ──────────────────────────────────────────────────

function fmt(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string | undefined | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtDateShort(d: string | undefined | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function diasRestantes(fechaLimite: string | undefined | null): number | null {
  if (!fechaLimite) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const limite = new Date(fechaLimite)
  limite.setHours(0, 0, 0, 0)
  const diff = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

// ─── Letter generators ──────────────────────────────────────────────────

function generarCartaPreaviso(worker: WorkerInfo, ceseRecord: CeseRecord): string {
  const nombre = `${worker.lastName}, ${worker.firstName}`
  const fechaCarta = fmtDateShort(ceseRecord.fechaCartaPreaviso ?? new Date().toISOString())
  const fechaLimite = fmtDateShort(ceseRecord.fechaLimiteDescargos)
  const cargo = worker.position ?? 'Sin especificar'
  const causa = ceseRecord.causaDetalle ?? 'Se le imputan hechos que podrian constituir falta grave.'

  return `CARTA DE PREAVISO

Lugar y fecha: Lima, ${fechaCarta}

Señor/Señora:
${nombre}
DNI: ${worker.dni}
Cargo: ${cargo}
Presente.-

De nuestra consideracion:

Por medio de la presente, y de conformidad con lo establecido en el articulo 31° del Decreto Legislativo N° 728 (TUO aprobado por D.S. 003-97-TR), nos dirigimos a usted con la finalidad de comunicarle que la empresa ha tomado conocimiento de hechos que podrian constituir falta grave en su perjuicio.

HECHOS IMPUTADOS:
${causa}

En tal sentido, le otorgamos un plazo de SEIS (06) DIAS NATURALES, contados a partir del dia siguiente de recibida la presente carta, para que presente por escrito sus descargos y las pruebas que estime convenientes para su defensa.

Base Legal: Art. 31° D.Leg. 728 (D.S. 003-97-TR).

Fecha limite para presentar descargos: ${fechaLimite}

Atentamente,

_______________________
Representante Legal
[Razon Social de la Empresa]

_______________________
${nombre}
Cargo: ${cargo}
DNI: ${worker.dni}
Fecha de recepcion: ___________________`
}

function generarCartaDespido(worker: WorkerInfo, ceseRecord: CeseRecord): string {
  const nombre = `${worker.lastName}, ${worker.firstName}`
  const fechaCarta = fmtDateShort(ceseRecord.fechaCartaDespido ?? new Date().toISOString())
  const fechaCese = fmtDateShort(ceseRecord.fechaCese)
  const cargo = worker.position ?? 'Sin especificar'
  const causa = ceseRecord.causaDetalle ?? 'Falta grave segun Art. 25 D.Leg. 728.'

  if (ceseRecord.tipoCese === 'DESPIDO_ARBITRARIO') {
    return `CARTA DE DESPIDO

Lugar y fecha: Lima, ${fechaCarta}

Señor/Señora:
${nombre}
DNI: ${worker.dni}
Cargo: ${cargo}
Presente.-

De nuestra consideracion:

Estimado/a ${worker.firstName}:

Mediante la presente comunicamos a usted que, lamentablemente, la empresa se ve en la necesidad de prescindir de sus servicios con fecha ${fechaCese}.

Le comunicamos que, conforme al articulo 34° del D.Leg. 728, al no mediar causa justificada de despido, le corresponde el pago de una indemnizacion equivalente a una remuneracion y media ordinaria mensual por cada año completo de servicios, con un maximo de doce (12) remuneraciones, la que sera abonada en el plazo de ley.

Los beneficios sociales (CTS, gratificaciones truncas, vacaciones truncas e indemnizacion) seran pagados dentro de las 48 horas del cese (Art. 3° D.S. 001-97-TR).

Atentamente,

_______________________
Representante Legal
[Razon Social de la Empresa]

_______________________
${nombre}
Cargo: ${cargo}
DNI: ${worker.dni}
Fecha de recepcion: ___________________`
  }

  return `CARTA DE DESPIDO

Lugar y fecha: Lima, ${fechaCarta}

Señor/Señora:
${nombre}
DNI: ${worker.dni}
Cargo: ${cargo}
Presente.-

De nuestra consideracion:

Por medio de la presente, y en cumplimiento de lo dispuesto por el articulo 32° del Decreto Legislativo N° 728 (TUO aprobado por D.S. 003-97-TR), comunicamos a usted que con fecha ${fechaCese} quedara extinguido el vinculo laboral que lo une a esta empresa.

CAUSA DE DESPIDO:
${causa}

Habiendo evaluado los descargos presentados (o ante la ausencia de los mismos dentro del plazo otorgado), los hechos imputados no han sido desvirtuados, por lo que se procede al despido justificado por causa relacionada con la conducta del trabajador, conforme al articulo 25° del D.Leg. 728.

Los beneficios sociales que correspondan seran pagados dentro de las CUARENTA Y OCHO (48) HORAS posteriores al cese, conforme al articulo 3° del D.S. 001-97-TR.

Atentamente,

_______________________
Representante Legal
[Razon Social de la Empresa]

_______________________
${nombre}
Cargo: ${cargo}
DNI: ${worker.dni}
Fecha de recepcion: ___________________`
}

function getChecklist(tipoCese: TipoCese): string[] {
  switch (tipoCese) {
    case 'DESPIDO_CAUSA_JUSTA':
      return CHECKLIST_DESPIDO_CAUSA_JUSTA
    case 'RENUNCIA_VOLUNTARIA':
      return CHECKLIST_RENUNCIA_VOLUNTARIA
    case 'DESPIDO_ARBITRARIO':
      return CHECKLIST_DESPIDO_ARBITRARIO
    default:
      return CHECKLIST_DEFAULT
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────

function InfoItem({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn('text-sm font-medium text-white mt-0.5', valueClass)}>{value}</p>
    </div>
  )
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={cn('text-right', highlight ? 'text-amber-400 font-semibold' : 'text-slate-300')}>
        {value}
      </span>
    </div>
  )
}

function LiqRow({ label, sublabel, amount }: { label: string; sublabel: string; amount: number }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-sm text-slate-300">{label}</p>
        <p className="text-[10px] text-slate-500">{sublabel}</p>
      </div>
      <span className={cn(
        'text-sm font-medium tabular-nums shrink-0',
        amount > 0 ? 'text-white' : 'text-[color:var(--text-secondary)]',
      )}>
        S/ {amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  )
}

function CountdownTimer({ fechaLimite }: { fechaLimite: string | undefined | null }) {
  const dias = diasRestantes(fechaLimite)
  if (dias === null) return null

  const isUrgent = dias <= 2
  const isWarning = dias > 2 && dias <= 4
  const isExpired = dias < 0

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border px-4 py-3',
      isExpired ? 'border-red-500/40 bg-red-900/20' :
      isUrgent ? 'border-red-500/30 bg-red-900/15' :
      isWarning ? 'border-amber-500/30 bg-amber-900/15' :
      'border-blue-500/30 bg-blue-900/15',
    )}>
      <Timer className={cn(
        'h-5 w-5 shrink-0',
        isExpired ? 'text-red-400' :
        isUrgent ? 'text-red-400' :
        isWarning ? 'text-amber-400' :
        'text-emerald-600',
      )} />
      <div>
        {isExpired ? (
          <>
            <p className="text-sm font-semibold text-red-300">Plazo vencido</p>
            <p className="text-[11px] text-red-400">El plazo de descargos vencio hace {Math.abs(dias)} dia{Math.abs(dias) !== 1 ? 's' : ''}</p>
          </>
        ) : (
          <>
            <p className={cn(
              'text-sm font-semibold',
              isUrgent ? 'text-red-300' : isWarning ? 'text-amber-700' : 'text-emerald-600',
            )}>
              {dias === 0 ? 'Vence HOY' : `${dias} dia${dias !== 1 ? 's' : ''} restante${dias !== 1 ? 's' : ''}`}
            </p>
            <p className={cn(
              'text-[11px]',
              isUrgent ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-600',
            )}>
              Plazo limite de descargos: {fmtDate(fechaLimite)}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

interface CartaModalProps {
  titulo: string
  contenido: string
  onClose: () => void
}

function CartaModal({ titulo, contenido, onClose }: CartaModalProps) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(contenido)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // fallback silencioso
    }
  }

  const descargar = () => {
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${titulo.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-white flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            {titulo}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          <pre className="whitespace-pre-wrap font-mono text-xs text-slate-200 leading-relaxed bg-[#0f172a] rounded-lg p-4 border border-white/[0.08]">
            {contenido}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-white/[0.08]">
          <button
            onClick={copiar}
            className="flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            {copiado ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            {copiado ? 'Copiado!' : 'Copiar al portapapeles'}
          </button>
          <button
            onClick={descargar}
            className="flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Download className="h-4 w-4" />
            Descargar .txt
          </button>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

interface ChecklistPanelProps {
  tipoCese: TipoCese
}

function ChecklistPanel({ tipoCese }: ChecklistPanelProps) {
  const items = getChecklist(tipoCese)
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  const toggle = (i: number) => setChecked(prev => ({ ...prev, [i]: !prev[i] }))
  const done = Object.values(checked).filter(Boolean).length

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          Documentos Requeridos
        </h3>
        <span className="text-xs text-slate-500">{done}/{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            className="flex items-start gap-2.5 w-full text-left group"
          >
            <div className={cn(
              'mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors',
              checked[i]
                ? 'border-green-500 bg-green-500/20'
                : 'border-white/20 bg-white/5 group-hover:border-white/40',
            )}>
              {checked[i] && <Check className="h-2.5 w-2.5 text-green-400" />}
            </div>
            <span className={cn(
              'text-xs leading-relaxed transition-colors',
              checked[i] ? 'text-slate-500 line-through' : 'text-slate-300',
            )}>
              {item}
            </span>
          </button>
        ))}
      </div>
      {done === items.length && items.length > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-900/20 border border-green-500/30 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          <span className="text-xs text-green-300">Todos los documentos listos</span>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function CesePage() {
  const params = useParams()
  const workerId = params.id as string

  const [worker, setWorker] = useState<WorkerInfo | null>(null)
  const [ceseRecord, setCeseRecord] = useState<CeseRecord | null>(null)
  const [etapasRequeridas, setEtapasRequeridas] = useState<EtapaCese[]>([])
  const [baseLegal, setBaseLegal] = useState<BaseLegal[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for initiating cese
  const [selectedTipo, setSelectedTipo] = useState<TipoCese | null>(null)
  const [causaDetalle, setCausaDetalle] = useState('')
  const [fechaCese, setFechaCese] = useState(new Date().toISOString().slice(0, 10))
  const [observaciones, setObservaciones] = useState('')

  // Faltas graves multi-select
  const [selectedFaltas, setSelectedFaltas] = useState<Set<string>>(new Set())

  // Liquidacion state
  const [liquidacionData, setLiquidacionData] = useState<{
    ctsMonto: number
    vacacionesMonto: number
    gratificacionMonto: number
    indemnizacionMonto: number
    totalLiquidacion: number
  } | null>(null)

  // Anular modal
  const [showAnular, setShowAnular] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  // Carta modal
  const [cartaModal, setCartaModal] = useState<{ titulo: string; contenido: string } | null>(null)

  // ── Sync faltas → causaDetalle ────────────────────────────────────────
  useEffect(() => {
    if (selectedTipo !== 'DESPIDO_CAUSA_JUSTA') return
    if (selectedFaltas.size === 0) return
    const texto = FALTAS_GRAVES
      .filter(f => selectedFaltas.has(f.id))
      .map(f => `- ${f.texto} (${f.articulo})`)
      .join('\n')
    setCausaDetalle(texto)
  }, [selectedFaltas, selectedTipo])

  const toggleFalta = (id: string) => {
    setSelectedFaltas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Load cese state ──────────────────────────────────────────────────
  const loadCese = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workers/${workerId}/cese`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}: No se pudo cargar el proceso de cese`)
      }
      const data = await res.json()
      setWorker(data.worker)
      setCeseRecord(data.ceseRecord ?? null)
      setEtapasRequeridas(data.etapasRequeridas ?? [])
      setBaseLegal(data.baseLegal ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado al cargar la pagina')
    } finally {
      setLoading(false)
    }
  }, [workerId])

  useEffect(() => {
    loadCese()
  }, [loadCese])

  // ── Start cese process ──────────────────────────────────────────────
  const iniciarCese = async () => {
    if (!selectedTipo || !fechaCese) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workers/${workerId}/cese`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoCese: selectedTipo,
          causaDetalle: causaDetalle || undefined,
          fechaCese,
          observaciones: observaciones || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'No se pudo iniciar el proceso de cese')
      }
      await loadCese()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No pudimos iniciar el proceso de cese. Revisa la conexión e intentá de nuevo.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  // ── Advance stage ───────────────────────────────────────────────────
  const avanzarEtapa = async (extra?: Record<string, unknown>) => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workers/${workerId}/cese`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'AVANZAR_ETAPA', ...extra }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'No se pudo avanzar de etapa')
      }
      await loadCese()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No pudimos avanzar la etapa. Intentá en unos segundos.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  // ── Save liquidacion ───────────────────────────────────────────────
  const guardarLiquidacion = async () => {
    if (!liquidacionData) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workers/${workerId}/cese`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GUARDAR_LIQUIDACION',
          ...liquidacionData,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'No se pudo guardar la liquidación')
      }
      await loadCese()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No pudimos guardar la liquidación. Intentá en unos segundos.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  // ── Load liquidacion calculation ──────────────────────────────────
  const calcularLiquidacion = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/workers/${workerId}/liquidacion`)
      if (!res.ok) {
        throw new Error(
          'No pudimos calcular la liquidación. Asegurate de que el trabajador tenga fecha de cese y motivo registrados.',
        )
      }
      const data = await res.json()
      const r = data.result
      setLiquidacionData({
        ctsMonto: r.breakdown.cts.amount,
        vacacionesMonto: r.breakdown.vacacionesTruncas.amount + r.breakdown.vacacionesNoGozadas.amount,
        gratificacionMonto: r.breakdown.gratificacionTrunca.amount + r.breakdown.bonificacionEspecial.amount,
        indemnizacionMonto: r.breakdown.indemnizacion?.amount ?? 0,
        totalLiquidacion: r.totalBruto,
      })
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No pudimos calcular la liquidación. Revisa los datos del trabajador.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  // ── Complete cese ──────────────────────────────────────────────────
  const completarCese = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workers/${workerId}/cese`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'COMPLETAR_CESE' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'No se pudo completar el cese')
      }
      await loadCese()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No pudimos completar el cese. Intentá de nuevo en unos segundos.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  // ── Anular ────────────────────────────────────────────────────────
  const anularCese = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workers/${workerId}/cese`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ANULAR',
          observaciones: motivoAnulacion,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'No se pudo anular el cese')
      }
      setShowAnular(false)
      setMotivoAnulacion('')
      await loadCese()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No pudimos anular. Intentá de nuevo.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  // ── Ver carta handlers ────────────────────────────────────────────
  const verCartaPreaviso = () => {
    if (!worker || !ceseRecord) return
    setCartaModal({
      titulo: 'Carta de Preaviso',
      contenido: generarCartaPreaviso(worker, ceseRecord),
    })
  }

  const verCartaDespido = () => {
    if (!worker || !ceseRecord) return
    setCartaModal({
      titulo: 'Carta de Despido',
      contenido: generarCartaDespido(worker, ceseRecord),
    })
  }

  // ── Derived state ─────────────────────────────────────────────────
  const procesoActivo = ceseRecord && ceseRecord.etapa !== 'COMPLETADO' && ceseRecord.etapa !== 'ANULADO'

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <p className="ml-3 text-slate-400">Cargando...</p>
      </div>
    )
  }

  // ── Fixed error state (bug fix: shows actual error, not generic message) ──
  if (!worker) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-6 text-center space-y-3">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
        <p className="text-red-300 font-medium">{error || 'Trabajador no encontrado'}</p>
        <Link href="/dashboard/trabajadores" className="inline-block text-sm text-emerald-600 hover:underline">
          Volver a Trabajadores
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/trabajadores/${workerId}`}
            className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Scale className="h-6 w-6 text-amber-400" />
              Proceso de Cese
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {displayWorkerName(worker.firstName, worker.lastName)} — DNI: {worker.dni}
            </p>
          </div>
        </div>

        {procesoActivo && (
          <button
            onClick={() => setShowAnular(true)}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-2 text-sm text-red-400 hover:bg-red-900/40 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            Anular Proceso
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Worker summary card */}
      <div className="rounded-xl border border-white/[0.08] bg-white p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <InfoItem label="Regimen" value={REGIMEN_LABELS[worker.regimenLaboral] ?? worker.regimenLaboral} />
          <InfoItem label="Tipo Contrato" value={worker.tipoContrato.replace(/_/g, ' ')} />
          <InfoItem label="Cargo" value={worker.position ?? '—'} />
          <InfoItem label="Fecha Ingreso" value={fmtDate(worker.fechaIngreso)} />
          <InfoItem label="Sueldo Bruto" value={fmt(worker.sueldoBruto)} />
          <InfoItem
            label="Estado"
            value={worker.status === 'ACTIVE' ? 'Activo' : worker.status === 'TERMINATED' ? 'Cesado' : worker.status}
            valueClass={worker.status === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}
          />
        </div>
      </div>

      {/* ─── NO PROCESO: Iniciar nuevo ──────────────────────────────── */}
      {!ceseRecord && worker.status !== 'TERMINATED' && (
        <div className="space-y-6">
          {/* Tipo de cese selection */}
          <div className="rounded-xl border border-white/[0.08] bg-white p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-400" />
              Seleccionar Tipo de Cese
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TIPO_CESE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSelectedTipo(opt.value)
                    setSelectedFaltas(new Set())
                    setCausaDetalle('')
                  }}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                    selectedTipo === opt.value
                      ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30'
                      : 'border-white/[0.08] bg-white/5 hover:border-white/20 hover:bg-white/10',
                  )}
                >
                  <div className="mt-0.5 shrink-0">{opt.icon}</div>
                  <div>
                    <p className={cn(
                      'text-sm font-semibold',
                      selectedTipo === opt.value ? 'text-amber-400' : 'text-white',
                    )}>
                      {opt.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form fields (show when tipo selected) */}
          {selectedTipo && (
            <div className="rounded-xl border border-white/[0.08] bg-white p-5 space-y-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-400" />
                Datos del Cese
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Fecha de Cese Efectivo
                  </label>
                  <input
                    type="date"
                    value={fechaCese}
                    onChange={e => setFechaCese(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.12] bg-[#0f172a] px-3 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Faltas graves selector for DESPIDO_CAUSA_JUSTA */}
              {selectedTipo === 'DESPIDO_CAUSA_JUSTA' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">
                      Faltas Graves — Art. 25 D.Leg. 728 (seleccion multiple)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Seleccione las faltas graves aplicables. Se auto-completara el campo de causa.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {FALTAS_GRAVES.map(falta => (
                      <button
                        key={falta.id}
                        type="button"
                        onClick={() => toggleFalta(falta.id)}
                        className={cn(
                          'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all',
                          selectedFaltas.has(falta.id)
                            ? 'border-red-500/40 bg-red-900/20'
                            : 'border-white/[0.08] bg-white/5 hover:border-white/20 hover:bg-white/10',
                        )}
                      >
                        <div className={cn(
                          'mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors',
                          selectedFaltas.has(falta.id)
                            ? 'border-red-500 bg-red-500/30'
                            : 'border-white/20',
                        )}>
                          {selectedFaltas.has(falta.id) && (
                            <Check className="h-2.5 w-2.5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className={cn(
                            'text-xs font-medium leading-snug',
                            selectedFaltas.has(falta.id) ? 'text-red-300' : 'text-slate-300',
                          )}>
                            {falta.texto}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{falta.articulo}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Causa detalle textarea */}
              {(selectedTipo === 'DESPIDO_CAUSA_JUSTA' || selectedTipo === 'DESPIDO_ARBITRARIO') && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    {selectedTipo === 'DESPIDO_CAUSA_JUSTA'
                      ? 'Descripcion de Hechos Imputados'
                      : 'Motivo del Despido'}
                  </label>
                  <textarea
                    value={causaDetalle}
                    onChange={e => setCausaDetalle(e.target.value)}
                    rows={4}
                    placeholder={
                      selectedTipo === 'DESPIDO_CAUSA_JUSTA'
                        ? 'Descripcion detallada de los hechos que constituyen la falta grave...'
                        : 'Motivo del despido (opcional para carta)...'
                    }
                    className="w-full rounded-lg border border-white/[0.12] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  rows={2}
                  placeholder="Notas adicionales sobre el proceso..."
                  className="w-full rounded-lg border border-white/[0.12] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                />
              </div>

              {/* Warning for despido arbitrario */}
              {selectedTipo === 'DESPIDO_ARBITRARIO' && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-3 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700">
                      Indemnizacion Obligatoria (Art. 38 D.Leg. 728)
                    </p>
                    <p className="mt-1 text-xs text-amber-400/80">
                      El despido arbitrario genera la obligacion de pagar una indemnizacion
                      equivalente a 1.5 remuneraciones mensuales por cada ano completo de servicios,
                      con un tope de 12 remuneraciones. Las fracciones de ano se abonan por dozavos y treintavos.
                    </p>
                  </div>
                </div>
              )}

              {/* Warning for despido causa justa */}
              {selectedTipo === 'DESPIDO_CAUSA_JUSTA' && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-900/20 px-4 py-3 flex items-start gap-3">
                  <BookOpen className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-600">
                      Procedimiento Legal Obligatorio (Art. 31-32 D.Leg. 728)
                    </p>
                    <p className="mt-1 text-xs text-emerald-600/80">
                      1. Se generara la <strong>Carta de Preaviso</strong> notificando la falta grave.<br />
                      2. El trabajador tendra <strong>6 dias naturales</strong> para presentar descargos.<br />
                      3. Tras evaluar los descargos, se emite la <strong>Carta de Despido</strong> con fecha de cese.<br />
                      4. Luego se calcula y paga la liquidacion dentro de las <strong>48 horas</strong> del cese.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={iniciarCese}
                disabled={actionLoading || !fechaCese}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Iniciar Proceso de Cese
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Worker already terminated (no active process) ─────────── */}
      {!ceseRecord && worker.status === 'TERMINATED' && (
        <div className="rounded-xl border border-slate-700 bg-white p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">Trabajador ya Cesado</h3>
          <p className="text-sm text-slate-400">
            Este trabajador ya fue cesado anteriormente. No se encontro un registro de proceso de cese asociado.
          </p>
        </div>
      )}

      {/* ─── PROCESO ACTIVO: Timeline + acciones ───────────────────── */}
      {ceseRecord && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left: Timeline + Stage actions */}
          <div className="space-y-6">
            {/* Progress timeline */}
            <div className="rounded-xl border border-white/[0.08] bg-white p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                Progreso del Proceso
              </h2>

              <div className="relative">
                {etapasRequeridas.map((etapa, i) => {
                  const currentIdx = etapasRequeridas.indexOf(ceseRecord.etapa)
                  const isCompleted = i < currentIdx || ceseRecord.etapa === 'COMPLETADO'
                  const isCurrent = i === currentIdx && ceseRecord.etapa !== 'COMPLETADO' && ceseRecord.etapa !== 'ANULADO'

                  return (
                    <div key={etapa} className="flex gap-3 pb-4 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                          isCompleted ? 'border-green-500 bg-green-500/20' :
                          isCurrent ? 'border-amber-400 bg-amber-100 animate-pulse' :
                          'border-white/20 bg-white/5',
                        )}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : isCurrent ? (
                            <Clock className="h-4 w-4 text-amber-400" />
                          ) : (
                            <span className="text-xs text-slate-500">{i + 1}</span>
                          )}
                        </div>
                        {i < etapasRequeridas.length - 1 && (
                          <div className={cn(
                            'w-0.5 flex-1 min-h-[16px]',
                            isCompleted ? 'bg-green-500/50' : 'bg-white/10',
                          )} />
                        )}
                      </div>

                      <div className="pt-1">
                        <p className={cn(
                          'text-sm font-medium',
                          isCompleted ? 'text-green-400' :
                          isCurrent ? 'text-amber-400' :
                          'text-slate-500',
                        )}>
                          {ETAPA_LABELS[etapa]}
                        </p>
                        {isCurrent && (
                          <p className="text-[11px] text-slate-400 mt-0.5">Etapa actual</p>
                        )}
                      </div>
                    </div>
                  )
                })}

                {ceseRecord.etapa === 'ANULADO' && (
                  <div className="flex items-center gap-3 rounded-lg bg-red-900/20 border border-red-500/30 px-3 py-2 mt-2">
                    <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    <p className="text-sm text-red-300">Proceso anulado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stage-specific actions */}
            {procesoActivo && (
              <div className="rounded-xl border border-white/[0.08] bg-white p-5 space-y-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-amber-400" />
                  Accion Requerida
                </h2>

                {/* CARTA_PREAVISO stage */}
                {ceseRecord.etapa === 'CARTA_PREAVISO' && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-blue-900/20 border border-blue-500/30 px-4 py-3">
                      <p className="text-sm text-emerald-600">
                        <strong>Paso actual:</strong> Se ha generado la Carta de Preaviso
                        {ceseRecord.fechaCartaPreaviso && (
                          <> (fecha: {fmtDate(ceseRecord.fechaCartaPreaviso)})</>
                        )}.
                        Debe notificar al trabajador y esperar el periodo de descargos.
                      </p>
                      {ceseRecord.fechaLimiteDescargos && (
                        <p className="mt-2 text-xs text-emerald-600">
                          <strong>Plazo para descargos:</strong> hasta el {fmtDate(ceseRecord.fechaLimiteDescargos)} (6 dias naturales — Art. 31 D.Leg. 728)
                        </p>
                      )}
                    </div>

                    <CountdownTimer fechaLimite={ceseRecord.fechaLimiteDescargos} />

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={verCartaPreaviso}
                        className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-900/20 px-4 py-2.5 text-sm text-emerald-600 hover:bg-blue-900/40 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        Ver Carta de Preaviso
                      </button>
                    </div>

                    <button
                      onClick={() => avanzarEtapa()}
                      disabled={actionLoading}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Confirmar Notificacion y Avanzar a Descargos
                    </button>
                  </div>
                )}

                {/* PERIODO_DESCARGOS stage */}
                {ceseRecord.etapa === 'PERIODO_DESCARGOS' && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-amber-900/20 border border-amber-500/30 px-4 py-3">
                      <p className="text-sm text-amber-700">
                        <strong>Periodo de descargos en curso.</strong> El trabajador tiene hasta
                        el {fmtDate(ceseRecord.fechaLimiteDescargos)} para presentar su defensa.
                      </p>
                      <p className="mt-2 text-xs text-amber-400/80">
                        Si los descargos no desvirtuan la falta grave, proceda a emitir la Carta de Despido.
                        Si los descargos son satisfactorios, puede anular el proceso.
                      </p>
                    </div>

                    <CountdownTimer fechaLimite={ceseRecord.fechaLimiteDescargos} />

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={verCartaPreaviso}
                        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-white/5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        Ver Carta de Preaviso
                      </button>
                    </div>

                    <button
                      onClick={() => avanzarEtapa({ fechaCartaDespido: new Date().toISOString().slice(0, 10) })}
                      disabled={actionLoading}
                      className="flex items-center gap-2 rounded-lg bg-red-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      Emitir Carta de Despido
                    </button>
                  </div>
                )}

                {/* CARTA_DESPIDO stage */}
                {ceseRecord.etapa === 'CARTA_DESPIDO' && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-red-900/20 border border-red-500/30 px-4 py-3">
                      <p className="text-sm text-red-300">
                        <strong>Carta de Despido emitida</strong>
                        {ceseRecord.fechaCartaDespido && <> el {fmtDate(ceseRecord.fechaCartaDespido)}</>}.
                        El siguiente paso es calcular y guardar la liquidacion de beneficios sociales.
                      </p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={verCartaDespido}
                        className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-2.5 text-sm text-red-300 hover:bg-red-900/40 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        Ver Carta de Despido
                      </button>
                    </div>

                    <button
                      onClick={calcularLiquidacion}
                      disabled={actionLoading}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                      Calcular Liquidacion
                    </button>
                  </div>
                )}

                {/* INICIADO stage (non despido_causa_justa, non periodo_prueba) */}
                {ceseRecord.etapa === 'INICIADO' && ceseRecord.tipoCese !== 'PERIODO_PRUEBA' && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-blue-900/20 border border-blue-500/30 px-4 py-3">
                      <p className="text-sm text-emerald-600">
                        Proceso de cese iniciado. Tipo: <strong>{TIPO_CESE_OPTIONS.find(o => o.value === ceseRecord.tipoCese)?.label ?? ceseRecord.tipoCese}</strong>.
                        Proceda a calcular la liquidacion de beneficios sociales.
                      </p>
                    </div>

                    {/* Show carta despido button for DESPIDO_ARBITRARIO */}
                    {ceseRecord.tipoCese === 'DESPIDO_ARBITRARIO' && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={verCartaDespido}
                          className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-900/40 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          Ver Carta de Despido
                        </button>
                      </div>
                    )}

                    <button
                      onClick={calcularLiquidacion}
                      disabled={actionLoading}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                      Calcular Liquidacion
                    </button>
                  </div>
                )}

                {/* INICIADO stage for PERIODO_PRUEBA (skip liquidacion) */}
                {ceseRecord.etapa === 'INICIADO' && ceseRecord.tipoCese === 'PERIODO_PRUEBA' && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-white border border-white/[0.08] px-4 py-3">
                      <p className="text-sm text-slate-300">
                        Cese dentro del <strong>periodo de prueba</strong> (Art. 10 D.Leg. 728).
                        No requiere expresion de causa ni pago de indemnizacion.
                        Solo corresponden beneficios truncos proporcionales.
                      </p>
                    </div>
                    <button
                      onClick={completarCese}
                      disabled={actionLoading}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Completar Cese
                    </button>
                  </div>
                )}

                {/* Show liquidacion preview when calculated */}
                {liquidacionData && (ceseRecord.etapa === 'INICIADO' || ceseRecord.etapa === 'CARTA_DESPIDO') && (
                  <div className="space-y-4 mt-2">
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                      <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Liquidacion Calculada
                      </h3>
                      <div className="space-y-3">
                        <LiqRow
                          label="CTS Trunca"
                          sublabel="Compensacion por Tiempo de Servicios (D.S. 001-97-TR)"
                          amount={liquidacionData.ctsMonto}
                        />
                        <LiqRow
                          label="Vacaciones"
                          sublabel="Vacaciones Truncas (Art. 23 D.Leg. 713)"
                          amount={liquidacionData.vacacionesMonto}
                        />
                        <LiqRow
                          label="Gratificacion Trunca"
                          sublabel="Gratificacion Trunca (Art. 7 Ley 27735)"
                          amount={liquidacionData.gratificacionMonto}
                        />
                        {liquidacionData.indemnizacionMonto > 0 && (
                          <LiqRow
                            label="Indemnizacion"
                            sublabel="Indemnizacion por Despido Arbitrario (Art. 38 D.Leg. 728)"
                            amount={liquidacionData.indemnizacionMonto}
                          />
                        )}
                        <div className="border-t border-amber-500/30 pt-3 flex items-center justify-between">
                          <span className="text-sm font-bold text-white">TOTAL BRUTO</span>
                          <span className="text-lg font-bold text-amber-400">{fmt(liquidacionData.totalLiquidacion)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        <strong>Art. 3 D.S. 001-97-TR:</strong> El pago debe realizarse dentro de las <strong>48 horas</strong> posteriores al cese efectivo.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={guardarLiquidacion}
                        disabled={actionLoading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Guardar Liquidacion
                      </button>
                      <Link
                        href={`/dashboard/liquidaciones?worker=${workerId}`}
                        className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/5 px-4 py-3 text-sm text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        Ver Detalle
                      </Link>
                    </div>
                  </div>
                )}

                {/* LIQUIDACION_CALCULADA stage */}
                {ceseRecord.etapa === 'LIQUIDACION_CALCULADA' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                      <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Liquidacion Guardada
                      </h3>
                      <div className="space-y-3">
                        <LiqRow
                          label="CTS Trunca"
                          sublabel="Compensacion por Tiempo de Servicios (D.S. 001-97-TR)"
                          amount={ceseRecord.ctsMonto}
                        />
                        <LiqRow
                          label="Vacaciones"
                          sublabel="Vacaciones Truncas (Art. 23 D.Leg. 713)"
                          amount={ceseRecord.vacacionesMonto}
                        />
                        <LiqRow
                          label="Gratificacion Trunca"
                          sublabel="Gratificacion Trunca (Art. 7 Ley 27735)"
                          amount={ceseRecord.gratificacionMonto}
                        />
                        {ceseRecord.indemnizacionMonto > 0 && (
                          <LiqRow
                            label="Indemnizacion"
                            sublabel="Indemnizacion por Despido Arbitrario (Art. 38 D.Leg. 728)"
                            amount={ceseRecord.indemnizacionMonto}
                          />
                        )}
                        <div className="border-t border-amber-500/30 pt-3 flex items-center justify-between">
                          <span className="text-sm font-bold text-white">TOTAL BRUTO</span>
                          <span className="text-lg font-bold text-amber-400">{fmt(ceseRecord.totalLiquidacion)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-amber-900/20 border border-amber-500/30 px-4 py-3">
                      <p className="text-sm text-amber-700">
                        <strong>Art. 3 D.S. 001-97-TR:</strong> El pago de la liquidacion debe realizarse
                        dentro de las <strong>48 horas</strong> posteriores al cese efectivo.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => avanzarEtapa()}
                        disabled={actionLoading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                        Confirmar Pago de Liquidacion
                      </button>
                      <button
                        onClick={() => {
                          window.open(`/api/workers/${workerId}/liquidacion/pdf`, '_blank')
                        }}
                        className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/5 px-4 py-3 text-sm text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </button>
                    </div>
                  </div>
                )}

                {/* LIQUIDACION_PAGADA stage */}
                {ceseRecord.etapa === 'LIQUIDACION_PAGADA' && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-green-900/20 border border-green-500/30 px-4 py-3">
                      <p className="text-sm text-green-300">
                        Liquidacion pagada. Proceda a completar el proceso de cese.
                        Esto marcara al trabajador como <strong>CESADO</strong> en el sistema.
                      </p>
                    </div>
                    <button
                      onClick={completarCese}
                      disabled={actionLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Completar Cese — Marcar Trabajador como Cesado
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Completed state */}
            {ceseRecord.etapa === 'COMPLETADO' && (
              <div className="rounded-xl border border-green-500/30 bg-green-900/20 p-6 text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
                <h3 className="text-lg font-semibold text-green-300">Proceso de Cese Completado</h3>
                <p className="text-sm text-green-400/80">
                  El trabajador ha sido marcado como cesado. La liquidacion de {fmt(ceseRecord.totalLiquidacion)} ha sido registrada.
                </p>
                {ceseRecord.fechaPagoLiquidacion && (
                  <p className="text-xs text-slate-400">
                    Pago registrado: {fmtDate(ceseRecord.fechaPagoLiquidacion)}
                  </p>
                )}
              </div>
            )}

            {/* Document checklist for active process */}
            {ceseRecord && <ChecklistPanel tipoCese={ceseRecord.tipoCese} />}
          </div>

          {/* Right: Summary + Legal */}
          <div className="space-y-4">
            {/* Cese summary */}
            <div className="rounded-xl border border-white/[0.08] bg-white p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Scale className="h-4 w-4 text-amber-400" />
                Resumen del Cese
              </h3>
              <div className="space-y-2 text-xs">
                <SummaryRow label="Tipo" value={TIPO_CESE_OPTIONS.find(o => o.value === ceseRecord.tipoCese)?.label ?? ceseRecord.tipoCese} />
                <SummaryRow label="Etapa" value={ETAPA_LABELS[ceseRecord.etapa]} />
                <SummaryRow label="Fecha Inicio" value={fmtDate(ceseRecord.fechaInicioProceso)} />
                <SummaryRow label="Fecha Cese" value={fmtDate(ceseRecord.fechaCese)} />
                {ceseRecord.fechaCartaPreaviso && (
                  <SummaryRow label="Carta Preaviso" value={fmtDate(ceseRecord.fechaCartaPreaviso)} />
                )}
                {ceseRecord.fechaLimiteDescargos && (
                  <SummaryRow label="Limite Descargos" value={fmtDate(ceseRecord.fechaLimiteDescargos)} />
                )}
                {ceseRecord.fechaCartaDespido && (
                  <SummaryRow label="Carta Despido" value={fmtDate(ceseRecord.fechaCartaDespido)} />
                )}
                {ceseRecord.totalLiquidacion > 0 && (
                  <SummaryRow label="Total Liquidacion" value={fmt(ceseRecord.totalLiquidacion)} highlight />
                )}
              </div>
              {ceseRecord.causaDetalle && (
                <div className="mt-2 rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Causa</p>
                  <p className="text-xs text-slate-300 whitespace-pre-line">{ceseRecord.causaDetalle}</p>
                </div>
              )}
              {ceseRecord.observaciones && (
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Observaciones</p>
                  <p className="text-xs text-slate-300">{ceseRecord.observaciones}</p>
                </div>
              )}
            </div>

            {/* Cartas panel — show when carta actions available */}
            {ceseRecord.tipoCese === 'DESPIDO_CAUSA_JUSTA' && (
              <div className="rounded-xl border border-white/[0.08] bg-white p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Documentos del Proceso
                </h3>
                {(ceseRecord.etapa === 'CARTA_PREAVISO' || ceseRecord.etapa === 'PERIODO_DESCARGOS' || ceseRecord.etapa === 'CARTA_DESPIDO' || ceseRecord.etapa === 'LIQUIDACION_CALCULADA' || ceseRecord.etapa === 'LIQUIDACION_PAGADA' || ceseRecord.etapa === 'COMPLETADO') && (
                  <button
                    onClick={verCartaPreaviso}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <FileText className="h-4 w-4 text-emerald-600" />
                    Ver Carta de Preaviso
                  </button>
                )}
                {(ceseRecord.etapa === 'CARTA_DESPIDO' || ceseRecord.etapa === 'LIQUIDACION_CALCULADA' || ceseRecord.etapa === 'LIQUIDACION_PAGADA' || ceseRecord.etapa === 'COMPLETADO') && (
                  <button
                    onClick={verCartaDespido}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <FileText className="h-4 w-4 text-red-400" />
                    Ver Carta de Despido
                  </button>
                )}
              </div>
            )}

            {ceseRecord.tipoCese === 'DESPIDO_ARBITRARIO' && (
              <div className="rounded-xl border border-white/[0.08] bg-white p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Documentos del Proceso
                </h3>
                <button
                  onClick={verCartaDespido}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FileText className="h-4 w-4 text-amber-400" />
                  Ver Carta de Despido
                </button>
              </div>
            )}

            {/* Base legal */}
            {baseLegal.length > 0 && (
              <div className="rounded-xl border border-white/[0.08] bg-white p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Base Legal Aplicada
                </h3>
                <div className="space-y-2">
                  {baseLegal.map((ref, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500 mt-0.5" />
                      <div>
                        <span className="text-xs font-semibold text-emerald-600">
                          {ref.norma} {ref.articulo}
                        </span>
                        <span className="text-xs text-slate-400"> — {ref.descripcion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="rounded-xl border border-white/[0.08] bg-white p-4 space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Acciones Rapidas
              </h3>
              <Link
                href={`/dashboard/liquidaciones?worker=${workerId}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Banknote className="h-4 w-4 text-amber-400" />
                Ver Liquidacion Completa
              </Link>
              <Link
                href={`/dashboard/trabajadores/${workerId}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <User className="h-4 w-4 text-emerald-600" />
                Perfil del Trabajador
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Anular proceso ─────────────────────────────────── */}
      {showAnular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" />
              Anular Proceso de Cese
            </h3>
            <p className="text-sm text-slate-400">
              Esta accion anulara el proceso de cese. El trabajador permanecera activo.
            </p>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Motivo de Anulacion
              </label>
              <textarea
                value={motivoAnulacion}
                onChange={e => setMotivoAnulacion(e.target.value)}
                rows={3}
                placeholder="Explique el motivo de la anulacion..."
                className="w-full rounded-lg border border-white/[0.12] bg-[#0f172a] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowAnular(false); setMotivoAnulacion('') }}
                className="flex-1 rounded-lg border border-white/[0.08] py-2.5 text-sm text-slate-400 hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={anularCese}
                disabled={actionLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Confirmar Anulacion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Ver carta ──────────────────────────────────────── */}
      {cartaModal && (
        <CartaModal
          titulo={cartaModal.titulo}
          contenido={cartaModal.contenido}
          onClose={() => setCartaModal(null)}
        />
      )}
    </div>
  )
}
