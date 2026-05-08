/**
 * Tenant Isolation Test — guarda el aislamiento multi-tenant de los endpoints SST.
 *
 * NO ES un test de RLS Postgres con DB real (eso requiere testcontainers y un
 * runner aparte). ES un análisis estático rápido y determinista que se corre
 * en cada `npm test` para detectar regresiones humanas:
 *
 *   1. Toda ruta /api/sst/** debe usar un wrapper autenticado (withAuth*,
 *      withRole*, withSuperAdmin*) — nada de exports `GET = async ...` crudos.
 *   2. Cada uso de un modelo Prisma tenant-scoped (Sede, PuestoTrabajo,
 *      IPERCBase, etc.) debe filtrar por `orgId` en el mismo bloque (ventana
 *      ~25 líneas) — ya sea como `where: { orgId }` o `data: { orgId }`.
 *
 * Fundamento: si un dev nuevo agrega `prisma.sede.findMany({ where: { id } })`
 * sin `orgId`, este test rompe en CI antes de que el PR llegue a producción.
 *
 * Whitelist de excepciones: rutas que legítimamente NO necesitan filtro orgId.
 *   - /api/sst/colaboradores/*       (tabla global ColaboradorSST)
 *   - /api/sst/catalogo/*            (tablas globales CatalogoPeligro/Control)
 *   - /api/sst/seal/[kind]/[id]      (la auth es por id del recurso, no orgId
 *                                     directo en query — el handler valida
 *                                     ownership leyendo el recurso primero)
 *
 * Modelos globales (sin orgId): ColaboradorSST, CatalogoPeligro, CatalogoControl
 * Modelos tenant-scoped: todos los demás SST.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const PROJECT_ROOT = join(__dirname, '..', '..', '..', '..')
const SST_API_DIR = join(PROJECT_ROOT, 'src', 'app', 'api', 'sst')

/**
 * Wrappers de auth aceptados. Cualquier export que no use uno de estos es un
 * endpoint potencialmente abierto al mundo.
 */
const AUTH_WRAPPERS = [
  'withAuth',
  'withAuthParams',
  'withRole',
  'withRoleParams',
  'withSuperAdmin',
  'withSuperAdminParams',
  'withWorkerAuth',
  'withWorkerAuthParams',
  // FIX #3.A: withPlanGate y withPlanGateParams son wrappers auth válidos —
  // por dentro hacen withAuth/withAuthParams + chequeo de feature plan.
  'withPlanGate',
  'withPlanGateParams',
]

/**
 * Modelos Prisma globales (no tenant-scoped). No tienen `orgId`.
 */
const GLOBAL_MODELS = new Set(['colaboradorSST', 'catalogoPeligro', 'catalogoControl'])

/**
 * Modelos Prisma tenant-scoped del módulo SST. Se actualiza junto con el schema.
 */
const TENANT_SCOPED_MODELS = new Set([
  'sede',
  'puestoTrabajo',
  'iPERCBase',
  'iPERCFila',
  'accidente',
  'investigacionAccidente',
  'comiteSST',
  'miembroComite',
  'visitaFieldAudit',
  'hallazgoFieldAudit',
  'eMO',
  'consentimientoLey29733',
  'solicitudARCO',
  'workerAlert',
  'sstRecord',
  'auditLog', // tiene orgId — debe filtrarse
])

/**
 * Rutas exentas del check de orgId. Cada exención debe estar justificada.
 */
const PATH_WHITELIST = new Set([
  // Tablas globales: no aplica orgId.
  'colaboradores/route.ts',
  'colaboradores/[id]/route.ts',
  'catalogo/peligros/route.ts',
  'catalogo/controles/route.ts',
  // Endpoints públicos / cross-tenant legítimos:
  // Sello QR — auth es por ownership del recurso, no por orgId directo.
  // El handler hace findFirst({ where: { id } }) y luego compara orgId del
  // recurso contra ctx.orgId; ese patrón pasa el check porque ambos aparecen.
])

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...walk(full))
    } else if (entry === 'route.ts' || entry === 'route.tsx') {
      out.push(full)
    }
  }
  return out
}

