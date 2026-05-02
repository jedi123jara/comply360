'use client'

/**
 * /dashboard/contratos/bulk — Generación masiva de contratos.
 * Generador de Contratos / Chunk 7.
 *
 * Flujo:
 *   1. Usuario sube Excel/CSV + elige tipo de contrato
 *   2. POST /api/contracts/bulk/preview → muestra filas válidas / inválidas
 *   3. Usuario confirma y selecciona qué filas generar
 *   4. POST /api/contracts/bulk/generate → descarga ZIP con DOCX + manifest
 *
 * Limit: 200 filas por archivo (síncrono, sin Redis).
 */

import { useState, useCallback } from 'react'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Package,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'

type ContractType = 'LABORAL_INDEFINIDO' | 'LABORAL_PLAZO_FIJO' | 'LABORAL_TIEMPO_PARCIAL'

interface ValidationRow {
  rowIndex: number
  raw: Record<string, unknown>
  normalized: Record<string, unknown> | null
  errors: string[]
  warnings: string[]
  valid: boolean
}

interface PreviewResult {
  totalRows: number
  validRows: number
  invalidRows: number
  rows: ValidationRow[]
  detectedColumns: string[]
  contractType: ContractType
  sourceFileName: string
  columnMapping: Record<string, string>
}

const TYPE_LABELS: Record<ContractType, string> = {
  LABORAL_INDEFINIDO: 'Plazo Indeterminado',
  LABORAL_PLAZO_FIJO: 'Plazo Fijo',
  LABORAL_TIEMPO_PARCIAL: 'Tiempo Parcial',
}

