import { NextRequest, NextResponse } from 'next/server'
import { reviewContract } from '@/lib/ai/contract-review'
import { detectProvider, getModelName } from '@/lib/ai/provider'
import { withAuth } from '@/lib/api-auth'

// =============================================
// POST /api/ai-review - Review a contract with AI
// =============================================
export const POST = withAuth(async (request, ctx) => {
  try {
    const body = await request.json()
    const { contractHtml, contractType, templateId } = body

    if (!contractHtml || !contractType) {
      return NextResponse.json(
        { error: 'contractHtml and contractType are required' },
        { status: 400 }
      )
    }

    const result = await reviewContract({
      contractHtml,
      contractType,
      templateId,
    })

    return NextResponse.json({
      data: result,
      meta: {
        provider: detectProvider(),
        model: getModelName(),
        reviewedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('AI review error:', error)
    return NextResponse.json(
      { error: 'AI review failed. Please try again.' },
      { status: 500 }
    )
  }
})
