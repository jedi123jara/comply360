/**
 * Detecta modelos Prisma con campo `orgId` pero SIN relación a Organization.
 * Output: lista de modelos huérfanos para 7.B remediation.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const schemaPath = join(__dirname, '..', '..', 'prisma', 'schema.prisma')
const raw = readFileSync(schemaPath, 'utf-8')

// Parse modelos
const modelRegex = /^model\s+(\w+)\s*\{([^}]+)\}/gm
const orphans: Array<{ name: string; hasOrgId: boolean; hasRelation: boolean; line: number }> = []
let match: RegExpExecArray | null

while ((match = modelRegex.exec(raw)) !== null) {
  const [, name, body] = match
  const hasOrgId = /^\s*orgId\s+String/m.test(body)
  // Detecta cualquiera de:
  //   organization      Organization @relation(...)
  //   org               Organization @relation(...)
  //   organisation      Organization @relation(...)
  const hasRelation = /\bOrganization\s+@relation\b/.test(body)
  if (hasOrgId && !hasRelation) {
    const line = raw.slice(0, match.index).split('\n').length
    orphans.push({ name, hasOrgId, hasRelation, line })
  }
}

console.log(`Modelos con orgId SIN relación a Organization: ${orphans.length}\n`)
for (const o of orphans) {
  console.log(`  - ${o.name} (line ${o.line})`)
}

// Output JSON para uso programático
const outPath = join(__dirname, 'orphan-models.json')
require('node:fs').writeFileSync(outPath, JSON.stringify(orphans, null, 2))
console.log(`\nGuardado: ${outPath}`)
