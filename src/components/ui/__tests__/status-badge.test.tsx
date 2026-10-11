// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Clock } from 'lucide-react'
import { StatusBadge, scoreLabel, scoreTone, type StatusTone } from '../status-badge'

const TONES: StatusTone[] = ['success', 'warning', 'danger', 'info', 'neutral']

describe('StatusBadge', () => {
  it.each(TONES)('tono %s: siempre muestra ícono (oculto al lector) + texto', (tone) => {
    const { container } = render(<StatusBadge tone={tone} label="Estado de prueba" />)
    const badge = container.firstElementChild as HTMLElement
    expect(badge.textContent).toBe('Estado de prueba')
    expect(badge.getAttribute('data-tone')).toBe(tone)
    const icon = badge.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon!.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('cada tono usa un ícono distinto por defecto', () => {
    const classes = TONES.map((tone) => {
      const { container } = render(<StatusBadge tone={tone} label="x" />)
      return container.querySelector('svg')!.getAttribute('class')
    })
    expect(new Set(classes).size).toBe(TONES.length)
  })

  it('acepta un ícono propio', () => {
    const { container } = render(<StatusBadge tone="warning" label="Por vencer" icon={Clock} />)
    expect(container.querySelector('svg')!.getAttribute('class')).toContain('lucide-clock')
  })

  it('con label vacío igual muestra texto (respaldo por tono)', () => {
    const { container } = render(<StatusBadge tone="danger" label="  " />)
    expect(container.textContent).toBe('En riesgo')
    expect(container.querySelector('svg')).not.toBeNull()
  })
})

describe('scoreTone / scoreLabel', () => {
  it.each([
    [0, 'danger', 'En riesgo'],
    [59, 'danger', 'En riesgo'],
    [59.9, 'danger', 'En riesgo'],
    [60, 'warning', 'A mejorar'],
    [79, 'warning', 'A mejorar'],
    [80, 'success', 'Bien'],
    [100, 'success', 'Bien'],
  ] as const)('score %s → %s / %s', (score, tone, label) => {
    expect(scoreTone(score)).toBe(tone)
    expect(scoreLabel(score)).toBe(label)
  })

  it('valores no numéricos quedan en neutral / "Sin datos"', () => {
    expect(scoreTone(Number.NaN)).toBe('neutral')
    expect(scoreLabel(Number.NaN)).toBe('Sin datos')
    expect(scoreTone(Number.POSITIVE_INFINITY)).toBe('neutral')
  })
})