export default function BulkContractsPage() {
  const { toast } = useToast()
  const [contractType, setContractType] = useState<ContractType>('LABORAL_INDEFINIDO')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [generating, setGenerating] = useState(false)
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set())

  const onUpload = useCallback(async (file: File) => {
    setUploading(true)
    setPreview(null)
    setExcludedRows(new Set())
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('contractType', contractType)
      const res = await fetch('/api/contracts/bulk/preview', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Error procesando el archivo')
      }
      const data = await res.json()
      setPreview(data.data)
      // Excluir por default las inválidas
      const invalid = new Set<number>(
        (data.data.rows as ValidationRow[]).filter((r) => !r.valid).map((r) => r.rowIndex),
      )
      setExcludedRows(invalid)
      toast({
        title: `${data.data.validRows} fila${data.data.validRows === 1 ? '' : 's'} válidas detectadas`,
        description: data.data.invalidRows > 0 ? `${data.data.invalidRows} con errores (excluidas)` : '',
        type: 'success',
      })
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Error procesando archivo',
        type: 'error',
      })
    } finally {
      setUploading(false)
    }
  }, [contractType, toast])

  async function generateZip() {
    if (!preview) return
    const rows = preview.rows
      .filter((r) => r.valid && !excludedRows.has(r.rowIndex))
      .map((r) => r.normalized)
    if (rows.length === 0) {
      toast({ title: 'No hay filas válidas para generar', type: 'error' })
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/contracts/bulk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType: preview.contractType,
          rows,
          sourceFileName: preview.sourceFileName,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Error generando contratos')
      }
      const blob = await res.blob()
      const jobId = res.headers.get('X-Bulk-Job-Id') ?? 'job'
      const succeeded = res.headers.get('X-Bulk-Succeeded') ?? '0'
      const failed = res.headers.get('X-Bulk-Failed') ?? '0'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `contratos-${jobId}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast({
        title: `${succeeded} contratos generados ✓`,
        description: failed !== '0' ? `${failed} fallaron — revisa /api/contracts/bulk/jobs/${jobId}` : 'ZIP descargado',
        type: 'success',
      })
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Error', type: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  function toggleRow(rowIndex: number) {
    setExcludedRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowIndex)) next.delete(rowIndex)
      else next.add(rowIndex)
      return next
    })
  }

  const includedCount = preview
    ? preview.rows.filter((r) => r.valid && !excludedRows.has(r.rowIndex)).length
    : 0

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/contratos" className="flex items-center gap-1 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          Contratos
        </Link>
        <span>·</span>
        <span className="text-slate-900 font-medium">Generación masiva</span>
      </div>

      <header>
        <h1 className="text-2xl font-bold text-slate-900">Generación masiva de contratos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Sube un Excel o CSV con tus trabajadores. Generamos un contrato (con .docx) por cada fila válida y te entregamos un ZIP listo para firmar.
        </p>
      </header>

      {/* Step 1: Upload */}
      {!preview && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">
                Tipo de contrato
              </label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value as ContractType)}
                className="w-full sm:w-80 border border-slate-300 rounded-lg p-2 text-sm"
              >
                <option value="LABORAL_INDEFINIDO">Plazo Indeterminado (D.Leg. 728)</option>
                <option value="LABORAL_PLAZO_FIJO">Plazo Fijo (Modal)</option>
                <option value="LABORAL_TIEMPO_PARCIAL">Tiempo Parcial</option>
              </select>
            </div>

            <UploadDropzone uploading={uploading} onFile={onUpload} />

            <div className="text-xs text-slate-500 space-y-1">
              <p>Columnas mínimas: <strong>Nombre / DNI / Cargo / Fecha de inicio / Sueldo</strong>. También aceptamos variantes (Nombres, Documento, Puesto, Inicio, Salario, Remuneración).</p>
              <p>Para plazo fijo: agrega <strong>Fecha de fin</strong> y opcionalmente <strong>Causa objetiva</strong>.</p>
              <p>Máximo 200 filas por archivo.</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {preview && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{preview.sourceFileName}</p>
                <p className="text-xs text-slate-500">
                  {preview.totalRows} filas · {preview.validRows} válidas · {preview.invalidRows} con errores · Tipo: {TYPE_LABELS[preview.contractType]}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setPreview(null); setExcludedRows(new Set()) }}
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cargar otro archivo
              </button>
              <button
                onClick={generateZip}
                disabled={generating || includedCount === 0}
                className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg disabled:opacity-50 inline-flex items-center gap-2"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Generar ZIP ({includedCount} contratos)
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="p-3 w-12">#</th>
                  <th className="p-3 w-12"></th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Trabajador</th>
                  <th className="p-3">DNI</th>
                  <th className="p-3">Cargo</th>
                  <th className="p-3">Inicio</th>
                  <th className="p-3">Remuneración</th>
                  <th className="p-3">Errores / avisos</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => {
                  const norm = (r.normalized ?? r.raw) as Record<string, unknown>
                  const excluded = excludedRows.has(r.rowIndex)
                  return (
                    <tr key={r.rowIndex} className={`border-b border-slate-100 ${excluded ? 'opacity-50' : ''} ${!r.valid ? 'bg-red-50' : ''}`}>
                      <td className="p-3 text-slate-500 font-mono text-xs">{r.rowIndex}</td>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={r.valid && !excluded}
                          disabled={!r.valid}
                          onChange={() => toggleRow(r.rowIndex)}
                        />
                      </td>
                      <td className="p-3">
                        {r.valid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Válida
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 text-xs font-semibold">
                            <XCircle className="w-3.5 h-3.5" /> Errores
                          </span>
                        )}
                      </td>
                      <td className="p-3">{String(norm.trabajador_nombre ?? '—')}</td>
                      <td className="p-3 font-mono text-xs">{String(norm.trabajador_dni ?? '—')}</td>
                      <td className="p-3">{String(norm.cargo ?? '—')}</td>
                      <td className="p-3 text-xs">{String(norm.fecha_inicio ?? '—')}</td>
                      <td className="p-3 text-right font-mono">
                        {norm.remuneracion ? `S/ ${Number(norm.remuneracion).toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3">
                        {r.errors.length > 0 && (
                          <ul className="text-xs text-red-700 space-y-0.5">
                            {r.errors.map((e, i) => (
                              <li key={i}>• {e}</li>
                            ))}
                          </ul>
                        )}
                        {r.warnings.length > 0 && (
                          <ul className="text-xs text-amber-700 space-y-0.5 mt-1">
                            {r.warnings.map((w, i) => (
                              <li key={i} className="inline-flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {w}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function UploadDropzone({ uploading, onFile }: { uploading: boolean; onFile: (f: File) => void }) {
  const [dragOver, setDragOver] = useState(false)
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
      className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        dragOver ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50'
      }`}
    >
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-2 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Procesando archivo…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-slate-600">
          <Upload className="w-10 h-10 text-slate-400" />
          <p className="text-sm font-semibold">Arrastra tu archivo aquí o haz clic para subir</p>
          <p className="text-xs text-slate-500">.xlsx · .xls · .csv (máx. 200 filas)</p>
        </div>
      )}
    </label>
  )
}
