/**
 * Tests para la validación opcional del output de agentes con Zod schema.
 *
 * - Si un agente NO declara `outputSchema`, el runtime se comporta igual que antes.
 * - Si un agente declara schema y el output calza, se devuelve sin tocar.
 * - Si declara schema y NO calza, se degrada a `status='partial'` + warning,
 *   pero no se pierde el `data` ni se relanza el error.
 */

import { z } from 'zod'
import { runAgent } from '../runtime'
import type { AgentDefinition, AgentResult } from '../types'

const { mockGetAgent } = vi.hoisted(() => ({ mockGetAgent: vi.fn() }))
vi.mock('../registry', () => ({ getAgent: mockGetAgent }))

function makeAgent(overrides: Partial<AgentDefinition> = {}): AgentDefinition {
  return {
    slug: 'test',
    name: 'Test Agent',
    description: 'agent for tests',
    category: 'sunafil',
    icon: 'Bug',
    status: 'experimental',
    acceptedInputs: ['text'],
    estimatedTokens: 0,
    run: async () =>
      ({
        agentSlug: 'test',
        runId: 'r1',
        status: 'success',
        confidence: 90,
        data: { ok: true, riesgo: 'BAJO' },
        summary: 'ok',
        warnings: [],
        recommendedActions: [],
        model: 'mock',
        durationMs: 0,
      }) satisfies AgentResult,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runAgent — outputSchema (S2.6)', () => {
  test('agente sin schema → output pasa intacto', async () => {
    mockGetAgent.mockReturnValue(makeAgent())
    const r = await runAgent('test', { type: 'text', text: 'x' }, { orgId: 'o', userId: 'u' })
    expect(r.status).toBe('success')
    expect(r.warnings).toEqual([])
  })

  test('agente con schema y output válido → success', async () => {
    const schema = z.object({ ok: z.boolean(), riesgo: z.enum(['BAJO', 'MEDIO', 'ALTO']) })
    mockGetAgent.mockReturnValue(makeAgent({ outputSchema: schema }))

    const r = await runAgent('test', { type: 'text', text: 'x' }, { orgId: 'o', userId: 'u' })
    expect(r.status).toBe('success')
    expect(r.warnings).toEqual([])
  })

  test('agente con schema y output inválido → partial + warning, NO crash', async () => {
    const schema = z.object({
      ok: z.boolean(),
      riesgo: z.enum(['CRITICO']), // El agente devuelve 'BAJO' — no calza
    })
    mockGetAgent.mockReturnValue(makeAgent({ outputSchema: schema }))

    const r = await runAgent('test', { type: 'text', text: 'x' }, { orgId: 'o', userId: 'u' })
    expect(r.status).toBe('partial')
    expect(r.warnings.length).toBeGreaterThan(0)
    expect(r.warnings[0]).toMatch(/no calzó con el schema/i)
    // data se preserva
    expect(r.data).toEqual({ ok: true, riesgo: 'BAJO' })
  })

  test('output null/undefined → no se valida (skip schema)', async () => {
    const schema = z.object({ ok: z.boolean() })
    mockGetAgent.mockReturnValue(
      makeAgent({
        outputSchema: schema,
        run: async () =>
          ({
            agentSlug: 'test',
            runId: 'r1',
            status: 'partial',
            confidence: 0,
            data: null,
            summary: 'no se pudo procesar',
            warnings: [],
            recommendedActions: [],
            model: 'mock',
            durationMs: 0,
          }) satisfies AgentResult,
      }),
    )

    const r = await runAgent('test', { type: 'text', text: 'x' }, { orgId: 'o', userId: 'u' })
    expect(r.status).toBe('partial')
    // No agregó warning de "no calzó" — el schema se saltó porque data era null
    expect(r.warnings.find((w) => w.includes('no calzó'))).toBeUndefined()
  })

  test('si agent.run lanza, el runtime captura y devuelve status=error como antes', async () => {
    mockGetAgent.mockReturnValue(
      makeAgent({
        run: async () => {
          throw new Error('fallo simulado')
        },
      }),
    )

    const r = await runAgent('test', { type: 'text', text: 'x' }, { orgId: 'o', userId: 'u' })
    expect(r.status).toBe('error')
    expect(r.errors).toBeDefined()
    expect(r.errors?.[0]).toMatch(/fallo simulado/)
  })
})
