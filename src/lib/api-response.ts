import { NextResponse } from 'next/server'

// =============================================
// Standard API response helpers
// Every API route should use these to keep the
// response envelope consistent across the platform.
// =============================================

/**
 * Return a successful JSON response.
 *
 * Envelope: `{ data, ok: true }`
 */
export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, ok: true }, { status })
}

/**
 * Return an error JSON response.
 *
 * Envelope: `{ error, code?, ok: false }`
 */
export function error(message: string, status = 400, code?: string): NextResponse {
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}), ok: false },
    { status },
  )
}

/**
 * Return a paginated JSON response.
 *
 * Envelope:
 * ```json
 * {
 *   "data": [...],
 *   "pagination": { "page", "limit", "total", "totalPages" },
 *   "ok": true
 * }
 * ```
 */
export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): NextResponse {
  const totalPages = Math.ceil(total / limit)

  return NextResponse.json({
    data,
    pagination: { page, limit, total, totalPages },
    ok: true,
  })
}

/**
 * Shorthand for a 403 Forbidden response.
 */
export function forbidden(message = 'No tiene permisos para esta accion'): NextResponse {
  return error(message, 403, 'FORBIDDEN')
}

/**
 * Shorthand for a 404 Not Found response.
 */
export function notFound(message = 'Recurso no encontrado'): NextResponse {
  return error(message, 404, 'NOT_FOUND')
}

/**
 * Shorthand for a 401 Unauthorized response.
 */
export function unauthorized(message = 'No autenticado'): NextResponse {
  return error(message, 401, 'UNAUTHORIZED')
}

/**
 * Shorthand for a 409 Conflict response (e.g. duplicate DNI).
 */
export function conflict(message: string): NextResponse {
  return error(message, 409, 'CONFLICT')
}

/**
 * Shorthand for a 422 Unprocessable Entity response (validation errors).
 */
export function validationError(message: string, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}), code: 'VALIDATION_ERROR', ok: false },
    { status: 422 },
  )
}

/**
 * Shorthand for a 500 Internal Server Error response.
 * Logs the real error server-side; returns a generic message to the client.
 */
export function serverError(err?: unknown, message = 'Error interno del servidor'): NextResponse {
  if (err) {
    console.error('[API Error]', err)
  }
  return error(message, 500, 'INTERNAL_ERROR')
}
