import { prisma } from '@/lib/prisma'

// =============================================
// AUDIT TRAIL SYSTEM — COMPLY 360
// =============================================
//
// Usage:
//   await auditLog({
//     action: 'WORKER_CREATED',
//     orgId: ctx.orgId,
//     userId: ctx.userId,
//     resourceType: 'Worker',
//     resourceId: worker.id,
//     details: { dni: worker.dni, name: `${worker.firstName} ${worker.lastName}` },
//     ipAddress: req.headers.get('x-forwarded-for'),
//   })

// =============================================
// ACTION CATEGORIES
// =============================================

export const AuditActions = {
  // AUTH
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',

  // WORKERS
  WORKER_CREATED: 'WORKER_CREATED',
  WORKER_UPDATED: 'WORKER_UPDATED',
  WORKER_DELETED: 'WORKER_DELETED',
  WORKER_TERMINATED: 'WORKER_TERMINATED',

  // CONTRACTS
  CONTRACT_CREATED: 'CONTRACT_CREATED',
  CONTRACT_UPDATED: 'CONTRACT_UPDATED',
  CONTRACT_SIGNED: 'CONTRACT_SIGNED',
  CONTRACT_EXPIRED: 'CONTRACT_EXPIRED',
  CONTRACT_DELETED: 'CONTRACT_DELETED',

  // COMPLIANCE
  DIAGNOSTIC_STARTED: 'DIAGNOSTIC_STARTED',
  DIAGNOSTIC_COMPLETED: 'DIAGNOSTIC_COMPLETED',
  SCORE_UPDATED: 'SCORE_UPDATED',

  // CALCULATIONS
  CALCULATION_PERFORMED: 'CALCULATION_PERFORMED',
  CALCULATION_EXPORTED: 'CALCULATION_EXPORTED',

  // SETTINGS
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  TEAM_MEMBER_ADDED: 'TEAM_MEMBER_ADDED',
  TEAM_MEMBER_REMOVED: 'TEAM_MEMBER_REMOVED',
  TEAM_MEMBER_ROLE_CHANGED: 'TEAM_MEMBER_ROLE_CHANGED',

  // DOCUMENTS
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
  DOCUMENT_VERIFIED: 'DOCUMENT_VERIFIED',

  // COMPLAINTS
  COMPLAINT_RECEIVED: 'COMPLAINT_RECEIVED',
  COMPLAINT_ASSIGNED: 'COMPLAINT_ASSIGNED',
  COMPLAINT_RESOLVED: 'COMPLAINT_RESOLVED',
  COMPLAINT_STATUS_CHANGED: 'COMPLAINT_STATUS_CHANGED',

  // EXPORTS
  DATA_EXPORTED: 'DATA_EXPORTED',
  REPORT_GENERATED: 'REPORT_GENERATED',

  // AI
  AI_CHAT_USED: 'AI_CHAT_USED',
  AI_CONTRACT_REVIEWED: 'AI_CONTRACT_REVIEWED',

  // SST
  SST_RECORD_CREATED: 'SST_RECORD_CREATED',
  SST_RECORD_UPDATED: 'SST_RECORD_UPDATED',

  // E-LEARNING
  ENROLLMENT_CREATED: 'ENROLLMENT_CREATED',
  COURSE_COMPLETED: 'COURSE_COMPLETED',
  CERTIFICATE_ISSUED: 'CERTIFICATE_ISSUED',

  // SUBSCRIPTIONS
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  PLAN_CHANGED: 'PLAN_CHANGED',
} as const

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions]

// =============================================
// RESOURCE TYPES
// =============================================

export type AuditResourceType =
  | 'Worker'
  | 'Contract'
  | 'Calculation'
  | 'Complaint'
  | 'Document'
  | 'Organization'
  | 'User'
  | 'Invitation'
  | 'Diagnostic'
  | 'SstRecord'
  | 'Course'
  | 'Enrollment'
  | 'Certificate'
  | 'Subscription'
  | 'NormUpdate'
  | 'Tercero'
  | string

// =============================================
// AUDIT LOG INPUT
// =============================================

export interface AuditLogInput {
  /** The action being logged */
  action: AuditAction | string
  /** Organization ID */
  orgId: string
  /** User performing the action (null for system actions) */
  userId?: string | null
  /** Type of resource affected */
  resourceType?: AuditResourceType
  /** ID of the resource affected */
  resourceId?: string
  /** Additional details — serialized to JSON */
  details?: Record<string, unknown>
  /** Client IP address */
  ipAddress?: string | null
  /** User agent string */
  userAgent?: string | null
}

