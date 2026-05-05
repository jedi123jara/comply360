/**
 * Customer Journey QA spec — simula a una PYME peruana real recorriendo el happy path
 * completo de COMPLY360. NO es un test que tenga que pasar verde — es un crawler con
 * screenshots para auditar UX/copy. Cada paso intenta avanzar; si algo rompe, queda
 * registrado en findings[] y el siguiente paso se ejecuta igual.
 */
import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const EMAIL = 'inveraduaneras@gmail.com'
const PASSWORD = 'K102007lia'

const RUC = '20512345674'
const RAZON_SOCIAL = 'Inversiones Aduaneras del Pacífico SAC'

const SCREENSHOT_DIR = 'test-results/journey'

interface StepResult {
  step: number
  name: string
  status: 'OK' | 'FAIL' | 'PARTIAL' | 'SKIP'
  screenshot: string
  notes: string[]
  bugs: string[]
}

const results: StepResult[] = []
const copyIssues: { page: string; text: string; issue: string }[] = []
let workerId: string | null = null

// patrones de voseo argentino que buscamos como anti-patrón
const VOSEO_PATTERNS = [
  /\btenés\b/i,
  /\bpodés\b/i,
  /\bquerés\b/i,
  /\bsabés\b/i,
  /\bhacés\b/i,
  /\bvenís\b/i,
  /\bsalís\b/i,
  /\bvení\b/i,
  /\bandá\b/i,
  /\bmirá\b/i,
  /\bdecime\b/i,
  /\bcontame\b/i,
  /\bfijate\b/i,
  /\bdale\b/i,
  /\bponele\b/i,
  /\bdejá\b/i,
  /\bhacé\b/i,
  /\babrí\b/i,
  /\bcorré\b/i,
  /\bche\b/i,
  /\bboludo\b/i,
  /\bpibe\b/i,
  /\bguita\b/i,
]

async function snap(page: Page, name: string) {
  const file = path.join(SCREENSHOT_DIR, name + '.png')
  try {
    await page.screenshot({ path: file, fullPage: true })
  } catch (e) {
    // ignore
  }
  return file
}

async function scanCopy(page: Page, label: string, notes: string[]) {
  try {
    const text = await page.evaluate(() => document.body.innerText || '')
    for (const re of VOSEO_PATTERNS) {
      const m = text.match(re)
      if (m) {
        const idx = text.indexOf(m[0])
        const ctx = text.slice(Math.max(0, idx - 40), Math.min(text.length, idx + 60)).replace(/\s+/g, ' ').trim()
        copyIssues.push({ page: label, text: ctx, issue: `Voseo argentino detectado: "${m[0]}"` })
        notes.push(`Voseo "${m[0]}" en ${label}: …${ctx}…`)
      }
    }
    // copy en inglés sospechoso
    const englishHints = [/\bSign in\b/, /\bLog in\b/, /\bSubmit\b/, /\bLoading\b/, /\bSign up\b/]
    for (const re of englishHints) {
      const m = text.match(re)
      if (m) {
        // sólo flagea si el resto del texto es claramente español
        if (/[áéíóúñ]|[Pp]eruana?|[Ee]mpresa|[Tt]rabajador/.test(text)) {
          copyIssues.push({ page: label, text: m[0], issue: `Copy en inglés sin traducir: "${m[0]}"` })
        }
      }
    }
  } catch {
    // ignore
  }
}

