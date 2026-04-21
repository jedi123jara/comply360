/**
 * SUNAT SOL Portal Scraper via Browserless.io
 *
 * Connects to a remote headless browser (Browserless BaaS V2) to:
 * 1. Login to SUNAT SOL portal
 * 2. Extract company data (RUC info, representative, address)
 * 3. Navigate to T-REGISTRO and extract registered workers
 * 4. Logout cleanly
 *
 * SECURITY:
 * - Credentials are NEVER logged
 * - Browser session is destroyed after each use
 * - Read-only operations — NEVER modifies SUNAT data
 * - Timeout protection (60s max per operation)
 */

import puppeteer from 'puppeteer-core'

// ── Types ────────────────────────────────────────────────────────────────

export interface SunatSolData {
  // Company info
  ruc: string
  razonSocial: string
  nombreComercial: string | null
  estado: string
  condicion: string
  direccion: string
  actividadEconomica: string
  representanteLegal: string | null
  tipoContribuyente: string
  fechaInscripcion: string | null
  // T-REGISTRO workers (if accessible)
  workers: TRegistroWorker[]
  // Metadata
  extractedAt: string
  source: 'sunat_sol_scraper'
}

export interface TRegistroWorker {
  dni: string
  apellidos: string
  nombres: string
  fechaIngreso: string | null
  situacion: string // ACTIVO, BAJA
  regimenLaboral: string | null
}

export interface ScraperResult {
  ok: boolean
  data?: SunatSolData
  error?: string
  duration?: number
}

// ── Browserless Connection ───────────────────────────────────────────────

function getBrowserlessUrl(): string {
  const apiKey = process.env.BROWSERLESS_API_KEY
  if (!apiKey) {
    throw new Error('BROWSERLESS_API_KEY no configurado')
  }
  // Browserless BaaS V2 WebSocket endpoint
  return `wss://production-sfo.browserless.io?token=${apiKey}`
}

// ── Main Scraper ─────────────────────────────────────────────────────────

