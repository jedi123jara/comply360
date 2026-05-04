/**
 * scripts/rotate-medical-vault-key.ts
 *
 * Rota la `MEDICAL_VAULT_KEY` re-cifrando todos los `Bytes` encriptados con
 * `pgp_sym_encrypt` en el sub-schema médico (Ley 29733 + D.S. 016-2024-JUS).
 *
 * COLUMNAS QUE ROTA (4 en 3 tablas):
 *   - emo.restricciones_cifrado                       (nullable)
 *   - consentimientos_ley_29733.texto_cifrado         (NOT NULL)
 *   - consentimientos_ley_29733.firma_cifrada         (NOT NULL)
 *   - solicitudes_arco.detalle_cifrado                (nullable)
 *
 * MODOS:
 *   --dry-run   Cuenta cuántos registros necesitan rotación. No modifica nada.
 *   --apply     Ejecuta la rotación. Idempotente y resumible.
 *   --verify    Confirma que la clave NUEVA descifra TODOS los registros
 *               (post-rotación). Falla si encuentra algo con la clave vieja.
 *
 * VARIABLES DE ENTORNO REQUERIDAS:
 *   MEDICAL_VAULT_KEY_OLD   La clave anterior (comprometida o por rotar).
 *   MEDICAL_VAULT_KEY       La clave nueva, ya configurada en .env.
 *
 * IDEMPOTENCIA:
 *   Para cada ciphertext, primero intenta descifrar con la clave NUEVA.
 *   Si tiene éxito → ya fue rotado en una corrida previa, se salta.
 *   Si falla → asume que está con la clave VIEJA: descifra con OLD y
 *   re-cifra con NEW. Esto permite re-ejecutar el script sin riesgo si
 *   se interrumpe a la mitad.
 *
 * USO RECOMENDADO:
 *   1) npx tsx scripts/rotate-medical-vault-key.ts --dry-run
 *      (revisar conteos esperados)
 *   2) npx tsx scripts/rotate-medical-vault-key.ts --apply
 *      (ejecutar rotación, leer log con detalle)
 *   3) npx tsx scripts/rotate-medical-vault-key.ts --verify
 *      (confirmar que todo quedó descifrable con NEW)
 *   4) Remover MEDICAL_VAULT_KEY_OLD de .env y de Vercel.
 *
 * SEGURIDAD:
 *   Este script imprime los primeros 8 caracteres de cada clave en log
 *   para confirmar que se cargaron las correctas. Nunca imprime el
 *   plaintext médico ni el ciphertext crudo. El AuditLog 'MEDICAL_KEY_ROTATED'
 *   queda como evidencia de la rotación con conteos por tabla.
 */

import { prisma } from '../src/lib/prisma'

type Mode = 'dry-run' | 'apply' | 'verify'

interface Keys {
  oldKey: string
  newKey: string
}

interface ColumnStats {
  table: string
  column: string
  total: number
  rotated: number
  alreadyRotated: number
  failed: number
  failedIds: string[]
}

function emptyStats(table: string, column: string): ColumnStats {
  return { table, column, total: 0, rotated: 0, alreadyRotated: 0, failed: 0, failedIds: [] }
}

function parseArgs(): { mode: Mode; limit: number | null } {
  const args = process.argv.slice(2)
  let mode: Mode | null = null
  if (args.includes('--dry-run')) mode = 'dry-run'
  if (args.includes('--apply')) mode = 'apply'
  if (args.includes('--verify')) mode = 'verify'

  if (!mode) {
    console.error(
      'Uso: npx tsx scripts/rotate-medical-vault-key.ts [--dry-run|--apply|--verify] [--limit N]',
    )
    process.exit(1)
  }

  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '', 10) : null

  return { mode, limit: limit && !Number.isNaN(limit) ? limit : null }
}

