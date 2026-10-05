/**
 * API simulada para las vistas previas de /dev/*.
 *
 * El shell real del dashboard (sidebar, topbar, banners, command palette,
 * copiloto) pide datos a `/api/*` en sus `useEffect`. En /dev no hay sesión
 * ni base de datos, así que interceptamos `window.fetch` SOLO para rutas
 * same-origin que empiezan con `/api/` y respondemos con datos de ejemplo.
 *
 * Reglas:
 *   - Endpoint con mock → responde JSON de ejemplo (cabecera `x-comply360-preview`).
 *   - Endpoint sin mock → 503 `preview_sin_datos` (nunca toca la base).
 *   - Cualquier otra petición (RSC de Next, assets, terceros) pasa intacta.
 *
 * Escenarios por query string (se leen en cada petición):
 *   - `?plan=FREE|STARTER|EMPRESA|PRO` (por defecto PRO)
 *   - `?trial=1` → simula una prueba gratuita activa (muestra el TrialBanner)
 *
 * El parche se activa con `activatePreviewApi()` (devuelve la función para
 * desactivarlo). Cuando no hay ninguna vista previa montada, el wrapper deja
 * pasar todo hacia el fetch original, así que navegar a /dashboard desde aquí
 * no queda con datos falsos.
 */

export type PreviewPlan = 'FREE' | 'STARTER' | 'EMPRESA' | 'PRO'

export interface PreviewScenario {
  plan: PreviewPlan
  trial: boolean
}

const PREVIEW_PLANS: readonly PreviewPlan[] = ['FREE', 'STARTER', 'EMPRESA', 'PRO']

export const PREVIEW_ORG = {
  id: 'org-ejemplo',
  name: 'Comercial Ejemplo S.A.C.',
  ruc: '20601234567',
  ownerFirstName: 'María',
  ownerLastName: 'Quispe Rojas',
  ownerEmail: 'maria.quispe@ejemplo.pe',
  totalWorkers: 42,
} as const

export function parsePreviewScenario(search: string): PreviewScenario {
  const params = new URLSearchParams(search)
  const rawPlan = (params.get('plan') ?? '').toUpperCase()
  const plan = (PREVIEW_PLANS as readonly string[]).includes(rawPlan)
    ? (rawPlan as PreviewPlan)
    : 'PRO'
  return { plan, trial: params.get('trial') === '1' }
}

/* ── Datos de ejemplo ──────────────────────────────────────────────── */

const DAY_MS = 24 * 60 * 60 * 1000

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString()
}

const NORM_ALERTS = [
  {
    id: 'alerta-ejemplo-1',
    normCategory: 'SST',
    title: 'SUNAFIL prioriza inspecciones de SST en comercio minorista',
    summary: 'Revisa tu IPERC y el registro de capacitaciones antes de fin de mes.',
    impactLevel: 'HIGH',
    isRead: false,
    publishedAt: hoursAgo(3),
    orgStatus: 'NEW',
  },
  {
    id: 'alerta-ejemplo-2',
    normCategory: 'REMUNERACIONES',
    title: 'Cronograma de depósito de CTS de noviembre',
    summary: 'El plazo vence el 15 de noviembre. Prepara las liquidaciones con anticipación.',
    impactLevel: 'MEDIUM',
    isRead: false,
    publishedAt: hoursAgo(26),
    orgStatus: 'NEW',
  },
  {
    id: 'alerta-ejemplo-3',
    normCategory: 'CONTRATOS',
    title: 'Nuevo formato de registro de contratos modales',
    summary: 'Aplica a contratos celebrados desde este mes.',
    impactLevel: 'LOW',
    isRead: true,
    publishedAt: hoursAgo(72),
    orgStatus: 'READ',
  },
]

