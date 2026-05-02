// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { z } from 'zod'
import { useFormState } from '../use-form-state'

const schema = z.object({
  cargo: z.string().min(2, 'Cargo muy corto'),
  sueldo: z.number().positive('Sueldo debe ser positivo'),
  flexible: z.boolean(),
})

type FormShape = z.infer<typeof schema>

const initial: FormShape = { cargo: '', sueldo: 0, flexible: false }

describe('useFormState', () => {
  it('inicializa con los valores iniciales', () => {
    const { result } = renderHook(() => useFormState({ initial, schema }))
    expect(result.current.values).toEqual(initial)
    expect(result.current.errors).toEqual({})
    expect(result.current.touched).toEqual({})
    expect(result.current.isDirty).toBe(false)
  })

  it('setField marca dirty', () => {
    const { result } = renderHook(() => useFormState({ initial, schema }))
    act(() => {
      result.current.setField('cargo', 'Gerente')
    })
    expect(result.current.values.cargo).toBe('Gerente')
    expect(result.current.isDirty).toBe(true)
  })

  it('validateAll devuelve errores tipados cuando falla', () => {
    const { result } = renderHook(() => useFormState({ initial, schema }))
    let outcome: ReturnType<typeof result.current.validateAll> | undefined
    act(() => {
      outcome = result.current.validateAll()
    })
    expect(outcome?.ok).toBe(false)
    if (outcome && !outcome.ok) {
      expect(outcome.errors.cargo).toBeDefined()
      expect(outcome.errors.sueldo).toBeDefined()
    }
  })

  it('validateAll devuelve data tipada cuando pasa', () => {
    const { result } = renderHook(() => useFormState({ initial, schema }))
    act(() => {
      result.current.setField('cargo', 'Gerente')
      result.current.setField('sueldo', 3500)
      result.current.setField('flexible', true)
    })
    let outcome: ReturnType<typeof result.current.validateAll> | undefined
    act(() => {
      outcome = result.current.validateAll()
    })
    expect(outcome?.ok).toBe(true)
    if (outcome && outcome.ok) {
      expect(outcome.data.cargo).toBe('Gerente')
      expect(outcome.data.sueldo).toBe(3500)
    }
  })

  it('touchField en modo blur valida solo ese campo', () => {
    const { result } = renderHook(() =>
      useFormState({ initial, schema, validateOn: 'blur' })
    )
    act(() => {
      result.current.setField('cargo', 'X') // 1 char, debe fallar al hacer blur
      result.current.touchField('cargo')
    })
    expect(result.current.errors.cargo).toBe('Cargo muy corto')
    // sueldo sigue invalido pero no fue tocado
    expect(result.current.errors.sueldo).toBeUndefined()
  })

  it('reset vuelve al estado inicial', () => {
    const { result } = renderHook(() => useFormState({ initial, schema }))
    act(() => {
      result.current.setField('cargo', 'Gerente')
      result.current.touchField('cargo')
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.values).toEqual(initial)
    expect(result.current.errors).toEqual({})
    expect(result.current.touched).toEqual({})
    expect(result.current.isDirty).toBe(false)
  })

  it('reset con valores nuevos los toma como nuevo baseline', () => {
    const { result } = renderHook(() => useFormState({ initial, schema }))
    const next = { cargo: 'Analista', sueldo: 2500, flexible: true }
    act(() => {
      result.current.reset(next)
    })
    expect(result.current.values).toEqual(next)
    expect(result.current.isDirty).toBe(false)
    act(() => {
      result.current.setField('cargo', 'Otro')
    })
    expect(result.current.isDirty).toBe(true)
  })

  it('isValid refleja el estado completo del formulario', () => {
    const { result } = renderHook(() => useFormState({ initial, schema }))
    expect(result.current.isValid).toBe(false)
    act(() => {
      result.current.setField('cargo', 'Gerente')
      result.current.setField('sueldo', 3500)
    })
    expect(result.current.isValid).toBe(true)
  })

  it('setValues asigna varios campos a la vez', () => {
    const { result } = renderHook(() => useFormState({ initial, schema }))
    act(() => {
      result.current.setValues({ cargo: 'Gerente', sueldo: 5000 })
    })
    expect(result.current.values).toEqual({ cargo: 'Gerente', sueldo: 5000, flexible: false })
  })

  it('sin schema, no valida y siempre es valido', () => {
    const { result } = renderHook(() => useFormState({ initial }))
    expect(result.current.isValid).toBe(true)
    let outcome: ReturnType<typeof result.current.validateAll> | undefined
    act(() => {
      outcome = result.current.validateAll()
    })
    expect(outcome?.ok).toBe(true)
  })
})
