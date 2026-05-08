/**
 * Helper de aritmética decimal para cálculos monetarios PEN.
 *
 * FIX #2.A: las calculadoras laborales usaban `number` + `Math.round(*100)/100`
 * para todas las operaciones. Eso introduce errores de coma flotante hasta
 * ~S/0.05 acumulados en sumas largas (boleta, liquidación, utilidades).
 * Para integración con T-REGISTRO/PLAME (que requiere centavos exactos)
 * y para cuadrar contra el cálculo del contador del cliente, usamos
 * `decimal.js` como base de las operaciones intermedias.
 *
 * Uso recomendado:
 *
 *   import { money } from '@/lib/legal-engine/money'
 *
 *   const cts = money(remComputable).div(12).mul(meses)
 *     .add(money(remComputable).div(360).mul(dias))
 *
 *   return cts.toNumber()  // 2 decimales redondeados
 *
 * Conversión final:
 *   .toNumber()      → number con 2 decimales (PEN)
 *   .toString()      → string "S/ 1234.56"
 *   .toFixed(2)      → string "1234.56" sin símbolo
 *
 * Decimal.js NO trunca silenciosamente. Tipos string/number/Money se
 * aceptan en operaciones; null/undefined lanzan.
 */

import Decimal from 'decimal.js'

// Configuración global de decimal.js
//   - precision 30: suficiente para cualquier cálculo laboral peruano
//   - rounding: banker's rounding (ROUND_HALF_EVEN) — minimiza sesgo
//     acumulado en sumas largas. Para PEN 2 decimales es indistinguible
//     de ROUND_HALF_UP en la práctica.
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_EVEN })

export type MoneyInput = number | string | Decimal | Money

/**
 * Wrapper inmutable sobre Decimal con métodos en español-peruano y
 * conversión final a `number` con 2 decimales.
 */
export class Money {
  private readonly value: Decimal

  constructor(input: MoneyInput) {
    if (input instanceof Money) {
      this.value = input.value
    } else if (input instanceof Decimal) {
      this.value = input
    } else if (typeof input === 'number') {
      if (!Number.isFinite(input)) {
        throw new Error(`Money: input no es número finito: ${input}`)
      }
      this.value = new Decimal(input)
    } else if (typeof input === 'string') {
      this.value = new Decimal(input)
    } else {
      throw new Error(`Money: input inválido: ${input}`)
    }
  }

  add(other: MoneyInput): Money {
    return new Money(this.value.plus(Money.toDecimal(other)))
  }

  sub(other: MoneyInput): Money {
    return new Money(this.value.minus(Money.toDecimal(other)))
  }

  mul(other: MoneyInput): Money {
    return new Money(this.value.times(Money.toDecimal(other)))
  }

  /**
   * División. Si el divisor es 0, lanza (no devuelve Infinity como JS).
   */
  div(other: MoneyInput): Money {
    const d = Money.toDecimal(other)
    if (d.isZero()) {
      throw new Error('Money: división por cero')
    }
    return new Money(this.value.dividedBy(d))
  }

  /**
   * Compara con otro Money. Devuelve -1, 0, 1.
   */
  cmp(other: MoneyInput): number {
    return this.value.comparedTo(Money.toDecimal(other))
  }

  isZero(): boolean {
    return this.value.isZero()
  }

  isNegative(): boolean {
    return this.value.isNegative()
  }

  isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero()
  }

  /**
   * Aplica un mínimo (no permitir bajar de `floor`).
   */
  max(other: MoneyInput): Money {
    return this.cmp(other) >= 0 ? this : new Money(other)
  }

  /**
   * Aplica un máximo (no permitir superar `ceiling`).
   */
  min(other: MoneyInput): Money {
    return this.cmp(other) <= 0 ? this : new Money(other)
  }

  /**
   * Devuelve un number redondeado a 2 decimales (PEN canónico).
   * Esto es el "salida final" — internamente seguimos con precisión alta.
   */
  toNumber(): number {
    return this.value.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toNumber()
  }

  /** Igual a toNumber() pero como string "1234.56" sin símbolo. */
  toFixed(decimals = 2): string {
    return this.value.toFixed(decimals, Decimal.ROUND_HALF_EVEN)
  }

  /** Formato es-PE con dos decimales y símbolo S/. */
  toFormatted(): string {
    return `S/ ${this.toNumber().toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  /** Para JSON.stringify y debugging. */
  toJSON(): number {
    return this.toNumber()
  }

  toString(): string {
    return this.toFormatted()
  }

  // ─── Helpers internos ─────────────────────────────────────────────────────

  private static toDecimal(input: MoneyInput): Decimal {
    if (input instanceof Money) return input.value
    if (input instanceof Decimal) return input
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) {
        throw new Error(`Money: input no es número finito: ${input}`)
      }
      return new Decimal(input)
    }
    return new Decimal(input)
  }
}

/**
 * Factory ergonómica. Equivale a `new Money(x)`.
 */
export function money(input: MoneyInput): Money {
  return new Money(input)
}

/**
 * Suma una lista de Money/numbers en un solo pasada (más preciso que
 * acumular con number + round porque mantiene precisión interna).
 */
export function sumMoney(values: ReadonlyArray<MoneyInput>): Money {
  let acc = new Money(0)
  for (const v of values) acc = acc.add(v)
  return acc
}
