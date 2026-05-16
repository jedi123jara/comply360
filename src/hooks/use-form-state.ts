'use client'

/* -------------------------------------------------------------------------- */
/*  use-form-state — manejo unificado de estado de formulario con Zod         */
/* -------------------------------------------------------------------------- */
/*
 * Reemplaza ~20 useState individuales por un solo hook tipado.
 * Valida por campo (en onBlur o onChange) usando el mismo Zod schema del
 * submit. Diseñado para encajar con el patron del proyecto: estado local
 * + Zod, sin agregar react-hook-form.
 *
 * Uso:
 *   const f = useFormState({
 *     initial: { cargo: '', sueldo: '' },
 *     schema: createContractSchema,
 *     validateOn: 'blur',
 *     debounceMs: 300,
 *   })
 *   <input {...f.bind('cargo')} />
 *   {f.errors.cargo && <span>{f.errors.cargo}</span>}
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ZodType } from 'zod'

export type FormErrors<T> = Partial<Record<keyof T, string>>
export type FormTouched<T> = Partial<Record<keyof T, boolean>>

export interface UseFormStateOptions<T extends Record<string, unknown>> {
  /** Valores iniciales del formulario */
  initial: T
  /** Zod schema para validacion. Debe matchear la forma de T */
  schema?: ZodType<T>
  /** Cuando validar cada campo: 'blur' | 'change' | 'submit' (default 'blur') */
  validateOn?: 'blur' | 'change' | 'submit'
  /** Debounce en ms para validacion onChange (default 300) */
  debounceMs?: number
  /** Callback cuando cualquier campo cambia (util para autosave) */
  onChange?: (values: T) => void
}

export interface UseFormStateReturn<T extends Record<string, unknown>> {
  /** Valores actuales del formulario */
  values: T
  /** Errores por campo (solo los que han fallado validacion) */
  errors: FormErrors<T>
  /** Campos que el usuario ha tocado (blur o cambio) */
  touched: FormTouched<T>
  /** Asignar valor de un campo */
  setField: <K extends keyof T>(key: K, value: T[K]) => void
  /** Asignar varios campos a la vez (util para prefill) */
  setValues: (next: Partial<T>) => void
  /** Marcar campo como tocado (sin cambiar valor) */
  touchField: <K extends keyof T>(key: K) => void
  /** Reset al estado inicial o a un nuevo set de valores */
  reset: (next?: T) => void
  /** Helper para spread en <input>: returns { value, onChange, onBlur, name } */
  bind: <K extends keyof T>(
    key: K
  ) => {
    name: K
    value: T[K]
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
    onBlur: () => void
  }
  /** Valida todo el formulario y devuelve el resultado tipado */
  validateAll: () => { ok: true; data: T } | { ok: false; errors: FormErrors<T> }
  /** Marca todos los campos como tocados (usar antes de validateAll en submit) */
  touchAll: () => void
  /** True si el form pasa validacion (chequea todo, no solo los tocados) */
  isValid: boolean
  /** True si algun campo cambio respecto al initial */
  isDirty: boolean
}

/**
 * Hook unificado de estado de formulario con validacion Zod por campo.
 */
export function useFormState<T extends Record<string, unknown>>(
  options: UseFormStateOptions<T>
): UseFormStateReturn<T> {
  const { initial, schema, validateOn = 'blur', debounceMs = 300, onChange } = options

  const [values, setValuesState] = useState<T>(initial)
  const [initialValues, setInitialValues] = useState<T>(initial)
  const [errors, setErrors] = useState<FormErrors<T>>({})
  const [touched, setTouched] = useState<FormTouched<T>>({})

  // Guardamos el initial para detectar dirty + reset
  const debounceTimers = useRef<Map<keyof T, ReturnType<typeof setTimeout>>>(new Map())

  // Notificar onChange cuando cambian los values
  useEffect(() => {
    onChange?.(values)
    // Intencionalmente no incluir onChange para evitar loops si el caller no
    // memoiza el callback. Si necesitas reactividad, memoiza tu onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values])

  // Limpiar timers al desmontar
  useEffect(() => {
    const timers = debounceTimers.current
    return () => {
      timers.forEach(t => clearTimeout(t))
      timers.clear()
    }
  }, [])

  /** Valida un solo campo contra el schema */
  const validateField = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      if (!schema) return
      // Trick: parseamos el form completo y filtramos solo el error de este campo.
      // Es mas simple que extraer un sub-schema y suficientemente rapido para
      // forms de <50 campos.
      const result = schema.safeParse({ ...values, [key]: value })
      setErrors(prev => {
        const next = { ...prev }
        if (result.success) {
          delete next[key]
        } else {
          const fieldIssue = result.error.issues.find(
            i => i.path[0] === key
          )
          if (fieldIssue) {
            next[key] = fieldIssue.message
          } else {
            delete next[key]
          }
        }
        return next
      })
    },
    [schema, values]
  )

  const setField = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setValuesState(prev => ({ ...prev, [key]: value }))

      if (validateOn === 'change' && schema) {
        const existing = debounceTimers.current.get(key)
        if (existing) clearTimeout(existing)
        const timer = setTimeout(() => {
          validateField(key, value)
        }, debounceMs)
        debounceTimers.current.set(key, timer)
      }
    },
    [validateOn, schema, debounceMs, validateField]
  )

  const setValues = useCallback((next: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...next }))
  }, [])

  const touchField = useCallback(
    <K extends keyof T>(key: K) => {
      setTouched(prev => ({ ...prev, [key]: true }))
      if (validateOn === 'blur' && schema) {
        validateField(key, values[key])
      }
    },
    [validateOn, schema, validateField, values]
  )

  const touchAll = useCallback(() => {
    const all: FormTouched<T> = {}
    for (const key of Object.keys(values) as (keyof T)[]) {
      all[key] = true
    }
    setTouched(all)
  }, [values])

  const reset = useCallback((next?: T) => {
    const target = next ?? initialValues
    if (next) setInitialValues(next)
    setValuesState(target)
    setErrors({})
    setTouched({})
  }, [initialValues])

  const validateAll = useCallback(():
    | { ok: true; data: T }
    | { ok: false; errors: FormErrors<T> } => {
    if (!schema) return { ok: true, data: values }
    const result = schema.safeParse(values)
    if (result.success) {
      setErrors({})
      return { ok: true, data: result.data }
    }
    const next: FormErrors<T> = {}
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof T | undefined
      if (key && !(key in next)) {
        next[key] = issue.message
      }
    }
    setErrors(next)
    return { ok: false, errors: next }
  }, [schema, values])

  const bind = useCallback(
    <K extends keyof T>(key: K) => ({
      name: key,
      value: values[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target
        let val: unknown = target.value
        if (target instanceof HTMLInputElement) {
          if (target.type === 'checkbox') val = target.checked
          else if (target.type === 'number') val = target.value === '' ? '' : Number(target.value)
        }
        setField(key, val as T[K])
      },
      onBlur: () => touchField(key),
    }),
    [values, setField, touchField]
  )

  const isValid = useMemo(() => {
    if (!schema) return true
    return schema.safeParse(values).success
  }, [schema, values])

  const isDirty = useMemo(() => {
    for (const key of Object.keys(values) as (keyof T)[]) {
      if (values[key] !== initialValues[key]) return true
    }
    return false
  }, [initialValues, values])

  return {
    values,
    errors,
    touched,
    setField,
    setValues,
    touchField,
    reset,
    bind,
    validateAll,
    touchAll,
    isValid,
    isDirty,
  }
}
