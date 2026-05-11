'use client'

import { useEffect, useMemo } from 'react'
import { listDepartamentos, listProvincias, listDistritos, hasDistritos } from '@/data/peru/ubigeo'

/**
 * UbigeoSelect — 3 dropdowns dependientes para ubicación peruana.
 *
 * - Departamento → Provincia → Distrito
 * - Al cambiar el padre, resetea hijos automáticamente
 * - Si la provincia no tiene distritos pre-cargados (datasets parciales en
 *   Sprint 1), cae a input de texto libre con placeholder informativo
 * - Permite controlar los 3 valores desde el padre (uncontrolled-friendly via
 *   onChange callbacks separados)
 *
 * Uso típico:
 * ```tsx
 * <UbigeoSelect
 *   departamento={form.departamento}
 *   provincia={form.provincia}
 *   distrito={form.distrito}
 *   onChange={({ departamento, provincia, distrito }) => setForm({ ...form, departamento, provincia, distrito })}
 * />
 * ```
 */

interface UbigeoSelectProps {
  departamento: string
  provincia: string
  distrito: string
  onChange: (value: { departamento: string; provincia: string; distrito: string }) => void
  required?: boolean
  className?: string
  /** Tailwind classes for each input/select (compartidas entre los 3). */
  inputClassName?: string
  /** Tailwind classes for each label. */
  labelClassName?: string
}

const DEFAULT_INPUT_CLS =
  'w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-colors'

const DEFAULT_LABEL_CLS =
  'block text-xs font-medium text-[color:var(--text-secondary)] mb-1'

export function UbigeoSelect({
  departamento,
  provincia,
  distrito,
  onChange,
  required = false,
  className = '',
  inputClassName = DEFAULT_INPUT_CLS,
  labelClassName = DEFAULT_LABEL_CLS,
}: UbigeoSelectProps) {
  const departamentos = useMemo(() => listDepartamentos(), [])
  const provincias = useMemo(() => listProvincias(departamento), [departamento])
  const distritos = useMemo(() => listDistritos(departamento, provincia), [departamento, provincia])
  const distritosTipiables = !hasDistritos(departamento, provincia) && !!provincia

  // Si el departamento cambia y la provincia actual no pertenece, limpia hijos.
  useEffect(() => {
    if (provincia && !provincias.includes(provincia)) {
      onChange({ departamento, provincia: '', distrito: '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departamento])

  // Si la provincia cambia y el distrito actual no pertenece (cuando hay
  // distritos pre-cargados), limpia el distrito.
  useEffect(() => {
    if (distrito && hasDistritos(departamento, provincia) && !distritos.includes(distrito)) {
      onChange({ departamento, provincia, distrito: '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provincia])

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
      {/* Departamento */}
      <div>
        <label htmlFor="ubigeo-departamento" className={labelClassName}>
          Departamento {required && <span className="text-red-500">*</span>}
        </label>
        <select
          id="ubigeo-departamento"
          value={departamento}
          onChange={e => onChange({ departamento: e.target.value, provincia: '', distrito: '' })}
          required={required}
          className={inputClassName}
        >
          <option value="">Seleccionar…</option>
          {departamentos.map(d => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Provincia */}
      <div>
        <label htmlFor="ubigeo-provincia" className={labelClassName}>
          Provincia {required && <span className="text-red-500">*</span>}
        </label>
        <select
          id="ubigeo-provincia"
          value={provincia}
          onChange={e => onChange({ departamento, provincia: e.target.value, distrito: '' })}
          required={required}
          disabled={!departamento}
          className={inputClassName + (departamento ? '' : ' opacity-50 cursor-not-allowed')}
        >
          <option value="">{departamento ? 'Seleccionar…' : 'Elige departamento primero'}</option>
          {provincias.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Distrito — select si tenemos lista pre-cargada, input si no */}
      <div>
        <label htmlFor="ubigeo-distrito" className={labelClassName}>
          Distrito {required && <span className="text-red-500">*</span>}
        </label>
        {distritosTipiables ? (
          <input
            id="ubigeo-distrito"
            type="text"
            value={distrito}
            onChange={e => onChange({ departamento, provincia, distrito: e.target.value })}
            required={required}
            placeholder="Escribe el nombre del distrito"
            className={inputClassName}
            title="No tenemos esta provincia indexada todavía. Escribe el nombre exacto del distrito."
          />
        ) : (
          <select
            id="ubigeo-distrito"
            value={distrito}
            onChange={e => onChange({ departamento, provincia, distrito: e.target.value })}
            required={required}
            disabled={!provincia}
            className={inputClassName + (provincia ? '' : ' opacity-50 cursor-not-allowed')}
          >
            <option value="">{provincia ? 'Seleccionar…' : 'Elige provincia primero'}</option>
            {distritos.map(dist => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
