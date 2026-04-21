import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateOrgBackup, getBackupConfig } from '@/lib/backup'

/**
 * GET /api/backup — Get backup config info
 * POST /api/backup — Generate manual backup (OWNER only)
 */

export async function GET() {
  const { orgId } = await auth()
  if (!orgId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  return NextResponse.json(getBackupConfig())
}

export async function POST() {
  const { orgId, orgRole } = await auth()
  if (!orgId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (orgRole !== 'org:admin') {
    return NextResponse.json(
      { error: 'Solo el administrador puede generar backups' },
      { status: 403 }
    )
  }

  try {
    const backup = await generateOrgBackup(orgId)

    // Return as downloadable JSON
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set(
      'Content-Disposition',
      `attachment; filename="comply360-backup-${new Date().toISOString().slice(0, 10)}.json"`
    )

    return new NextResponse(JSON.stringify(backup, null, 2), { headers })
  } catch (error) {
    console.error('[backup] Error:', error)
    return NextResponse.json(
      { error: 'Error al generar backup' },
      { status: 500 }
    )
  }
}
