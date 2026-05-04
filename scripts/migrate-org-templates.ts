import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

interface LegacyTemplateMeta {
  _schema: 'contract_template_v1'
  documentType: string
  contractType?: string | null
  content: string
  placeholders?: string[]
  mappings?: Record<string, string>
  notes?: string
  usageCount?: number
}

function parseLegacyTemplate(description: string | null): LegacyTemplateMeta | null {
  if (!description) return null
  try {
    const parsed = JSON.parse(description) as Partial<LegacyTemplateMeta>
    if (
      parsed._schema === 'contract_template_v1'
      && typeof parsed.documentType === 'string'
      && typeof parsed.content === 'string'
    ) {
      return {
        _schema: 'contract_template_v1',
        documentType: parsed.documentType,
        contractType: parsed.contractType ?? null,
        content: parsed.content,
        placeholders: Array.isArray(parsed.placeholders)
          ? parsed.placeholders.filter((item): item is string => typeof item === 'string')
          : [],
        mappings: isStringRecord(parsed.mappings) ? parsed.mappings : {},
        notes: typeof parsed.notes === 'string' ? parsed.notes : undefined,
        usageCount: typeof parsed.usageCount === 'number' ? parsed.usageCount : 0,
      }
    }
    return null
  } catch {
    return null
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every((item) => typeof item === 'string')
}

async function main() {
  const legacyDocs = await prisma.orgDocument.findMany({
    where: { type: 'OTRO' },
    select: {
      id: true,
      orgId: true,
      title: true,
      description: true,
      version: true,
      uploadedById: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  let migrated = 0
  let skipped = 0

  for (const doc of legacyDocs) {
    const meta = parseLegacyTemplate(doc.description)
    if (!meta) {
      skipped += 1
      continue
    }

    const existing = await prisma.orgTemplate.findFirst({
      where: {
        orgId: doc.orgId,
        title: doc.title,
        documentType: meta.documentType,
        content: meta.content,
      },
      select: { id: true },
    })
    if (existing) {
      skipped += 1
      continue
    }

    await prisma.orgTemplate.create({
      data: {
        orgId: doc.orgId,
        title: doc.title,
        documentType: meta.documentType,
        contractType: meta.contractType ?? null,
        content: meta.content,
        placeholders: meta.placeholders ?? [],
        mappings: meta.mappings ?? {},
        notes: meta.notes ?? null,
        usageCount: meta.usageCount ?? 0,
        version: doc.version,
        active: true,
        createdById: doc.uploadedById,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    })
    migrated += 1
  }

  console.log(`OrgTemplate migration complete. migrated=${migrated} skipped=${skipped}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
