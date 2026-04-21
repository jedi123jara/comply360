import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRole } from '@/lib/api-auth'
import { ALL_TEMPLATES } from '@/lib/templates/contract-templates'
import type { ContractType } from '@/generated/prisma/client'

// =============================================
// GET /api/templates - List contract templates from DB
// =============================================
export const GET = withAuth(async () => {
  try {
    const templates = await prisma.contractTemplate.findMany({
      where: { isActive: true },
      orderBy: { type: 'asc' },
      select: {
        id: true,
        type: true,
        name: true,
        description: true,
        legalBasis: true,
        fieldsSchema: true,
        contentBlocks: true,
        version: true,
      },
    })

    return NextResponse.json({ data: templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
})

// =============================================
// POST /api/templates?action=seed - Seed the 5 default templates
// =============================================
export const POST = withRole('ADMIN', async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action !== 'seed') {
    return NextResponse.json({ error: 'Unknown action. Use ?action=seed' }, { status: 400 })
  }

  try {
    let created = 0
    let updated = 0

    for (const tmpl of ALL_TEMPLATES) {
      const existing = await prisma.contractTemplate.findFirst({
        where: { type: tmpl.type as ContractType },
      })

      const data = {
        type: tmpl.type as ContractType,
        name: tmpl.name,
        description: tmpl.description,
        legalBasis: tmpl.legalBasis,
        version: tmpl.version,
        fieldsSchema: JSON.parse(JSON.stringify(tmpl.fieldsSchema)),
        contentBlocks: JSON.parse(JSON.stringify(tmpl.contentBlocks)),
        isActive: true,
      }

      if (existing) {
        await prisma.contractTemplate.update({ where: { id: existing.id }, data })
        updated++
      } else {
        await prisma.contractTemplate.create({ data })
        created++
      }
    }

    return NextResponse.json({
      message: `Plantillas procesadas: ${created} creadas, ${updated} actualizadas`,
      total: ALL_TEMPLATES.length,
    })
  } catch (error) {
    console.error('Error seeding templates:', error)
    return NextResponse.json({ error: 'Failed to seed templates' }, { status: 500 })
  }
})
