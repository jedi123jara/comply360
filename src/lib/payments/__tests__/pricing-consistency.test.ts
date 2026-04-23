// =============================================
// Pricing consistency tests
// Ensures PLANS (constants.ts) and CULQI_PLANS (culqi.ts) stay in sync.
// =============================================

import { PLANS } from '@/lib/constants'
import { CULQI_PLANS } from '@/lib/payments/culqi'

describe('Pricing consistency: PLANS vs CULQI_PLANS', () => {
  // -----------------------------------------
  // STARTER
  // -----------------------------------------

  it('STARTER price matches between PLANS and CULQI_PLANS', () => {
    expect(PLANS.STARTER.price).toBe(CULQI_PLANS.STARTER.priceDisplay)
  })

  it('STARTER centimos matches between PLANS and CULQI_PLANS', () => {
    expect(PLANS.STARTER.priceInCentimos).toBe(CULQI_PLANS.STARTER.priceInCentimos)
  })

  // -----------------------------------------
  // EMPRESA
  // -----------------------------------------

  it('EMPRESA price matches between PLANS and CULQI_PLANS', () => {
    expect(PLANS.EMPRESA.price).toBe(CULQI_PLANS.EMPRESA.priceDisplay)
  })

  it('EMPRESA centimos matches between PLANS and CULQI_PLANS', () => {
    expect(PLANS.EMPRESA.priceInCentimos).toBe(CULQI_PLANS.EMPRESA.priceInCentimos)
  })

  // -----------------------------------------
  // PRO
  // -----------------------------------------

  it('PRO price matches between PLANS and CULQI_PLANS', () => {
    expect(PLANS.PRO.price).toBe(CULQI_PLANS.PRO.priceDisplay)
  })

  it('PRO centimos matches between PLANS and CULQI_PLANS', () => {
    expect(PLANS.PRO.priceInCentimos).toBe(CULQI_PLANS.PRO.priceInCentimos)
  })

  // -----------------------------------------
  // FREE — exists in PLANS, excluded from CULQI_PLANS
  // -----------------------------------------

  it('FREE has price 0 and is NOT in CULQI_PLANS', () => {
    expect(PLANS.FREE.price).toBe(0)
    expect('FREE' in CULQI_PLANS).toBe(false)
  })

  // -----------------------------------------
  // ENTERPRISE — exists in PLANS, excluded from CULQI_PLANS (contact-sales)
  // -----------------------------------------

  it('ENTERPRISE is in PLANS but NOT in CULQI_PLANS', () => {
    expect(PLANS.ENTERPRISE).toBeDefined()
    expect('ENTERPRISE' in CULQI_PLANS).toBe(false)
  })

  // -----------------------------------------
  // All CULQI_PLANS entries have a matching PLANS entry
  // -----------------------------------------

  it('all CULQI_PLANS entries have a matching entry in PLANS', () => {
    for (const key of Object.keys(CULQI_PLANS)) {
      expect(key in PLANS).toBe(true)
    }
  })

  // -----------------------------------------
  // priceInCentimos === price * 100 for each paid PLANS entry
  // -----------------------------------------

  it('priceInCentimos === price * 100 for each PLANS entry with price > 0', () => {
    for (const [key, plan] of Object.entries(PLANS)) {
      if (plan.price > 0) {
        expect(plan.priceInCentimos).toBe(plan.price * 100)
      }
    }
  })
})