// =============================================
// MAIN AUDIT LOGGER
// =============================================

/**
 * Log an audit event to the database.
 *
 * Non-blocking by default — errors are caught and logged to console
 * so the main request flow is never disrupted.
 *
 * Uses the AuditLog table in the database (maps to `audit_logs`).
 */
export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    const metadata: Record<string, unknown> = {}

    if (input.details) {
      Object.assign(metadata, input.details)
    }
    if (input.userAgent) {
      metadata._userAgent = input.userAgent
    }

    await prisma.auditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.userId ?? undefined,
        action: input.action,
        entityType: input.resourceType ?? undefined,
        entityId: input.resourceId ?? undefined,
        metadataJson: Object.keys(metadata).length > 0 ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ipAddress: input.ipAddress ?? undefined,
      },
    })
  } catch (error) {
    // Audit logging must never break the main flow
    console.error('[audit] Failed to write audit log:', input.action, error)
  }
}

/**
 * Shorthand alias — backwards compatible with the original logAudit function.
 */
export async function logAudit(params: {
  orgId: string
  userId?: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, string | number | boolean>
  ipAddress?: string
}): Promise<void> {
  return auditLog({
    action: params.action,
    orgId: params.orgId,
    userId: params.userId,
    resourceType: params.entityType,
    resourceId: params.entityId,
    details: params.metadata as Record<string, unknown> | undefined,
    ipAddress: params.ipAddress,
  })
}

// =============================================
// AUDIT LOG QUERY HELPERS
// =============================================

export interface AuditLogFilters {
  orgId: string
  userId?: string
  action?: string
  resourceType?: string
  resourceId?: string
  from?: Date
  to?: Date
}

export interface AuditLogEntry {
  id: string
  orgId: string
  userId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  metadataJson: unknown
  ipAddress: string | null
  createdAt: Date
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  } | null
}

/**
 * Query audit logs with filters and pagination.
 * Returns { data, totalCount } for building paginated responses.
 */
export async function queryAuditLogs(
  filters: AuditLogFilters,
  pagination: { skip: number; take: number }
): Promise<{ data: AuditLogEntry[]; totalCount: number }> {
  const where: Record<string, unknown> = {
    orgId: filters.orgId,
  }

  if (filters.userId) {
    where.userId = filters.userId
  }
  if (filters.action) {
    where.action = filters.action
  }
  if (filters.resourceType) {
    where.entityType = filters.resourceType
  }
  if (filters.resourceId) {
    where.entityId = filters.resourceId
  }

  // Date range filter
  if (filters.from || filters.to) {
    const createdAt: Record<string, Date> = {}
    if (filters.from) createdAt.gte = filters.from
    if (filters.to) createdAt.lte = filters.to
    where.createdAt = createdAt
  }

  const [data, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { data: data as unknown as AuditLogEntry[], totalCount }
}

/**
 * Get distinct action values used by an organization.
 * Useful for populating filter dropdowns in the UI.
 */
export async function getDistinctActions(orgId: string): Promise<string[]> {
  const results = await prisma.auditLog.findMany({
    where: { orgId },
    select: { action: true },
    distinct: ['action'],
    orderBy: { action: 'asc' },
  })
  return results.map((r) => r.action)
}

/**
 * Get audit log count for an organization, optionally filtered by date range.
 * Useful for dashboard stats.
 */
export async function getAuditLogCount(
  orgId: string,
  from?: Date,
  to?: Date
): Promise<number> {
  const where: Record<string, unknown> = { orgId }
  if (from || to) {
    const createdAt: Record<string, Date> = {}
    if (from) createdAt.gte = from
    if (to) createdAt.lte = to
    where.createdAt = createdAt
  }
  return prisma.auditLog.count({ where })
}

/**
 * Extract client IP from a Next.js request.
 * Checks x-forwarded-for, x-real-ip, then falls back to null.
 */
export function extractIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; take the first (client)
    return forwarded.split(',')[0].trim()
  }
  return req.headers.get('x-real-ip') ?? null
}

/**
 * Build a standard audit context from a request + auth context.
 * Convenience helper to reduce boilerplate in API routes.
 */
export function auditContext(
  req: Request,
  auth: { userId: string; orgId: string }
): Pick<AuditLogInput, 'orgId' | 'userId' | 'ipAddress' | 'userAgent'> {
  return {
    orgId: auth.orgId,
    userId: auth.userId,
    ipAddress: extractIp(req),
    userAgent: req.headers.get('user-agent'),
  }
}