function readKeys(): Keys {
  const oldKey = process.env.MEDICAL_VAULT_KEY_OLD
  const newKey = process.env.MEDICAL_VAULT_KEY

  if (!oldKey || oldKey.length < 32) {
    throw new Error(
      'MEDICAL_VAULT_KEY_OLD no configurada o muy corta (≥32 chars). ' +
        'Configura la clave VIEJA antes de correr el script.',
    )
  }
  if (!newKey || newKey.length < 32) {
    throw new Error(
      'MEDICAL_VAULT_KEY no configurada o muy corta (≥32 chars). ' +
        'Genera una nueva con: openssl rand -base64 32',
    )
  }
  if (oldKey === newKey) {
    throw new Error(
      'MEDICAL_VAULT_KEY_OLD y MEDICAL_VAULT_KEY son idénticas. ' +
        'No tiene sentido rotar a la misma clave. Genera una nueva primero.',
    )
  }
  return { oldKey, newKey }
}

/**
 * Intenta descifrar el ciphertext con la clave dada. Devuelve true si tuvo
 * éxito (la integridad MDC del paquete pgp se valida implícitamente). Devuelve
 * false si la clave no corresponde o el ciphertext está corrupto.
 */
async function tryDecrypt(ciphertext: Buffer, key: string): Promise<boolean> {
  try {
    await prisma.$queryRaw<{ ok: string | null }[]>`
      SELECT pgp_sym_decrypt(${ciphertext}::bytea, ${key}::text) AS ok
    `
    return true
  } catch {
    return false
  }
}

/**
 * Re-cifra: descifra con OLD y vuelve a cifrar con NEW. Atómico en Postgres.
 * El ciphertext resultante es opaco; pgcrypto usa nonce aleatorio así que cada
 * llamada produce un binario distinto aunque el plaintext sea igual.
 */
async function rotateOnce(
  ciphertext: Buffer,
  oldKey: string,
  newKey: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const rows = await prisma.$queryRaw<{ rotated: Buffer }[]>`
    SELECT pgp_sym_encrypt(
      pgp_sym_decrypt(${ciphertext}::bytea, ${oldKey}::text),
      ${newKey}::text
    ) AS rotated
  `
  const buf = rows[0]?.rotated
  if (!buf) {
    throw new Error('pgp re-encrypt no devolvió bytes')
  }
  // Prisma 7 tipa columnas Bytes como Uint8Array<ArrayBuffer>; copiamos a un
  // buffer nativo nuevo para que el tipo coincida exactamente.
  const bytes = new Uint8Array(buf.length)
  bytes.set(buf)
  return bytes
}

/**
 * Procesa una columna `Bytes` cifrada de una tabla.
 *
 * @param updateFn Recibe el id del registro y los bytes nuevos, debe persistir
 *                 la actualización con Prisma.
 */
async function processColumn(args: {
  mode: Mode
  keys: Keys
  table: string
  column: string
  rows: Array<{ id: string; ciphertext: Buffer | Uint8Array | null }>
  updateFn: (id: string, bytes: Uint8Array<ArrayBuffer>) => Promise<void>
  limit: number | null
}): Promise<ColumnStats> {
  const stats = emptyStats(args.table, args.column)
  const filtered = args.rows.filter((r) => r.ciphertext && r.ciphertext.length > 0)
  stats.total = filtered.length

  const toProcess = args.limit ? filtered.slice(0, args.limit) : filtered

  console.log(
    `[${args.table}.${args.column}] ${stats.total} registros con datos cifrados` +
      (args.limit ? ` (procesando primeros ${toProcess.length})` : ''),
  )

  for (const row of toProcess) {
    const raw = row.ciphertext as Buffer | Uint8Array
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw)

    // 1) ¿Ya está rotado? Intenta con la clave NUEVA primero.
    const decryptsWithNew = await tryDecrypt(buf, args.keys.newKey)
    if (decryptsWithNew) {
      stats.alreadyRotated++
      continue
    }

    // 2) ¿Descifra con la clave VIEJA? Si no, está corrupto.
    const decryptsWithOld = await tryDecrypt(buf, args.keys.oldKey)
    if (!decryptsWithOld) {
      console.error(
        `  ✗ [${args.table} ${row.id}] No descifra con OLD ni NEW — saltando`,
      )
      stats.failed++
      stats.failedIds.push(row.id)
      continue
    }

    if (args.mode === 'verify') {
      // En modo verify, encontrar algo con OLD es un fallo de la rotación.
      console.error(
        `  ✗ [${args.table} ${row.id}] Sigue con la clave VIEJA — rotación incompleta`,
      )
      stats.failed++
      stats.failedIds.push(row.id)
      continue
    }

    if (args.mode === 'dry-run') {
      // Solo contamos.
      stats.rotated++
      continue
    }

    // 3) Modo apply: re-cifrar y persistir.
    try {
      const rotated = await rotateOnce(buf, args.keys.oldKey, args.keys.newKey)
      await args.updateFn(row.id, rotated)
      stats.rotated++
      if (stats.rotated % 50 === 0) {
        console.log(`  ↻ ${stats.rotated}/${toProcess.length} rotados...`)
      }
    } catch (err) {
      console.error(
        `  ✗ [${args.table} ${row.id}] Error al rotar:`,
        err instanceof Error ? err.message : err,
      )
      stats.failed++
      stats.failedIds.push(row.id)
    }
  }

  return stats
}

