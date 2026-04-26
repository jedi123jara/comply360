// =============================================
// Culqi Payment Integration for Peru
// https://docs.culqi.com/
// =============================================

import type { Plan } from '@/generated/prisma/client'

// =============================================
// Plan definitions with prices in centimos
// (Culqi uses centimos: S/ 1.00 = 100 centimos)
// =============================================

export interface CulqiPlan {
  key: Plan
  name: string
  priceInCentimos: number
  priceDisplay: number
  currency: string
  interval: 'month'
  description: string
  features: string[]
  highlighted?: boolean
}

/**
 * CULQI_PLANS — fuente de verdad de pricing transaccional.
 *
 * Sincronizado con `src/lib/constants.ts` PLANS. Actualizar juntos.
 *
 * ENTERPRISE NO está acá: es contact-sales con pricing customizado + contrato anual.
 * Si quieres facturar un Enterprise estándar, copiar PRO y subir precio a 129900 centimos.
 */
// ENTERPRISE excluido porque es contact-sales (no Culqi-charged). Ver /dashboard/planes que redirige a WhatsApp
export const CULQI_PLANS: Record<Exclude<Plan, 'FREE' | 'ENTERPRISE'>, CulqiPlan> = {
  STARTER: {
    key: 'STARTER',
    name: 'Starter',
    priceInCentimos: 14900,
    priceDisplay: 149,
    currency: 'PEN',
    interval: 'month',
    description: 'Gestor de planilla + calculadoras. Para MYPEs que arrancan su compliance.',
    features: [
      'Hasta 20 trabajadores',
      'Gestor de planilla + legajo digital',
      '13 calculadoras peruanas',
      'Alertas de vencimientos',
      'Calendario de compliance',
      '2 usuarios admin',
      'Soporte por email',
    ],
  },
  EMPRESA: {
    key: 'EMPRESA',
    name: 'Empresa',
    priceInCentimos: 34900,
    priceDisplay: 349,
    currency: 'PEN',
    interval: 'month',
    description: 'Compliance SUNAFIL completo para pequeñas empresas.',
    highlighted: true,
    features: [
      'Hasta 100 trabajadores',
      'Todo del plan Starter',
      'Diagnóstico SUNAFIL 135 preguntas',
      'Simulacro de inspección básico',
      'Biblioteca de plantillas con merge fields',
      'Reportes ejecutivos PDF',
      '5 usuarios admin',
      'Soporte prioritario',
    ],
  },
  PRO: {
    key: 'PRO',
    name: 'Pro',
    priceInCentimos: 79900,
    priceDisplay: 799,
    currency: 'PEN',
    interval: 'month',
    description: 'IA + portal biométrico para medianas empresas.',
    features: [
      'Hasta 300 trabajadores',
      'Todo del plan Empresa',
      'Asistente IA (copilot)',
      'Auto-verificación de documentos con IA Vision',
      'Revisión IA de contratos',
      'Simulacro SUNAFIL completo + Acta PDF',
      'Portal del trabajador con firma biométrica',
      'Cascada de onboarding automatizada',
      'Canal de denuncias',
      'SST integral',
      '15 usuarios admin',
      'Soporte dedicado',
    ],
  },
}

// =============================================
// Culqi API configuration
// =============================================

const CULQI_API_BASE = 'https://api.culqi.com/v2'

function isDevMode(): boolean {
  return !process.env.CULQI_SECRET_KEY
}

function getCulqiSecretKey(): string {
  const key = process.env.CULQI_SECRET_KEY
  if (!key) {
    throw new Error('CULQI_SECRET_KEY no esta configurada en las variables de entorno')
  }
  return key
}

function getCulqiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getCulqiSecretKey()}`,
  }
}

// =============================================
// Types
// =============================================

export interface CulqiChargeRequest {
  token: string
  amount: number // in centimos
  currency: string
  email: string
  description: string
  metadata?: Record<string, string>
}

export interface CulqiChargeResponse {
  id: string
  amount: number
  currency: string
  email: string
  description: string
  source: {
    object: string
    id: string
    type: string
    card_number: string
    last_four: string
    active: boolean
    iin: {
      card_brand: string
      card_type: string
      issuer: {
        name: string
        country: string
      }
    }
  }
  outcome: {
    type: string
    code: string
    merchant_message: string
    user_message: string
  }
  metadata: Record<string, string>
  creation_date: number
  reference_code: string
}

export interface CulqiCustomerRequest {
  first_name: string
  last_name: string
  email: string
  address: string
  address_city: string
  country_code: string
  phone_number: string
}

export interface CulqiSubscriptionRequest {
  card_id: string
  plan_id: string
  metadata?: Record<string, string>
}

export interface CulqiSubscriptionResponse {
  id: string
  status: string
  plan_id: string
  card_id: string
  creation_date: number
  metadata?: Record<string, string>
}

export interface CulqiError {
  object: 'error'
  type: string
  charge_id?: string
  code?: string
  decline_code?: string
  merchant_message: string
  user_message: string
}

// =============================================
// Custom Error
// =============================================

export class CulqiPaymentError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code: string, statusCode: number) {
    super(message)
    this.name = 'CulqiPaymentError'
    this.code = code
    this.statusCode = statusCode
  }
}

// =============================================
// Mock responses for dev mode
// =============================================

function mockChargeResponse(
  amount: number,
  currency: string,
  email: string,
  description: string,
  metadata?: Record<string, string>
): CulqiChargeResponse {
  const id = `mock_chr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    amount,
    currency,
    email,
    description,
    source: {
      object: 'token',
      id: 'mock_tkn_test',
      type: 'card',
      card_number: '************4242',
      last_four: '4242',
      active: true,
      iin: {
        card_brand: 'Visa',
        card_type: 'credito',
        issuer: { name: 'Mock Bank', country: 'PE' },
      },
    },
    outcome: {
      type: 'venta_exitosa',
      code: 'AUT0000',
      merchant_message: 'La operacion de venta ha sido autorizada exitosamente',
      user_message: 'Su compra ha sido exitosa.',
    },
    metadata: metadata ?? {},
    creation_date: Date.now(),
    reference_code: `ref_${Date.now()}`,
  }
}

