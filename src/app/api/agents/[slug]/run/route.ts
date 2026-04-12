import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { runAgent } from '@/lib/agents/runtime'
import { getAgent } from '@/lib/agents/registry'
import type { AgentInput, AgentInputType } from '@/lib/agents/types'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15 MB

export const POST = withAuth(async (req: NextRequest, ctx) => {
  // Extract slug from URL: /api/agents/[slug]/run
  const segments = req.nextUrl.pathname.split('/')
  const slug = segments[segments.indexOf('agents') + 1]

  if (!slug) {
    return NextResponse.json({ error: 'Slug del agente requerido' }, { status: 400 })
  }

  const agent = getAgent(slug)
  if (!agent) {
    return NextResponse.json({ error: `Agente "${slug}" no encontrado` }, { status: 404 })
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    let input: AgentInput

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file') as File | null
      if (!file) {
        return NextResponse.json({ error: 'Falta el archivo "file"' }, { status: 400 })
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `El archivo excede ${MAX_FILE_SIZE / 1024 / 1024} MB` },
          { status: 400 }
        )
      }

      const name = file.name.toLowerCase()
      const type: AgentInputType = name.endsWith('.pdf')
        ? 'pdf'
        : name.endsWith('.docx')
          ? 'docx'
          : 'text'

      const buffer = Buffer.from(await file.arrayBuffer())
      const paramsRaw = form.get('params')
      let params: Record<string, unknown> | undefined
      if (typeof paramsRaw === 'string') {
        try {
          params = JSON.parse(paramsRaw)
        } catch {
          /* ignore */
        }
      }

      input = {
        type,
        fileBuffer: buffer,
        fileName: file.name,
        params,
      }
    } else {
      const body = await req.json()
      input = body as AgentInput
    }

    const result = await runAgent(slug, input, {
      orgId: ctx.orgId,
      userId: ctx.userId,
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error(`[Agent:${slug}] error`, e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error inesperado ejecutando el agente' },
      { status: 500 }
    )
  }
})
