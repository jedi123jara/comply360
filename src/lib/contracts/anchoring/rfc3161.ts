// =============================================
// RFC 3161 TIMESTAMPING CLIENT (server-side, best-effort)
// Generador de Contratos / Chunk 8
//
// Implementación mínima de TimeStampReq → TimeStampResp via HTTP.
// Construye el ASN.1 DER del request a mano (sin pkijs, sin asn1js) para
// evitar agregar 200KB de bundle. Cuando el TSA no está configurado, el
// service.ts cae en best-effort y persiste el anchor sin token.
//
// Solo soporta SHA-256 como messageImprint algorithm. Para producción real
// con TSA INDECOPI se sugiere validar la respuesta contra la cadena de
// certificados, lo cual requiere pkijs/openssl. Aquí guardamos el token
// intacto (CMS/PKCS#7) para que un perito lo verifique externamente.
// =============================================

import { createHash } from 'node:crypto'

export interface RFC3161RequestOptions {
  /** URL del TSA (ej: https://freetsa.org/tsr o TSA acreditada por INDECOPI) */
  tsaUrl: string
  /** Hash SHA-256 hex del dato a timestamp (típicamente el merkleRoot) */
  digestHex: string
  /** Authorization header opcional (Basic, Bearer, etc.). */
  authorization?: string
  /** Timeout en ms — default 15000. */
  timeoutMs?: number
  /** Si true, agrega un nonce al request (recomendado contra replay). */
  nonce?: boolean
  /** Si true, pide certReq=true (TSA incluye su cadena en el token). */
  requestCert?: boolean
}

export interface RFC3161Result {
  /** Token RFC 3161 binario (CMS PKCS#7 SignedData). */
  token: Buffer
  /** Status del TSA: 0 = granted, 1 = grantedWithMods, 2..5 = error */
  status: number
  /** Mensaje del TSA en caso de error. */
  statusString?: string
}

export class RFC3161Error extends Error {
  constructor(message: string, public details?: unknown) {
    super(message)
    this.name = 'RFC3161Error'
  }
}

// ─── ASN.1 DER encoder mínimo ───────────────────────────────────────────────
// Solo lo que necesita TimeStampReq según RFC 3161 §2.4.1.
//
// TimeStampReq ::= SEQUENCE {
//   version           INTEGER  { v1(1) },
//   messageImprint    MessageImprint,
//   reqPolicy         OBJECT IDENTIFIER OPTIONAL,
//   nonce             INTEGER OPTIONAL,
//   certReq           BOOLEAN DEFAULT FALSE,
//   extensions        [0] IMPLICIT Extensions OPTIONAL
// }
// MessageImprint ::= SEQUENCE { hashAlgorithm AlgorithmIdentifier, hashedMessage OCTET STRING }
// AlgorithmIdentifier ::= SEQUENCE { algorithm OBJECT IDENTIFIER, parameters ANY DEFINED BY algorithm OPTIONAL }

function encodeLength(len: number): Buffer {
  if (len < 0x80) return Buffer.from([len])
  const bytes: number[] = []
  let n = len
  while (n > 0) { bytes.unshift(n & 0xff); n >>>= 8 }
  return Buffer.from([0x80 | bytes.length, ...bytes])
}

function tlv(tag: number, value: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), encodeLength(value.length), value])
}

function asn1Sequence(...values: Buffer[]): Buffer {
  return tlv(0x30, Buffer.concat(values))
}

function asn1Integer(n: number | bigint): Buffer {
  const big = typeof n === 'bigint' ? n : BigInt(n)
  if (big === BigInt(0)) return tlv(0x02, Buffer.from([0]))
  let hex = big.toString(16)
  if (hex.length % 2) hex = '0' + hex
  let buf = Buffer.from(hex, 'hex')
  // Si el bit más alto está set, prefijamos 00 para que sea positivo
  if (buf[0] & 0x80) buf = Buffer.concat([Buffer.from([0]), buf])
  return tlv(0x02, buf)
}

function asn1OctetString(b: Buffer): Buffer {
  return tlv(0x04, b)
}

function asn1ObjectIdentifier(oid: string): Buffer {
  // Encode OID per X.690. Ej: "2.16.840.1.101.3.4.2.1" (sha256)
  const parts = oid.split('.').map((n) => parseInt(n, 10))
  if (parts.length < 2) throw new Error(`OID inválido: ${oid}`)
  const bytes: number[] = [parts[0] * 40 + parts[1]]
  for (let i = 2; i < parts.length; i++) {
    let v = parts[i]
    const stack: number[] = []
    do { stack.push(v & 0x7f); v >>>= 7 } while (v > 0)
    for (let j = stack.length - 1; j > 0; j--) bytes.push(stack[j] | 0x80)
    bytes.push(stack[0])
  }
  return tlv(0x06, Buffer.from(bytes))
}

function asn1Null(): Buffer {
  return tlv(0x05, Buffer.alloc(0))
}

function asn1Boolean(value: boolean): Buffer {
  return tlv(0x01, Buffer.from([value ? 0xff : 0x00]))
}

const SHA256_OID = '2.16.840.1.101.3.4.2.1'

