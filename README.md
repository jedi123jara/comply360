# COMPLY360

Plataforma SaaS de **compliance laboral integral** para el mercado peruano.
Una empresa que la usa no necesita contratar un estudio jurídico laboral
externo, no sufre multas SUNAFIL sorpresa, y opera con certeza legal en los
**12 regímenes laborales** vigentes.

**Stack**: Next.js 16 · React 19 · TypeScript strict · Prisma 7 · PostgreSQL
· Clerk · Tailwind CSS 4 · OpenAI · Culqi · Resend · Supabase

---

## Docs

| Archivo | Para qué |
|---|---|
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | **Guía de implementación real** — lee esto antes de tocar código. Layout del repo, modelo de datos, subsistemas, flujos end-to-end, variables de entorno, deuda técnica. |
| [CLAUDE.md](./CLAUDE.md) | Plan maestro del producto (fases F0-F4) |
| [AGENTS.md](./AGENTS.md) | Reglas cortas para agentes de IA |
| [DEFECTS.md](./DEFECTS.md) | Registro de bugs conocidos + soluciones recurrentes |

---

## Features principales

- **13 calculadoras laborales** con base legal citada (CTS, gratificación, vacaciones, liquidación, indemnización, horas extras, multa SUNAFIL, intereses legales, etc.) — 518 tests pasando
- **Diagnóstico SUNAFIL** con 135 preguntas en 8 áreas + score + plan de acción accionable
- **Simulacro de inspección SUNAFIL** interactivo con Acta de Requerimiento PDF
- **Worker Hub** con 8 tabs (info, legajo digital, contratos, remuneraciones, vacaciones, SST, beneficios en vivo, historial)
- **Biblioteca de plantillas de contratos** con merge fields `{{PLACEHOLDERS}}` (zero-liability, sin IA escribiendo cláusulas)
- **Portal del trabajador** (PWA mobile-first) con **firma biométrica** (Touch ID / huella / Windows Hello — WebAuthn, Ley 27269)
- **Cascada de onboarding** automática tras firmar contrato: entrega RIT + políticas + pide legajo + emails
- **Auto-verificación de documentos con IA vision** (GPT-4o-mini): extrae DNI, cross-matchea contra el worker, auto-marca VERIFIED
- **AI Copilot** persistente + asistente IA con RAG sobre +40 normas peruanas + 11 agentes especializados
- **Canal de denuncias** (Ley 27942) con URL pública por empresa
- **SST completo** (Ley 29783) — IPERC, capacitaciones, accidentes, EPP
- **12 regímenes laborales** (GENERAL, MYPE_MICRO, MYPE_PEQUENA, AGRARIO, CONSTRUCCION_CIVIL, MINERO, PESQUERO, TEXTIL_EXPORTACION, DOMESTICO, CAS, MODALIDAD_FORMATIVA, TELETRABAJO)
- **Push notifications** + PWA instalable + 5 cron jobs operativos
- **Upgrade funnel Culqi** end-to-end + multi-tenant vía Clerk

---

## Getting started

### Requisitos
- Node.js 20+ · pnpm o npm
- PostgreSQL 15+ (recomendado: [Supabase](https://supabase.com))
- Cuentas (opcional para dev): Clerk, OpenAI, Resend, Culqi

### Setup
```bash
# 1. Instalar dependencias
npm install

# 2. Copiar env vars
cp .env.example .env
# Editar .env — mínimo requerido:
#   DATABASE_URL, DIRECT_URL
#   CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# 3. Aplicar migraciones + seed
npx prisma migrate dev
npm run db:seed

# 4. Correr dev server (Turbopack, puerto 3000)
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### Primeros pasos en la app
- `/sign-up` — crea una cuenta de prueba
- `/dashboard` — cockpit narrativo
- `/dev/ui` — showcase del design system "Emerald Light"
- `Cmd+K` / `Ctrl+K` — command palette
- `Cmd+I` / `Ctrl+I` — AI copilot drawer

---

## Scripts

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # Build de producción
npm test                 # Vitest (518 tests)
npm run test:e2e         # Playwright E2E
npm run lint             # ESLint
npx tsc --noEmit         # Typecheck sin generar archivos

npm run db:migrate       # Aplicar migración nueva
npm run db:seed          # Poblar con normas + templates iniciales
npm run db:studio        # Prisma Studio en http://localhost:5555
npm run db:reset         # ¡Cuidado en prod!
```

---

## Estructura (vista rápida)

```
src/
├── app/
│   ├── page.tsx                 # Landing
│   ├── dashboard/               # Producto (104 páginas, rol OWNER/ADMIN/MEMBER)
│   ├── mi-portal/               # Portal del trabajador PWA (rol WORKER)
│   ├── admin/                   # Admin de plataforma (rol SUPER_ADMIN)
│   └── api/                     # Rutas API (auth + plan gating)
├── components/
│   ├── ui/                      # Primitivas (button, modal, tabs, ...)
│   ├── comply360/                # Identidad visual (EditorialTitle, KpiCard, AnimatedShield)
│   ├── cockpit/ workers/ copilot/ billing/ pwa/ calculadoras/
│   └── ...
├── lib/
│   ├── legal-engine/            # 13 calculadoras + 344 tests
│   ├── compliance/              # Diagnóstico, simulacro, score calculator
│   ├── ai/                      # Provider + chat + RAG + document-verifier
│   ├── onboarding/cascade.ts    # Cascada post-firma del contrato
│   ├── templates/               # Motor de merge fields org-template-engine
│   ├── alerts/ agents/ payments/ email/ pdf/ storage/ notifications/
│   ├── webauthn.ts              # Ceremony biométrica cliente
│   └── ...
├── providers/                   # Context providers (copilot, query, upgrade-gate, motion)
├── hooks/                       # Custom hooks (use-api, use-page-context)
└── styles/                      # tokens.css + comply360-design.css
```

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para el layout detallado y cómo
agregar features nuevas.

---

## Planes comerciales

| Plan | Precio (PEN/mes) | Trabajadores | Features clave |
|---|---|---|---|
| **FREE** | — | demo | Calculadoras |
| **STARTER** | S/ 49 | hasta 20 | + workers, alertas, calendario, contratos |
| **EMPRESA** | S/ 149 | hasta 100 | + diagnóstico, simulacro, IA contratos, plantillas, PDFs |
| **PRO** | S/ 399 | ilimitado | + asistente IA, review IA, auto-verify docs, denuncias, SST, API |

---

## Deploy

Target recomendado: **Vercel + Supabase** (ver ARCHITECTURE.md §13).

```bash
# Primera vez
npx prisma migrate deploy
npm run db:seed
vercel --prod
```

Crons configurados en `vercel.json` (daily-alerts, weekly-digest, check-trials,
risk-sweep, norm-updates).

---

## Licencia

Proprietario. Todos los derechos reservados. El código está bajo desarrollo
activo y no acepta pull requests externos en este momento.