const SEARCH_INDEX = [
  {
    id: 'w-ejemplo-1',
    kind: 'worker',
    label: 'Juan García López',
    sublabel: 'Analista de Operaciones · DNI 4561****',
    href: '/dashboard/trabajadores',
  },
  {
    id: 'w-ejemplo-2',
    kind: 'worker',
    label: 'Ana Pérez Quispe',
    sublabel: 'Supervisora SST · DNI 7012****',
    href: '/dashboard/trabajadores',
  },
  {
    id: 'w-ejemplo-3',
    kind: 'worker',
    label: 'Roberto Mamani Flores',
    sublabel: 'Conductor · DNI 4377****',
    href: '/dashboard/trabajadores',
  },
  {
    id: 'c-ejemplo-1',
    kind: 'contract',
    label: 'Contrato a plazo fijo — Juan García',
    sublabel: 'Vence en 12 días',
    href: '/dashboard/contratos',
  },
  {
    id: 'c-ejemplo-2',
    kind: 'contract',
    label: 'Contrato indefinido — Ana Pérez',
    sublabel: 'Firmado',
    href: '/dashboard/contratos',
  },
  {
    id: 'd-ejemplo-1',
    kind: 'document',
    label: 'Política de SST 2026',
    sublabel: 'Documento de la empresa',
    href: '/dashboard/documentos',
  },
  {
    id: 'd-ejemplo-2',
    kind: 'document',
    label: 'Reglamento interno de trabajo',
    sublabel: 'Documento de la empresa',
    href: '/dashboard/documentos',
  },
] as const

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/* ── Tabla de rutas simuladas ──────────────────────────────────────── */

interface MockReply {
  status?: number
  body: unknown
}

interface MockRoute {
  method: 'GET' | 'POST'
  path: string | RegExp
  respond: (url: URL, scenario: PreviewScenario) => MockReply
}

const ROUTES: MockRoute[] = [
  {
    method: 'GET',
    path: '/api/onboarding/progress',
    respond: () => ({
      body: {
        hasOrg: true,
        hasWorker: true,
        hasContract: true,
        hasCalculation: true,
        needsPlan: false,
        counts: { workers: PREVIEW_ORG.totalWorkers, contracts: 38, calculations: 12 },
        orgProfile: { ruc: PREVIEW_ORG.ruc, razonSocial: PREVIEW_ORG.name },
      },
    }),
  },
  {
    method: 'GET',
    path: '/api/consent',
    respond: () => ({ body: { accepted: true } }),
  },
  {
    method: 'GET',
    path: '/api/org/profile',
    respond: (_url, scenario) => ({
      body: {
        org: {
          id: PREVIEW_ORG.id,
          name: PREVIEW_ORG.name,
          ruc: PREVIEW_ORG.ruc,
          razonSocial: PREVIEW_ORG.name,
          sector: 'COMERCIO',
          sizeRange: '11-50',
          logoUrl: null,
          plan: scenario.plan,
          regimenPrincipal: 'GENERAL',
          totalWorkersDeclared: PREVIEW_ORG.totalWorkers,
          totalWorkersDeclaredAt: null,
        },
        representanteLegal: `${PREVIEW_ORG.ownerFirstName} ${PREVIEW_ORG.ownerLastName}`,
        representanteEmail: PREVIEW_ORG.ownerEmail,
        alertEmail: PREVIEW_ORG.ownerEmail,
      },
    }),
  },
  {
    method: 'GET',
    path: '/api/billing/status',
    respond: (_url, scenario) => ({
      body: scenario.trial
        ? {
            plan: scenario.plan,
            planExpiresAt: daysFromNow(5),
            trialDaysRemaining: 5,
            isTrialActive: true,
            isPastDue: false,
            hasSubscription: false,
          }
        : {
            plan: scenario.plan,
            planExpiresAt: null,
            trialDaysRemaining: null,
            isTrialActive: false,
            isPastDue: false,
            hasSubscription: scenario.plan !== 'FREE',
          },
    }),
  },
  {
    method: 'GET',
    path: '/api/alerts/counts',
    respond: () => ({ body: { pendingAlerts: 7, criticalAlerts: 3, expiringContracts: 4 } }),
  },
  {
    method: 'GET',
    path: '/api/compliance/score',
    respond: () => ({ body: { scoreGlobal: 78, delta: 4 } }),
  },
  {
    method: 'GET',
    path: '/api/alerts',
    respond: () => ({
      body: {
        data: NORM_ALERTS,
        stats: { unread: NORM_ALERTS.filter((a) => !a.isRead).length },
      },
    }),
  },
  {
    method: 'GET',
    path: '/api/me/orgs',
    respond: (_url, scenario) => ({
      body: {
        orgs: [
          {
            id: PREVIEW_ORG.id,
            name: PREVIEW_ORG.name,
            plan: scenario.plan,
            ruc: PREVIEW_ORG.ruc,
            isActive: true,
          },
        ],
      },
    }),
  },
  {
    method: 'GET',
    path: '/api/feedback/nps',
    respond: () => ({ body: { shouldShow: false, reason: 'vista_previa' } }),
  },
  {
    method: 'GET',
    path: '/api/search',
    respond: (url) => {
      const q = normalize(url.searchParams.get('q') ?? '').trim()
      const results = q
        ? SEARCH_INDEX.filter((hit) => normalize(`${hit.label} ${hit.sublabel}`).includes(q))
        : []
      return { body: { results } }
    },
  },
  {
    method: 'POST',
    path: '/api/ai-chat/stream',
    respond: () => ({
      body: {
        content:
          '**Respuesta de ejemplo (vista previa).** Aquí verás la respuesta del asistente con base legal peruana. ' +
          'En esta vista previa no se consulta a la IA ni a la base de datos.\n\n' +
          '- Revisa los contratos a plazo fijo que vencen este mes.\n' +
          '- Prepara el depósito de CTS antes del 15 de noviembre.',
      },
    }),
  },
]