async function processEMO(mode: Mode, keys: Keys, limit: number | null) {
  const rows = await prisma.eMO.findMany({
    where: { restriccionesCifrado: { not: null } },
    select: { id: true, restriccionesCifrado: true },
  })
  return processColumn({
    mode,
    keys,
    table: 'emo',
    column: 'restricciones_cifrado',
    rows: rows.map((r) => ({ id: r.id, ciphertext: r.restriccionesCifrado })),
    updateFn: async (id, bytes) => {
      await prisma.eMO.update({
        where: { id },
        data: { restriccionesCifrado: bytes },
      })
    },
    limit,
  })
}

async function processConsentimientos(mode: Mode, keys: Keys, limit: number | null) {
  // Esta tabla tiene 2 columnas cifradas; las rotamos juntas en una transacción
  // para que ambas queden con la misma clave.
  const rows = await prisma.consentimientoLey29733.findMany({
    select: { id: true, textoCifrado: true, firmaCifrada: true },
  })

  const statsTexto = emptyStats('consentimientos_ley_29733', 'texto_cifrado')
  const statsFirma = emptyStats('consentimientos_ley_29733', 'firma_cifrada')
  statsTexto.total = rows.length
  statsFirma.total = rows.length

  const toProcess = limit ? rows.slice(0, limit) : rows

  console.log(
    `[consentimientos_ley_29733] ${rows.length} registros (rotando 2 columnas)` +
      (limit ? ` (procesando primeros ${toProcess.length})` : ''),
  )

  for (const row of toProcess) {
    const bufTexto = Buffer.from(row.textoCifrado)
    const bufFirma = Buffer.from(row.firmaCifrada)

    const textoNew = await tryDecrypt(bufTexto, keys.newKey)
    const firmaNew = await tryDecrypt(bufFirma, keys.newKey)

    if (textoNew && firmaNew) {
      statsTexto.alreadyRotated++
      statsFirma.alreadyRotated++
      continue
    }

    const textoOld = textoNew ? false : await tryDecrypt(bufTexto, keys.oldKey)
    const firmaOld = firmaNew ? false : await tryDecrypt(bufFirma, keys.oldKey)

    // Casos mixtos (texto rotado pero firma no, o viceversa) son raros pero
    // los manejamos uno por uno para no bloquear.
    const needsTexto = !textoNew && textoOld
    const needsFirma = !firmaNew && firmaOld

    if (!textoNew && !textoOld) {
      console.error(
        `  ✗ [consentimientos ${row.id}] texto_cifrado no descifra con OLD ni NEW`,
      )
      statsTexto.failed++
      statsTexto.failedIds.push(row.id)
    }
    if (!firmaNew && !firmaOld) {
      console.error(
        `  ✗ [consentimientos ${row.id}] firma_cifrada no descifra con OLD ni NEW`,
      )
      statsFirma.failed++
      statsFirma.failedIds.push(row.id)
    }

    if (mode === 'verify') {
      if (needsTexto) {
        statsTexto.failed++
        statsTexto.failedIds.push(row.id)
        console.error(`  ✗ [consentimientos ${row.id}] texto sigue con clave VIEJA`)
      }
      if (needsFirma) {
        statsFirma.failed++
        statsFirma.failedIds.push(row.id)
        console.error(`  ✗ [consentimientos ${row.id}] firma sigue con clave VIEJA`)
      }
      continue
    }

    if (mode === 'dry-run') {
      if (needsTexto) statsTexto.rotated++
      if (needsFirma) statsFirma.rotated++
      continue
    }

    // Apply: rotamos las que faltan en una transacción.
    try {
      const data: Partial<{
        textoCifrado: Uint8Array<ArrayBuffer>
        firmaCifrada: Uint8Array<ArrayBuffer>
      }> = {}
      if (needsTexto) {
        data.textoCifrado = await rotateOnce(bufTexto, keys.oldKey, keys.newKey)
      }
      if (needsFirma) {
        data.firmaCifrada = await rotateOnce(bufFirma, keys.oldKey, keys.newKey)
      }

      if (Object.keys(data).length > 0) {
        await prisma.consentimientoLey29733.update({
          where: { id: row.id },
          data,
        })
        if (needsTexto) statsTexto.rotated++
        if (needsFirma) statsFirma.rotated++
      }
    } catch (err) {
      console.error(
        `  ✗ [consentimientos ${row.id}] Error al rotar:`,
        err instanceof Error ? err.message : err,
      )
      if (needsTexto) {
        statsTexto.failed++
        statsTexto.failedIds.push(row.id)
      }
      if (needsFirma) {
        statsFirma.failed++
        statsFirma.failedIds.push(row.id)
      }
    }
  }

  return [statsTexto, statsFirma] as const
}