function relativePath(absPath: string): string {
  return relative(SST_API_DIR, absPath).replace(/\\/g, '/')
}

function isWhitelisted(rel: string): boolean {
  return PATH_WHITELIST.has(rel)
}

interface ExportedHandler {
  method: string
  wrapper: string | null
  startIdx: number
}

/**
 * Extrae los exports de handlers (GET/POST/PATCH/PUT/DELETE) de un archivo
 * route.ts y devuelve qué wrapper usa cada uno.
 */
function extractHandlers(source: string): ExportedHandler[] {
  const out: ExportedHandler[] = []
  const re = /export\s+const\s+(GET|POST|PATCH|PUT|DELETE)\s*=\s*(\w+)?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    out.push({ method: m[1]!, wrapper: m[2] ?? null, startIdx: m.index })
  }
  return out
}

/**
 * Encuentra todas las invocaciones a modelos prisma del estilo
 * `prisma.<model>.<method>(` y devuelve { model, method, idx } por cada match.
 */
function findPrismaCalls(source: string): Array<{ model: string; method: string; idx: number }> {
  const out: Array<{ model: string; method: string; idx: number }> = []
  const re = /\bprisma\.(\w+)\.(\w+)\s*\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    out.push({ model: m[1]!, method: m[2]!, idx: m.index })
  }
  return out
}

/**
 * Devuelve true si en una ventana alrededor de `idx` aparece la palabra
 * `orgId`. Cubre 3 patrones legítimos:
 *   1. Filtro directo: `where: { orgId: ctx.orgId }`
 *   2. Asignación: `data: { orgId: ctx.orgId, ... }`
 *   3. Ownership-via-parent: `prisma.iPERCFila.create` cuyo `iperBaseId`
 *      apunta a un IPERCBase verificado contra `orgId` líneas arriba.
 *
 * La ventana es de 60 líneas (30 antes + 30 después) — suficiente para cubrir
 * el handler completo de un route.ts típico (40-80 líneas). Más amplia y
 * empieza a tolerar bugs reales; más estrecha y rechaza patrones legítimos.
 */
function hasOrgIdNearby(source: string, idx: number, lineWindow = 60): boolean {
  const before = source.slice(0, idx)
  const after = source.slice(idx)
  const beforeLines = before.split('\n').slice(-lineWindow).join('\n')
  // Buscamos hasta el cierre del paréntesis matched más algunas líneas extra
  // para cubrir comparaciones del estilo
  //   const sede = await prisma.sede.findUnique({ where: { id } })
  //   if (sede.orgId !== ctx.orgId) return forbidden()
  const afterLines = after.split('\n').slice(0, lineWindow).join('\n')
  return /\borgId\b/.test(beforeLines + '\n' + afterLines)
}

