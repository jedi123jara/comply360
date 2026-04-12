'use client'

import { useState, useMemo } from 'react'
import {
  Code, Copy, ChevronDown, ChevronRight, Lock, Search,
  Book, Terminal, Key, Check, ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  requestBody?: string
  responseBody: string
  statusCodes: { code: number; text: string }[]
}

interface EndpointGroup {
  name: string
  slug: string
  endpoints: Endpoint[]
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const BASE_URL = 'https://api.comply360.pe/v1'

const groups: EndpointGroup[] = [
  {
    name: 'Trabajadores',
    slug: 'workers',
    endpoints: [
      {
        method: 'GET',
        path: '/workers',
        description: 'Listar todos los trabajadores registrados en la organización. Soporta paginación y filtros por estado, área y tipo de contrato.',
        responseBody: JSON.stringify({
          data: [
            { id: 'wrk_01', nombres: 'Juan', apellidos: 'Pérez López', dni: '12345678', estado: 'activo', area: 'Operaciones', cargo: 'Analista', fecha_ingreso: '2024-03-15' },
          ],
          pagination: { page: 1, per_page: 20, total: 145 },
        }, null, 2),
        statusCodes: [
          { code: 200, text: 'Lista de trabajadores' },
          { code: 401, text: 'No autorizado' },
        ],
      },
      {
        method: 'POST',
        path: '/workers',
        description: 'Crear un nuevo trabajador. Se requieren datos personales mínimos y datos laborales básicos.',
        requestBody: JSON.stringify({
          nombres: 'María',
          apellidos: 'García Ruiz',
          dni: '87654321',
          fecha_nacimiento: '1990-05-20',
          email: 'maria.garcia@empresa.pe',
          telefono: '999888777',
          area: 'Recursos Humanos',
          cargo: 'Coordinadora',
          fecha_ingreso: '2025-01-10',
          regimen: 'general',
          tipo_contrato: 'indefinido',
        }, null, 2),
        responseBody: JSON.stringify({
          id: 'wrk_02',
          nombres: 'María',
          apellidos: 'García Ruiz',
          dni: '87654321',
          estado: 'activo',
          created_at: '2025-06-01T10:30:00Z',
        }, null, 2),
        statusCodes: [
          { code: 201, text: 'Trabajador creado' },
          { code: 400, text: 'Datos inválidos' },
          { code: 409, text: 'DNI duplicado' },
        ],
      },
      {
        method: 'GET',
        path: '/workers/:id',
        description: 'Obtener el detalle completo de un trabajador, incluyendo contratos vigentes, beneficios y documentos asociados.',
        responseBody: JSON.stringify({
          id: 'wrk_01',
          nombres: 'Juan',
          apellidos: 'Pérez López',
          dni: '12345678',
          estado: 'activo',
          area: 'Operaciones',
          cargo: 'Analista',
          fecha_ingreso: '2024-03-15',
          regimen: 'general',
          remuneracion: 3500.00,
          contratos: [{ id: 'ctr_01', tipo: 'indefinido', inicio: '2024-03-15', estado: 'vigente' }],
        }, null, 2),
        statusCodes: [
          { code: 200, text: 'Detalle del trabajador' },
          { code: 404, text: 'Trabajador no encontrado' },
        ],
      },
      {
        method: 'PUT',
        path: '/workers/:id',
        description: 'Actualizar datos de un trabajador existente. Solo se envían los campos que se desean modificar.',
        requestBody: JSON.stringify({
          cargo: 'Analista Senior',
          area: 'Operaciones',
          remuneracion: 4200.00,
        }, null, 2),
        responseBody: JSON.stringify({
          id: 'wrk_01',
          nombres: 'Juan',
          apellidos: 'Pérez López',
          cargo: 'Analista Senior',
          remuneracion: 4200.00,
          updated_at: '2025-06-01T14:00:00Z',
        }, null, 2),
        statusCodes: [
          { code: 200, text: 'Trabajador actualizado' },
          { code: 400, text: 'Datos inválidos' },
          { code: 404, text: 'Trabajador no encontrado' },
        ],
      },
    ],
  },
  {
    name: 'Contratos',
    slug: 'contracts',
    endpoints: [
      {
        method: 'GET',
        path: '/contracts',
        description: 'Listar todos los contratos. Filtros disponibles: estado (vigente, vencido, por_vencer), tipo, trabajador_id.',
        responseBody: JSON.stringify({
          data: [
            { id: 'ctr_01', trabajador_id: 'wrk_01', tipo: 'indefinido', inicio: '2024-03-15', fin: null, estado: 'vigente', remuneracion: 3500.00 },
          ],
          pagination: { page: 1, per_page: 20, total: 89 },
        }, null, 2),
        statusCodes: [
          { code: 200, text: 'Lista de contratos' },
          { code: 401, text: 'No autorizado' },
        ],
      },
      {
        method: 'POST',
        path: '/contracts',
        description: 'Crear un nuevo contrato asociado a un trabajador. Valida automáticamente reglas laborales peruanas (plazo máximo, renovaciones, etc.).',
        requestBody: JSON.stringify({
          trabajador_id: 'wrk_01',
          tipo: 'plazo_fijo',
          motivo: 'Incremento de actividad',
          fecha_inicio: '2025-07-01',
          fecha_fin: '2025-12-31',
          remuneracion: 3500.00,
          jornada_semanal: 48,
        }, null, 2),
        responseBody: JSON.stringify({
          id: 'ctr_05',
          trabajador_id: 'wrk_01',
          tipo: 'plazo_fijo',
          estado: 'vigente',
          alertas: ['Registrar en MTPE dentro de 15 días'],
          created_at: '2025-06-01T10:30:00Z',
        }, null, 2),
        statusCodes: [
          { code: 201, text: 'Contrato creado' },
          { code: 400, text: 'Datos inválidos o regla laboral incumplida' },
          { code: 404, text: 'Trabajador no encontrado' },
        ],
      },
      {
        method: 'GET',
        path: '/contracts/:id',
        description: 'Obtener detalle completo de un contrato, incluyendo historial de adendas y estado de registro ante MTPE.',
        responseBody: JSON.stringify({
          id: 'ctr_01',
          trabajador_id: 'wrk_01',
          tipo: 'indefinido',
          fecha_inicio: '2024-03-15',
          fecha_fin: null,
          estado: 'vigente',
          remuneracion: 3500.00,
          jornada_semanal: 48,
          registro_mtpe: { estado: 'registrado', fecha: '2024-03-20' },
          adendas: [],
        }, null, 2),
        statusCodes: [
          { code: 200, text: 'Detalle del contrato' },
          { code: 404, text: 'Contrato no encontrado' },
        ],
      },
    ],
  },
  {
    name: 'Calculadoras',
    slug: 'calculations',
    endpoints: [
      {
        method: 'POST',
        path: '/calculations',
        description: 'Ejecutar un cálculo laboral. Tipos disponibles: cts, gratificacion, vacaciones, liquidacion, utilidades, planilla.',
        requestBody: JSON.stringify({
          tipo: 'cts',
          trabajador_id: 'wrk_01',
          periodo: '2025-1',
          parametros: {
            remuneracion_basica: 3500.00,
            asignacion_familiar: 113.00,
            fecha_inicio_computo: '2024-11-01',
            fecha_fin_computo: '2025-04-30',
          },
        }, null, 2),
        responseBody: JSON.stringify({
          id: 'calc_01',
          tipo: 'cts',
          trabajador_id: 'wrk_01',
          resultado: {
            remuneracion_computable: 3602.50,
            meses_completos: 6,
            dias_adicionales: 0,
            monto_cts: 1801.25,
            entidad_depositaria: 'BCP',
          },
          base_legal: 'D.S. 001-97-TR',
          created_at: '2025-06-01T10:30:00Z',
        }, null, 2),
        statusCodes: [
          { code: 200, text: 'Cálculo ejecutado' },
          { code: 400, text: 'Parámetros inválidos' },
          { code: 422, text: 'Tipo de cálculo no soportado' },
        ],
      },
      {
        method: 'GET',
        path: '/calculations',
        description: 'Obtener historial de cálculos realizados. Filtros: tipo, trabajador_id, periodo, rango de fechas.',
        responseBody: JSON.stringify({
          data: [
            { id: 'calc_01', tipo: 'cts', trabajador_id: 'wrk_01', monto: 1801.25, periodo: '2025-1', created_at: '2025-06-01T10:30:00Z' },
          ],
          pagination: { page: 1, per_page: 20, total: 312 },
        }, null, 2),
        statusCodes: [
          { code: 200, text: 'Historial de cálculos' },
          { code: 401, text: 'No autorizado' },
        ],
      },
    ],
  },
  {
    name: 'Diagnostico',
    slug: 'diagnostics',
    endpoints: [
      {
        method: 'GET',
        path: '/diagnostics',
        description: 'Listar todos los diagnósticos de cumplimiento laboral realizados. Incluye puntaje general y estado.',
        responseBody: JSON.stringify({
          data: [
            { id: 'diag_01', titulo: 'Diagnóstico Q1 2025', puntaje: 72, estado: 'completado', riesgos: 5, fecha: '2025-03-15' },
          ],
          pagination: { page: 1, per_page: 20, total: 8 },
        }, null, 2),
        statusCodes: [
          { code: 200, text: 'Lista de diagnósticos' },
          { code: 401, text: 'No autorizado' },
        ],
      },
      {
        method: 'POST',
        path: '/diagnostics',
        description: 'Crear un nuevo diagnóstico de cumplimiento. Analiza automáticamente contratos, planillas, SST y políticas internas.',
        requestBody: JSON.stringify({
          titulo: 'Diagnóstico Q2 2025',
          areas: ['contratos', 'planillas', 'sst', 'igualdad_salarial'],
          incluir_recomendaciones: true,
        }, null, 2),
        responseBody: JSON.stringify({
          id: 'diag_02',
          titulo: 'Diagnóstico Q2 2025',
          estado: 'procesando',
          estimado_minutos: 5,
          created_at: '2025-06-01T10:30:00Z',
        }, null, 2),
        statusCodes: [
          { code: 202, text: 'Diagnóstico en proceso' },
          { code: 400, text: 'Parámetros inválidos' },
        ],
      },
      {
        method: 'GET',
        path: '/diagnostics/:id',
        description: 'Obtener el resultado completo de un diagnóstico, incluyendo hallazgos, riesgos identificados y recomendaciones.',
        responseBody: JSON.stringify({
          id: 'diag_01',
          titulo: 'Diagnóstico Q1 2025',
          puntaje: 72,
          estado: 'completado',
          hallazgos: [
            { area: 'contratos', nivel: 'alto', descripcion: '3 contratos a plazo fijo exceden límite de 5 años', recomendacion: 'Convertir a contratos indefinidos' },
            { area: 'sst', nivel: 'medio', descripcion: 'Falta acta de comité SST del mes de febrero', recomendacion: 'Programar reunión y generar acta' },
          ],
          resumen: { total_hallazgos: 5, alto: 2, medio: 2, bajo: 1 },
        }, null, 2),
        statusCodes: [
          { code: 200, text: 'Resultado del diagnóstico' },
          { code: 404, text: 'Diagnóstico no encontrado' },
        ],
      },
    ],
  },
  {
    name: 'Alertas',
    slug: 'alerts',
    endpoints: [
      {
        method: 'GET',
        path: '/alerts',
        description: 'Listar alertas de cumplimiento activas. Filtros: prioridad (alta, media, baja), estado (pendiente, leida), tipo.',
        responseBody: JSON.stringify({
          data: [
            { id: 'alt_01', tipo: 'vencimiento_contrato', prioridad: 'alta', mensaje: 'Contrato de Juan Pérez vence en 15 días', leida: false, fecha: '2025-06-01' },
            { id: 'alt_02', tipo: 'deposito_cts', prioridad: 'media', mensaje: 'Plazo de depósito CTS vence el 15 de mayo', leida: true, fecha: '2025-04-28' },
          ],
          sin_leer: 12,
          pagination: { page: 1, per_page: 20, total: 34 },
        }, null, 2),
        statusCodes: [
          { code: 200, text: 'Lista de alertas' },
          { code: 401, text: 'No autorizado' },
        ],
      },
      {
        method: 'PUT',
        path: '/alerts/:id',
        description: 'Marcar una alerta como leída o actualizar su estado.',
        requestBody: JSON.stringify({
          leida: true,
        }, null, 2),
        responseBody: JSON.stringify({
          id: 'alt_01',
          leida: true,
          updated_at: '2025-06-01T14:00:00Z',
        }, null, 2),
        statusCodes: [
          { code: 200, text: 'Alerta actualizada' },
          { code: 404, text: 'Alerta no encontrada' },
        ],
      },
    ],
  },
  {
    name: 'Denuncias',
    slug: 'complaints',
    endpoints: [
      {
        method: 'POST',
        path: '/complaints',
        description: 'Crear una denuncia a través del canal de denuncias (endpoint publico, no requiere autenticacion del denunciante). Compatible con Ley 31572.',
        requestBody: JSON.stringify({
          tipo: 'hostigamiento_sexual',
          descripcion: 'Descripción detallada del incidente reportado...',
          fecha_incidente: '2025-05-28',
          area: 'Ventas',
          anonimo: true,
          adjuntos: ['evidence_01.pdf'],
        }, null, 2),
        responseBody: JSON.stringify({
          id: 'den_01',
          codigo_seguimiento: 'DEN-2025-0042',
          estado: 'recibida',
          mensaje: 'Su denuncia ha sido registrada. Use el código de seguimiento para consultar el estado.',
          created_at: '2025-06-01T10:30:00Z',
        }, null, 2),
        statusCodes: [
          { code: 201, text: 'Denuncia registrada' },
          { code: 400, text: 'Datos incompletos' },
        ],
      },
      {
        method: 'GET',
        path: '/complaints',
        description: 'Listar denuncias recibidas (requiere rol de administrador o comite de intervención). Filtros: estado, tipo, rango de fechas.',
        responseBody: JSON.stringify({
          data: [
            { id: 'den_01', codigo: 'DEN-2025-0042', tipo: 'hostigamiento_sexual', estado: 'en_investigacion', anonimo: true, fecha: '2025-06-01', prioridad: 'alta' },
          ],
          resumen: { total: 15, pendientes: 3, en_investigacion: 5, resueltas: 7 },
          pagination: { page: 1, per_page: 20, total: 15 },
        }, null, 2),
        statusCodes: [
          { code: 200, text: 'Lista de denuncias' },
          { code: 403, text: 'Sin permisos suficientes' },
        ],
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const methodColorsLight: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  POST: 'bg-blue-100 text-blue-700 border-blue-300',
  PUT: 'bg-amber-100 text-amber-700 border-amber-300',
  DELETE: 'bg-red-100 text-red-700 border-red-300',
}

/* ------------------------------------------------------------------ */
/*  CodeBlock                                                          */
/* ------------------------------------------------------------------ */
function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative rounded-lg border border-zinc-200 border-zinc-700 bg-zinc-50 bg-zinc-900 overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 border-zinc-700 bg-zinc-100 bg-zinc-800/60">
          <span className="text-xs font-medium text-zinc-500 text-zinc-400">{label}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed text-zinc-700 text-zinc-300">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  EndpointCard                                                       */
/* ------------------------------------------------------------------ */
function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      id={`${endpoint.method}-${endpoint.path}`.replace(/[/:]/g, '-')}
      className="border border-zinc-200 border-zinc-700/60 rounded-xl overflow-hidden bg-[#141824] bg-zinc-800/40 transition-shadow hover:shadow-md hover:shadow-zinc-900/40"
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-zinc-50 hover:bg-zinc-700/30 transition-colors"
      >
        <span className={cn('shrink-0 px-2.5 py-1 rounded text-xs font-bold border tracking-wide', methodColorsLight[endpoint.method], 'hidden')}>
          {endpoint.method}
        </span>
        <span className={cn('shrink-0 px-2.5 py-1 rounded text-xs font-bold border tracking-wide hidden inline-block', methodColors[endpoint.method])}>
          {endpoint.method}
        </span>
        <code className="text-sm font-mono text-zinc-800 text-zinc-200">{endpoint.path}</code>
        <span className="ml-2 text-sm text-zinc-500 text-zinc-400 hidden sm:inline">{endpoint.description.split('.')[0]}</span>
        <span className="ml-auto shrink-0 text-zinc-400">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-zinc-200 border-zinc-700/60 px-5 py-5 space-y-5 bg-zinc-50/50 bg-zinc-800/20">
          {/* Description */}
          <p className="text-sm text-zinc-600 text-zinc-400 leading-relaxed">{endpoint.description}</p>

          {/* Auth */}
          <div className="flex items-center gap-2 text-sm">
            <Lock size={14} className="text-amber-500" />
            <span className="text-zinc-500 text-zinc-400">Autenticacion:</span>
            <code className="text-xs bg-zinc-200 bg-zinc-700 px-2 py-0.5 rounded text-zinc-700 text-zinc-300">Bearer Token</code>
            <span className="text-xs text-red-400 font-medium">(requerido)</span>
          </div>

          {/* Request */}
          {endpoint.requestBody && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-zinc-700 text-zinc-300 flex items-center gap-2">
                <Terminal size={14} /> Request Body
              </h4>
              <CodeBlock code={endpoint.requestBody} label="application/json" />
            </div>
          )}

          {/* Response */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-700 text-zinc-300 flex items-center gap-2">
              <Code size={14} /> Response
            </h4>
            <CodeBlock code={endpoint.responseBody} label="200 OK - application/json" />
          </div>

          {/* Status Codes */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-700 text-zinc-300">Codigos de Estado</h4>
            <div className="flex flex-wrap gap-2">
              {endpoint.statusCodes.map((sc) => (
                <span
                  key={sc.code}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border',
                    sc.code < 300
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : sc.code < 500
                        ? 'bg-amber-50 text-amber-700 border-amber-200 bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-red-50 text-red-700 border-red-200 bg-red-500/10 text-red-400 border-red-500/20',
                  )}
                >
                  {sc.code} &mdash; {sc.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ApiDocsPage() {
  const [search, setSearch] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map((g) => [g.slug, true])),
  )

  const toggleGroup = (slug: string) => {
    setExpandedGroups((prev) => ({ ...prev, [slug]: !prev[slug] }))
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return groups
    const q = search.toLowerCase()
    return groups
      .map((g) => ({
        ...g,
        endpoints: g.endpoints.filter(
          (e) =>
            e.path.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            e.method.toLowerCase().includes(q) ||
            g.name.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.endpoints.length > 0)
  }, [search])

  const totalEndpoints = groups.reduce((s, g) => s + g.endpoints.length, 0)

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#141824] bg-zinc-900">
      {/* ---- Sidebar ---- */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-zinc-200 border-zinc-800 bg-zinc-50 bg-zinc-900/80 overflow-y-auto">
        {/* Logo area */}
        <div className="px-5 pt-6 pb-4 border-b border-zinc-200 border-zinc-800">
          <div className="flex items-center gap-2.5 mb-1">
            <Book size={20} className="text-blue-600 text-blue-400" />
            <span className="font-bold text-lg text-zinc-800 text-zinc-100">API Reference</span>
          </div>
          <p className="text-xs text-zinc-500 text-zinc-500 mt-1">COMPLY 360 &mdash; v1.0</p>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {groups.map((g) => (
            <div key={g.slug}>
              <button
                onClick={() => {
                  toggleGroup(g.slug)
                  document.getElementById(`group-${g.slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-700 text-zinc-300 hover:bg-zinc-200/60 hover:bg-zinc-700/40 transition-colors"
              >
                {expandedGroups[g.slug] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {g.name}
                <span className="ml-auto text-xs text-zinc-400">{g.endpoints.length}</span>
              </button>
              {expandedGroups[g.slug] && (
                <div className="ml-4 pl-3 border-l border-zinc-200 border-zinc-700 space-y-0.5 mt-1 mb-2">
                  {g.endpoints.map((ep) => (
                    <a
                      key={`${ep.method}-${ep.path}`}
                      href={`#${ep.method}-${ep.path}`.replace(/[/:]/g, '-')}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-zinc-200/60 hover:bg-zinc-700/40 transition-colors"
                    >
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold border', methodColors[ep.method])}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-zinc-600 text-zinc-400 truncate">{ep.path}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-200 border-zinc-800 text-xs text-zinc-400">
          {totalEndpoints} endpoints documentados
        </div>
      </aside>

      {/* ---- Main content ---- */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
          {/* Back link */}
          <Link
            href="/dashboard/integraciones"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft size={14} /> Volver a Integraciones
          </Link>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 text-zinc-100 tracking-tight">
              COMPLY 360 API
            </h1>
            <p className="mt-2 text-zinc-500 text-zinc-400 text-base leading-relaxed max-w-2xl">
              Documentacion de referencia para integrar sistemas externos con la plataforma COMPLY 360.
              Gestiona trabajadores, contratos, calculos laborales, diagnosticos de cumplimiento y mas.
            </p>
          </div>

          {/* Base URL */}
          <div className="rounded-xl border border-zinc-200 border-zinc-700 bg-zinc-50 bg-zinc-800/40 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-800 text-zinc-200 flex items-center gap-2">
              <Terminal size={16} /> Base URL
            </h2>
            <CodeBlock code={BASE_URL} label="URL base para todas las peticiones" />
          </div>

          {/* Auth section */}
          <div className="rounded-xl border border-blue-200 border-blue-500/20 bg-blue-50/50 bg-blue-500/5 p-5 space-y-4">
            <h2 className="text-base font-semibold text-zinc-800 text-zinc-200 flex items-center gap-2">
              <Key size={18} className="text-blue-500" /> Autenticacion
            </h2>
            <p className="text-sm text-zinc-600 text-zinc-400 leading-relaxed">
              Todas las peticiones requieren un token de autenticacion en el header <code className="bg-zinc-200 bg-zinc-700 px-1.5 py-0.5 rounded text-xs">Authorization</code>.
              Puedes generar tu API Key desde <strong>Configuracion &rarr; API Keys</strong> en el panel de COMPLY 360.
            </p>
            <CodeBlock
              code={`curl -X GET "${BASE_URL}/workers" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
              label="Ejemplo de autenticacion"
            />
            <div className="flex items-start gap-2 text-xs text-amber-600 text-amber-400 bg-amber-50 bg-amber-500/10 border border-amber-200 border-amber-500/20 rounded-lg p-3">
              <Lock size={14} className="shrink-0 mt-0.5" />
              <span>Nunca compartas tu API Key publicamente. Si sospechas que ha sido comprometida, revocala inmediatamente desde el panel y genera una nueva.</span>
            </div>
          </div>

          {/* Rate limiting */}
          <div className="rounded-xl border border-zinc-200 border-zinc-700 bg-zinc-50 bg-zinc-800/40 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-800 text-zinc-200">Limites de Uso</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-[#141824] bg-zinc-800 rounded-lg p-3 border border-zinc-200 border-zinc-700">
                <p className="text-zinc-500 text-zinc-400 text-xs">Plan Basico</p>
                <p className="font-semibold text-zinc-800 text-zinc-200 mt-1">1,000 req/hora</p>
              </div>
              <div className="bg-[#141824] bg-zinc-800 rounded-lg p-3 border border-zinc-200 border-zinc-700">
                <p className="text-zinc-500 text-zinc-400 text-xs">Plan Pro</p>
                <p className="font-semibold text-zinc-800 text-zinc-200 mt-1">10,000 req/hora</p>
              </div>
              <div className="bg-[#141824] bg-zinc-800 rounded-lg p-3 border border-zinc-200 border-zinc-700">
                <p className="text-zinc-500 text-zinc-400 text-xs">Enterprise</p>
                <p className="font-semibold text-zinc-800 text-zinc-200 mt-1">Ilimitado</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar endpoints... (ej: workers, POST, contrato)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 border-zinc-700 bg-[#141824] bg-zinc-800 text-sm text-zinc-800 text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-gold/30/40 focus:border-gold/50 transition-all"
            />
          </div>

          {/* Endpoint Groups */}
          {filtered.map((group) => (
            <section key={group.slug} id={`group-${group.slug}`} className="space-y-4">
              <button
                onClick={() => toggleGroup(group.slug)}
                className="flex items-center gap-2 group"
              >
                {expandedGroups[group.slug] ? (
                  <ChevronDown size={20} className="text-zinc-400 group-hover:text-zinc-600 group-hover:text-zinc-300" />
                ) : (
                  <ChevronRight size={20} className="text-zinc-400 group-hover:text-zinc-600 group-hover:text-zinc-300" />
                )}
                <h2 className="text-xl font-bold text-zinc-800 text-zinc-100">{group.name}</h2>
                <span className="text-xs font-medium text-zinc-400 bg-zinc-100 bg-zinc-800 px-2 py-0.5 rounded-full">
                  {group.endpoints.length}
                </span>
              </button>

              {expandedGroups[group.slug] && (
                <div className="space-y-3 ml-1">
                  {group.endpoints.map((ep) => (
                    <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Search size={40} className="mx-auto text-zinc-300 text-zinc-600 mb-4" />
              <p className="text-zinc-500 text-zinc-400 text-sm">
                No se encontraron endpoints que coincidan con &ldquo;{search}&rdquo;
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-zinc-200 border-zinc-800 pt-8 pb-4 text-center text-xs text-zinc-400 space-y-1">
            <p>COMPLY 360 API v1.0 &mdash; Documentacion generada automaticamente</p>
            <p>Para soporte tecnico, contacta a <a href="mailto:soporte@comply360.pe" className="text-blue-500 hover:underline">soporte@comply360.pe</a></p>
          </div>
        </div>
      </main>
    </div>
  )
}