async function processARCO(mode: Mode, keys: Keys, limit: number | null) {
  const rows = await prisma.solicitudARCO.findMany({
    where: { detalleCifrado: { not: null } },
    select: { id: true, detalleCifrado: true },
  })
  return processColumn({
    mode,
    keys,
    table: 'solicitudes_arco',
    column: 'detalle_cifrado',
    rows: rows.map((r) => ({ id: r.id, ciphertext: r.detalleCifrado })),
    updateFn: async (id, bytes) => {
      await prisma.solicitudARCO.update({
        where: { id },
        data: { detalleCifrado: bytes },
      })
    },
    limit,
  })
}

function printSummary(allStats: ColumnStats[], mode: Mode) {
  console.log('')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  RESUMEN — modo: ${mode.toUpperCase()}`)
  console.log('═══════════════════════════════════════════════════════════')

  const header = '  Tabla.columna'.padEnd(48) +
    'Total'.padStart(7) +
    'Rotar'.padStart(7) +
    'Listos'.padStart(8) +
    'Fallo'.padStart(7)
  console.log(header)
  console.log('  ' + '─'.repeat(73))

  let totalRotar = 0
  let totalListos = 0
  let totalFallo = 0

  for (const s of allStats) {
    const label = `  ${s.table}.${s.column}`
    console.log(
      label.padEnd(48) +
        String(s.total).padStart(7) +
        String(s.rotated).padStart(7) +
        String(s.alreadyRotated).padStart(8) +
        String(s.failed).padStart(7),
    )
    totalRotar += s.rotated
    totalListos += s.alreadyRotated
    totalFallo += s.failed
  }

  console.log('  ' + '─'.repeat(73))
  console.log(
    '  TOTAL'.padEnd(48) +
      ''.padStart(7) +
      String(totalRotar).padStart(7) +
      String(totalListos).padStart(8) +
      String(totalFallo).padStart(7),
  )
  console.log('')

  if (mode === 'dry-run') {
    if (totalRotar === 0 && totalFallo === 0) {
      console.log('✅ No hay nada que rotar (todo ya está con la clave NUEVA).')
    } else {
      console.log(`📋 Listo para rotar ${totalRotar} columnas. Corre con --apply.`)
      if (totalFallo > 0) {
        console.log(`⚠ ${totalFallo} columnas no descifran ni con OLD ni con NEW — investigar antes de aplicar.`)
      }
    }
  } else if (mode === 'apply') {
    if (totalFallo === 0) {
      console.log('✅ Rotación completada sin errores.')
      console.log('')
      console.log('SIGUIENTE PASO:')
      console.log('  1) Corre `--verify` para confirmar que NEW descifra todo.')
      console.log('  2) Una vez verificado, remueve MEDICAL_VAULT_KEY_OLD del entorno (.env y Vercel).')
    } else {
      console.log(`⚠ Rotación completada con ${totalFallo} fallos. Revisar IDs:`)
      for (const s of allStats) {
        if (s.failedIds.length > 0) {
          console.log(`  ${s.table}.${s.column}: ${s.failedIds.slice(0, 10).join(', ')}${s.failedIds.length > 10 ? '...' : ''}`)
        }
      }
    }
  } else {
    // verify
    if (totalFallo === 0) {
      console.log('✅ Verificación OK: la clave NUEVA descifra todos los registros.')
      console.log('   Ya puedes remover MEDICAL_VAULT_KEY_OLD de forma segura.')
    } else {
      console.log(`✗ Verificación FALLÓ: ${totalFallo} registros NO descifran con NEW.`)
      console.log('   Vuelve a correr `--apply` o investiga las IDs listadas arriba.')
      process.exit(2)
    }
  }
}

async function logAuditTrail(allStats: ColumnStats[], mode: Mode) {
  if (mode !== 'apply') return

  const totalRotar = allStats.reduce((sum, s) => sum + s.rotated, 0)
  const totalFallo = allStats.reduce((sum, s) => sum + s.failed, 0)

  // Log global sin orgId — la rotación es operación de plataforma.
  // El AuditLog requiere orgId; usamos la primera org como ancla para que
  // quede registro auditable. Si no hay ninguna org, omitimos.
  const anyOrg = await prisma.organization.findFirst({ select: { id: true } })
  if (!anyOrg) return

  await prisma.auditLog.create({
    data: {
      orgId: anyOrg.id,
      action: 'MEDICAL_KEY_ROTATED',
      entityType: 'MedicalVault',
      entityId: 'global',
      metadataJson: {
        timestamp: new Date().toISOString(),
        mode,
        totalRotated: totalRotar,
        totalFailed: totalFallo,
        breakdown: allStats.map((s) => ({
          table: s.table,
          column: s.column,
          total: s.total,
          rotated: s.rotated,
          alreadyRotated: s.alreadyRotated,
          failed: s.failed,
        })),
      },
    },
  })
}

async function main() {
  const { mode, limit } = parseArgs()
  const keys = readKeys()

  console.log('═══════════════════════════════════════════════════════════')
  console.log('  ROTACIÓN DE MEDICAL_VAULT_KEY (Ley 29733)')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`Modo:           ${mode}`)
  console.log(`OLD key prefix: ${keys.oldKey.slice(0, 8)}...`)
  console.log(`NEW key prefix: ${keys.newKey.slice(0, 8)}...`)
  if (limit) console.log(`Limit:          ${limit} registros por columna`)
  console.log('')

  const emoStats = await processEMO(mode, keys, limit)
  const [textoStats, firmaStats] = await processConsentimientos(mode, keys, limit)
  const arcoStats = await processARCO(mode, keys, limit)

  const allStats = [emoStats, textoStats, firmaStats, arcoStats]

  printSummary(allStats, mode)
  await logAuditTrail(allStats, mode)
}

main()
  .catch((err) => {
    console.error('')
    console.error('✗ Error fatal:', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
