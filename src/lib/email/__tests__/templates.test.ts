import {
  welcomeEmail,
  alertEmail,
  weeklyDigest,
  complaintNotification,
  workerOnboardingEmail,
  morningBriefingEmail,
  founderDigestEmail,
} from '@/lib/email/templates'

describe('Email Templates', () => {
  // ── welcomeEmail ──────────────────────────────────────────

  describe('welcomeEmail', () => {
    it('returns string containing the company name', () => {
      const html = welcomeEmail('Acme Corp')
      expect(html).toContain('Acme Corp')
    })

    it('contains COMPLY360 branding', () => {
      const html = welcomeEmail('Test Inc')
      expect(html).toContain('COMPLY360')
    })

    it('starts with <!DOCTYPE html>', () => {
      const html = welcomeEmail('Test Inc')
      expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/)
    })

    it('contains a CTA link to the dashboard', () => {
      const html = welcomeEmail('Test Inc')
      expect(html).toContain('Ir al Dashboard')
      expect(html).toContain('https://comply360.pe/dashboard')
    })
  })

  // ── alertEmail ────────────────────────────────────────────

  describe('alertEmail', () => {
    const title = 'Contrato por vencer'
    const desc = 'El contrato de Juan Perez vence en 7 dias'
    const due = '2026-05-01'

    it('includes alertTitle in the output', () => {
      expect(alertEmail(title, desc, due)).toContain(title)
    })

    it('includes alertDescription in the output', () => {
      expect(alertEmail(title, desc, due)).toContain(desc)
    })

    it('includes dueDate in the output', () => {
      expect(alertEmail(title, desc, due)).toContain(due)
    })

    it('contains Alerta de Cumplimiento header', () => {
      expect(alertEmail(title, desc, due)).toContain('Alerta de Cumplimiento')
    })

    it('contains a red border alert box', () => {
      const html = alertEmail(title, desc, due)
      expect(html).toContain('#dc2626')
    })
  })

  // ── weeklyDigest ──────────────────────────────────────────

  describe('weeklyDigest', () => {
    const stats = { workers: 42, openAlerts: 3, score: 75, pendingActions: 5 }

    it('includes the worker count', () => {
      expect(weeklyDigest(stats)).toContain('42')
    })

    it('includes the compliance score', () => {
      expect(weeklyDigest(stats)).toContain('75%')
    })

    it('includes Resumen Semanal header', () => {
      expect(weeklyDigest(stats)).toContain('Resumen Semanal')
    })

    it('uses yellow colour for score 60-79', () => {
      const html = weeklyDigest({ ...stats, score: 65 })
      expect(html).toContain('#ca8a04')
    })

    it('uses green colour for score >= 80', () => {
      const html = weeklyDigest({ ...stats, score: 90 })
      expect(html).toContain('#16a34a')
    })

    it('uses red colour for score < 60', () => {
      const html = weeklyDigest({ ...stats, score: 40 })
      expect(html).toContain('#dc2626')
    })
  })

  // ── complaintNotification ─────────────────────────────────

  describe('complaintNotification', () => {
    it('includes the complaint code', () => {
      const html = complaintNotification('DENUNCIA-2026-001', 'HOSTIGAMIENTO_SEXUAL')
      expect(html).toContain('DENUNCIA-2026-001')
    })

    it('maps complaint type to human-readable label', () => {
      const html = complaintNotification('DENUNCIA-2026-002', 'DISCRIMINACION')
      expect(html).toContain('Discriminacion')
    })

    it('contains legal reference to Ley 27942', () => {
      const html = complaintNotification('DENUNCIA-2026-003', 'OTRO')
      expect(html).toContain('27942')
    })

    it('contains Nueva Denuncia Recibida header', () => {
      const html = complaintNotification('D-001', 'ACOSO_LABORAL')
      expect(html).toContain('Nueva Denuncia Recibida')
    })
  })

  // ── workerOnboardingEmail ─────────────────────────────────

  describe('workerOnboardingEmail', () => {
    const payload = {
      workerName: 'Maria Garcia',
      orgName: 'Tech Solutions SAC',
      documentsCount: 5,
      pendingActions: 3,
    }

    it('includes the worker name', () => {
      expect(workerOnboardingEmail(payload)).toContain('Maria Garcia')
    })

    it('includes the org name', () => {
      expect(workerOnboardingEmail(payload)).toContain('Tech Solutions SAC')
    })

    it('includes documents count', () => {
      expect(workerOnboardingEmail(payload)).toContain('5')
    })

    it('includes pending actions count', () => {
      expect(workerOnboardingEmail(payload)).toContain('3')
    })

    it('contains a link to the worker portal', () => {
      expect(workerOnboardingEmail(payload)).toContain('https://comply360.pe/mi-portal')
    })
  })

  // ── morningBriefingEmail ──────────────────────────────────

  describe('morningBriefingEmail', () => {
    const payload = {
      orgName: 'Minera Andina',
      signedYesterday: 2,
      docsUploadedYesterday: 10,
      criticalAlertsOpen: 1,
      upcomingDeadlines: 3,
      multaEvitadaMes: 15000,
    }

    it('includes the org name', () => {
      expect(morningBriefingEmail(payload)).toContain('Minera Andina')
    })

    it('shows multa evitada when > 0', () => {
      const html = morningBriefingEmail(payload)
      expect(html).toContain('Multa evitada este mes')
    })

    it('shows critical alerts section when > 0', () => {
      const html = morningBriefingEmail(payload)
      expect(html).toContain('critica(s)')
    })

    it('links to alertas when critical alerts open', () => {
      const html = morningBriefingEmail(payload)
      expect(html).toContain('Resolver alertas')
    })

    it('links to dashboard when no critical alerts', () => {
      const html = morningBriefingEmail({ ...payload, criticalAlertsOpen: 0 })
      expect(html).toContain('Ir al dashboard')
    })
  })

  // ── founderDigestEmail ────────────────────────────────────

  describe('founderDigestEmail', () => {
    const data = {
      date: 'Lun 21 abr 2026',
      mrr: 5000,
      mrrDeltaVsPrev30d: 500,
      mrrDeltaPct: 10,
      activeSubscriptions: 12,
      trialingCount: 3,
      newOrgs7d: 2,
      activationRate7d: 66,
      dau: 8,
      mau: 25,
      stickinessPct: 32,
      trialsExpiring7d: 1,
      churnRiskOrgs: 0,
      cancelledLast30d: 0,
      aiVerifyAutoVerified30d: 45,
      copilotQueries30d: 120,
      topEvents7d: [
        { action: 'worker.created', count: 30 },
        { action: 'contract.signed', count: 12 },
      ],
      narrative: ['MRR sube 10% m/m', 'Zero churn este mes'],
      adminUrl: 'https://comply360.pe/admin',
    }

    it('includes the date', () => {
      expect(founderDigestEmail(data)).toContain('Lun 21 abr 2026')
    })

    it('contains Founder Digest branding', () => {
      expect(founderDigestEmail(data)).toContain('Founder Digest')
    })

    it('includes narrative items', () => {
      const html = founderDigestEmail(data)
      expect(html).toContain('MRR sube 10% m/m')
      expect(html).toContain('Zero churn este mes')
    })

    it('includes top events', () => {
      const html = founderDigestEmail(data)
      expect(html).toContain('worker.created')
      expect(html).toContain('contract.signed')
    })

    it('uses its own layout (not the standard one) with dark background', () => {
      const html = founderDigestEmail(data)
      expect(html).toContain('#09090b')
    })
  })

  // ── Cross-cutting ─────────────────────────────────────────

  describe('all templates', () => {
    it('all return strings starting with <!DOCTYPE html>', () => {
      const templates = [
        welcomeEmail('Test'),
        alertEmail('T', 'D', '2026-01-01'),
        weeklyDigest({ workers: 1, openAlerts: 0, score: 50, pendingActions: 0 }),
        complaintNotification('C-001', 'OTRO'),
        workerOnboardingEmail({
          workerName: 'W',
          orgName: 'O',
          documentsCount: 0,
          pendingActions: 0,
        }),
        morningBriefingEmail({
          orgName: 'O',
          signedYesterday: 0,
          docsUploadedYesterday: 0,
          criticalAlertsOpen: 0,
          upcomingDeadlines: 0,
          multaEvitadaMes: 0,
        }),
        founderDigestEmail({
          date: 'D',
          mrr: 0,
          mrrDeltaVsPrev30d: 0,
          mrrDeltaPct: null,
          activeSubscriptions: 0,
          trialingCount: 0,
          newOrgs7d: 0,
          activationRate7d: null,
          dau: 0,
          mau: 0,
          stickinessPct: null,
          trialsExpiring7d: 0,
          churnRiskOrgs: 0,
          cancelledLast30d: 0,
          aiVerifyAutoVerified30d: 0,
          copilotQueries30d: 0,
          topEvents7d: [],
          narrative: [],
          adminUrl: '',
        }),
      ]

      for (const html of templates) {
        expect(html.trimStart().startsWith('<!DOCTYPE html>')).toBe(true)
      }
    })

    it('handles special characters in companyName', () => {
      const html = welcomeEmail('Empresa "XYZ" & Cia')
      expect(html).toContain('Empresa "XYZ" & Cia')
    })
  })
})
