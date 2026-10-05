// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { CopilotProvider, useCopilot } from '../copilot-provider'

function sse(events: string[], status = 200): Response {
  return new Response(events.join(''), {
    status,
    headers: { 'content-type': 'text/event-stream' },
  })
}

const wrapper = ({ children }: { children: ReactNode }) => <CopilotProvider>{children}</CopilotProvider>

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CopilotProvider', () => {
  it('arma la respuesta con los eventos delta y reenvía el historial', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        sse([
          'event: citations\ndata: {"citations":[],"ragChunksUsed":0}\n\n',
          'event: delta\ndata: {"delta":"La CTS "}\n\n',
          'event: delta\ndata: {"delta":"se deposita en mayo."}\n\n',
          'event: done\ndata: {}\n\n',
        ]),
      )
      .mockResolvedValueOnce(sse(['event: delta\ndata: {"delta":"Sí."}\n\n']))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCopilot(), { wrapper })

    await act(async () => {
      result.current.send('¿Qué es la CTS?')
    })
    await waitFor(() => expect(result.current.messages[1]?.streaming).toBe(false))
    expect(result.current.messages[1].content).toBe('La CTS se deposita en mayo.')

    await act(async () => {
      result.current.send('¿Y en noviembre?')
    })
    await waitFor(() => expect(result.current.messages[3]?.streaming).toBe(false))

    const body = JSON.parse(fetchMock.mock.calls[1][1].body as string) as {
      messages: { role: string; content: string }[]
    }
    expect(body.messages).toEqual([
      { role: 'user', content: '¿Qué es la CTS?' },
      { role: 'assistant', content: 'La CTS se deposita en mayo.' },
      { role: 'user', content: '¿Y en noviembre?' },
    ])
  })

  it('muestra un aviso claro cuando se agotó el límite del mes (respuesta SSE 429)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sse(['event: error\ndata: {"error":"AI_QUOTA_EXCEEDED","message":"x"}\n\n'], 429),
      ),
    )
    const { result } = renderHook(() => useCopilot(), { wrapper })
    await act(async () => {
      result.current.send('Hola')
    })
    await waitFor(() => expect(result.current.messages[1]?.streaming).toBe(false))
    expect(result.current.messages[1].content).toContain('límite del asistente de este mes')
    expect(result.current.messages[1].isError).toBe(true)
  })

  it('distingue plan insuficiente de usuario de solo lectura', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ code: 'PLAN_UPGRADE_REQUIRED', requiredPlan: 'PRO', upgradeUrl: '/dashboard/planes' }, { status: 403 }),
        )
        .mockResolvedValueOnce(Response.json({ code: 'READ_ONLY_ROLE' }, { status: 403 })),
    )
    const { result } = renderHook(() => useCopilot(), { wrapper })

    await act(async () => {
      result.current.send('Hola')
    })
    await waitFor(() => expect(result.current.messages[1]?.streaming).toBe(false))
    expect(result.current.messages[1].content).toContain('desde el plan Pro')

    await act(async () => {
      result.current.send('Hola otra vez')
    })
    await waitFor(() => expect(result.current.messages[3]?.streaming).toBe(false))
    expect(result.current.messages[3].content).toContain('solo lectura')
  })

  it('no reenvía los avisos de error (ni su pregunta) como historial', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('falla', { status: 500 }))
      .mockResolvedValueOnce(sse(['event: delta\ndata: {"delta":"Listo."}\n\n']))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useCopilot(), { wrapper })

    await act(async () => {
      result.current.send('Primera')
    })
    await waitFor(() => expect(result.current.messages[1]?.streaming).toBe(false))
    expect(result.current.messages[1].content).toContain('No pude responder')

    await act(async () => {
      result.current.send('Segunda')
    })
    await waitFor(() => expect(result.current.messages[3]?.streaming).toBe(false))
    const body = JSON.parse(fetchMock.mock.calls[1][1].body as string) as {
      messages: { role: string; content: string }[]
    }
    expect(body.messages).toEqual([{ role: 'user', content: 'Segunda' }])
  })
})
