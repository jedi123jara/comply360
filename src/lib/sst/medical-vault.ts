/**
 * Medical Vault — cifrado/descifrado de datos médicos sensibles
 * Ley 29733 (Protección de Datos Personales) + D.S. 016-2024-JUS
 *
 * Usa pgcrypto.pgp_sym_encrypt/pgp_sym_decrypt vía raw query Prisma.
 * Clave maestra en MEDICAL_VAULT_KEY (Supabase Vault recomendado en prod).
 *
 * Reglas absolutas:
 *   1. El diagnóstico médico JAMÁS se persiste en COMPLY360.
 *   2. Solo "Aptitud" (APTO/APTO_RESTRINGIDO/NO_APTO/OBSERVADO) va en claro.
 *   3. Restricciones, consentimientos, ARCO van cifrados con esta utilidad.
 *   4. Si MEDICAL_VAULT_KEY falta en producción → fail fast al boot.
 */

import { PrismaClient } from '../../generated/prisma/client'

const KEY_ENV_VAR = 'MEDICAL_VAULT_KEY'

/**
 * Resuelve la clave del vault. Falla rápido en producción si no está;
 * en desarrollo permite un fallback explícito que el dev tiene que reconocer.
 */
function getVaultKey(): string {
  const key = process.env[KEY_ENV_VAR]
  if (key && key.length >= 32) return key

  // FIX #4.E: hard guard contra deploys que no son `production` literal pero
  // SÍ son entornos cliente-facing (Vercel preview, staging custom). Antes
  // solo se chequeaba `NODE_ENV === 'production'` → si alguien ponía
  // `NODE_ENV=staging` o si Vercel preview tenía NODE_ENV genérico, se
  // caía al dev fallback (clave conocida en código). Eso volvía públicas
  // las restricciones médicas de cualquier preview deployment.
  //
  // Reglas:
  //   - Si VERCEL_ENV está seteado a 'production' o 'preview' → throw.
  //   - Si NODE_ENV === 'production' → throw.
  //   - Solo si NODE_ENV es 'development' (dev local literal) y no hay
  //     VERCEL_ENV → permitir el fallback con warning.
  const isVercelHosted = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV
  if (process.env.NODE_ENV === 'production' || isVercelHosted) {
    throw new Error(
      `[medical-vault] ${KEY_ENV_VAR} no está configurada o es muy corta (≥32 chars). ` +
        'Generar con: openssl rand -base64 32. ' +
        `Detectado entorno cliente-facing (NODE_ENV=${process.env.NODE_ENV}, VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'}).`,
    )
  }

  if (process.env.NODE_ENV !== 'development') {
    // Algún entorno raro (test ya queda permitido por NODE_ENV=test, lo
    // permitimos abajo). Si el NODE_ENV no es ni production ni development
    // ni test, exigimos clave real.
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        `[medical-vault] NODE_ENV='${process.env.NODE_ENV}' no es development|test|production — ` +
          `${KEY_ENV_VAR} requerido.`,
      )
    }
  }

  // Dev fallback: clave determinística pero NO usar en prod.
  // Logueamos el aviso una sola vez por proceso.
  if (!devKeyWarned) {
    devKeyWarned = true
    console.warn(
      `[medical-vault] ${KEY_ENV_VAR} no configurada — usando clave de desarrollo. ` +
        'Configurar antes de cualquier deploy.',
    )
  }
  return 'dev-vault-key-do-not-use-in-prod-32chars'
}

let devKeyWarned = false

/**
 * Cifra un texto plano con pgp_sym_encrypt y retorna los bytes resultantes.
 * Diseñado para guardarse en columna `Bytes` de Prisma.
 *
 * @param prisma  Cliente Prisma activo (de getTenantPrisma o el global).
 * @param plain   Texto plano (UTF-8). Cualquier longitud.
 * @returns       Uint8Array de bytes opacos compatible con `Bytes` columns
 *                de Prisma (que espera Uint8Array nativo, no Buffer).
 */
export async function encryptMedical(
  prisma: PrismaClient,
  plain: string,
): Promise<Uint8Array<ArrayBuffer>> {
  if (plain == null) {
    throw new Error('[medical-vault] encryptMedical recibió null/undefined')
  }
  const key = getVaultKey()
  const rows = await prisma.$queryRaw<{ ciphertext: Buffer }[]>`
    SELECT pgp_sym_encrypt(${plain}::text, ${key}::text) AS ciphertext
  `
  const buf = rows[0]?.ciphertext
  if (!buf) {
    throw new Error('[medical-vault] pgp_sym_encrypt no devolvió ciphertext')
  }
  // Prisma 7 tipa `Bytes` como Uint8Array<ArrayBuffer>; Buffer puede venir
  // con ArrayBufferLike. Copiamos a un Uint8Array nativo para cerrar el tipo.
  const bytes = new Uint8Array(buf.length)
  bytes.set(buf)
  return bytes
}

/**
 * Descifra bytes producidos por encryptMedical y retorna el texto plano.
 *
 * @param prisma     Cliente Prisma activo.
 * @param ciphertext Buffer de bytes cifrados.
 * @returns          Texto plano UTF-8.
 * @throws           Error si la clave es incorrecta o el ciphertext está corrupto.
 */
export async function decryptMedical(
  prisma: PrismaClient,
  ciphertext: Buffer | Uint8Array,
): Promise<string> {
  if (!ciphertext || ciphertext.length === 0) {
    throw new Error('[medical-vault] decryptMedical recibió ciphertext vacío')
  }
  const key = getVaultKey()
  const buf = Buffer.isBuffer(ciphertext) ? ciphertext : Buffer.from(ciphertext)
  const rows = await prisma.$queryRaw<{ plaintext: string }[]>`
    SELECT pgp_sym_decrypt(${buf}::bytea, ${key}::text) AS plaintext
  `
  if (rows[0]?.plaintext == null) {
    throw new Error('[medical-vault] pgp_sym_decrypt no devolvió plaintext')
  }
  return rows[0].plaintext
}

/**
 * Helper de validación al boot del proceso (importar desde una rutina de
 * inicialización). En producción, lanza si la clave no es válida.
 */
export function ensureMedicalVaultConfigured(): void {
  // Reusa la lógica de getVaultKey: en prod lanza si falta.
  getVaultKey()
}