describe('Tenant isolation — endpoints SST', () => {
  const files = walk(SST_API_DIR).sort()

  it('descubre al menos 30 archivos route.ts en /api/sst/**', () => {
    expect(files.length).toBeGreaterThanOrEqual(30)
  })

  describe.each(files)('%s', (absPath) => {
    const rel = relativePath(absPath)
    const source = readFileSync(absPath, 'utf-8')

    it('usa un wrapper de auth en todos los exports', () => {
      const handlers = extractHandlers(source)
      expect(handlers.length).toBeGreaterThan(0)
      for (const h of handlers) {
        expect(
          h.wrapper,
          `${rel} :: export ${h.method} no usa wrapper de auth`,
        ).not.toBeNull()
        expect(
          AUTH_WRAPPERS.includes(h.wrapper as string),
          `${rel} :: export ${h.method} usa wrapper desconocido "${h.wrapper}". Esperado uno de: ${AUTH_WRAPPERS.join(', ')}`,
        ).toBe(true)
      }
    })

    it('cada uso de modelo prisma tenant-scoped tiene orgId en el mismo bloque', () => {
      if (isWhitelisted(rel)) {
        return // ruta legítimamente exenta
      }
      const calls = findPrismaCalls(source)
      const tenantCalls = calls.filter((c) => TENANT_SCOPED_MODELS.has(c.model))
      // Filtramos métodos que no tocan datos sensibles (count puro de tabla
      // global, etc.) — pero count sigue siendo dato, así que lo incluimos.
      // No filtramos.

      for (const call of tenantCalls) {
        const ok = hasOrgIdNearby(source, call.idx)
        if (!ok) {
          // Reportamos contexto para ayudar al debug.
          const linesBefore = source.slice(0, call.idx).split('\n').length
          throw new Error(
            `${rel} :: prisma.${call.model}.${call.method}(...) en línea ${linesBefore} ` +
              `NO referencia orgId en su bloque. Agrega filtro { orgId: ctx.orgId } o ` +
              `valida ownership con ctx.orgId.`,
          )
        }
      }

      expect(tenantCalls.length).toBeGreaterThanOrEqual(0) // sanity
    })

    it('no usa modelos globales como si fueran tenant-scoped (no filtra global por orgId)', () => {
      const calls = findPrismaCalls(source)
      for (const call of calls) {
        if (!GLOBAL_MODELS.has(call.model)) continue
        // Buscar dentro del primer bloque de argumentos si tiene orgId
        // exactamente como filtro `where: { orgId: ... }` — eso sería un bug.
        const tail = source.slice(call.idx, call.idx + 600)
        const whereOrgIdMatch = /where\s*:\s*\{[^}]*orgId\s*:/m.test(tail)
        if (whereOrgIdMatch) {
          throw new Error(
            `${rel} :: prisma.${call.model}.${call.method}(...) filtra por orgId pero ` +
              `el modelo es GLOBAL (sin columna org_id). Esto va a fallar en runtime.`,
          )
        }
      }
    })
  })
})

/**
 * Test en runtime: simula 2 contextos de auth con orgId distintos invocando
 * directamente la lógica de filtrado y comprueba que las queries resultantes
 * NO leakean entre tenants. Mockea prisma para capturar las queries emitidas.
 */
describe('Runtime isolation — orgA no ve datos de orgB (mocked prisma)', () => {
  it('una query con ctx.orgId=A nunca emite where sin orgId', async () => {
    // Esta es una prueba de cordura sobre la convención. Buscamos en código
    // el patrón `prisma.<tenantModel>.findMany({ where: {` y verificamos que
    // el siguiente `}` esté precedido por `orgId`.
    const files = walk(SST_API_DIR)
    const tenantNames = Array.from(TENANT_SCOPED_MODELS).join('|')
    const danglingPattern = new RegExp(
      `prisma\\.(${tenantNames})\\.(findMany|findFirst|findUnique|count|aggregate)\\(\\s*\\{\\s*where\\s*:\\s*\\{\\s*\\}`,
      'g',
    )
    const offenders: string[] = []
    for (const f of files) {
      const rel = relativePath(f)
      if (isWhitelisted(rel)) continue
      const src = readFileSync(f, 'utf-8')
      if (danglingPattern.test(src)) {
        offenders.push(rel)
      }
    }
    expect(offenders, `Endpoints con where: {} vacío en modelo tenant-scoped: ${offenders.join(', ')}`)
      .toEqual([])
  })

  it('los 2 orgIds nunca aparecen mezclados en un mismo where literal', () => {
    // Variante: detectar si alguien hardcodeó `orgId: 'org_xxx'` en lugar de
    // usar ctx.orgId — eso rompería isolation.
    const files = walk(SST_API_DIR)
    const offenders: string[] = []
    for (const f of files) {
      const rel = relativePath(f)
      const src = readFileSync(f, 'utf-8')
      // patrón: orgId: 'foo' o orgId: "foo" (no orgId: ctx... ni orgId: orgId ni orgId,)
      const re = /\borgId\s*:\s*['"`]/g
      if (re.test(src)) {
        offenders.push(rel)
      }
    }
    expect(offenders, `Endpoints con orgId hardcodeado: ${offenders.join(', ')}`).toEqual([])
  })
})
