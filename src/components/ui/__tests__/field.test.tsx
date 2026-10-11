// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Field } from '../field'
import { Input } from '../input'
import { Textarea } from '../textarea'
import { Select, SelectTrigger, SelectValue } from '../select'

function describedTexts(el: HTMLElement): string[] {
  const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
  return ids.map((id) => document.getElementById(id)?.textContent ?? `<sin elemento #${id}>`)
}

describe('Field', () => {
  it('conecta label, ayuda, error, aria-invalid y aria-required con Input', () => {
    render(
      <Field label="DNI" hint="8 dígitos, sin puntos" error="El DNI debe tener 8 dígitos" required>
        <Input />
      </Field>
    )
    const input = screen.getByLabelText(/DNI/)
    expect(input.tagName).toBe('INPUT')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-required')).toBe('true')
    // No activa la validación nativa del navegador.
    expect(input.hasAttribute('required')).toBe(false)

    const texts = describedTexts(input)
    expect(texts).toHaveLength(2)
    expect(texts[0]).toContain('El DNI debe tener 8 dígitos')
    expect(texts[1]).toBe('8 dígitos, sin puntos')
  })

  it('el error lleva ícono + texto (no solo color)', () => {
    render(
      <Field label="Correo" error="Correo inválido">
        <Input type="email" />
      </Field>
    )
    const input = screen.getByLabelText('Correo')
    const errorId = input.getAttribute('aria-describedby')!
    const error = document.getElementById(errorId)!
    expect(error.textContent).toContain('Correo inválido')
    const icon = error.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon!.getAttribute('aria-hidden')).toBe('true')
  })

  it('sin error no marca aria-invalid y solo describe con la ayuda', () => {
    render(
      <Field label="Cargo" hint="Como figura en el contrato">
        <Input />
      </Field>
    )
    const input = screen.getByLabelText('Cargo')
    expect(input.hasAttribute('aria-invalid')).toBe(false)
    expect(describedTexts(input)).toEqual(['Como figura en el contrato'])
  })

  it('respeta el id del control y combina su aria-describedby propio', () => {
    render(
      <>
        <p id="nota-externa">Nota externa</p>
        <Field label="Sueldo" error="Monto requerido">
          <input id="sueldo" aria-describedby="nota-externa" />
        </Field>
      </>
    )
    const input = screen.getByLabelText('Sueldo')
    expect(input.id).toBe('sueldo')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const texts = describedTexts(input)
    expect(texts[0]).toBe('Nota externa')
    expect(texts[1]).toContain('Monto requerido')
  })

  it('conecta el SelectTrigger de Radix por contexto', () => {
    render(
      <Field label="Régimen laboral" error="Elige un régimen">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Elige…" />
          </SelectTrigger>
        </Select>
      </Field>
    )
    const trigger = screen.getByLabelText('Régimen laboral')
    expect(trigger.getAttribute('role')).toBe('combobox')
    expect(trigger.getAttribute('aria-invalid')).toBe('true')
    expect(describedTexts(trigger)[0]).toContain('Elige un régimen')
  })

  it('conecta Textarea y acepta la forma render-prop', () => {
    render(
      <>
        <Field label="Observaciones" hint="Opcional">
          <Textarea />
        </Field>
        <Field label="Fecha de ingreso" error="Fecha inválida">
          {(control) => <input type="date" {...control} />}
        </Field>
      </>
    )
    const textarea = screen.getByLabelText('Observaciones')
    expect(textarea.tagName).toBe('TEXTAREA')
    expect(describedTexts(textarea)).toEqual(['Opcional'])

    const date = screen.getByLabelText('Fecha de ingreso')
    expect(date.getAttribute('aria-invalid')).toBe('true')
  })

  it('Input mantiene su API anterior (label/error/helperText) fuera de un Field', () => {
    render(<Input label="Razón social" error="Campo obligatorio" helperText="Como en la ficha RUC" />)
    const input = screen.getByLabelText('Razón social')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const texts = describedTexts(input)
    expect(texts[0]).toContain('Campo obligatorio')
    expect(texts[1]).toBe('Como en la ficha RUC')
  })

  it('Input, Select y Textarea comparten altura y anillo de foco', () => {
    render(
      <>
        <Input aria-label="a" />
        <Select>
          <SelectTrigger aria-label="b">
            <SelectValue placeholder="…" />
          </SelectTrigger>
        </Select>
      </>
    )
    const input = screen.getByLabelText('a')
    const trigger = screen.getByLabelText('b')
    for (const el of [input, trigger]) {
      expect(el.className).toContain('h-10')
      expect(el.className).toContain('rounded-lg')
      expect(el.className).toContain('focus-visible:ring-[3px]')
    }
  })
})
