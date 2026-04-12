/**
 * SUNAT SOL OAuth2 Client
 *
 * Authenticates with SUNAT's OAuth2 endpoint using SOL credentials.
 * Endpoint: api-seguridad.sunat.gob.pe
 *
 * Flow:
 *   1. POST /v1/clientesol/{clientId}/oauth2/token with grant_type=password
 *   2. Receive access_token + expires_in
 *   3. Use token for subsequent API calls to SUNAT services
 *
 * Note: SUNAT's OAuth2 uses password grant (Resource Owner Password Credentials).
 * The client_id comes from registering the application in SUNAT's API portal.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface SunatSolCredentials {
  ruc: string
  solUser: string
  solPassword: string
}

export interface SunatOAuthToken {
  accessToken: string
  tokenType: string
  expiresIn: number
  expiresAt: Date
}

export interface SunatSolError {
  code: 'INVALID_CREDENTIALS' | 'SUNAT_OFFLINE' | 'RATE_LIMITED' | 'CLIENT_NOT_CONFIGURED' | 'UNKNOWN'
  message: string
  httpStatus?: number
}

export type SunatSolResult<T> = { ok: true; data: T } | { ok: false; error: SunatSolError }

// ── Configuration ────────────────────────────────────────────────────────────

const SUNAT_AUTH_BASE = 'https://api-seguridad.sunat.gob.pe'
const SUNAT_API_BASE = 'https://api.sunat.gob.pe'

function getClientId(): string | null {
  return process.env.SUNAT_CLIENT_ID ?? null
}

function getClientSecret(): string | null {
  return process.env.SUNAT_CLIENT_SECRET ?? null
}

// ── OAuth2 Login ─────────────────────────────────────────────────────────────

/**
 * Login to SUNAT SOL via OAuth2 password grant.
 * Returns an access token for subsequent API calls.
 */
export async function loginSunatSol(credentials: SunatSolCredentials): Promise<SunatSolResult<SunatOAuthToken>> {
  const clientId = getClientId()
  const clientSecret = getClientSecret()

  if (!clientId) {
    return {
      ok: false,
      error: {
        code: 'CLIENT_NOT_CONFIGURED',
        message: 'SUNAT_CLIENT_ID no configurado. Registre su aplicacion en el portal de API SUNAT.',
      },
    }
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'password',
      scope: 'https://api.sunat.gob.pe',
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      username: `${credentials.ruc}${credentials.solUser}`,
      password: credentials.solPassword,
    })

    const response = await fetch(`${SUNAT_AUTH_BASE}/v1/clientesol/${clientId}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Credenciales SOL invalidas. Verifique RUC, usuario y clave SOL.',
            httpStatus: response.status,
          },
        }
      }
      if (response.status === 429) {
        return {
          ok: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Demasiadas solicitudes a SUNAT. Intente en unos minutos.',
            httpStatus: 429,
          },
        }
      }
      if (response.status >= 500) {
        return {
          ok: false,
          error: {
            code: 'SUNAT_OFFLINE',
            message: `Servicio SUNAT no disponible (HTTP ${response.status}). Intente mas tarde.`,
            httpStatus: response.status,
          },
        }
      }

      // Log detailed error server-side, but NEVER expose to client
      const errorBody = await response.text().catch(() => '')
      console.error(`[SUNAT] OAuth2 error: HTTP ${response.status} — ${errorBody.substring(0, 300)}`)
      return {
        ok: false,
        error: {
          code: 'UNKNOWN',
          message: `Error de comunicacion con SUNAT (HTTP ${response.status}). Intente mas tarde.`,
          httpStatus: response.status,
        },
      }
    }

    const data = await response.json()
    const expiresIn = data.expires_in ?? 3600

    return {
      ok: true,
      data: {
        accessToken: data.access_token,
        tokenType: data.token_type ?? 'Bearer',
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        error: {
          code: 'SUNAT_OFFLINE',
          message: 'Timeout conectando a SUNAT (15s). El servicio puede estar lento o inactivo.',
        },
      }
    }
    return {
      ok: false,
      error: {
        code: 'UNKNOWN',
        message: `Error de conexion: ${err instanceof Error ? err.message : 'desconocido'}`,
      },
    }
  }
}

/**
 * Test SUNAT SOL credentials by attempting a login.
 * Does NOT store the token — just verifies credentials work.
 */
export async function testSunatSolConnection(credentials: SunatSolCredentials): Promise<SunatSolResult<{ ruc: string; message: string }>> {
  const result = await loginSunatSol(credentials)

  if (result.ok) {
    return {
      ok: true,
      data: {
        ruc: credentials.ruc,
        message: `Conexion exitosa. Token valido por ${Math.round(result.data.expiresIn / 60)} minutos.`,
      },
    }
  }

  return result
}

/**
 * Call a SUNAT API endpoint using an OAuth2 token.
 */
export async function callSunatApi<T>(
  token: SunatOAuthToken,
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>,
): Promise<SunatSolResult<T>> {
  try {
    const response = await fetch(`${SUNAT_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `${token.tokenType} ${token.accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: response.status === 401 ? 'INVALID_CREDENTIALS' : 'UNKNOWN',
          message: `Error API SUNAT: HTTP ${response.status}`,
          httpStatus: response.status,
        },
      }
    }

    const data = await response.json()
    return { ok: true, data: data as T }
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'SUNAT_OFFLINE',
        message: `Error llamando API SUNAT: ${err instanceof Error ? err.message : 'desconocido'}`,
      },
    }
  }
}
