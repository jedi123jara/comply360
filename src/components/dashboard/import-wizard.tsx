'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X,
  Columns,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================
// Types
// =============================================

interface ParsedRow {
  rowNumber: number
  dni: string
  firstName: string
  lastName: string
  position: string
  department: string
  fechaIngreso: string
  sueldoBruto: number
  regimenLaboral: string
  tipoContrato: string
  tipoAporte: string
  afpNombre: string
  asignacionFamiliar: boolean
  jornadaSemanal: number
}

interface ParseError {
  row: number
  field: string
  message: string
}

interface PreviewData {
  totalRows: number
  validCount: number
  errorCount: number
  validRows: ParsedRow[]
  errors: ParseError[]
  headers: string[]
  detectedMapping: Record<string, string>
}

interface ImportResult {
  message: string
  imported: number
  skipped: number
  total: number
}

type WizardStep = 1 | 2 | 3 | 4

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Subir archivo',
  2: 'Mapeo de columnas',
  3: 'Validacion',
  4: 'Confirmar',
}

const FIELD_LABELS: Record<string, string> = {
  dni: 'DNI',
  firstName: 'Nombres',
  lastName: 'Apellidos',
  position: 'Cargo',
  department: 'Departamento',
  fechaIngreso: 'Fecha Ingreso',
  sueldoBruto: 'Sueldo Bruto',
  regimenLaboral: 'Regimen Laboral',
  tipoContrato: 'Tipo Contrato',
  tipoAporte: 'Tipo Aporte',
  afpNombre: 'AFP Nombre',
  asignacionFamiliar: 'Asignacion Familiar',
  jornadaSemanal: 'Jornada Semanal',
}

const ALL_FIELDS = Object.keys(FIELD_LABELS)

// =============================================
// Component
// =============================================