function findRoute(method: string, pathname: string): MockRoute | undefined {
  return ROUTES.find((route) => {
    if (route.method !== method) return false
    return typeof route.path === 'string' ? route.path === pathname : route.path.test(pathname)
  })
}

/* ── Interceptor de fetch ──────────────────────────────────────────── */

const LATENCY_MS = 140

function resolveRequestUrl(input: RequestInfo | URL): URL | null {
  try {
    if (input instanceof URL) return input
    if (typeof input === 'string') return new URL(input, window.location.href)
    return new URL(input.url, window.location.href)
  } catch {
    return null
  }
}

function abortError(): DOMException {
  return new DOMException('La petición fue cancelada.', 'AbortError')
}

function wait(ms: number, signal: AbortSignal | null | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError())
      return
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      window.clearTimeout(timer)
      reject(abortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-comply360-preview': '1',
    },
  })
}

let activeCount = 0
let installedWrapper: typeof window.fetch | null = null
let originalFetch: typeof window.fetch | null = null
const warnedPaths = new Set<string>()

function createPreviewFetch(real: typeof window.fetch): typeof window.fetch {
  return async function previewFetch(input: RequestInfo | URL, init?: RequestInit) {
    if (activeCount === 0) return real.call(window, input, init)

    const url = resolveRequestUrl(input)
    if (!url || url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
      return real.call(window, input, init)
    }

    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    await wait(LATENCY_MS, signal)

    const route = findRoute(method, url.pathname)
    if (!route) {
      const key = `${method} ${url.pathname}`
      if (!warnedPaths.has(key)) {
        warnedPaths.add(key)
        console.info(`[vista previa] ${key} no tiene datos de ejemplo; responde 503 sin tocar la base.`)
      }
      return jsonResponse(
        {
          error: 'preview_sin_datos',
          message: 'Vista previa: este endpoint no tiene datos de ejemplo.',
        },
        503,
      )
    }

    const reply = route.respond(url, parsePreviewScenario(window.location.search))
    return jsonResponse(reply.body, reply.status ?? 200)
  }
}

/**
 * Activa la API simulada. Devuelve la función que la desactiva (pensada
 * para usarse como cleanup de un efecto).
 */
export function activatePreviewApi(): () => void {
  if (typeof window === 'undefined') return () => {}

  // Si otro código reemplazó fetch y nuestro wrapper ya no está arriba,
  // envolvemos de nuevo. Doble envoltura es inofensiva: todos los wrappers
  // consultan el mismo `activeCount`.
  if (!installedWrapper || window.fetch !== installedWrapper) {
    originalFetch = window.fetch
    installedWrapper = createPreviewFetch(originalFetch)
    window.fetch = installedWrapper
  }
  activeCount += 1

  let released = false
  return () => {
    if (released) return
    released = true
    activeCount = Math.max(0, activeCount - 1)
    // Solo restauramos si nadie volvió a parchear fetch encima del nuestro
    // (UpgradeGateProvider lo hace). Si alguien lo envolvió, nuestro wrapper
    // queda en modo "pasar todo" porque activeCount es 0.
    if (activeCount === 0 && window.fetch === installedWrapper && originalFetch) {
      window.fetch = originalFetch
      installedWrapper = null
      originalFetch = null
    }
  }
}
