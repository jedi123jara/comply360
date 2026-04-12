/**
 * PATCH /api/admin/norm-updates/[id]
 *
 * Approve or reject a PENDING_REVIEW norm.
 * Protected by SUPER_ADMIN role.
 *
 * Body: { action: "approve" | "reject", notes?: string }
 *
 * On approve:
 *   - Sets status=APPROVED, isProcessed=true, reviewedAt, reviewedBy
 *   - If impactLevel is HIGH or CRITICAL, sends email to all org alertEmails
 *     whose regimenPrincipal is in the norm's affectedRegimens (or GENERAL)
 *
 * On reject:
 *   - Sets status=REJECTED, reviewedAt, reviewedBy, reviewNotes
 */

import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdminParams } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/client'
import type { AuthContext } from '@/lib/auth'

export const PATCH = withSuperAdminParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, params) => {
    const { id } = params
    const body = await req.json() as { action?: string; notes?: string }
    const { action, notes } = body

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const norm = await prisma.normUpdate.findUnique({ where: { id } })
    if (!norm) {
      return NextResponse.json({ error: 'Norm not found' }, { status: 404 })
    }

    if (norm.status !== 'PENDING_REVIEW') {
      return NextResponse.json(
        { error: `Norm is already ${norm.status} — only PENDING_REVIEW norms can be reviewed` },
        { status: 409 }
      )
    }

    const reviewedAt = new Date()
    const reviewedBy = ctx.email

    if (action === 'reject') {
      const updated = await prisma.normUpdate.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewNotes: notes || null,
          reviewedAt,
          reviewedBy,
        },
      })
      return NextResponse.json({ data: updated })
    }

    // ── Approve ─────────────────────────────────────────────────────────────
    const approved = await prisma.normUpdate.update({
      where: { id },
      data: {
        status: 'APPROVED',
        isProcessed: true,
        reviewNotes: notes || null,
        reviewedAt,
        reviewedBy,
      },
    })

    // Notify affected organizations if the impact is HIGH or CRITICAL
    const shouldNotifyOrgs =
      approved.impactLevel === 'HIGH' || approved.impactLevel === 'CRITICAL'

    if (shouldNotifyOrgs) {
      await notifyAffectedOrgs(approved)
    }

    return NextResponse.json({
      data: approved,
      orgsNotified: shouldNotifyOrgs,
    })
  }
)

/** Send an alert email to every org whose regimenPrincipal matches the norm's affectedRegimens */
async function notifyAffectedOrgs(norm: {
  id: string
  normCode: string
  title: string
  summary: string | null
  impactLevel: string | null
  impactAnalysis: string | null
  actionRequired: string | null
  actionDeadline: Date | null
  affectedRegimens: string[]
  sourceUrl: string | null
}) {
  const affectedRegimens = norm.affectedRegimens

  // GENERAL means it applies to everyone
  const where = affectedRegimens.includes('GENERAL')
    ? { alertEmail: { not: null } }
    : {
        alertEmail: { not: null },
        regimenPrincipal: { in: affectedRegimens },
      }

  const orgs = await prisma.organization.findMany({
    where,
    select: { id: true, razonSocial: true, alertEmail: true, regimenPrincipal: true },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://comply360.pe'
  const impactColor = norm.impactLevel === 'CRITICAL' ? '#991b1b' : '#92400e'
  const impactBg = norm.impactLevel === 'CRITICAL' ? '#fee2e2' : '#fef3c7'

  const deadlineText = norm.actionDeadline
    ? `<p><strong>Fecha límite:</strong> ${new Date(norm.actionDeadline).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>`
    : ''

  let notified = 0
  for (const org of orgs) {
    if (!org.alertEmail) continue
    try {
      await sendEmail({
        to: org.alertEmail,
        subject: `[COMPLY360] Nueva norma ${norm.impactLevel}: ${norm.normCode}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
            <div style="background:#1e3a6e;padding:20px 24px;border-radius:8px 8px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:18px;">Actualización Normativa</h1>
              <p style="color:#93c5fd;margin:6px 0 0;font-size:13px;">${org.razonSocial}</p>
            </div>
            <div style="padding:20px 24px;border:1px solid #e2e8f0;border-top:none;">
              <span style="display:inline-block;padding:4px 12px;border-radius:4px;font-size:13px;font-weight:700;background:${impactBg};color:${impactColor};">
                ${norm.impactLevel}
              </span>
              <h2 style="margin:12px 0 4px;font-size:16px;color:#1e293b;">${norm.normCode}</h2>
              <h3 style="margin:0 0 14px;font-size:14px;color:#475569;font-weight:400;">${norm.title}</h3>
              <p style="color:#334155;">${norm.summary || ''}</p>
              <div style="background:#f1f5f9;border-left:4px solid #1e3a6e;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;">
                <strong style="color:#1e3a6e;">Acción requerida:</strong>
                <p style="margin:6px 0 0;color:#334155;">${norm.actionRequired || ''}</p>
                ${deadlineText}
              </div>
              <p style="color:#64748b;font-size:13px;">${norm.impactAnalysis || ''}</p>
              ${norm.sourceUrl ? `<p style="margin-top:16px;"><a href="${norm.sourceUrl}" style="color:#1e3a6e;">Ver norma oficial →</a></p>` : ''}
            </div>
            <div style="padding:14px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;text-align:center;">
              <a href="${appUrl}/dashboard/normas"
                 style="display:inline-block;background:#1e3a6e;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
                Ver en COMPLY360
              </a>
            </div>
          </div>`,
      })
      notified++
    } catch (err) {
      console.error(`[norm-updates approve] Failed to notify org ${org.id}:`, err)
    }
  }

  console.log(`[norm-updates approve] Notified ${notified}/${orgs.length} orgs about ${norm.normCode}`)
}