export default function ImportWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<WizardStep>(1)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [importToken, setImportToken] = useState<string | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- File handling ---
  const handleFileSelect = useCallback((selectedFile: File) => {
    const name = selectedFile.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.txt')) {
      setError('Solo se aceptan archivos CSV (.csv)')
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('El archivo excede el tamano maximo de 5MB')
      return
    }
    setFile(selectedFile)
    setError(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) handleFileSelect(droppedFile)
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  // --- Upload and parse ---
  const uploadAndParse = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Include custom mapping if user modified it
      if (Object.keys(mapping).length > 0) {
        formData.append('mapping', JSON.stringify(mapping))
      }

      const res = await fetch('/api/workers/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al procesar el archivo')
        return
      }

      setPreview(data.preview)
      setImportToken(data.importToken)

      // Set detected mapping
      if (data.preview.detectedMapping) {
        setMapping(data.preview.detectedMapping)
      }

      setStep(2)
    } catch {
      setError('Error de conexion al servidor')
    } finally {
      setLoading(false)
    }
  }, [file, mapping])

  // --- Re-parse with updated mapping ---
  const reparseWithMapping = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mapping', JSON.stringify(mapping))

      const res = await fetch('/api/workers/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al reprocesar')
        return
      }

      setPreview(data.preview)
      setImportToken(data.importToken)
      setStep(3)
    } catch {
      setError('Error de conexion al servidor')
    } finally {
      setLoading(false)
    }
  }, [file, mapping])

  // --- Confirm import ---
  const confirmImport = useCallback(async () => {
    if (!importToken) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/workers/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al importar')
        return
      }

      setImportResult(data)
      setStep(4)
    } catch {
      setError('Error de conexion al servidor')
    } finally {
      setLoading(false)
    }
  }, [importToken])

  // --- Download template ---
  const downloadTemplate = useCallback(() => {
    const headers = [
      'DNI',
      'Nombres',
      'Apellidos',
      'Cargo',
      'Departamento',
      'Fecha Ingreso',
      'Sueldo Bruto',
      'Regimen Laboral',
      'Tipo Contrato',
      'Tipo Aporte',
      'AFP Nombre',
      'Asignacion Familiar',
      'Jornada Semanal',
    ]
    const example = [
      '12345678',
      'Juan Carlos',
      'Perez Lopez',
      'Analista',
      'Contabilidad',
      '15/03/2024',
      '3500.00',
      'General',
      'Indefinido',
      'AFP',
      'Prima',
      'Si',
      '48',
    ]
    const csv = '\uFEFF' + headers.join(',') + '\n' + example.join(',') + '\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_trabajadores.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // --- Mapping change handler ---
  const handleMappingChange = useCallback(
    (csvHeader: string, fieldName: string) => {
      setMapping((prev) => {
        const next = { ...prev }
        if (fieldName === '') {
          delete next[csvHeader]
        } else {
          next[csvHeader] = fieldName
        }
        return next
      })
    },
    []
  )

  // --- Progress bar ---
  const progress = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-[#141824] shadow-2xl bg-[#141824]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 border-white/[0.08]">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-white">
              Importar Trabajadores
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-[color:var(--neutral-100)] hover:text-gray-600 hover:bg-[color:var(--neutral-100)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="mb-2 flex justify-between text-xs text-gray-500">
            {([1, 2, 3, 4] as WizardStep[]).map((s) => (
              <span
                key={s}
                className={cn(
                  'font-medium',
                  s <= step ? 'text-blue-600' : ''
                )}
              >
                {s}. {STEP_LABELS[s]}
              </span>
            ))}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 bg-[color:var(--neutral-100)]">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Error banner */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* ======== STEP 1: Upload ======== */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors',
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-white/10 hover:border-gray-400 border-white/10',
                  file && 'border-green-500 bg-green-50'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileSelect(f)
                  }}
                />
                {file ? (
                  <>
                    <CheckCircle className="mb-3 h-12 w-12 text-green-500" />
                    <p className="text-lg font-medium text-white">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB - Listo para procesar
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-3 h-12 w-12 text-gray-400" />
                    <p className="text-lg font-medium text-gray-300">
                      Arrastra tu archivo CSV aqui
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      o haz clic para seleccionar - Maximo 5MB
                    </p>
                  </>
                )}
              </div>

              {/* Template download */}
              <div className="flex items-center justify-between rounded-lg bg-[color:var(--neutral-50)] px-4 py-3 bg-[color:var(--neutral-100)]/50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileSpreadsheet className="h-4 w-4" />
                  Descarga la plantilla CSV con las columnas requeridas
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 rounded-lg bg-[#141824] px-3 py-1.5 text-sm font-medium text-gray-300 shadow-sm ring-1 ring-gray-200 hover:bg-[color:var(--neutral-50)]"
                >
                  <Download className="h-4 w-4" />
                  Descargar plantilla
                </button>
              </div>

              {/* Required columns info */}
              <div className="rounded-lg border border-white/[0.08] p-4 border-white/10">
                <h3 className="mb-2 text-sm font-medium text-white">
                  Columnas requeridas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['DNI', 'Nombres', 'Apellidos', 'Fecha Ingreso', 'Sueldo Bruto'].map(
                    (col) => (
                      <span
                        key={col}
                        className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                      >
                        {col}
                      </span>
                    )
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Formato de fecha: DD/MM/YYYY. Delimitadores aceptados: coma, punto y coma, tabulador.
                </p>
              </div>
            </div>
          )}

          {/* ======== STEP 2: Column Mapping ======== */}
          {step === 2 && preview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Columns className="h-4 w-4" />
                Verifique que las columnas del archivo se mapearon correctamente
              </div>

              <div className="overflow-hidden rounded-lg border border-white/[0.08] border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]">
                      <th className="px-4 py-2.5 text-left font-medium text-gray-300">
                        Columna en CSV
                      </th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-300">
                        Campo del sistema
                      </th>
                      <th className="px-4 py-2.5 text-center font-medium text-gray-300">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.headers.map((header) => {
                      const mappedField = mapping[header] || ''
                      const isMapped = mappedField !== ''
                      return (
                        <tr key={header} className="hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]/50">
                          <td className="px-4 py-2.5 font-mono text-white">
                            {header}
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              value={mappedField}
                              onChange={(e) => handleMappingChange(header, e.target.value)}
                              className="w-full rounded-md border border-white/10 bg-[#141824] px-2 py-1 text-sm text-gray-300 border-white/10 bg-[color:var(--neutral-100)]"
                            >
                              <option value="">-- Sin mapear --</option>
                              {ALL_FIELDS.map((f) => (
                                <option key={f} value={f}>
                                  {FIELD_LABELS[f]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {isMapped ? (
                              <CheckCircle className="mx-auto h-4 w-4 text-green-500" />
                            ) : (
                              <span className="text-xs text-gray-400">Omitida</span>
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

          {/* ======== STEP 3: Validation Results ======== */}
          {step === 3 && preview && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-[color:var(--neutral-50)] p-4 bg-[color:var(--neutral-100)]/50">
                  <p className="text-sm text-gray-500">Total de filas</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {preview.totalRows}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm text-green-600">Validos</p>
                  <p className="mt-1 text-2xl font-bold text-green-700">
                    {preview.validCount}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm text-red-600">Con errores</p>
                  <p className="mt-1 text-2xl font-bold text-red-700">
                    {preview.errorCount}
                  </p>
                </div>
              </div>

              {/* Errors list */}
              {preview.errors.length > 0 && (
                <div className="rounded-lg border border-red-200">
                  <div className="border-b border-red-200 bg-red-50 px-4 py-2.5">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-red-700">
                      <XCircle className="h-4 w-4" />
                      Errores encontrados ({preview.errors.length})
                    </h3>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-red-50/50">
                          <th className="px-4 py-2 text-left font-medium text-red-600">
                            Fila
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-red-600">
                            Campo
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-red-600">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {preview.errors.map((err, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-red-700">
                              {err.row}
                            </td>
                            <td className="px-4 py-2 font-medium text-red-700">
                              {err.field}
                            </td>
                            <td className="px-4 py-2 text-red-600">
                              {err.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Valid rows preview */}
              {preview.validRows.length > 0 && (
                <div className="rounded-lg border border-green-200">
                  <div className="border-b border-green-200 bg-green-50 px-4 py-2.5">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      Registros validos (primeros {Math.min(preview.validRows.length, 50)})
                    </h3>
                  </div>
                  <div className="max-h-60 overflow-x-auto overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-green-50/50">
                          <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-green-600">
                            DNI
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-green-600">
                            Nombres
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-green-600">
                            Apellidos
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-green-600">
                            Cargo
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-green-600">
                            Sueldo
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-100">
                        {preview.validRows.map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-white">
                              {row.dni}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-300">
                              {row.firstName}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-300">
                              {row.lastName}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                              {row.position || '-'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-gray-300">
                              S/ {row.sueldoBruto.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======== STEP 4: Result ======== */}
          {step === 4 && importResult && (
            <div className="flex flex-col items-center py-8">
              <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
              <h3 className="text-xl font-semibold text-white">
                Importacion completada
              </h3>
              <p className="mt-2 text-gray-600">{importResult.message}</p>

              <div className="mt-6 grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {importResult.imported}
                  </p>
                  <p className="text-sm text-gray-500">Importados</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-600">
                    {importResult.skipped}
                  </p>
                  <p className="text-sm text-gray-500">Omitidos</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-600">
                    {importResult.total}
                  </p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-8 flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Users className="h-4 w-4" />
                Ir a Trabajadores
              </button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {step !== 4 && (
          <div className="flex items-center justify-between border-t border-white/[0.08] px-6 py-4 border-white/[0.08]">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as WizardStep)}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-[color:var(--neutral-100)] hover:bg-[color:var(--neutral-100)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </button>
              )}
            </div>
            <div>
              {step === 1 && (
                <button
                  type="button"
                  onClick={uploadAndParse}
                  disabled={!file || loading}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium text-white',
                    file && !loading
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'cursor-not-allowed bg-gray-300'
                  )}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Procesar archivo
                </button>
              )}
              {step === 2 && (
                <button
                  type="button"
                  onClick={reparseWithMapping}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Validar datos
                </button>
              )}
              {step === 3 && preview && preview.validCount > 0 && (
                <button
                  type="button"
                  onClick={confirmImport}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Importar {preview.validCount} trabajadores
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
