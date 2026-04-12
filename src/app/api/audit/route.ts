import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  queryAuditLogs,
  getDistinctActions,
  type AuditLogFilters,
} from '@/lib/audit'
import {
  parsePaginationParams,
  buildPrismaArgs,
  buildPaginationMeta,
} from '@/lib/pagination'

// =============================================
// GET /api/audit — List audit logs for the organization
// =============================================
//
// Query params:
//   page       — Page number (default: 1)
//   pageSize   — Items per page (default: 10, max: 100)
//   action     — Filter by action (e.g. "WORKER_CREATED")
//   userId     — Filter by user ID
//   resourceType — Filter by entity type (e.g. "Worker", "Contract")
//   resourceId — Filter by specific entity ID
//   from       — ISO date string, start of date range
//   to         — ISO date string, end of date range
//   actions    — If set to "list", returns distinct actions for filter dropdowns
//
// Protected: ADMIN role or higher required
//
// Response:
//   { data: AuditLogEntry[], pagination: PaginationMeta }
//   or { actions: string[] } when ?actions=list

export const GET = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)

    // Special mode: return distinct action values for filter UI
    if (searchParams.get('actions') === 'list') {
      const actions = await getDistinctActions(ctx.orgId)
      return NextResponse.json({ actions })
    }

    // Parse pagination
    const paginationParams = parsePaginationParams(searchParams)
    const { skip, take } = buildPrismaArgs(paginationParams)

    // Build filters
    const filters: AuditLogFilters = {
      orgId: ctx.orgId,
    }

    const action = searchParams.get('action')
    if (action) filters.action = action

    const userId = searchParams.get('userId')
    if (userId) filters.userId = userId

    const resourceType = searchParams.get('resourceType')
    if (resourceType) filters.resourceType = resourceType

    const resourceId = searchParams.get('resourceId')
    if (resourceId) filters.resourceId = resourceId

    const from = searchParams.get('from')
    if (from) {
      const parsed = new Date(from)
      if (!isNaN(parsed.getTime())) filters.from = parsed
    }

    const to = searchParams.get('to')
    if (to) {
      const parsed = new Date(to)
      if (!isNaN(parsed.getTime())) filters.to = parsed
    }

    // Query
    const { data, totalCount } = await queryAuditLogs(filters, { skip, take })
    const pagination = buildPaginationMeta(totalCount, paginationParams)

    // Format response
    const formattedData = data.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadataJson,
      ipAddress: entry.ipAddress,
      createdAt: entry.createdAt.toISOString(),
      user: entry.user
        ? {
            id: entry.user.id,
            email: entry.user.email,
            name: [entry.user.firstName, entry.user.lastName]
              .filter(Boolean)
              .join(' ') || entry.user.email,
          }
        : null,
    }))

    return NextResponse.json({ data: formattedData, pagination })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Error al obtener registros de auditoria' },
      { status: 500 }
    )
  }
})
