import { NextResponse } from 'next/server'
import { reviewContract } from '@/lib/ai/contract-review'
import { detectProvider, getModelName } from '@/lib/ai/provider'
import { withPlanGate } from '@/lib/plan-gate'

// =============================================
// POST /api/ai-review - Review a contract with AI (PRO only — feature `review_ia`)
// =============================================
export const POST = withPlanGate('review_ia', async (request) => {
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
