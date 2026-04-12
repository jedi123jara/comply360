/**
 * GET /api/cron/norm-updates
 *
 * Vercel Cron job — runs daily at 07:00 Lima time (12:00 UTC).
 * Schedule: "0 12 * * *" in vercel.json
 *
 * Flow:
 *  1. Fetch RSS from El Peruano + SUNAFIL (+ MTPE if configured)
 *  2. Skip norms already in the DB (by externalId)
 *  3. Classify each new norm via LLM (category, impact level, affected modules, etc.)
 *  4. Save as status=PENDING_REVIEW — NOT yet visible to clients
 *  5. Email DEV_TEAM_EMAIL with a summary and approval link
 *
 * Protected by CRON_SECRET (same pattern as daily-alerts).
 * Set DEV_TEAM_EMAIL env var to the address that receives review notifications.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/client'
import { fetchNewNorms } from '@/lib/crawler/norm-fetcher'
import { classifyNorm } from '@/lib/crawler/norm-classifier'
import type { NormSource, NormCategory, ImpactLevel, RegimenLaboral } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[norm-updates cron] CRON_SECRET not configured — disabled')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date()
  const devEmail = process.env.DEV_TEAM_EMAIL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://comply360.pe'

  try {
    // ── 1. Load existing externalIds to skip duplicates ───────────────────
    const existingRows = await prisma.normUpdate.findMany({
      where: { externalId: { not: null } },
      select: { externalId: true },
    })
    const existingIds = new Set(existingRows.map(r => r.externalId as string))

    // ── 2. Fetch from RSS feeds ───────────────────────────────────────────
    const rawNorms = await fetchNewNorms(existingIds)

    if (rawNorms.length === 0) {
      console.log('[norm-updates cron] No new norms found')
      return NextResponse.json({ fetched: 0, saved: 0, durationMs: Date.now() - startedAt.getTime() })
    }

    console.log(`[norm-updates cron] Found ${rawNorms.length} new norms — classifying...`)

    // ── 3. Classify each norm (sequential to avoid rate-limits) ──────────
    const classified = []
    for (const raw of rawNorms) {
      const result = await classifyNorm(raw)
      classified.push(result)
    }

    // ── 4. Save as PENDING_REVIEW ─────────────────────────────────────────
    let saved = 0
    for (const norm of classified) {
      try {
        await prisma.normUpdate.create({
          data: {
            externalId: norm.externalId,
            source: norm.source as NormSource,
            normCode: norm.normCode,
            title: norm.title,
            summary: norm.summary,
            category: norm.category as NormCategory,
            publishedAt: norm.publishedAt,
            sourceUrl: norm.sourceUrl,
            impactAnalysis: norm.impactAnalysis,
            impactLevel: norm.impactLevel as ImpactLevel,
            affectedModules: norm.affectedModules,
            affectedRegimens: norm.affectedRegimens as RegimenLaboral[],
            actionRequired: norm.actionRequired,
            actionDeadline: norm.actionDeadline ? new Date(norm.actionDeadline) : null,
            isProcessed: false,
            status: 'PENDING_REVIEW',
          },
        })
        saved++
      } catch (err) {
        // Unique constraint on externalId — race condition with previous run, safe to skip
        console.warn(`[norm-updates cron] Skipping duplicate externalId "${norm.externalId}"`)
      }
    }

    // ── 5. Notify dev team ─────────────────────────────────────────────────
    if (saved > 0 && devEmail) {
      const criticalCount = classified.filter(n => n.impactLevel === 'CRITICAL').length
      const highCount = classified.filter(n => n.impactLevel === 'HIGH').length

      const normRows = classified
        .map(n => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${n.normCode}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${n.title}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">
              <span style="padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;
                background:${n.impactLevel === 'CRITICAL' ? '#fee2e2' : n.impactLevel === 'HIGH' ? '#fef3c7' : '#dcfce7'};
                color:${n.impactLevel === 'CRITICAL' ? '#991b1b' : n.impactLevel === 'HIGH' ? '#92400e' : '#166534'}">
                ${n.impactLevel}
              </span>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">${n.summary.slice(0, 120)}...</td>
          </tr>`)
        .join('')

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;">
          <div style="background:#1e3a6e;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;">
              COMPLY360 — ${saved} norma${saved > 1 ? 's' : ''} pendiente${saved > 1 ? 's' : ''} de revisión
            </h1>
            <p style="color:#93c5fd;margin:6px 0 0;font-size:14px;">
              Detectadas el ${new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style="background:#f8fafc;padding:16px 24px;border:1px solid #e2e8f0;border-top:none;">
            ${criticalCount > 0 ? `<p style="color:#991b1b;font-weight:600;background:#fee2e2;padding:10px 14px;border-radius:6px;margin:0 0 12px;">⚠️ ${criticalCount} norma${criticalCount > 1 ? 's' : ''} CRITICAL requiere${criticalCount > 1 ? 'n' : ''} atención inmediata</p>` : ''}
            ${highCount > 0 ? `<p style="color:#92400e;font-weight:600;background:#fef3c7;padding:10px 14px;border-radius:6px;margin:0 0 12px;">🔶 ${highCount} norma${highCount > 1 ? 's' : ''} de impacto HIGH</p>` : ''}
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:10px 12px;text-align:left;font-size:13px;color:#475569;">Código</th>
                <th style="padding:10px 12px;text-align:left;font-size:13px;color:#475569;">Título</th>
                <th style="padding:10px 12px;text-align:center;font-size:13px;color:#475569;">Impacto</th>
                <th style="padding:10px 12px;text-align:left;font-size:13px;color:#475569;">Resumen</th>
              </tr>
            </thead>
            <tbody>${normRows}</tbody>
          </table>
          <div style="padding:20px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;text-align:center;">
            <a href="${appUrl}/dashboard/normas?status=PENDING_REVIEW"
               style="display:inline-block;background:#1e3a6e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
              Revisar y aprobar normas →
            </a>
            <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;">
              También puedes usar <code>PATCH /api/admin/norm-updates/:id</code> con <code>{ "action": "approve" }</code> o <code>{ "action": "reject" }</code>
            </p>
          </div>
        </div>`

      await sendEmail({
        to: devEmail,
        subject: `[COMPLY360] ${saved} norma${saved > 1 ? 's' : ''} pendiente${saved > 1 ? 's' : ''} de revisión${criticalCount > 0 ? ` — ${criticalCount} CRITICAL` : ''}`,
        html,
      })

      console.log(`[norm-updates cron] Notified ${devEmail} about ${saved} pending norms`)
    } else if (saved > 0 && !devEmail) {
      console.warn('[norm-updates cron] DEV_TEAM_EMAIL not set — skipping notification email')
    }

    const durationMs = Date.now() - startedAt.getTime()
    console.log(`[norm-updates cron] Done — ${saved}/${rawNorms.length} saved in ${durationMs}ms`)

    return NextResponse.json({
      fetched: rawNorms.length,
      saved,
      durationMs,
      notified: saved > 0 && !!devEmail,
    })
  } catch (error) {
    console.error('[norm-updates cron] Fatal error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
