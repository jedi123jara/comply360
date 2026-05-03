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

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[medical-vault] ${KEY_ENV_VAR} no está configurada o es muy corta (≥32 chars). ` +
        'Generar con: openssl rand -base64 32',
    )
  }

  // Dev fallback: clave determinística pero NO usar en prod.
  // Logueamos el aviso una sola vez por proceso.
  if (!devKeyWarned) {
    devKeyWarned = true
    // eslint-disable-next-line no-console
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
 * @returns       Buffer de bytes opacos para persistir en `Bytes` columns.
 */
export async function encryptMedical(
  prisma: PrismaClient,
  plain: string,
): Promise<Buffer> {
  if (plain == null) {
    throw new Error('[medical-vault] encryptMedical recibió null/undefined')
  }
  const key = getVaultKey()
  const rows = await prisma.$queryRaw<{ ciphertext: Buffer }[]>`
    SELECT pgp_sym_encrypt(${plain}::text, ${key}::text) AS ciphertext
  `
  if (!rows[0]?.ciphertext) {
    throw new Error('[medical-vault] pgp_sym_encrypt no devolvió ciphertext')
  }
  return rows[0].ciphertext
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