export async function scrapeSupanat(
  ruc: string,
  solUser: string,
  solPassword: string,
): Promise<ScraperResult> {
  const startTime = Date.now()
  let browser: Awaited<ReturnType<typeof puppeteer.connect>> | null = null

  try {
    // Connect to remote browser
    browser = await puppeteer.connect({
      browserWSEndpoint: getBrowserlessUrl(),
    })

    const page = await browser.newPage()

    // Set reasonable timeout
    page.setDefaultTimeout(30000)
    page.setDefaultNavigationTimeout(30000)

    // Set a real browser User-Agent to avoid SUNAT blocking
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    )
    await page.setViewport({ width: 1366, height: 768 })

    // ── Step 1: Login to SUNAT SOL ──────────────────────────────────
    // Use the direct SOL login URL
    await page.goto('https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    }).catch(() => {
      // Fallback: try alternative URL
    })

    // Try alternative login page if main doesn't load
    const pageUrl = page.url()
    if (!pageUrl.includes('sunat.gob.pe')) {
      await page.goto('https://www.sunat.gob.pe/ol-ti-itmoddatruc/MenuInternet.htm', {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      }).catch(() => {})
    }

    // Try to find and fill login fields
    // SUNAT SOL login fields: txtRuc, txtUsuario, txtContrasena
    try {
      await page.waitForSelector('#txtRuc, input[name="txtRuc"]', { timeout: 10000 })
      await page.type('#txtRuc, input[name="txtRuc"]', ruc, { delay: 50 })
      await page.type('#txtUsuario, input[name="txtUsuario"]', solUser, { delay: 50 })
      await page.type('#txtContrasena, input[name="txtContrasena"]', solPassword, { delay: 50 })
      await page.click('#btnAceptar, input[type="submit"]')
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })
    } catch {
      // Alternative login form structure
      const frames = page.frames()
      for (const frame of frames) {
        try {
          const rucInput = await frame.$('#txtRuc')
          if (rucInput) {
            await frame.type('#txtRuc', ruc, { delay: 50 })
            await frame.type('#txtUsuario', solUser, { delay: 50 })
            await frame.type('#txtContrasena', solPassword, { delay: 50 })
            await frame.click('#btnAceptar')
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })
            break
          }
        } catch { continue }
      }
    }

    // Check if login succeeded
    const currentUrl = page.url()
    if (currentUrl.includes('login') || currentUrl.includes('error')) {
      return {
        ok: false,
        error: 'Login fallido. Verifique RUC, usuario y clave SOL.',
        duration: Date.now() - startTime,
      }
    }

    // ── Step 2: Extract company data ────────────────────────────────
    // Navigate to Consulta RUC
    const companyData: Partial<SunatSolData> = {
      ruc,
      razonSocial: '',
      nombreComercial: null,
      estado: '',
      condicion: '',
      direccion: '',
      actividadEconomica: '',
      representanteLegal: null,
      tipoContribuyente: '',
      fechaInscripcion: null,
    }

    try {
      // Try to extract data from the main page or navigate to consulta
      const pageText = await page.evaluate(() => document.body.innerText)

      // Extract company name from page if visible
      const razonMatch = pageText.match(/Bienvenido,\s*(.+?)(?:\n|$)/)
      if (razonMatch) {
        companyData.razonSocial = razonMatch[1].trim()
      }

      // Try navigating to ficha RUC
      await page.goto(`https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias`, {
        waitUntil: 'networkidle2',
        timeout: 15000,
      }).catch(() => {})

      // Try to extract RUC details from consulta page
      const fichaText = await page.evaluate(() => document.body.innerText).catch(() => '')

      if (fichaText.includes('Nombre Comercial') || fichaText.includes('Domicilio Fiscal')) {
        // Parse the ficha RUC text
        const extractField = (label: string): string => {
          const regex = new RegExp(`${label}[:\\s]*([^\\n]+)`, 'i')
          const match = fichaText.match(regex)
          return match?.[1]?.trim() || ''
        }

        companyData.razonSocial = companyData.razonSocial || extractField('Nombre o Raz.n Social')
        companyData.nombreComercial = extractField('Nombre Comercial') || null
        companyData.estado = extractField('Estado del Contribuyente')
        companyData.condicion = extractField('Condici.n del Contribuyente')
        companyData.direccion = extractField('Domicilio Fiscal')
        companyData.actividadEconomica = extractField('Actividad Econ.mica')
        companyData.tipoContribuyente = extractField('Tipo Contribuyente')
        companyData.representanteLegal = extractField('Representante Legal') || null
        companyData.fechaInscripcion = extractField('Fecha de Inscripci.n') || null
      }
    } catch {
      // Continue even if company data extraction fails
    }

    // ── Step 3: Extract T-REGISTRO workers ──────────────────────────
    const workers: TRegistroWorker[] = []

    try {
      // Navigate back to main menu
      await page.goto('https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm', {
        waitUntil: 'networkidle2',
        timeout: 15000,
      })

      // T-REGISTRO is usually under "Mi RUC y Otros Registros" > "T-REGISTRO"
      // Look for T-REGISTRO link
      const tRegistroLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'))
        const link = links.find(a => a.textContent?.includes('T-REGISTRO'))
        return link?.href || null
      })

      if (tRegistroLink) {
        await page.goto(tRegistroLink, { waitUntil: 'networkidle2', timeout: 15000 })

        // Try to extract worker table data
        const tableData = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('table tr'))
          return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'))
            return cells.map(cell => cell.textContent?.trim() || '')
          }).filter(row => row.length >= 3)
        })

        // Parse table rows into workers
        for (const row of tableData) {
          // T-REGISTRO table typically: DNI | Apellidos | Nombres | Fecha Ingreso | Situacion
          const dni = row.find(cell => /^\d{8}$/.test(cell))
          if (dni) {
            workers.push({
              dni,
              apellidos: row[1] || '',
              nombres: row[2] || '',
              fechaIngreso: row.find(cell => /\d{2}\/\d{2}\/\d{4}/.test(cell)) || null,
              situacion: row.find(cell => /ACTIVO|BAJA/i.test(cell)) || 'ACTIVO',
              regimenLaboral: row.find(cell => /GENERAL|MYPE|AGRARIO/i.test(cell)) || null,
            })
          }
        }
      }
    } catch {
      // T-REGISTRO extraction is optional — company data alone is valuable
    }

    // ── Step 4: Logout ──────────────────────────────────────────────
    try {
      await page.evaluate(() => {
        const logoutBtn = document.querySelector('a[href*="logout"], a[href*="Salir"], #btnSalir')
        if (logoutBtn instanceof HTMLElement) logoutBtn.click()
      })
      await page.waitForNavigation({ timeout: 5000 }).catch(() => {})
    } catch {
      // Logout failure is not critical
    }

    const result: SunatSolData = {
      ruc,
      razonSocial: companyData.razonSocial || '',
      nombreComercial: companyData.nombreComercial || null,
      estado: companyData.estado || '',
      condicion: companyData.condicion || '',
      direccion: companyData.direccion || '',
      actividadEconomica: companyData.actividadEconomica || '',
      representanteLegal: companyData.representanteLegal || null,
      tipoContribuyente: companyData.tipoContribuyente || '',
      fechaInscripcion: companyData.fechaInscripcion || null,
      workers,
      extractedAt: new Date().toISOString(),
      source: 'sunat_sol_scraper',
    }

    return {
      ok: true,
      data: result,
      duration: Date.now() - startTime,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error desconocido al navegar portal SUNAT',
      duration: Date.now() - startTime,
    }
  } finally {
    // ALWAYS close browser to free Browserless units
    if (browser) {
      try { await browser.close() } catch { /* ignore */ }
    }
  }
}
