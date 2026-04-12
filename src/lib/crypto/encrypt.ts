/**
 * AES-256-GCM encryption utility for storing sensitive credentials.
 * Uses Node.js native `crypto` module — no external dependencies.
 *
 * Usage:
 *   const encrypted = encryptJson({ solUser: 'admin', solPassword: '1234' })
 *   const decrypted = decryptJson(encrypted) // → { solUser: 'admin', solPassword: '1234' }
 *
 * Security:
 *   - AES-256-GCM provides authenticated encryption (confidentiality + integrity)
 *   - Random IV per encryption (no IV reuse)
 *   - Master key from ENCRYPTION_MASTER_KEY env var (32 bytes hex or base64)
 *   - Auth tag prevents tampering
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM standard
const TAG_LENGTH = 16

// Cache to avoid re-parsing on every call
let _cachedKey: Buffer | null = null

function getMasterKey(): Buffer {
  if (_cachedKey) return _cachedKey

  const key = process.env.ENCRYPTION_MASTER_KEY
  if (!key) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY is required. Generate one with:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
      'Then add it to your .env file.'
    )
  }

  let buf: Buffer
  // Accept hex (64 chars) or base64 (44 chars)
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    buf = Buffer.from(key, 'hex')
  } else {
    buf = Buffer.from(key, 'base64')
  }

  if (buf.length !== 32) {
    throw new Error('ENCRYPTION_MASTER_KEY must be exactly 32 bytes (64 hex chars or 44 base64 chars)')
  }

  // Reject all-zeros key
  if (buf.every(b => b === 0)) {
    throw new Error('ENCRYPTION_MASTER_KEY cannot be all zeros. Generate a real key.')
  }

  _cachedKey = buf
  return buf
}

export interface EncryptedData {
  iv: string      // hex
  tag: string     // hex
  ciphertext: string // hex
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 */
export function encrypt(plaintext: string): EncryptedData {
  const key = getMasterKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  return {
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    ciphertext: encrypted.toString('hex'),
  }
}

/**
 * Decrypt an AES-256-GCM encrypted payload.
 */
export function decrypt(data: EncryptedData): string {
  const key = getMasterKey()
  const iv = Buffer.from(data.iv, 'hex')
  const tag = Buffer.from(data.tag, 'hex')
  const ciphertext = Buffer.from(data.ciphertext, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Encrypt a JSON object. Returns a single string (JSON-encoded EncryptedData).
 */
export function encryptJson(obj: Record<string, unknown>): string {
  const plaintext = JSON.stringify(obj)
  const encrypted = encrypt(plaintext)
  return JSON.stringify(encrypted)
}

/**
 * Decrypt a JSON object from its encrypted string representation.
 */
export function decryptJson<T = Record<string, unknown>>(encryptedStr: string): T {
  const data: EncryptedData = JSON.parse(encryptedStr)
  const plaintext = decrypt(data)
  return JSON.parse(plaintext) as T
}

/**
 * Generate a random 32-byte master key (for initial setup).
 * Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
 */
export function generateMasterKey(): string {
  return randomBytes(32).toString('hex')
}
