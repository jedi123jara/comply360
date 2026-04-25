/**
 * Tests para src/lib/ai/pii-redactor.ts
 *
 * Validan que NUNCA un DNI/RUC/email/teléfono/nombre literal salga al
 * LLM. Snapshot defensivo contra regresiones futuras (alguien agrega un
 * tipo de dato nuevo y olvida redactarlo).
 */

import { redactPii, unredact } from '../pii-redactor'

describe('redactPii', () => {
  test('redacta DNI de 8 dígitos exactos', () => {
    const r = redactPii('El trabajador 45678912 firmó el contrato.')
    expect(r.redacted).not.toMatch(/\b\d{8}\b/)
    expect(r.redacted).toContain('[DNI_1]')
    expect(r.mapping['[DNI_1]']).toBe('45678912')
    expect(r.counts.dni).toBe(1)
  })

  test('mismo DNI dos veces → mismo placeholder (determinista)', () => {
    const r = redactPii('45678912 vino y luego 45678912 se fue.')
    expect(r.counts.dni).toBe(1)
    expect((r.redacted.match(/\[DNI_1\]/g) ?? []).length).toBe(2)
  })

  test('DNIs distintos → placeholders distintos', () => {
    const r = redactPii('45678912 y 87654321 son hermanos.')
    expect(r.counts.dni).toBe(2)
    expect(r.redacted).toContain('[DNI_1]')
    expect(r.redacted).toContain('[DNI_2]')
  })

  test('redacta RUC peruano (11 dígitos, empieza con 10 o 20)', () => {
    const r = redactPii('La empresa con RUC 20123456789 contrata.')
    expect(r.redacted).toContain('[RUC_1]')
    expect(r.redacted).not.toMatch(/20123456789/)
    expect(r.mapping['[RUC_1]']).toBe('20123456789')
  })

  test('número de 11 dígitos que NO empieza con 10/20 NO se trata como RUC', () => {
    const r = redactPii('Código 33445566778 es del lote.')
    expect(r.counts.ruc).toBe(0)
  })

  test('redacta email', () => {
    const r = redactPii('Contacto: juan.perez@empresa.pe.')
    expect(r.redacted).toContain('[EMAIL_1]')
    expect(r.redacted).not.toContain('juan.perez@empresa.pe')
  })

  test('redacta teléfono peruano con y sin prefijo', () => {
    const r = redactPii('Llama al +51 999 888 777 o al 988777666.')
    expect(r.counts.phone).toBe(2)
    expect(r.redacted).not.toMatch(/999.?888.?777/)
    expect(r.redacted).not.toMatch(/988777666/)
  })

  test('redacta nombres del worker cuando se pasa context', () => {
    const r = redactPii(
      'Juan Pérez aceptó el contrato. Más tarde, Juan Pérez renunció.',
      { workerNames: ['Juan Pérez'] },
    )
    expect(r.redacted).toContain('[NAME_1]')
    expect(r.redacted).not.toContain('Juan Pérez')
    expect((r.redacted.match(/\[NAME_1\]/g) ?? []).length).toBe(2)
  })

  test('nombres case-insensitive', () => {
    const r = redactPii('JUAN PÉREZ y juan pérez son la misma persona.', {
      workerNames: ['Juan Pérez'],
    })
    expect(r.counts.name).toBe(1)
    expect(r.redacted).not.toMatch(/juan pérez/i)
  })

  test('snapshot completo: contrato laboral simulado sin PII en output', () => {
    const contrato = `
      CONTRATO DE TRABAJO
      Entre EMPRESA TEXTIL S.A.C., RUC 20505123456, domiciliada en Av. Argentina,
      y JUAN PÉREZ, identificado con DNI 45678912, email juan@gmail.com,
      teléfono +51 987 654 321, con CCI 00219012345678901234.
      Sueldo: S/ 1500.
    `
    const r = redactPii(contrato, { workerNames: ['Juan Pérez'] })

    // El test definitivo: ningún identificador literal sobrevive.
    expect(r.redacted).not.toMatch(/\b\d{8}\b/) // DNI
    expect(r.redacted).not.toMatch(/20505123456/) // RUC
    expect(r.redacted).not.toMatch(/juan@gmail\.com/) // email
    expect(r.redacted).not.toMatch(/987.?654.?321/) // teléfono
    expect(r.redacted).not.toMatch(/00219012345678901234/) // CCI
    expect(r.redacted).not.toMatch(/JUAN PÉREZ/i) // nombre

    // Y los counters reflejan la cobertura
    expect(r.counts.dni).toBe(1)
    expect(r.counts.ruc).toBe(1)
    expect(r.counts.email).toBe(1)
    expect(r.counts.phone).toBe(1)
    expect(r.counts.account).toBe(1)
    expect(r.counts.name).toBe(1)
  })

  test('texto sin PII queda intacto', () => {
    const text = 'El régimen general establece 30 días de vacaciones por año.'
    const r = redactPii(text)
    expect(r.redacted).toBe(text)
    expect(r.counts.dni).toBe(0)
  })
})

describe('unredact', () => {
  test('restaura el texto original con la mapping', () => {
    const r = redactPii('45678912 contrató 20123456789.')
    const restored = unredact(r.redacted, r.mapping)
    expect(restored).toBe('45678912 contrató 20123456789.')
  })

  test('orden por longitud evita matches parciales (DNI_10 vs DNI_1)', () => {
    // Forzamos 10 DNIs distintos
    const dnis = Array.from({ length: 11 }, (_, i) => String(10000000 + i)).join(' ')
    const r = redactPii(dnis)
    const restored = unredact(r.redacted, r.mapping)
    expect(restored).toBe(dnis)
  })
})