test.describe.serial('Customer journey — PYME peruana', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  })

  test.afterAll(async () => {
    // Reporte se genera al final
    const totalSteps = results.length
    const ok = results.filter(r => r.status === 'OK').length
    const partial = results.filter(r => r.status === 'PARTIAL').length
    const fail = results.filter(r => r.status === 'FAIL').length
    const skip = results.filter(r => r.status === 'SKIP').length
    const allBugs = results.flatMap(r => r.bugs.map(b => ({ step: r.name, bug: b })))

    const md: string[] = []
    md.push('# Reporte QA — Customer Journey COMPLY360')
    md.push('')
    md.push(`**Fecha**: ${new Date().toISOString()}`)
    md.push(`**Tester**: QA Bot (Playwright)`)
    md.push(`**Perfil simulado**: PYME peruana — Inversiones Aduaneras del Pacífico SAC`)
    md.push('')
    md.push('## Resumen ejecutivo')
    md.push('')
    md.push(`- Total de pasos: ${totalSteps}`)
    md.push(`- ✅ OK: ${ok}`)
    md.push(`- 🟡 Parcial: ${partial}`)
    md.push(`- ❌ Fallidos: ${fail}`)
    md.push(`- ⏭️ Skipped: ${skip}`)
    md.push(`- 🐞 Bugs detectados: ${allBugs.length}`)
    md.push(`- ✏️ Issues de copy/idioma: ${copyIssues.length}`)
    md.push('')
    md.push('## Detalle por paso')
    md.push('')
    for (const r of results) {
      const icon = r.status === 'OK' ? '✅' : r.status === 'PARTIAL' ? '🟡' : r.status === 'FAIL' ? '❌' : '⏭️'
      md.push(`### ${icon} Paso ${String(r.step).padStart(2, '0')} — ${r.name}`)
      md.push('')
      md.push(`- **Estado**: ${r.status}`)
      md.push(`- **Screenshot**: \`${r.screenshot}\``)
      if (r.notes.length) {
        md.push(`- **Notas**:`)
        for (const n of r.notes) md.push(`  - ${n}`)
      }
      if (r.bugs.length) {
        md.push(`- **Bugs**:`)
        for (const b of r.bugs) md.push(`  - ${b}`)
      }
      md.push('')
    }
    md.push('## Bugs y fricciones')
    md.push('')
    if (allBugs.length === 0) {
      md.push('_Sin bugs reportados._')
    } else {
      for (const b of allBugs) {
        md.push(`- **[${b.step}]** ${b.bug}`)
      }
    }
    md.push('')
    md.push('## Copy en mal castellano (voseo / inglés / typos)')
    md.push('')
    if (copyIssues.length === 0) {
      md.push('_No se detectó voseo argentino ni copy en inglés en las páginas visitadas._ ✨')
    } else {
      for (const c of copyIssues) {
        md.push(`- **[${c.page}]** ${c.issue} — contexto: \`${c.text}\``)
      }
    }
    md.push('')
    md.push('## Sugerencias de UX')
    md.push('')
    md.push('Generadas a partir de los hallazgos del crawler — ver detalle por paso arriba.')
    md.push('')
    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'REPORTE.md'), md.join('\n'), 'utf8')
  })

  test('01 — Login con Clerk', async ({ page }) => {
    const r: StepResult = { step: 1, name: 'Login', status: 'OK', screenshot: '', notes: [], bugs: [] }
    try {
      await page.goto('/sign-in', { waitUntil: 'domcontentloaded', timeout: 30_000 })
      r.screenshot = await snap(page, '01-signin-loaded')
      await scanCopy(page, '/sign-in', r.notes)

      // Clerk v7: identifier + continue + password
      const idInput = page.locator('input[name="identifier"], input[type="email"], input[name="emailAddress"]').first()
      await idInput.waitFor({ state: 'visible', timeout: 15_000 })
      await idInput.fill(EMAIL)
      await snap(page, '01-signin-email-filled')

      // FLAG: Clerk muestra UI en inglés en vez de español — bug de marca peruana
      const bodyTextSignin = await page.locator('body').innerText().catch(() => '')
      if (/Sign in|Continue|Email address|Welcome back/.test(bodyTextSignin) && !/Iniciar sesión|Correo electrónico/.test(bodyTextSignin)) {
        r.bugs.push('CRÍTICO: pantalla de Sign-In de Clerk está en INGLÉS ("Sign in to COMPLY360", "Continue", "Email address", "Sign up"). Falta configurar localization es-PE en ClerkProvider.')
      }
      if (/intelligente/i.test(bodyTextSignin)) {
        r.bugs.push('TYPO en tagline público: dice "intelligente" en vez de "inteligente" ("Tu escudo intelligente contra multas SUNAFIL")')
      }

      const continueBtn = page.locator('button:has-text("Continuar"), button:has-text("Continue"), button[type="submit"]').first()
      if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await continueBtn.click().catch(() => {})
      }
      await page.waitForTimeout(1500)

      const pwInput = page.locator('input[name="password"], input[type="password"]').first()
      const pwVisible = await pwInput.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true).catch(() => false)
      if (!pwVisible) {
        r.bugs.push('Tras enviar email no apareció campo de password. Posible bloqueo de Clerk (rate-limit, captcha, verificación email).')
        await snap(page, '01-signin-no-password-prompt')
        results.push(r)
        return
      }
      await pwInput.fill(PASSWORD)
      await snap(page, '01-signin-password-filled')

      const submitBtn = page.locator('button:has-text("Continuar"), button:has-text("Continue"), button[type="submit"]').first()
      await submitBtn.click().catch(() => {})

      // Esperar a salir de /sign-in (timeout más corto)
      const left = await page.waitForURL(url => !url.toString().includes('/sign-in'), { timeout: 25_000 }).then(() => true).catch(() => false)
      if (!left) {
        r.status = 'PARTIAL'
        r.bugs.push('Tras submit del password no hubo redirect fuera de /sign-in en 25s.')
      }
      r.notes.push(`Post-login URL: ${page.url()}`)
      r.screenshot = await snap(page, '01-signin-after-submit')
      await scanCopy(page, page.url(), r.notes)
    } catch (e: any) {
      r.status = 'FAIL'
      r.bugs.push(`Login falló: ${e.message?.slice(0, 200)}`)
      r.screenshot = await snap(page, '01-signin-error')
    }
    results.push(r)
  })

  test('02 — Onboarding wizard', async ({ page }) => {
    const r: StepResult = { step: 2, name: 'Onboarding wizard', status: 'OK', screenshot: '', notes: [], bugs: [] }
    try {
      await page.goto('/dashboard/onboarding', { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await page.waitForTimeout(2000) // dejar que el wizard fetchee /api/onboarding
      r.screenshot = await snap(page, '02-onboarding-loaded')
      await scanCopy(page, '/dashboard/onboarding', r.notes)

      // Si ya está completado, el wizard no se monta — saltamos
      const wizardVisible = await page.locator('text=/Bienvenido a COMPLY360|Datos de empresa|Régimen laboral/').first().isVisible().catch(() => false)
      if (!wizardVisible) {
        r.status = 'SKIP'
        r.notes.push('Wizard no visible — onboarding probablemente ya completado para esta org')
        results.push(r)
        return
      }

      // Step 1 — Datos empresa
      const rucInput = page.locator('input[placeholder*="20"], input[placeholder*="RUC"], input[maxlength="11"]').first()
      if (await rucInput.isVisible().catch(() => false)) {
        await rucInput.fill(RUC)
        await page.waitForTimeout(2500) // debounce SUNAT 500ms + lookup
      } else {
        r.notes.push('No se encontró input de RUC con selector estándar')
      }

      // Razon social — si SUNAT no rellenó, lo escribimos
      const razonInput = page.locator('input').filter({ hasText: '' }).nth(1)
      try {
        const allTextInputs = page.locator('input[type="text"]')
        const count = await allTextInputs.count()
        for (let i = 0; i < count; i++) {
          const el = allTextInputs.nth(i)
          const placeholder = await el.getAttribute('placeholder').catch(() => '')
          const val = await el.inputValue().catch(() => '')
          if ((placeholder?.toLowerCase().includes('razón') || placeholder?.toLowerCase().includes('razon') || placeholder?.toLowerCase().includes('social')) && !val) {
            await el.fill(RAZON_SOCIAL)
            break
          }
        }
      } catch {}

      await snap(page, '02-onboarding-step1-filled')

      // Sector — combobox o select
      const sectorTrigger = page.getByRole('combobox').first()
      if (await sectorTrigger.isVisible().catch(() => false)) {
        await sectorTrigger.click().catch(() => {})
        await page.waitForTimeout(400)
        const opt = page.getByRole('option', { name: /Transporte|Logística|Comercio|Servicios/ }).first()
        if (await opt.isVisible().catch(() => false)) await opt.click().catch(() => {})
      }
      await page.waitForTimeout(300)

      // Tamaño — combobox 2
      const sizeTrigger = page.getByRole('combobox').nth(1)
      if (await sizeTrigger.isVisible().catch(() => false)) {
        await sizeTrigger.click().catch(() => {})
        await page.waitForTimeout(400)
        const opt = page.getByRole('option', { name: /11 a 50/ }).first()
        if (await opt.isVisible().catch(() => false)) await opt.click().catch(() => {})
      }
      await snap(page, '02-onboarding-step1-complete')

      // Continuar
      const next = page.locator('button:has-text("Continuar"), button:has-text("Siguiente")').first()
      if (await next.isVisible().catch(() => false)) await next.click().catch(() => {})
      await page.waitForTimeout(800)
      await snap(page, '02-onboarding-step2')
      await scanCopy(page, 'onboarding step2', r.notes)

      // Step 2 — régimen GENERAL ya seleccionado por default. Avanzar.
      const next2 = page.locator('button:has-text("Continuar"), button:has-text("Siguiente")').first()
      if (await next2.isVisible().catch(() => false)) await next2.click().catch(() => {})
      await page.waitForTimeout(600)
      await snap(page, '02-onboarding-step3')

      // Step 3 — alertas (opcional, podemos saltar)
      const next3 = page.locator('button:has-text("Continuar"), button:has-text("Siguiente"), button:has-text("Saltar")').first()
      if (await next3.isVisible().catch(() => false)) await next3.click().catch(() => {})
      await page.waitForTimeout(600)
      await snap(page, '02-onboarding-step4-confirm')

      // Step 4 — confirmación + submit
      const submitBtn = page.locator('button:has-text("Comenzar"), button:has-text("Finalizar"), button:has-text("Crear"), button:has-text("Empezar")').first()
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click().catch(() => {})
        await page.waitForTimeout(3500)
      }
      r.screenshot = await snap(page, '02-onboarding-done')
      await scanCopy(page, 'onboarding final', r.notes)
    } catch (e: any) {
      r.status = 'PARTIAL'
      r.bugs.push(`Onboarding wizard error/parcial: ${e.message?.slice(0, 200)}`)
      r.screenshot = await snap(page, '02-onboarding-error')
    }
    results.push(r)
  })

  test('03 — Crear trabajador', async ({ page }) => {
    test.setTimeout(60_000)
    const r: StepResult = { step: 3, name: 'Crear trabajador', status: 'OK', screenshot: '', notes: [], bugs: [] }
    try {
      await page.goto('/dashboard/trabajadores/nuevo', { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await page.waitForTimeout(1500)
      r.screenshot = await snap(page, '03-worker-form-loaded')
      await scanCopy(page, '/dashboard/trabajadores/nuevo', r.notes)

      // DNI
      const dniInput = page.locator('input[placeholder="12345678"], input[placeholder*="DNI"], input[maxlength="8"]').first()
      if (await dniInput.isVisible().catch(() => false)) {
        await dniInput.fill('45678912')
        await page.waitForTimeout(1500) // RENIEC lookup
      } else {
        r.bugs.push('No se encontró input de DNI')
      }

      // Detectar typos ortográficos comunes en labels del form
      const formText = await page.locator('body').innerText().catch(() => '')
      const labelTypos: { wrong: string; right: string }[] = [
        { wrong: 'Genero', right: 'Género' },
        { wrong: 'Telefono', right: 'Teléfono' },
        { wrong: 'Direccion', right: 'Dirección' },
        { wrong: 'Region', right: 'Región' },
      ]
      for (const t of labelTypos) {
        const re = new RegExp(`\\b${t.wrong}\\b`, 'g')
        if (re.test(formText) && !new RegExp(`\\b${t.right}\\b`).test(formText)) {
          r.bugs.push(`Typo/falta tilde en label del form de trabajador: "${t.wrong}" → debería ser "${t.right}"`)
        }
      }

      const firstName = page.locator('input[placeholder="Juan Carlos"]').first()
      if (await firstName.isVisible({ timeout: 2000 }).catch(() => false)) {
        const v = await firstName.inputValue().catch(() => '')
        if (!v) await firstName.fill('María Elena').catch(() => {})
      }
      const lastName = page.locator('input[placeholder="Perez Garcia"], input[placeholder*="Apellido"]').first()
      if (await lastName.isVisible({ timeout: 2000 }).catch(() => false)) {
        const v = await lastName.inputValue().catch(() => '')
        if (!v) await lastName.fill('Quispe Rojas').catch(() => {})
      }
      const email = page.locator('input[type="email"]').first()
      if (await email.isVisible({ timeout: 2000 }).catch(() => false)) await email.fill('maria.quispe@test.pe').catch(() => {})
      const phone = page.locator('input[placeholder="987654321"]').first()
      if (await phone.isVisible({ timeout: 2000 }).catch(() => false)) await phone.fill('987654321').catch(() => {})
      await snap(page, '03-worker-form-personal-filled')

      // Cambiar a tab "Datos Laborales" si existe
      const tabLab = page.locator('button:has-text("Datos Laborales"), [role="tab"]:has-text("Datos Laborales")').first()
      if (await tabLab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tabLab.click({ timeout: 3000 }).catch(() => {})
        await page.waitForTimeout(800)
        await snap(page, '03-worker-tab-laborales')
      }

      const position = page.locator('input[placeholder="Analista de RRHH"]').first()
      if (await position.isVisible({ timeout: 2000 }).catch(() => false)) await position.fill('Asistente administrativa').catch(() => {})
      const dept = page.locator('input[placeholder="Recursos Humanos"]').first()
      if (await dept.isVisible({ timeout: 2000 }).catch(() => false)) await dept.fill('Operaciones').catch(() => {})

      // Sueldo — input numérico/decimal
      const salaryInput = page.locator('input[placeholder="1130.00"], input[type="number"]').first()
      if (await salaryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await salaryInput.fill('2500').catch(() => {})
      }

      // Fecha ingreso — buscar input date que NO sea fecha nacimiento (por label cercano)
      const dateInputs = page.locator('input[type="date"]')
      const dCount = await dateInputs.count()
      const today = new Date().toISOString().slice(0, 10)
      // El último input date suele ser fecha de ingreso
      if (dCount > 0) {
        await dateInputs.nth(dCount - 1).fill(today).catch(() => {})
      }
      await snap(page, '03-worker-form-filled')

      // Selects (régimen, tipo contrato) — usar selects nativos si los hay
      const selects = page.locator('select')
      const sCount = await selects.count()
      r.notes.push(`Selects nativos encontrados: ${sCount}`)

      // Tipo de contrato — buscar select con PLAZO_FIJO (con timeout corto)
      for (let i = 0; i < sCount; i++) {
        try {
          const sel = selects.nth(i)
          const options = await sel.locator('option').allTextContents()
          if (options.some(o => /Plazo Fijo|PLAZO_FIJO/i.test(o))) {
            await sel.selectOption('PLAZO_FIJO').catch(() => {})
            r.notes.push(`Select tipo contrato seteado a PLAZO_FIJO en select #${i}`)
            break
          }
        } catch { /* skip */ }
      }

      await snap(page, '03-worker-form-pre-submit')

      // Submit
      const submitBtn = page.locator('button:has-text("Guardar"), button:has-text("Crear trabajador"), button:has-text("Registrar"), button[type="submit"]').first()
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click({ timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(4500)
      } else {
        r.bugs.push('No se encontró botón de Guardar/Crear trabajador')
      }
      r.screenshot = await snap(page, '03-worker-after-submit')

      // Capturar workerId del URL
      const url = page.url()
      const match = url.match(/trabajadores\/([a-z0-9]+)(?:$|[/?])/i)
      if (match && match[1] !== 'nuevo') {
        workerId = match[1]
        r.notes.push(`Worker creado con ID: ${workerId}`)
      } else {
        r.notes.push(`URL post-submit: ${url} — workerId no capturado`)
        // Intentar buscar en lista
        await page.goto('/dashboard/trabajadores', { waitUntil: 'domcontentloaded' }).catch(() => {})
        await page.waitForTimeout(1500)
        const link = page.locator('a[href*="/dashboard/trabajadores/"]').filter({ hasText: /Quispe|María|45678912/ }).first()
        if (await link.isVisible().catch(() => false)) {
          const href = await link.getAttribute('href')
          if (href) {
            const m2 = href.match(/trabajadores\/([a-z0-9]+)/i)
            if (m2) {
              workerId = m2[1]
              r.notes.push(`Worker encontrado en lista, ID: ${workerId}`)
            }
          }
        }
      }
      if (!workerId) {
        r.status = 'PARTIAL'
        r.bugs.push('No se pudo capturar workerId tras crear trabajador')
      }
      await scanCopy(page, 'worker form result', r.notes)
    } catch (e: any) {
      r.status = 'FAIL'
      r.bugs.push(`Crear trabajador falló: ${e.message?.slice(0, 200)}`)
      r.screenshot = await snap(page, '03-worker-error')
    }
    results.push(r)
  })

  test('04 — Verificar legajo del trabajador', async ({ page }) => {
    test.setTimeout(45_000)
    const r: StepResult = { step: 4, name: 'Verificar legajo', status: 'OK', screenshot: '', notes: [], bugs: [] }
    try {
      if (!workerId) {
        // intentar agarrar primer trabajador
        await page.goto('/dashboard/trabajadores', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
        await page.waitForTimeout(1500)
        await snap(page, '04-trabajadores-list')
        const firstLink = page.locator('a[href^="/dashboard/trabajadores/"]').filter({ hasNotText: /nuevo|Nuevo|Importar/ }).first()
        if (await firstLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          const href = await firstLink.getAttribute('href').catch(() => null)
          if (href) {
            const m = href.match(/trabajadores\/([a-z0-9_-]+)/i)
            if (m && m[1] !== 'nuevo') workerId = m[1]
          }
        }
      }
      if (!workerId) {
        r.status = 'SKIP'
        r.bugs.push('Paso 3 no creó trabajador (no se capturó workerId, lista vacía o el form falló silenciosamente)')
        r.notes.push('Sin workerId disponible — paso saltado')
        r.screenshot = await snap(page, '04-skip-no-worker')
        results.push(r)
        return
      }

      await page.goto(`/dashboard/trabajadores/${workerId}`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(2000)
      r.screenshot = await snap(page, '04-worker-profile')
      await scanCopy(page, `/dashboard/trabajadores/${workerId}`, r.notes)

      // Click en tab Legajo
      const legajoTab = page.locator('button:has-text("Legajo"), a:has-text("Legajo"), [role="tab"]:has-text("Legajo")').first()
      if (await legajoTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await legajoTab.click({ timeout: 3000 }).catch(() => {})
        await page.waitForTimeout(1500)
        await snap(page, '04-worker-legajo-tab')
        await scanCopy(page, 'worker legajo tab', r.notes)
      } else {
        r.bugs.push('Tab Legajo no encontrada en el worker profile')
      }

      // Buscar el legajoScore en el texto plano
      const profileText = await page.locator('body').innerText().catch(() => '')
      const scoreMatch = profileText.match(/(\d{1,3})\s*%\s*(de\s+)?(legajo|completitud)/i) ||
                         profileText.match(/(legajo|completitud)\s*[:\-]?\s*(\d{1,3})\s*%/i)
      if (scoreMatch) r.notes.push(`Score legajo visible: ${scoreMatch[0]}`)
      else r.notes.push('Score de legajo no detectado claramente en la página')
    } catch (e: any) {
      r.status = 'PARTIAL'
      r.bugs.push(`Verificar legajo falló: ${e.message?.slice(0, 200)}`)
      r.screenshot = await snap(page, '04-legajo-error')
    }
    results.push(r)
  })

  test('05 — Generar contrato', async ({ page }) => {
    test.setTimeout(40_000)
    const r: StepResult = { step: 5, name: 'Generar contrato', status: 'OK', screenshot: '', notes: [], bugs: [] }
    try {
      await page.goto('/dashboard/contratos', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      r.screenshot = await snap(page, '05-contratos-list')
      await scanCopy(page, '/dashboard/contratos', r.notes)

      const newBtn = page.locator('a:has-text("Nuevo"), button:has-text("Nuevo"), a:has-text("Generar"), button:has-text("Generar"), a:has-text("Crear")').first()
      if (await newBtn.isVisible().catch(() => false)) {
        await newBtn.click().catch(() => {})
        await page.waitForTimeout(2000)
        await snap(page, '05-contrato-new-form')
        await scanCopy(page, 'contrato nuevo', r.notes)
      } else {
        r.notes.push('No se encontró botón "Nuevo contrato" obvio')
      }
      r.screenshot = await snap(page, '05-contrato-final-state')
    } catch (e: any) {
      r.status = 'PARTIAL'
      r.bugs.push(`Generar contrato falló: ${e.message?.slice(0, 200)}`)
      r.screenshot = await snap(page, '05-contrato-error')
    }
    results.push(r)
  })

  test('06 — Calculadora CTS', async ({ page }) => {
    test.setTimeout(40_000)
    const r: StepResult = { step: 6, name: 'Calculadora CTS', status: 'OK', screenshot: '', notes: [], bugs: [] }
    try {
      await page.goto('/dashboard/calculadoras/cts', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      r.screenshot = await snap(page, '06-cts-loaded')
      await scanCopy(page, '/dashboard/calculadoras/cts', r.notes)

      // Buscar input numérico de sueldo
      const numericInputs = page.locator('input[type="number"]')
      const cnt = await numericInputs.count()
      if (cnt > 0) {
        await numericInputs.first().fill('2500')
      }
      await page.waitForTimeout(500)
      const calcBtn = page.locator('button:has-text("Calcular"), button:has-text("Calcular CTS"), button[type="submit"]').first()
      if (await calcBtn.isVisible().catch(() => false)) {
        await calcBtn.click().catch(() => {})
        await page.waitForTimeout(1500)
      }
      r.screenshot = await snap(page, '06-cts-result')
      await scanCopy(page, 'CTS resultado', r.notes)

      const bodyText = await page.locator('body').innerText().catch(() => '')
      if (/S\/?\.?\s?\d/.test(bodyText)) r.notes.push('Resultado con monto en soles visible')
      else r.notes.push('No se observó monto S/ en pantalla tras click Calcular')
    } catch (e: any) {
      r.status = 'PARTIAL'
      r.bugs.push(`Calculadora CTS falló: ${e.message?.slice(0, 200)}`)
      r.screenshot = await snap(page, '06-cts-error')
    }
    results.push(r)
  })

  test('07 — Score de compliance en dashboard', async ({ page }) => {
    test.setTimeout(40_000)
    const r: StepResult = { step: 7, name: 'Dashboard cockpit + score', status: 'OK', screenshot: '', notes: [], bugs: [] }
    try {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(3500)
      r.screenshot = await snap(page, '07-dashboard-cockpit')
      await scanCopy(page, '/dashboard', r.notes)

      // Buscar score % visible
      const bodyText = await page.locator('body').innerText().catch(() => '')
      const scoreMatch = bodyText.match(/(\d{1,3})\s*%/)
      if (scoreMatch) r.notes.push(`Score visible en dashboard: ${scoreMatch[0]}`)
      else r.notes.push('No se detectó score % en dashboard')

      // Detectar errores en consola
      // (no crítico, sólo informativo)
    } catch (e: any) {
      r.status = 'PARTIAL'
      r.bugs.push(`Dashboard error: ${e.message?.slice(0, 200)}`)
      r.screenshot = await snap(page, '07-dashboard-error')
    }
    results.push(r)
  })

  test('08 — Diagnóstico SUNAFIL', async ({ page }) => {
    test.setTimeout(50_000)
    const r: StepResult = { step: 8, name: 'Diagnóstico SUNAFIL', status: 'OK', screenshot: '', notes: [], bugs: [] }
    try {
      await page.goto('/dashboard/diagnostico', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      r.screenshot = await snap(page, '08-diagnostico-landing')
      await scanCopy(page, '/dashboard/diagnostico', r.notes)

      const exprBtn = page.locator('button:has-text("Express"), a:has-text("Express"), button:has-text("Iniciar"), a:has-text("Iniciar")').first()
      if (await exprBtn.isVisible().catch(() => false)) {
        await exprBtn.click().catch(() => {})
        await page.waitForTimeout(1500)
        await snap(page, '08-diagnostico-q1')
        await scanCopy(page, 'diagnostico Q1', r.notes)

        // Responder 3-5 preguntas haciendo click en "Sí" o primera opción
        for (let i = 0; i < 5; i++) {
          const opt = page.locator('button:has-text("Sí"), button:has-text("No"), label[for*="opcion"], button[role="radio"]').first()
          if (await opt.isVisible().catch(() => false)) {
            await opt.click().catch(() => {})
            await page.waitForTimeout(500)
            const nextBtn = page.locator('button:has-text("Siguiente"), button:has-text("Continuar")').first()
            if (await nextBtn.isVisible().catch(() => false)) {
              await nextBtn.click().catch(() => {})
              await page.waitForTimeout(700)
            }
          }
        }
        r.screenshot = await snap(page, '08-diagnostico-mid')
      } else {
        r.notes.push('No se encontró botón "Express" o "Iniciar" en /diagnostico')
      }
    } catch (e: any) {
      r.status = 'PARTIAL'
      r.bugs.push(`Diagnóstico SUNAFIL falló: ${e.message?.slice(0, 200)}`)
      r.screenshot = await snap(page, '08-diag-error')
    }
    results.push(r)
  })

  test('09 — Logout', async ({ page }) => {
    test.setTimeout(40_000)
    const r: StepResult = { step: 9, name: 'Logout', status: 'OK', screenshot: '', notes: [], bugs: [] }
    try {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)

      // UserButton de Clerk + Cerrar sesión
      const userBtn = page.locator('[data-clerk-element], [aria-label*="ccount"], [aria-label*="erfil"], button:has(img[alt*="vatar"])').first()
      let loggedOut = false
      if (await userBtn.isVisible().catch(() => false)) {
        await userBtn.click().catch(() => {})
        await page.waitForTimeout(800)
        const signOut = page.locator('button:has-text("Cerrar sesión"), button:has-text("Sign out"), text=/Cerrar sesión|Sign out/').first()
        if (await signOut.isVisible().catch(() => false)) {
          await signOut.click().catch(() => {})
          await page.waitForTimeout(2500)
          loggedOut = !page.url().includes('/dashboard')
        }
      }
      r.screenshot = await snap(page, '09-logout-final')
      r.notes.push(loggedOut ? 'Logout exitoso' : 'Logout no confirmado vía UI — fallback a /sign-out')
      if (!loggedOut) {
        await page.goto('/sign-out').catch(() => {})
        await page.waitForTimeout(1500)
        await snap(page, '09-logout-fallback')
      }
    } catch (e: any) {
      r.status = 'PARTIAL'
      r.bugs.push(`Logout: ${e.message?.slice(0, 200)}`)
      r.screenshot = await snap(page, '09-logout-error')
    }
    results.push(r)
  })
})