function mockSubscriptionResponse(planId: string): CulqiSubscriptionResponse {
  return {
    id: `mock_sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'active',
    plan_id: planId,
    card_id: 'mock_card_test',
    creation_date: Date.now(),
  }
}

// =============================================
// CulqiService class
// =============================================

export class CulqiService {
  /**
   * Create a one-time charge using a Culqi token.
   * In dev mode (no CULQI_SECRET_KEY), returns a mock response.
   */
  async createCharge(
    amount: number,
    currency: string,
    email: string,
    token: string,
    description: string,
    metadata?: Record<string, string>
  ): Promise<CulqiChargeResponse> {
    if (isDevMode()) {
      console.log('[CulqiService][DEV] Mock createCharge:', { amount, currency, email, description })
      return mockChargeResponse(amount, currency, email, description, metadata)
    }

    const payload: CulqiChargeRequest = {
      token,
      amount,
      currency,
      email,
      description,
      metadata,
    }

    const response = await fetch(`${CULQI_API_BASE}/charges`, {
      method: 'POST',
      headers: getCulqiHeaders(),
      body: JSON.stringify(payload),
    })

    const data: unknown = await response.json()

    if (!response.ok) {
      const error = data as CulqiError
      throw new CulqiPaymentError(
        error.user_message || error.merchant_message || 'Error al procesar el pago',
        error.code || 'UNKNOWN',
        response.status
      )
    }

    return data as CulqiChargeResponse
  }

  /**
   * Create a subscription for recurring billing.
   * In dev mode, returns a mock response.
   */
  async createSubscription(
    planId: string,
    email: string,
    token: string,
    metadata?: Record<string, string>
  ): Promise<CulqiSubscriptionResponse> {
    if (isDevMode()) {
      console.log('[CulqiService][DEV] Mock createSubscription:', { planId, email })
      return mockSubscriptionResponse(planId)
    }

    // In production, first create a customer, then a card, then subscribe.
    // For simplicity, we create the subscription with the card_id (token).
    const payload: CulqiSubscriptionRequest = {
      card_id: token,
      plan_id: planId,
      metadata: { ...metadata, email },
    }

    const response = await fetch(`${CULQI_API_BASE}/subscriptions`, {
      method: 'POST',
      headers: getCulqiHeaders(),
      body: JSON.stringify(payload),
    })

    const data: unknown = await response.json()

    if (!response.ok) {
      const error = data as CulqiError
      throw new CulqiPaymentError(
        error.user_message || 'Error al crear la suscripcion',
        error.code || 'UNKNOWN',
        response.status
      )
    }

    return data as CulqiSubscriptionResponse
  }

  /**
   * Cancel an active subscription.
   * In dev mode, returns a mock cancelled status.
   */
  async cancelSubscription(
    subscriptionId: string
  ): Promise<{ id: string; status: string }> {
    if (isDevMode()) {
      console.log('[CulqiService][DEV] Mock cancelSubscription:', subscriptionId)
      return { id: subscriptionId, status: 'cancelled' }
    }

    const response = await fetch(`${CULQI_API_BASE}/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: getCulqiHeaders(),
    })

    const data: unknown = await response.json()

    if (!response.ok) {
      const error = data as CulqiError
      throw new CulqiPaymentError(
        error.user_message || 'Error al cancelar la suscripcion',
        error.code || 'UNKNOWN',
        response.status
      )
    }

    return data as { id: string; status: string }
  }

  /**
   * Get the status of a charge by its ID.
   * In dev mode, returns a mock successful status.
   */
  async getChargeStatus(
    chargeId: string
  ): Promise<CulqiChargeResponse> {
    if (isDevMode()) {
      console.log('[CulqiService][DEV] Mock getChargeStatus:', chargeId)
      return mockChargeResponse(0, 'PEN', 'mock@test.com', 'Mock charge lookup')
    }

    const response = await fetch(`${CULQI_API_BASE}/charges/${chargeId}`, {
      method: 'GET',
      headers: getCulqiHeaders(),
    })

    const data: unknown = await response.json()

    if (!response.ok) {
      const error = data as CulqiError
      throw new CulqiPaymentError(
        error.user_message || 'Error al consultar el cargo',
        error.code || 'UNKNOWN',
        response.status
      )
    }

    return data as CulqiChargeResponse
  }
}

// =============================================
// Backward-compatible standalone functions
// =============================================

const defaultService = new CulqiService()

/**
 * Create a one-time charge using a Culqi token.
 * Token is obtained from Culqi.js on the frontend.
 */
export async function createCharge(
  token: string,
  amount: number,
  email: string,
  description: string,
  metadata?: Record<string, string>
): Promise<CulqiChargeResponse> {
  return defaultService.createCharge(amount, 'PEN', email, token, description, metadata)
}

/**
 * Create a subscription for recurring billing.
 */
export async function createSubscription(
  planId: string,
  email: string,
  token: string,
  metadata?: Record<string, string>
): Promise<CulqiSubscriptionResponse> {
  return defaultService.createSubscription(planId, email, token, metadata)
}

/**
 * Cancel a subscription.
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<{ id: string; status: string }> {
  return defaultService.cancelSubscription(subscriptionId)
}

/**
 * Get charge status.
 */
export async function getChargeStatus(
  chargeId: string
): Promise<CulqiChargeResponse> {
  return defaultService.getChargeStatus(chargeId)
}

// =============================================
// Helpers
// =============================================

/**
 * Validate that a plan key is Culqi-charged (excluye FREE + ENTERPRISE contact-sales)
 */
export function isValidPaidPlan(planKey: string): planKey is Exclude<Plan, 'FREE' | 'ENTERPRISE'> {
  return planKey in CULQI_PLANS
}

/**
 * Get plan details by key
 */
export function getPlanDetails(planKey: string): CulqiPlan | null {
  if (!isValidPaidPlan(planKey)) return null
  return CULQI_PLANS[planKey]
}
