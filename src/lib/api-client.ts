/* -------------------------------------------------------------------------- */
/*  API Client — typed fetch wrapper with retry, timeout & error handling     */
/* -------------------------------------------------------------------------- */

/** Custom error class for API responses */
export class ApiError extends Error {
  /** HTTP status code (0 for network errors) */
  readonly status: number
  /** Parsed response body, if available */
  readonly data: unknown
  /** Whether the request can be retried */
  readonly retryable: boolean

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.retryable = status === 0 || status === 429 || status >= 500
  }
}

/* -------------------------------------------------------------------------- */
/*  Config & Defaults                                                         */
/* -------------------------------------------------------------------------- */

const DEFAULT_TIMEOUT_MS = 30_000
const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 500

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** Request body — will be JSON-stringified if it's an object */
  body?: unknown
  /** Timeout in milliseconds (default: 30 000) */
  timeout?: number
  /** Max retry attempts for retryable errors (default: 3) */
  retries?: number
  /** External AbortSignal — merged with internal timeout signal */
  signal?: AbortSignal
  /** Skip automatic JSON parsing (e.g. for blob responses) */
  rawResponse?: boolean
}

/* -------------------------------------------------------------------------- */
/*  Core fetch function                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Type-safe fetch wrapper for COMPLY360 dashboard API calls.
 *
 * @example
 * const users = await apiFetch<User[]>('/api/users')
 * const user  = await apiFetch<User>('/api/users', { method: 'POST', body: { name: 'Ana' } })
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    retries = MAX_RETRIES,
    rawResponse = false,
    body,
    signal: externalSignal,
    headers: customHeaders,
    ...fetchOptions
  } = options

  // Build headers
  const headers = new Headers(customHeaders)
  if (body !== undefined && body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Serialize body
  const serializedBody =
    body !== undefined && body !== null
      ? typeof body === 'string'
        ? body
        : JSON.stringify(body)
      : undefined

  // Retry loop
  let lastError: ApiError | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Create timeout controller per attempt
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout)

    // Merge external signal
    const combinedSignal = externalSignal
      ? mergeAbortSignals(externalSignal, timeoutController.signal)
      : timeoutController.signal

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        body: serializedBody,
        signal: combinedSignal,
      })

      clearTimeout(timeoutId)

      // --- Handle specific status codes ---

      // 401 — redirect to login (client-side only)
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          const currentPath = encodeURIComponent(window.location.pathname)
          window.location.href = `/sign-in?redirect=${currentPath}`
        }
        throw new ApiError('No autenticado. Redirigiendo al inicio de sesión.', 401)
      }

      // 429 — rate limited: wait for Retry-After and retry
      if (response.status === 429) {
        const retryAfter = parseRetryAfter(response.headers.get('Retry-After'))
        if (attempt < retries) {
          logRetry(url, attempt, response.status, retryAfter)
          await sleep(retryAfter)
          continue
        }
        throw new ApiError('Demasiadas solicitudes. Intenta más tarde.', 429)
      }

      // 5xx — server errors: retry with exponential backoff
      if (response.status >= 500) {
        const errorData = await safeParseJson(response)
        const errorMessage = extractMessage(errorData, response.statusText)

        if (attempt < retries) {
          const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt) + jitter()
          logRetry(url, attempt, response.status, backoff)
          await sleep(backoff)
          lastError = new ApiError(errorMessage, response.status, errorData)
          continue
        }
        throw new ApiError(errorMessage, response.status, errorData)
      }

      // 4xx — client errors (non-retryable)
      if (!response.ok) {
        const errorData = await safeParseJson(response)
        const errorMessage = extractMessage(errorData, response.statusText)
        throw new ApiError(errorMessage, response.status, errorData)
      }

      // --- Success ---
      if (rawResponse) {
        return response as unknown as T
      }

      // 204 No Content
      if (response.status === 204) {
        return undefined as T
      }

      const data: T = await response.json()
      return data
    } catch (error) {
      clearTimeout(timeoutId)

      // Already an ApiError — rethrow (unless retryable and we have attempts left)
      if (error instanceof ApiError) {
        if (error.retryable && attempt < retries) {
          lastError = error
          continue
        }
        logError(url, error)
        throw error
      }

      // AbortError from external signal — don't retry
      if (externalSignal?.aborted) {
        throw new ApiError('Solicitud cancelada.', 0)
      }

      // Timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError = new ApiError(
          `La solicitud excedió el tiempo límite de ${timeout / 1000}s.`,
          0
        )
        if (attempt < retries) {
          const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt) + jitter()
          logRetry(url, attempt, 0, backoff)
          lastError = timeoutError
          await sleep(backoff)
          continue
        }
        logError(url, timeoutError)
        throw timeoutError
      }

      // Network error
      const networkError = new ApiError(
        'Error de conexión. Verifica tu internet.',
        0
      )
      if (attempt < retries) {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt) + jitter()
        logRetry(url, attempt, 0, backoff)
        lastError = networkError
        await sleep(backoff)
        continue
      }
      logError(url, networkError)
      throw networkError
    }
  }

  // Should never reach here, but just in case
  throw lastError ?? new ApiError('Error desconocido.', 0)
}

/* -------------------------------------------------------------------------- */
/*  Convenience methods                                                       */
/* -------------------------------------------------------------------------- */

export const api = {
  get: <T>(url: string, opts?: ApiFetchOptions) =>
    apiFetch<T>(url, { ...opts, method: 'GET' }),

  post: <T>(url: string, body?: unknown, opts?: ApiFetchOptions) =>
    apiFetch<T>(url, { ...opts, method: 'POST', body }),

  put: <T>(url: string, body?: unknown, opts?: ApiFetchOptions) =>
    apiFetch<T>(url, { ...opts, method: 'PUT', body }),

  patch: <T>(url: string, body?: unknown, opts?: ApiFetchOptions) =>
    apiFetch<T>(url, { ...opts, method: 'PATCH', body }),

  delete: <T>(url: string, opts?: ApiFetchOptions) =>
    apiFetch<T>(url, { ...opts, method: 'DELETE' }),
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function jitter(): number {
  return Math.floor(Math.random() * 200)
}

function parseRetryAfter(header: string | null): number {
  if (!header) return 2000
  const seconds = parseInt(header, 10)
  if (!isNaN(seconds)) return seconds * 1000
  // Could be an HTTP-date
  const date = Date.parse(header)
  if (!isNaN(date)) return Math.max(0, date - Date.now())
  return 2000
}

async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function extractMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'message' in data) {
    return String((data as Record<string, unknown>).message)
  }
  if (data && typeof data === 'object' && 'error' in data) {
    return String((data as Record<string, unknown>).error)
  }
  return fallback
}

function mergeAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}

/* -------------------------------------------------------------------------- */
/*  Logging                                                                   */
/* -------------------------------------------------------------------------- */

function logRetry(url: string, attempt: number, status: number, delayMs: number): void {
  console.warn(
    JSON.stringify({
      level: 'warn',
      message: 'API request retrying',
      timestamp: new Date().toISOString(),
      context: { url, attempt: attempt + 1, status, delayMs: Math.round(delayMs) },
    })
  )
}

function logError(url: string, error: ApiError): void {
  console.error(
    JSON.stringify({
      level: 'error',
      message: 'API request failed',
      timestamp: new Date().toISOString(),
      context: { url, status: error.status },
      error: error.message,
    })
  )
}
