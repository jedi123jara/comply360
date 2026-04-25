/**
 * Event bus in-process para eventos del dominio COMPLY360.
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ GARANTÍAS                                                            ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║ ✓ Emit no bloquea el caller: `queueMicrotask` + Promise.resolve      ║
 * ║ ✓ Un handler que falla NO cancela a los demás (try/catch por handler)║
 * ║ ✓ Tipado fuerte: `emit('worker.created', {...})` valida en compile   ║
 * ║ ✓ Validación en runtime: el payload pasa por Zod del catalog         ║
 * ║ ✓ Feature flag: ENABLE_EVENT_BUS=false → no-op, retorna el id igual  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ NO GARANTIZADO (y está bien)                                         ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║ ✗ Durabilidad: si el proceso muere entre emit() y handler execution, ║
 * ║   el evento se pierde. Best-effort in-process.                       ║
 * ║ ✗ Ordering entre handlers: microtasks son FIFO, pero no garantizamos ║
 * ║   ordering entre eventos distintos.                                  ║
 * ║ ✗ Retries automáticos: si un handler falla, solo se logea.           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Si algún día necesitamos durabilidad (outbox pattern) o fan-out entre
 * procesos (queue), el catálogo y la API pública de `emit()` quedan iguales
 * — solo cambia la implementación interna. Por eso el contrato es mínimo.
 *
 * Importante: emit() vive FUERA de cualquier transacción Prisma. Si el
 * commit DB falla, el caller no debería haber llamado emit(). Si el commit
 * pasa pero el proceso muere antes del microtask, el evento se pierde —
 * aceptado como best-effort. Cron de safety nets (risk-sweep, daily-alerts)
 * rescatan estado inconsistente.
 */

import { randomUUID } from 'crypto'
import { EVENT_CATALOG, type DomainEvent, type EventName, type EventPayloads } from './catalog'

// ═══════════════════════════════════════════════════════════════════════════
// Handler registry
// ═══════════════════════════════════════════════════════════════════════════

export type EventHandler<K extends EventName = EventName> = (
  event: DomainEvent<K>,
) => void | Promise<void>

interface RegisteredHandler {
  name: string
  handler: EventHandler
  /** Si se pasa una lista de nombres, solo se dispara para esos eventos. null = todos. */
  only: EventName[] | null
}

const handlers: RegisteredHandler[] = []

/**
 * Registra un handler que recibirá eventos despachados por `emit()`.
 *
 * @param name Identificador humano del handler (aparece en logs de error)
 * @param handler Función que recibe el `DomainEvent` y puede ser async
 * @param only Opcional: lista blanca de eventos a los que reacciona
 */
export function registerHandler(
  name: string,
  handler: EventHandler,
  only?: EventName[],
): void {
  handlers.push({ name, handler, only: only ?? null })
}

/**
 * Limpia todos los handlers. Solo para tests — no usar en código de app.
 */
export function _resetHandlersForTesting(): void {
  handlers.length = 0
}

/**
 * Lista los handlers registrados (diagnóstico / tests).
 */
export function listHandlers(): Array<{ name: string; only: EventName[] | null }> {
  return handlers.map((h) => ({ name: h.name, only: h.only }))
}

// ═══════════════════════════════════════════════════════════════════════════
// emit — la API pública
// ═══════════════════════════════════════════════════════════════════════════

function isEnabled(): boolean {
  // Feature flag. En tests puedes overridear con process.env.ENABLE_EVENT_BUS='true'.
  return process.env.ENABLE_EVENT_BUS === 'true'
}

/**
 * Despacha un evento del dominio a todos los handlers registrados.
 *
 * @returns El `id` generado del evento, útil para trace en logs
 *
 * @example
 * ```ts
 * const worker = await prisma.worker.create({...})
 * emit('worker.created', { workerId: worker.id, orgId: ctx.orgId })
 * ```
 */
export function emit<K extends EventName>(
  name: K,
  payload: EventPayloads[K],
): string {
  const id = randomUUID()
  const event: DomainEvent<K> = {
    id,
    name,
    payload,
    emittedAt: new Date().toISOString(),
  }

  if (!isEnabled()) {
    // Feature flag apagado: retornamos el id igual pero no invocamos handlers.
    // Esto permite que los callers llamen emit() sin condicionales, y flipear
    // el flag a true cuando estemos listos.
    return id
  }

  // Validación runtime con Zod. Si el payload no matchea el schema registrado
  // en el catalog, logeamos y NO invocamos handlers (mejor fallar visible que
  // ejecutar un workflow con datos inconsistentes).
  const descriptor = EVENT_CATALOG[name]
  const parsed = descriptor.schema.safeParse(payload)
  if (!parsed.success) {
    console.error(`[events] payload inválido para ${name}`, {
      eventId: id,
      issues: parsed.error.issues,
    })
    return id
  }

  // Fan-out asíncrono con aislamiento estricto: un handler que rechaza NO
  // afecta a los demás. queueMicrotask se ejecuta después del response HTTP
  // actual sin bloquear, y funciona tanto en Node como en edge runtime.
  for (const h of handlers) {
    if (h.only && !h.only.includes(name)) continue
    queueMicrotask(() => {
      Promise.resolve()
        .then(() => h.handler(event))
        .catch((err: unknown) => {
          console.error(`[events] handler "${h.name}" falló en ${name}`, {
            eventId: id,
            error: err instanceof Error ? err.message : String(err),
          })
        })
    })
  }

  return id
}

/**
 * Helper para tests: espera a que todos los handlers pendientes terminen.
 * Usa un sleep mínimo + una vuelta de microtask queue. Suficiente para que
 * `queueMicrotask` + Promise.resolve() corran en nuestros tests.
 */
export async function _flushHandlersForTesting(): Promise<void> {
  // Dos vueltas: permiten que handlers que hagan await otra cosa también corran.
  await new Promise((r) => setImmediate(r))
  await new Promise((r) => setImmediate(r))
}

// Re-exports para conveniencia
export type { DomainEvent, EventName, EventPayloads } from './catalog'
