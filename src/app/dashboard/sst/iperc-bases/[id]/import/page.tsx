'use client'

import { useState, useRef, type ChangeEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Upload,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Eye,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  parseIpercRows,
  type IpercImportRow,
  type IpercImportError,
} from '@/lib/sst/iperc-import'
import { calcularNivelRiesgo } from '@/lib/sst/iperc-matrix'

/**
 * Página: Importar matriz IPERC desde Excel.
 *
 * Flujo:
 *   1. Usuario descarga plantilla (botón "Descargar plantilla").
 *   2. Sube archivo .xlsx o .csv con sus filas.
 *   3. Cliente parsea con exceljs, valida con `parseIpercRows`, muestra preview
 *      con NR calculado en vivo + errores destacados.
 *   4. Botón "Importar N filas" envía JSON a /bulk-import.
 *   5. Tras éxito, redirige al editor IPERC.
 */

export default function ImportIpercPage() {
  const params = useParams<{ id: string }>()
  const ipercId = params.id
  const router = useRouter()

  const fileRef = useRef<HTMLInputElement>(null)
  const [parsedRows, setParsedRows] = useState<IpercImportRow[]>([])
  const [parseErrors, setParseErrors] = useState<IpercImportError[]>([])
  const [skippedEmpty, setSkippedEmpty] = useState(0)
  const [filename, setFilename] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setParsedRows([])
    setParseErrors([])
    setSkippedEmpty(0)
    setFilename(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setFilename(file.name)

    try {
      const lowerName = file.name.toLowerCase()
      if (lowerName.endsWith('.xls')) {
        throw new Error('El formato .xls heredado ya no se acepta por seguridad. Guarda el archivo como .xlsx o .csv.')
      }

      const {
        firstWorksheet,
        loadWorkbook,
        parseCsvObjects,
        worksheetToJson,
      } = await import('@/lib/excel/exceljs')

      const raw = lowerName.endsWith('.csv')
        ? parseCsvObjects(await file.text())
        : (() => null)()

      let rows = raw
      if (!rows) {
        const buf = await file.arrayBuffer()
        const wb = await loadWorkbook(buf)
        // Buscamos hoja "Datos" o, si no existe, la primera no llamada
        // "Instrucciones" ni "Catálogo Peligros".
        let sheet = wb.worksheets.find((s) => s.name.toLowerCase() === 'datos')
        if (!sheet) {
          sheet = wb.worksheets.find(
            (s) =>
              !s.name.toLowerCase().includes('instruccion') &&
              !s.name.toLowerCase().includes('catálogo') &&
              !s.name.toLowerCase().includes('catalogo'),
          )
        }
        sheet ??= firstWorksheet(wb) ?? undefined
        if (!sheet) throw new Error('El Excel no contiene hojas para importar.')
        rows = worksheetToJson(sheet, { defval: '', rawDates: false })
      }

      const result = parseIpercRows(rows)
      setParsedRows(result.rows)
      setParseErrors(result.errors)
      setSkippedEmpty(result.skipped)

      if (result.rows.length === 0 && result.errors.length === 0) {
        toast.error('El Excel parece vacío. Revisa la hoja "Datos".')
      } else if (result.errors.length > 0 && result.rows.length === 0) {
        toast.error(`Se encontraron ${result.errors.length} errores y 0 filas válidas.`)
      } else {
        toast.success(
          `${result.rows.length} filas válidas detectadas` +
            (result.errors.length > 0 ? ` (${result.errors.length} con errores)` : ''),
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo Excel')
      reset()
    }
  }

  async function handleSubmit() {
    if (parsedRows.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/sst/iperc-bases/${ipercId}/filas/bulk-import`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ rows: parsedRows }),
        },
      )
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo importar el Excel')
      }
      const skippedNote =
        json.skippedCount > 0
          ? ` (${json.skippedCount} filas con observaciones — peligros no en catálogo)`
          : ''
      toast.success(`${json.created} filas importadas${skippedNote}`)
      router.push(`/dashboard/sst/iperc-bases/${ipercId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Errores agrupados por fila para mostrar en el preview
  const errorsByRow = new Map<number, IpercImportError[]>()
  for (const err of parseErrors) {
    if (!errorsByRow.has(err.rowIndex)) errorsByRow.set(err.rowIndex, [])
    errorsByRow.get(err.rowIndex)!.push(err)
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/sst/iperc-bases/${ipercId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver al IPERC
      </Link>

      <PageHeader
        title="Importar matriz IPERC desde Excel"
        subtitle="Sube tu plantilla con N filas. El motor IPERC recalcula IP, NR y clasificación automáticamente — los datos derivados que vengan en el Excel se ignoran (defensa en profundidad)."
      />

      {error && (
        <Card>
          <CardContent className="p-4 flex items-start gap-2 text-sm text-red-700 bg-red-50">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Paso 1: Descargar plantilla */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Paso 1 — Descarga la plantilla
              </h3>
              <p className="text-sm text-slate-600 mt-0.5">
                Excel con headers correctos, ejemplos pre-llenados y el catálogo de peligros válidos.
              </p>
            </div>
          </div>
          <a href="/api/sst/iperc-bases/template" download>
            <Button variant="emerald-soft">
              <Download className="w-4 h-4 mr-2" />
              Descargar plantilla
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Paso 2: Subir archivo */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Paso 2 — Sube tu archivo
              </h3>
              <p className="text-sm text-slate-600 mt-0.5">
                El parsing es local en tu navegador — el archivo no se sube al server hasta que confirmes.
              </p>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={handleFile}
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:font-semibold hover:file:bg-emerald-700 file:cursor-pointer cursor-pointer border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50"
          />

          {filename && (
            <div className="mt-3 flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">{filename}</span>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            </div>
          )}

          {(parsedRows.length > 0 || parseErrors.length > 0) && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-emerald-50 ring-1 ring-emerald-200 p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700 tabular-nums">
                  {parsedRows.length}
                </div>
                <div className="text-xs text-emerald-700 uppercase font-semibold tracking-wide">
                  Válidas
                </div>
              </div>
              <div className="rounded-lg bg-red-50 ring-1 ring-red-200 p-3 text-center">
                <div className="text-2xl font-bold text-red-700 tabular-nums">
                  {parseErrors.length}
                </div>
                <div className="text-xs text-red-700 uppercase font-semibold tracking-wide">
                  Errores
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 ring-1 ring-slate-200 p-3 text-center">
                <div className="text-2xl font-bold text-slate-600 tabular-nums">
                  {skippedEmpty}
                </div>
                <div className="text-xs text-slate-600 uppercase font-semibold tracking-wide">
                  Vacías omitidas
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paso 3: Preview */}
      {parsedRows.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Vista previa ({parsedRows.length} filas)
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-700">#</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-700">Proceso</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-700">Tarea</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-700">Peligro</th>
                    <th className="text-center px-2 py-2 font-semibold text-slate-700">A</th>
                    <th className="text-center px-2 py-2 font-semibold text-slate-700">B</th>
                    <th className="text-center px-2 py-2 font-semibold text-slate-700">C</th>
                    <th className="text-center px-2 py-2 font-semibold text-slate-700">D</th>
                    <th className="text-center px-2 py-2 font-semibold text-slate-700">S</th>
                    <th className="text-center px-2 py-2 font-semibold text-slate-700">NR</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-700">Clasif.</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => {
                    const calc = calcularNivelRiesgo({
                      indicePersonas: row.indicePersonas,
                      indiceProcedimiento: row.indiceProcedimiento,
                      indiceCapacitacion: row.indiceCapacitacion,
                      indiceExposicion: row.indiceExposicion,
                      indiceSeveridad: row.indiceSeveridad,
                    })
                    return (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 text-slate-500 tabular-nums">{i + 1}</td>
                        <td className="px-3 py-2 text-slate-700">{row.proceso}</td>
                        <td className="px-3 py-2 text-slate-700 max-w-xs truncate">{row.tarea}</td>
                        <td className="px-3 py-2 text-slate-700 max-w-xs truncate">
                          {row.peligroNombre || (
                            <span className="text-slate-400 italic">Sin peligro</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums">
                          {row.indicePersonas}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums">
                          {row.indiceProcedimiento}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums">
                          {row.indiceCapacitacion}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums">
                          {row.indiceExposicion}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums">
                          {row.indiceSeveridad}
                        </td>
                        <td className="px-2 py-2 text-center font-bold tabular-nums">
                          {calc.nivelRiesgo}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              calc.clasificacion === 'INTOLERABLE'
                                ? 'critical'
                                : calc.clasificacion === 'IMPORTANTE'
                                ? 'high'
                                : calc.clasificacion === 'MODERADO'
                                ? 'medium'
                                : calc.clasificacion === 'TOLERABLE'
                                ? 'info'
                                : 'success'
                            }
                          >
                            {calc.clasificacion}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errores detallados */}
      {parseErrors.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Filas con errores ({errorsByRow.size})
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {Array.from(errorsByRow.entries()).map(([rowIdx, errs]) => (
                <div
                  key={rowIdx}
                  className="rounded-lg bg-red-50 ring-1 ring-red-200 p-3 text-sm"
                >
                  <div className="font-semibold text-red-900 mb-1">
                    Fila Excel #{rowIdx + 2}
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-red-700 text-xs">
                    {errs.map((e, i) => (
                      <li key={i}>
                        <span className="font-mono">{e.field}</span>: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit footer */}
      {parsedRows.length > 0 && (
        <div className="sticky bottom-4 z-10">
          <Card className="ring-2 ring-emerald-300 shadow-lg">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-900">
                  Listo para importar {parsedRows.length}{' '}
                  {parsedRows.length === 1 ? 'fila' : 'filas'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={reset} disabled={submitting}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importar {parsedRows.length}{' '}
                      {parsedRows.length === 1 ? 'fila' : 'filas'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