/** Construye un TimeStampReq DER para messageImprint = SHA-256(digestHex). */
export function buildTimeStampRequest(opts: {
  digestHex: string
  nonce?: bigint
  requestCert?: boolean
}): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(opts.digestHex)) {
    throw new Error('digestHex debe ser SHA-256 (64 hex chars).')
  }
  const algorithmIdentifier = asn1Sequence(
    asn1ObjectIdentifier(SHA256_OID),
    asn1Null(),
  )
  const messageImprint = asn1Sequence(
    algorithmIdentifier,
    asn1OctetString(Buffer.from(opts.digestHex, 'hex')),
  )

  const parts: Buffer[] = [
    asn1Integer(1), // version v1
    messageImprint,
  ]
  if (opts.nonce !== undefined) parts.push(asn1Integer(opts.nonce))
  if (opts.requestCert) parts.push(asn1Boolean(true))

  return asn1Sequence(...parts)
}

/**
 * Envía un TimeStampReq al TSA y devuelve el TimeStampResp parseado.
 * NO valida la cadena de certificados — eso es responsabilidad del
 * verificador externo (perito) que reciba el .tsr.
 */
export async function requestTimestamp(opts: RFC3161RequestOptions): Promise<RFC3161Result> {
  const nonce = opts.nonce ? generateNonce() : undefined
  const reqDer = buildTimeStampRequest({
    digestHex: opts.digestHex,
    nonce,
    requestCert: opts.requestCert ?? true,
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/timestamp-query',
    Accept: 'application/timestamp-reply',
  }
  if (opts.authorization) headers['Authorization'] = opts.authorization

  const ctrl = AbortSignal.timeout(opts.timeoutMs ?? 15_000)
  const res = await fetch(opts.tsaUrl, {
    method: 'POST',
    headers,
    body: reqDer as unknown as BodyInit,
    signal: ctrl,
  })

  if (!res.ok) {
    throw new RFC3161Error(`TSA respondió con HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  }

  const respBuf = Buffer.from(await res.arrayBuffer())
  // TimeStampResp ::= SEQUENCE { status PKIStatusInfo, timeStampToken TimeStampToken OPTIONAL }
  // Para v1 hacemos un parse mínimo: extraemos el TimeStampToken (CMS) intacto.
  const parsed = parseTimeStampResp(respBuf)

  return {
    token: parsed.token,
    status: parsed.status,
    statusString: parsed.statusString,
  }
}

function generateNonce(): bigint {
  // 8 bytes pseudo-aleatorios → bigint
  const bytes = new Uint8Array(8)
  for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256)
  let n = BigInt(0)
  for (const b of bytes) n = (n << BigInt(8)) + BigInt(b)
  return n
}

interface ASN1Item { tag: number; offset: number; length: number; valueOffset: number }

function readLength(buf: Buffer, offset: number): { length: number; consumed: number } {
  const first = buf[offset]
  if (first < 0x80) return { length: first, consumed: 1 }
  const lenBytes = first & 0x7f
  let length = 0
  for (let i = 0; i < lenBytes; i++) length = (length << 8) | buf[offset + 1 + i]
  return { length, consumed: 1 + lenBytes }
}

function readTLV(buf: Buffer, offset: number): ASN1Item {
  const tag = buf[offset]
  const { length, consumed } = readLength(buf, offset + 1)
  return { tag, offset, length, valueOffset: offset + 1 + consumed }
}

/**
 * Parse mínimo de TimeStampResp:
 * SEQUENCE {
 *   status PKIStatusInfo  → SEQUENCE { status INTEGER, statusString [0] OPTIONAL, ... }
 *   timeStampToken TimeStampToken  → ContentInfo (CMS)
 * }
 */
function parseTimeStampResp(buf: Buffer): { status: number; statusString?: string; token: Buffer } {
  const top = readTLV(buf, 0)
  if (top.tag !== 0x30) throw new RFC3161Error('Respuesta no es SEQUENCE')

  // status PKIStatusInfo
  const statusInfo = readTLV(buf, top.valueOffset)
  if (statusInfo.tag !== 0x30) throw new RFC3161Error('PKIStatusInfo no es SEQUENCE')

  // status INTEGER (primer item de PKIStatusInfo)
  const statusInt = readTLV(buf, statusInfo.valueOffset)
  if (statusInt.tag !== 0x02) throw new RFC3161Error('status no es INTEGER')
  let status = 0
  for (let i = 0; i < statusInt.length; i++) {
    status = (status << 8) | buf[statusInt.valueOffset + i]
  }

  // El timeStampToken (CMS ContentInfo) viene después del PKIStatusInfo
  const tokenStart = statusInfo.valueOffset + statusInfo.length
  if (tokenStart >= top.valueOffset + top.length) {
    // Sin token → status indica error
    return { status, token: Buffer.alloc(0) }
  }
  // El token (ContentInfo) tag 0x30, lo capturamos completo
  const tokenItem = readTLV(buf, tokenStart)
  const tokenLength = tokenItem.valueOffset + tokenItem.length - tokenStart
  const token = buf.subarray(tokenStart, tokenStart + tokenLength)

  return { status, token: Buffer.from(token) }
}

/** SHA-256 hex de un Buffer — útil para tests. */
export function sha256OfBuffer(buf: Buffer | Uint8Array | string): string {
  return createHash('sha256').update(buf as Buffer).digest('hex')
}
