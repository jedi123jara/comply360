// =============================================
// OPENTIMESTAMPS WRAPPER (best-effort)
// Generador de Contratos / Chunk 8
//
// Para evitar agregar `opentimestamps` (50+ KB) sin que esté en uso real,
// implementamos un client mínimo que envía el digest a un calendar server
// vía HTTP y guarda la pending-attestation. El upgrade a Bitcoin block
// height se ejecuta en un cron posterior (no en este chunk).
//
// Calendar server por defecto: https://btc.calendar.opentimestamps.org
// Spec: https://github.com/opentimestamps/python-opentimestamps#protocol
// =============================================

export interface OTSStampOptions {
  /** Hash SHA-256 hex del root a anclar. */
  digestHex: string
  /** URL del calendar server (default OpenTimestamps oficial). */
  calendarUrl?: string
  timeoutMs?: number
}

export interface OTSStampResult {
  /** Buffer .ots con la pending-attestation. */
  proof: Buffer
  calendarUrl: string
  bitcoinBlockHeight: null // siempre null en stamp inicial — se completa en upgrade
}

const DEFAULT_CALENDAR = 'https://btc.calendar.opentimestamps.org'

/**
 * Submitea el digest al calendar server y devuelve la receipt como Buffer.
 *
 * Limitación de v1: el formato .ots completo requiere headers binarios
 * específicos y la cadena de operaciones (sha256→prepend/append→sha256).
 * Esta implementación se queda con la receipt cruda del calendar y la
 * envuelve con metadata mínima en JSON. Es suficiente para auditar la
 * existencia, no para verificar end-to-end con `ots verify`. Para eso
 * el dev debe instalar `opentimestamps` cuando la feature se active.
 */
export async function submitToCalendar(opts: OTSStampOptions): Promise<OTSStampResult> {
  if (!/^[0-9a-fA-F]{64}$/.test(opts.digestHex)) {
    throw new Error('digestHex debe ser SHA-256 (64 hex chars).')
  }
  const calendarUrl = opts.calendarUrl ?? DEFAULT_CALENDAR
  const url = `${calendarUrl.replace(/\/$/, '')}/digest`

  const digestBuf = Buffer.from(opts.digestHex, 'hex')

  const ctrl = AbortSignal.timeout(opts.timeoutMs ?? 15_000)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      Accept: 'application/octet-stream',
    },
    body: digestBuf as unknown as BodyInit,
    signal: ctrl,
  })

  if (!res.ok) {
    throw new Error(`OTS calendar respondió HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  }

  const proof = Buffer.from(await res.arrayBuffer())

  return {
    proof,
    calendarUrl,
    bitcoinBlockHeight: null,
  }
}
