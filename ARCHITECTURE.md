# COMPLY360 — Guía de Arquitectura e Ingeniería

> Documento vivo de referencia. Lee esto ANTES de editar código nuevo en el repo.
>
> Pareja con [CLAUDE.md](./CLAUDE.md) (plan maestro de producto/fases) y [AGENTS.md](./AGENTS.md)
> (reglas de convención para agentes). Este archivo describe **el código que existe hoy** —
> no lo que está planeado.

---

## 0. Índice

1. [Overview del producto](#1-overview-del-producto)
2. [Stack técnico](#2-stack-técnico)
3. [Layout del repositorio](#3-layout-del-repositorio)
4. [Modelo de datos (Prisma)](#4-modelo-de-datos-prisma)
5. [Mapa de rutas](#5-mapa-de-rutas)
6. [Subsistemas clave](#6-subsistemas-clave)
7. [Design system — "Emerald Light"](#7-design-system--emerald-light)
8. [Flujos críticos end-to-end](#8-flujos-críticos-end-to-end)
9. [Tareas comunes — "¿dónde agrego X?"](#9-tareas-comunes--dónde-agrego-x)
10. [Variables de entorno](#10-variables-de-entorno)
11. [Testing](#11-testing)
12. [Scripts útiles](#12-scripts-útiles)
13. [Deploy](#13-deploy)
14. [Deuda técnica conocida](#14-deuda-técnica-conocida)
15. [Glosario](#15-glosario)

---

## 1. Overview del producto

**COMPLY360** es una plataforma SaaS de compliance laboral integral para el mercado peruano.
Una empresa que la usa **no necesita contratar un estudio jurídico laboral externo**, no sufre
multas SUNAFIL sorpresa, y opera con certeza legal en los 12 regímenes laborales vigentes.

### Valor diferencial
- 13 calculadoras laborales con base legal citada (CTS, gratificación, vacaciones, liquidación, indemnización, horas extras, multas SUNAFIL, etc.) — 518 tests
- Diagnóstico SUNAFIL (135 preguntas en 10 áreas) con score + plan de acción
- Simulacro de inspección SUNAFIL interactivo
- AI Review de contratos + Asistente IA con RAG sobre +75 normas peruanas
- Canal de denuncias (Ley 27942)
- SST completo (Ley 29783)
- 12 regímenes laborales soportados (GENERAL, MYPE_MICRO, MYPE_PEQUENA, AGRARIO, CONSTRUCCION_CIVIL, MINERO, PESQUERO, TEXTIL_EXPORTACION, DOMESTICO, CAS, MODALIDAD_FORMATIVA, TELETRABAJO)

### Planes comerciales
| Plan | Precio (PEN/mes) | Límites | Features clave |
|---|---|---|---|
| FREE | — | demo | Solo calculadoras |
| STARTER | S/ 49 | 20 trabajadores, 1 user | + workers, alertas, calendario, contratos |
| EMPRESA | S/ 149 | 100 trabajadores, 5 users | + diagnóstico, simulacro, IA contratos, PDFs |
| PRO | S/ 399 | Ilimitado | + asistente IA, review IA, simulacro completo, denuncias, SST, API |

Ver [`src/lib/constants.ts`](src/lib/constants.ts) para los precios canónicos.

### Usuarios objetivo
- Responsables de RRHH (10–500 trabajadores)
- Contadores que gestionan planillas
- Asesores legales laborales
- Gerentes MYPE/PYME

---

## 2. Stack técnico

### Core
| Capa | Tech | Versión | Notas |
|---|---|---|---|
| Framework | **Next.js** | 16.2.2 | App Router + Turbopack (breaking changes vs 14/15) |
| Lenguaje | **TypeScript** | strict | `any` prohibido; ver `tsconfig.json` |
| UI | **React** | 19.2.4 | Server Components por default |
| Estilos | **Tailwind CSS** | 4 | `@theme inline` + arbitrary values |
| DB | **PostgreSQL** | — | Supabase recomendado en prod |
| ORM | **Prisma** | 7.6.0 | Output a `src/generated/prisma` |
| Auth | **Clerk** | 7.0.8 | Multi-tenant vía `orgId` |
| Validación | **Zod** | 4.3.6 | Schemas compartidos cliente/servidor |

### Extensiones
| Área | Tech | Ubicación |
|---|---|---|
| Pagos | **Culqi** | `src/lib/payments/culqi.ts` |
| Email | **Resend** | `src/lib/email/client.ts` |
| Push | **web-push** + VAPID | `src/lib/notifications/web-push-server.ts` |
| AI | OpenAI API | `src/lib/ai/provider.ts` |
| PDFs | `jsPDF` + `@react-pdf/renderer` | `src/lib/pdf/` |
| Iconos | **Lucide React** | Única librería permitida |
| Fechas | **date-fns** | NO usar moment/dayjs |
| Tests unitarios | **Vitest** | `src/**/__tests__/` |
| Tests E2E | **Playwright** | `e2e/*.spec.ts` |
| Observabilidad | **Sentry** | `sentry.*.config.ts` |

### Dependencias prohibidas
- No agregar nuevas libs sin justificación — el bundle ya incluye lo esencial
- No usar momentjs/dayjs (usar date-fns)
- No usar otra lib de iconos que Lucide
- No usar CSS-in-JS runtime (Tailwind + CSS tokens son suficientes)

---

## 3. Layout del repositorio

```
legaliapro-platform/
├── CLAUDE.md                  # Plan maestro de producto (fases F0-F4)
├── AGENTS.md                  # Reglas cortas para agentes de IA
├── README.md                  # Intro mínima
├── ARCHITECTURE.md            # ← ESTE ARCHIVO
├── package.json               # scripts: dev, build, test, db:*, test:e2e
├── next.config.ts             # Config de Next.js (experimental flags)
├── prisma.config.ts           # Config de Prisma (adapter-pg)
├── prisma/
│   ├── schema.prisma          # 45 modelos, 41 enums
│   ├── seed.ts                # Seed inicial (normas, plantillas)
│   └── migrations/            # Migraciones versionadas
├── public/                    # Estáticos
│   ├── manifest.webmanifest   # PWA manifest (theme_color emerald)
│   ├── sw.js                  # Service worker (push + cache)
│   ├── icon-192.png           # PWA icon 192
│   ├── icon-512.png           # PWA icon 512
│   └── apple-touch-icon.png   # iOS touch icon
├── e2e/                       # Tests E2E Playwright
├── scripts/                   # Scripts CLI (export, ingest, etc.)
├── chrome-extension/          # Extensión Chrome (SUNAT-SOL integration)
├── src/
│   ├── app/                   # Next.js App Router (rutas)
│   ├── components/            # Componentes React reutilizables
│   ├── data/                  # Corpus legal, fixtures
│   ├── generated/prisma/      # Cliente Prisma auto-generado (NO EDITAR)
│   ├── hooks/                 # React hooks custom
│   ├── lib/                   # Lógica de dominio (motor, integraciones)
│   ├── middleware/api-auth.ts # Wrapper Clerk + org isolation
│   ├── providers/             # React Providers globales
│   ├── proxy.ts               # Middleware Next (matches clerkMiddleware)
│   └── styles/                # tokens.css + comply360-design.css (inline)
├── sentry.{client,edge,server}.config.ts
├── vercel.json                # Config Vercel (crons)
├── vitest.config.ts           # Config tests unitarios
├── playwright.config.ts       # Config tests E2E
└── .env.example               # Template de env vars
```

### `src/app/` — Rutas (App Router)

```
src/app/
├── page.tsx                   # Landing (/)
├── layout.tsx                 # Root layout + Clerk + fonts (Geist + Instrument Serif)
├── globals.css                # Tailwind + tokens + comply360-design.css inline
├── (marketing)/               # Rutas públicas agrupadas (SEO)
├── sign-in/[[...sign-in]]/    # Clerk sign-in con branding emerald
├── sign-up/[[...sign-up]]/    # Clerk sign-up con branding emerald
├── dashboard/                 # Producto autenticado (106 páginas)
│   ├── layout.tsx             # Shell: sidebar + topbar + copilot + upgrade gate
│   ├── page.tsx               # Cockpit narrativo (hero + momentos + radar)
│   ├── _components/           # Sidebar + Topbar (subdir con "_" no ruta)
│   ├── trabajadores/
│   │   ├── page.tsx           # Lista (KpiGrid + tabla)
│   │   └── [id]/page.tsx      # Worker Hub — 8 tabs (redirige a WorkerProfile)
│   ├── alertas/
│   ├── contratos/
│   ├── calendario/
│   ├── diagnostico/           # Wizard 135 preguntas SUNAFIL
│   ├── simulacro/             # Inspección virtual interactiva
│   ├── sunafil-ready/         # Inventario 28 docs obligatorios
│   ├── sst/                   # Hub SST (IPERC, capacitaciones, etc.)
│   ├── vacaciones/            # (consolida dentro de Worker profile)
│   ├── boletas/               # (consolida dentro de Worker profile)
│   ├── reportes/              # Reportes ejecutivos PDF/Excel
│   ├── planes/                # Pricing + Culqi checkout
│   ├── asistente-ia/ ia-laboral/ agentes/ analizar-contrato/
│   ├── denuncias/             # Canal hostigamiento (Ley 27942)
│   ├── expedientes/ documentos/
│   ├── gamificacion/          # Streak + leaderboard + logros
│   ├── calculadoras/          # Drawer modal (11 calcs)
│   ├── configuracion/
│   │   ├── empresa/           # Datos empresa + plan
│   │   │   └── plantillas/    # Biblioteca de contratos con merge fields {{KEYS}}
│   │   │       ├── page.tsx          # Lista + modal crear (detector placeholders en vivo)
│   │   │       └── [id]/page.tsx     # Editor + mapping + generar con PDF
│   │   ├── equipo/ facturacion/ integraciones/ marca-blanca/ notificaciones/ seguridad/ soporte/
│   ├── ayuda/ certificacion/ integraciones/ api-docs/
│   └── ... +80 rutas más
├── api/                       # API routes (ver sección 5)
├── denuncias/                 # URL pública por org para denuncias
├── diagnostico-gratis/        # Captura lead (10 preguntas sin login)
├── portal-empleado/           # Lookup público DNI+código
├── mi-portal/                 # Portal del TRABAJADOR (rol WORKER) — PWA mobile-first
│   ├── layout.tsx             # Bottom tab nav (5 tabs) + drawer secundario
│   ├── page.tsx               # Inicio: hero, push opt-in, pending actions
│   ├── documentos/            # Legajo del worker (5 categorías + upload)
│   ├── boletas/               # Lista + detalle con firma biométrica WebAuthn
│   │   └── [id]/page.tsx      # BiometricCeremonyModal (Touch ID/huella)
│   ├── contratos/             # Lista + lector + firma biométrica del contrato
│   │   └── [id]/page.tsx      # CeremonyModal + cascada post-firma
│   ├── solicitudes/           # Vacaciones, permisos, adelanto, etc.
│   ├── perfil/ capacitaciones/ reglamento/ notificaciones/ denuncias/
├── admin/                     # Admin plataforma (rol SUPER_ADMIN)
├── firmar/                    # Firma pública de documentos
└── dev/                       # Showcase design system (/dev/ui)
```

### `src/components/` — Componentes

```
src/components/
├── ui/                        # Primitivas reutilizables (button, card, modal, tabs, etc.)
├── comply360/                 # Identidad visual custom (signature components)
│   ├── animated-shield.tsx    # Escudo SVG animado + RingPremium + Sparkline + useCountUp
│   ├── brand-block.tsx        # Logo "Sello notarial" Variant A
│   ├── editorial-title.tsx    # EditorialTitle + PageHeader (serif 34px + eyebrow)
│   ├── hero-panel.tsx         # Signature del dashboard (220px ring)
│   └── kpi-card.tsx           # KpiCard + KpiGrid (c360-kpi variants)
├── cockpit/                   # Widgets del dashboard/page.tsx
│   ├── activity-heatmap.tsx   # Grid 12 semanas (GitHub-style)
│   ├── compliance-tasks-panel.tsx
│   ├── moment-card.tsx        # 3 variantes: closed/upcoming/risk
│   ├── quick-actions.tsx
│   ├── risk-leaderboard.tsx   # Top 5 workers en riesgo
│   ├── score-narrative.tsx    # Storytelling del score
│   ├── sector-radar.tsx       # Benchmark sectorial (recharts)
│   └── upcoming-deadlines.tsx
├── workers/
│   └── profile/               # Worker Hub
│       ├── worker-profile.tsx         # Shell con 8 tabs
│       ├── worker-profile-header.tsx  # Nombre serif + AnimatedShield + ring
│       ├── onboarding-cascade-card.tsx # Control admin para disparar cascada (tab-info)
│       └── tabs/
│           ├── tab-info.tsx         # Datos personales/laborales + OnboardingCascadeCard
│           ├── tab-legajo.tsx       # 28 docs obligatorios + badge "IA ✨" si verifiedBy='ai-v1'
│           ├── tab-contratos.tsx    # Lista de contratos del worker
│           ├── tab-remuneraciones.tsx # Histórico boletas + KPIs
│           ├── tab-vacaciones.tsx   # Periodos + triple vacacional warning
│           ├── tab-sst.tsx          # 3 groups (EMO, capac, EPP)
│           ├── tab-beneficios.tsx   # 4 calcs en vivo (CTS, grati, vac, indem)
│           ├── tab-historial.tsx    # Timeline editorial (AuditLog)
│           └── tab-placeholder.tsx  # Placeholder genérico
├── copilot/
│   └── copilot-drawer.tsx     # Drawer derecho + streaming + context injection
├── billing/                   # Funnel de conversión
│   ├── upgrade-modal.tsx      # Panel comparativo planes
│   ├── culqi-checkout-modal.tsx # SDK Culqi + POST /api/payments/checkout
│   └── feature-lock.tsx       # Badge candado (sidebar, cards)
├── pwa/
│   ├── register-sw.tsx        # Registro del service worker
│   ├── install-prompt.tsx     # beforeinstallprompt handler
│   └── enable-notifications.tsx # CTA opt-in push
├── calculadoras/              # Formularios de las 13 calcs
├── contratos/ dashboard/ generadores/
└── safe-clerk-provider.tsx
```

### `src/lib/` — Lógica de dominio

```
src/lib/
├── legal-engine/              # CORAZÓN — cálculos laborales
│   ├── peru-labor.ts          # Constantes Perú 2026 (RMV 1130, UIT 5500)
│   ├── types.ts               # Inputs/Outputs de todas las calcs
│   ├── calculators/           # 13 calculadoras con 518 tests
│   │   ├── cts.ts
│   │   ├── gratificacion.ts
│   │   ├── vacaciones.ts
│   │   ├── indemnizacion.ts
│   │   ├── horas-extras.ts
│   │   ├── liquidacion.ts
│   │   ├── multa-sunafil.ts
│   │   ├── intereses-legales.ts
│   │   ├── boleta.ts
│   │   ├── aportes-previsionales.ts
│   │   ├── renta-quinta.ts
│   │   ├── costo-empleador.ts
│   │   ├── utilidades.ts
│   │   └── __tests__/
│   └── contracts/
│       └── templates.ts       # Templates de contratos (Indefinido, Plazo Fijo, Locación)
├── compliance/
│   ├── questions/             # 135 preguntas SUNAFIL (8 áreas)
│   │   ├── index.ts
│   │   └── types.ts
│   ├── diagnostic-scorer.ts   # Score ponderado + gap analysis
│   ├── score-calculator.ts    # Score global de compliance
│   ├── simulacro-engine.ts    # Motor de inspección virtual
│   ├── task-spawner.ts        # action-plan → ComplianceTask rows
│   └── __tests__/
├── ai/
│   ├── provider.ts            # Wrapper OpenAI (abstracción multi-proveedor)
│   ├── chat-engine.ts         # Motor conversacional del copilot
│   ├── legal-rag.ts           # RAG sobre normativa peruana
│   ├── contract-review.ts     # AI review de contratos PDF
│   ├── contract-generator.ts  # Gen contratos con IA
│   ├── document-verifier.ts   # Auto-verificación docs legajo con GPT-4o vision
│   ├── action-plan.ts         # IA genera plan de acción
│   └── rag/
│       ├── legal-corpus.ts    # Corpus base (D.Leg. 728, Ley 29783, etc.)
│       ├── extended-corpus.ts # +500 resoluciones TFL
│       ├── retriever.ts       # BM25/similarity
│       └── vector-retriever.ts # Embeddings (pgvector / Pinecone)
├── alerts/
│   └── alert-engine.ts        # generateWorkerAlerts + generateOrgAlerts
├── onboarding/
│   └── cascade.ts             # Cascada post-firma: crea WorkerRequests + email + audit
├── webauthn.ts                # Ceremony biométrica cliente (Touch ID/huella/Hello)
├── templates/
│   └── org-template-engine.ts # Merge fields {{PLACEHOLDERS}} para contratos propios
├── agents/                    # 14 agentes IA especializados
├── payments/
│   └── culqi.ts               # Integración Culqi Perú (createCharge, etc.)
├── notifications/
│   ├── web-push.ts            # Cliente (browser pushManager)
│   ├── web-push-server.ts     # Server (sendPushToUser/Many/Org + VAPID)
│   └── index.ts
├── email/
│   ├── client.ts              # Resend wrapper (fallback a console.log)
│   └── templates/             # HTML templates (welcome, alert, digest, etc.)
├── pdf/                       # Generadores PDF (Acta, Reporte Ejecutivo, etc.)
├── docx/                      # Generadores DOCX
├── exports/
│   ├── plame.ts               # Export formato PLAME (SUNAT)
│   └── tregistro.ts           # Export T-Registro
├── integrations/
│   ├── apis-net-pe/           # SUNAT (RUC) + RENIEC (DNI)
│   └── sunat-sol/             # Chrome ext bridge
├── auth.ts                    # Wrapper Clerk + tipos AuthContext
├── api-auth.ts                # HOC withAuth, withAuthParams, withRole
├── api-response.ts            # Helpers NextResponse
├── plan-gate.ts               # withPlanGate server (feature gating en API)
├── plan-features.ts           # Types + FEATURE_MIN_PLAN (client-safe)
├── prisma.ts                  # Cliente Prisma singleton
├── brand.ts                   # BRAND constants (nombre, tagline, colors)
├── constants.ts               # PLANS, NAV_GROUPS, etc.
├── utils.ts                   # cn(), displayWorkerName, workerInitials, ...
├── validations/               # Zod schemas compartidos
├── security/                  # Rate limits, CSP, sanitize
├── crypto/                    # JWT signing (documentos firmados)
├── signatures/                # Firma PDF + timestamping
├── storage/                   # Wrapper Supabase Storage
├── cache.ts                   # In-memory cache helpers
├── logger.ts                  # Wrapper console.log condicional
├── sentry.ts                  # Wrapper captureException
├── i18n/                      # ES/EN/PT (ya soportado en UI)
├── workflows/                 # Motor de workflows
├── sst/                       # Lógica SST (IPERC, etc.)
├── teletrabajo/               # Lógica régimen teletrabajo
├── attendance/                # Asistencia + geofence
├── signature/ signatures/     # (duplicación a limpiar)
├── webhooks/                  # Handlers webhooks (Culqi, casilla)
├── crawler/                   # Scraper normativo (El Peruano)
├── import/                    # Parsers Excel/CSV
└── analytics.ts               # Wrapper PostHog/Plausible
```

### `src/providers/` — React Providers (client-side globals)

```
providers/
├── query-provider.tsx          # TanStack Query (React Query)
├── motion-provider.tsx         # Framer Motion LazyMotion
├── i18n-provider.tsx           # react-intl provider
├── copilot-provider.tsx        # Estado del copilot (open, messages, context)
└── upgrade-gate-provider.tsx   # Intercepta 403 PLAN_UPGRADE_REQUIRED → abre modal
```

---

## 4. Modelo de datos (Prisma)

**45 modelos** + **41 enums**. Todos multi-tenant por `orgId`.

### Esquema: [`prisma/schema.prisma`](prisma/schema.prisma)

### Agrupación por dominio

#### Core (tenancy + auth)
- `Organization` — tenant root (RUC, sector, plan, planExpiresAt, sizeRange, alertEmail)
- `User` — miembro de org (clerkId, orgId, role, pushSubscription, streakCurrent)
- `Invitation` — invitaciones pendientes
- `GamificationEvent` — eventos que suman puntos
- `IntegrationCredential` — credenciales de integraciones (SUNAT, etc.)

#### Trabajadores (módulo central)
- `Worker` — trabajador (dni, firstName, lastName, regimenLaboral, tipoContrato, sueldoBruto, fechaIngreso, legajoScore)
- `WorkerDocument` — 28 docs obligatorios del legajo (category: INGRESO/VIGENTE/SST/PREVISIONAL/CESE)
- `VacationRecord` — periodos anuales (diasCorresponden, diasGozados, esDoble)
- `WorkerContract` — junction Worker↔Contract
- `WorkerAlert` — alertas específicas por trabajador (severity: CRITICAL/HIGH/MEDIUM/LOW)
- `CeseRecord` — cese laboral
- `WorkerRequest` — solicitudes (vacaciones, permisos)
- `Payslip` — boletas de pago históricas
- `Attendance` — registros de asistencia
- `Tercero` — terceros (cesionarios, acreedores)
- `ServiceProvider` — prestadores (recibos honorarios)

#### Contratos & documentos
- `ContractTemplate` — templates (por régimen, con contentBlocks)
- `Contract` — contratos generados (status, aiRiskScore, expiresAt)
- `OrgDocument` — documentos generales de la org

#### Compliance SUNAFIL
- `LegalNorm` — normas (D.Leg. 728, Ley 29783, etc.) con baseLegal
- `LegalRule` — reglas compliance con fórmula
- `NormAlert` — alertas normativas (cambio de ley)
- `OrgAlert` — alertas generales de la org
- `NormUpdate` — cambios detectados por el crawler
- `ComplianceDiagnostic` — resultados diagnósticos (FULL/EXPRESS/SIMULATION)
- `ComplianceTask` — tareas generadas del plan de acción
- `ComplianceScore` — snapshots históricos del score

#### SST (Ley 29783)
- `SstRecord` — política, IPERC, accidentes, EMO, EPP, capacitaciones
- `SindicalRecord` — relaciones sindicales

#### Denuncias (Ley 27942)
- `Complaint` — denuncias (hostigamiento, discriminación, acoso)
- `ComplaintTimeline` — línea de tiempo del proceso

#### E-Learning
- `Course` — cursos obligatorios
- `Lesson` — lecciones
- `Enrollment` — inscripciones
- `LessonProgress`, `ExamQuestion`, `Certificate`

#### Billing
- `Subscription` — suscripción Culqi (plan, status, periodo)
- `RhInvoice` — facturas electrónicas

#### Consultoría
- `ConsultorClient` — cliente del consultor laboral
- `InspeccionEnVivo` — inspección real en vivo

#### Auditoría / Sistema
- `AuditLog` — registro de TODOS los cambios (entityType, entityId, action, metadataJson)
- `Calculation` — resultados calculadoras guardados
- `Lead` — leads capturados en landing
- `SunatQueryCache` — cache de queries a apis.net.pe

### Enums clave
```
Plan: FREE | STARTER | EMPRESA | PRO
Role: OWNER | ADMIN | MEMBER | VIEWER | WORKER | SUPER_ADMIN
RegimenLaboral: GENERAL | MYPE_MICRO | MYPE_PEQUENA | AGRARIO | CONSTRUCCION_CIVIL | MINERO | PESQUERO | TEXTIL_EXPORTACION | DOMESTICO | CAS | MODALIDAD_FORMATIVA | TELETRABAJO
TipoContrato: INDEFINIDO | PLAZO_FIJO | TIEMPO_PARCIAL | ... (11 tipos)
AlertSeverity: CRITICAL | HIGH | MEDIUM | LOW
DocCategory: INGRESO | VIGENTE | SST | PREVISIONAL | CESE
ComplaintType: HOSTIGAMIENTO_SEXUAL | DISCRIMINACION | ACOSO_LABORAL | OTRO
```

### Reglas de multi-tenancy
1. **TODAS las queries deben filtrar por `orgId`** (hay wrapper `withAuth` que inyecta el context).
2. Row Level Security se implementará en PostgreSQL al migrar a prod.
3. `SUPER_ADMIN` (rol de plataforma) puede ver across-orgs en `/admin/*`.
4. Un `Worker` pertenece a UNA `Organization`.

---

## 5. Mapa de rutas

### Dashboard — 106 páginas

Agrupadas en **hubs** (ver `src/lib/constants.ts` → `NAV_GROUPS` + `NAV_HUBS`):

| Hub | Rutas principales |
|---|---|
| Cockpit | `/dashboard` |
| Equipo | `/trabajadores`, `/trabajadores/nuevo`, `/trabajadores/[id]`, `/prestadores`, `/terceros`, `/vacaciones`, `/boletas`, `/solicitudes`, `/asistencia`, `/liquidaciones` |
| Riesgo | `/diagnostico`, `/simulacro`, `/sunafil-ready`, `/inspeccion-en-vivo`, `/denuncias`, `/relaciones-colectivas`, `/igualdad-salarial`, `/alertas` |
| Calendario | `/calendario` |
| Contratos & Docs | `/contratos`, `/contratos/[id]`, `/analizar-contrato`, `/documentos`, `/expedientes`, `/sst`, `/sst/iperc`, `/firmar` |
| IA Laboral | `/asistente-ia`, `/ia-laboral`, `/agentes`, `/calculadoras/*` (11), `/action-plan` |
| Config | `/configuracion/*`, `/reportes/*`, `/planes`, `/integraciones`, `/normas`, `/ayuda`, `/notificaciones`, `/certificacion`, `/marketplace`, `/api-docs`, `/gamificacion`, `/workflows`, `/capacitaciones`, `/honorarios`, `/casilla-sunafil` |

Rutas especiales:
- `/mi-portal/*` — Portal del TRABAJADOR (rol WORKER, login distinto)
- `/admin/*` — Admin de la plataforma (rol SUPER_ADMIN)
- `/portal-empleado` — Lookup público DNI + código empresa (sin login)
- `/denuncias/[slug]` — Formulario público de denuncia por org
- `/diagnostico-gratis` — Captura lead (10 preguntas sin login)

### API Routes — estructura

Cada módulo tiene su carpeta con `route.ts`. Convenciones:

| Pattern | Uso |
|---|---|
| `GET /api/{recurso}` | Listar + filtros + paginación |
| `POST /api/{recurso}` | Crear |
| `GET /api/{recurso}/[id]` | Detalle |
| `PUT /api/{recurso}/[id]` | Editar |
| `DELETE /api/{recurso}/[id]` | Soft delete (por defecto) |
| `GET /api/{recurso}?stats=1` | Modo stats (org-wide aggregates) |

Endpoints críticos:
- `/api/dashboard` — payload del cockpit (score, heatmap, radar, deadlines, riskWorkers)
- `/api/diagnostics` — listar/crear diagnósticos + fetch preguntas
- `/api/simulacro` — motor simulacro
- `/api/ai-chat` — streaming SSE al copilot
- `/api/ai-review` — review de PDF
- `/api/payments/checkout` — POST { planId, token } → Culqi charge
- `/api/webhooks/subscriptions` — webhook Culqi
- `/api/notifications/subscribe` — guardar push subscription
- `/api/notifications/vapid-key` — expone clave pública
- `/api/cron/daily-alerts` — cron principal (13:00 UTC, ver `vercel.json`)
- `/api/cron/weekly-digest`, `/api/cron/check-trials`, `/api/cron/risk-sweep`, `/api/cron/norm-updates`

#### Biblioteca de plantillas (EMPRESA+, feature `ia_contratos`)
- `GET/POST /api/org-templates` — CRUD de plantillas (usa `OrgDocument` con metadata JSON en `description`)
- `GET/PATCH/DELETE /api/org-templates/[id]` — editor detalle, auto-bump de `version` al cambiar contenido
- `POST /api/org-templates/[id]/generate?format=json|pdf` — merge con worker, crea `Contract` DRAFT + `WorkerContract`, devuelve JSON o PDF

#### Cascada de onboarding
- `POST /api/workers/[id]/onboarding-cascade` — dispara manualmente (ADMIN+, body: `{ force?, requestLegajo?, sendEmail? }`)
- **Auto-trigger**: al `PATCH /api/contracts/[id]` con `status='SIGNED'` y al `POST /api/mi-portal/contratos/[id]/firmar`

#### Portal del Trabajador — contratos firmables
- `GET /api/mi-portal/contratos` — lista con stats (pending/signed/total)
- `GET /api/mi-portal/contratos/[id]` — detalle con HTML + metadata firma
- `POST /api/mi-portal/contratos/[id]/firmar` — body `{ signatureLevel: 'SIMPLE'|'BIOMETRIC', userAgent, credentialId }` → dispara cascada automática

#### Auto-verificación de documentos (PRO, feature `review_ia`)
- `POST /api/workers/[id]/documents/[docId]/verify` — re-corre verificación IA sobre un doc existente
- **Auto-trigger**: al `POST /api/workers/[id]/documents` (admin) y `POST /api/mi-portal/documentos` (worker)

### API pública v1 (para PRO con API access)
- `/api/v1/workers`, `/api/v1/contracts`, `/api/v1/compliance`
- `/api/v1/openapi` → swagger spec

---

## 6. Subsistemas clave

### 6.1 Autenticación (Clerk + multi-tenant)

**Archivos clave:**
- `src/proxy.ts` — middleware Next.js + `clerkMiddleware` + `createRouteMatcher`
- `src/lib/auth.ts` — `AuthContext` type + helpers
- `src/middleware/api-auth.ts` — HOCs: `withAuth`, `withAuthParams`, `withRole`

**Flujo:**
1. `proxy.ts` matchea rutas públicas (`/`, `/sign-in`, `/denuncias`, `/portal-empleado`, `/dev`, etc.)
2. Todo lo demás → Clerk verifica sesión → inyecta `orgId` + `userId` + `role`
3. API routes usan `withAuth(handler)` para obtener `AuthContext` typed

**Roles:**
- `OWNER` — dueño de la org (paga, cambia plan)
- `ADMIN` — permisos casi full
- `MEMBER` — edita pero no borra
- `VIEWER` — solo lectura
- `WORKER` — trabajador con acceso a `/mi-portal`
- `SUPER_ADMIN` — admin de plataforma (`/admin/*`)

### 6.2 Plan gating (feature access)

**Archivos:**
- `src/lib/plan-features.ts` — **client-safe**: tipos + `FEATURE_MIN_PLAN`
- `src/lib/plan-gate.ts` — **server**: `withPlanGate(feature, handler)` wrapper

**Features** (16):
```
calculadoras, workers, alertas_basicas, calendario, contratos,
diagnostico, simulacro_basico, reportes_pdf, ia_contratos,
asistente_ia, review_ia, simulacro_completo, denuncias, sst_completo, api_access,
gamificacion
```

**Flujo de upgrade:**
1. Backend: `export const POST = withPlanGate('diagnostico', handler)`
2. Si el plan no alcanza → 403 `{ code: 'PLAN_UPGRADE_REQUIRED', requiredPlan, currentPlan, upgradeUrl }`
3. Frontend: `UpgradeGateProvider` (parchea `window.fetch`) detecta el 403 → abre `<UpgradeModal>`
4. Click "Actualizar" → `/dashboard/planes?highlight=X`
5. Click plan → `<CulqiCheckoutModal>` carga SDK → POST token a `/api/payments/checkout`
6. Backend actualiza `Organization.plan` → user refresca con acceso

### 6.3 Motor legal (13 calculadoras)

**Archivos:** `src/lib/legal-engine/calculators/*.ts` — cada una tiene:
- `calcularX(input: XInput): XResult` — función pura determinística
- Test suite en `__tests__/` (518 tests totales)
- Referencia a base legal en `result.baseLegal`
- Fórmula en texto humano en `result.formula`

**Constantes Perú 2026:** `src/lib/legal-engine/peru-labor.ts`
- RMV: S/ 1,130
- UIT: S/ 5,500
- Tope AFP, tasas EsSalud, SCTR, asignación familiar, etc.

**Reglas por régimen** (muy diferentes):
- GENERAL: CTS completa, grati completa, vac 30d, indem 1.5 sueldos/año
- MYPE_MICRO: Sin CTS, sin grati, vac 15d, indem 10 rem diarias/año
- MYPE_PEQUENA: 50% CTS, 50% grati, vac 15d, indem 20 rem diarias/año
- AGRARIO: CTS y grati incluidas en remuneración diaria
- +8 más

### 6.4 Alertas inteligentes

**Archivo:** `src/lib/alerts/alert-engine.ts`

**Triggers automáticos:**
- Al crear/editar Worker → `generateWorkerAlerts(worker)` corre 12 reglas
- Cron diario → `/api/cron/daily-alerts` (`0 13 * * *`)
- Cron semanal → `/api/cron/weekly-digest` (`0 13 * * 1`)

**Tipos de alertas** (12 reglas en `WorkerAlertType`):
```
CONTRATO_POR_VENCER, CONTRATO_VENCIDO, CTS_PENDIENTE,
GRATIFICACION_PENDIENTE, VACACIONES_ACUMULADAS,
VACACIONES_DOBLE_PERIODO, DOCUMENTO_FALTANTE, DOCUMENTO_VENCIDO,
EXAMEN_MEDICO_VENCIDO, CAPACITACION_PENDIENTE, AFP_EN_MORA,
REGISTRO_INCOMPLETO
```

**Canales de notificación:**
1. Email (Resend) — todos los niveles
2. Push notification (web-push) — solo CRITICAL
3. WhatsApp (Twilio) — CRITICAL (stub en `src/lib/whatsapp.ts`)
4. In-app `/dashboard/alertas` — todas

### 6.5 IA (copilot + RAG + review)

**Archivos:**
- `src/lib/ai/provider.ts` — wrapper OpenAI
- `src/lib/ai/chat-engine.ts` — motor conversacional con streaming SSE
- `src/lib/ai/legal-rag.ts` — RAG sobre normativa peruana
- `src/lib/ai/contract-review.ts` — análisis clausula-por-clausula
- `src/lib/ai/contract-generator.ts` — genera contrato desde prompt
- `src/lib/ai/action-plan.ts` — IA genera plan desde gaps de diagnóstico
- `src/lib/ai/rag/legal-corpus.ts` + `extended-corpus.ts` — chunks indexados
- `src/lib/ai/rag/vector-retriever.ts` — embeddings (pgvector)
- `src/lib/agents/*` — 14 agentes especializados (prompts + tools)

**Copilot drawer:**
- Componente: `src/components/copilot/copilot-drawer.tsx`
- Provider: `src/providers/copilot-provider.tsx`
- Hook: `useCopilot()` — `.open(prompt?)`, `.close()`, `.toggle()`, `.send(text)`
- Hook contexto: `src/hooks/use-page-context.ts` — detecta ruta activa → inyecta worker/contract
- Shortcut global: **Cmd+I** / **Ctrl+I** (handler en `dashboard/layout.tsx`)

### 6.6 PWA + Push Notifications

**Archivos:**
- `public/manifest.webmanifest` — nombre, iconos, theme_color emerald, shortcuts
- `public/sw.js` — service worker (cache + push + notificationclick)
- `public/icon-{192,512}.png` + `apple-touch-icon.png` (generados con sharp)
- `src/components/pwa/register-sw.tsx` — registra el SW al boot
- `src/components/pwa/install-prompt.tsx` — `beforeinstallprompt` (muestra tras 3 sesiones)
- `src/components/pwa/enable-notifications.tsx` — flujo opt-in push
- `src/lib/notifications/web-push.ts` — **cliente** (subscribe vía pushManager)
- `src/lib/notifications/web-push-server.ts` — **server**: `sendPushToUser/Many/Org`

**Setup prod:**
```bash
npx web-push generate-vapid-keys
# Copiar a .env:
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:alerts@comply360.pe
```

### 6.7 Billing (Culqi)

**Archivos:**
- `src/lib/payments/culqi.ts` — `createCharge`, `CULQI_PLANS`, `isValidPaidPlan`
- `src/app/api/payments/checkout/route.ts` — POST (withRole `OWNER`)
- `src/app/api/webhooks/subscriptions/route.ts` — webhook Culqi
- `src/components/billing/culqi-checkout-modal.tsx` — SDK dinámico + modal
- `src/components/billing/upgrade-modal.tsx` — panel comparativo
- `src/components/billing/feature-lock.tsx` — badge candado

**Flujo end-to-end:**
1. Usuario clic plan → `CulqiCheckoutModal` carga `https://checkout.culqi.com/js/v4`
2. Clic "Pagar" → `Culqi.open()` → usuario completa tarjeta/Yape/banca
3. Culqi.js genera token → `window.culqi` callback
4. POST a `/api/payments/checkout` con `{ planId, token }`
5. Backend llama `createCharge` → actualiza `Organization.plan` + `planExpiresAt`
6. Redirect `/dashboard?upgraded=1`

### 6.8 Worker Hub (8 tabs)

**Archivos:**
- Página: `src/app/dashboard/trabajadores/[id]/page.tsx` (144 LOC, fetcher + estado)
- Shell: `src/components/workers/profile/worker-profile.tsx`
- Header: `src/components/workers/profile/worker-profile-header.tsx`
- Tabs: `src/components/workers/profile/tabs/tab-*.tsx`

**Tabs y endpoints consumidos:**
| Tab | Endpoint | Estado |
|---|---|---|
| Información | `worker` prop | REAL |
| Legajo | `worker.documents` (prop) | REAL |
| Contratos | `GET /api/contracts?workerId=...` | REAL |
| Remuneraciones | `GET /api/workers/[id]/payslips` | REAL |
| Vacaciones | `GET /api/workers/[id]/vacaciones` | REAL |
| SST | `legajoDocs` filtrado por category SST | REAL |
| Beneficios | Cálculos en vivo (CTS, grati, vac, indem) | REAL |
| Historial | `GET /api/workers/[id]/history` (AuditLog) | REAL |

### 6.9 Navegación + Command Palette

- **Sidebar** (`src/app/dashboard/_components/sidebar.tsx`): `BrandBlockA` arriba, Cmd+K trigger, `NAV_GROUPS` (6 grupos), user menu abajo
- **Topbar** (`src/app/dashboard/_components/topbar.tsx`): breadcrumbs, compliance score pill, Cmd+K visible, bell + badge, user dropdown
- **Command palette** (`src/components/ui/command-palette.tsx`): `cmdk`-based, búsqueda dinámica workers/contracts/documents
- **Calculator drawer** (`src/components/ui/calculator-drawer.tsx`): drawer con las 13 calcs invocable desde Cmd+K

### 6.10 Biblioteca de plantillas (org-templates + merge fields)

**Filosofía: zero-liability.** La empresa sube su propio contrato (aprobado por su
abogado) con placeholders `{{PLACEHOLDER}}` y el sistema hace **sustitución
determinística** — no hay AI escribiendo cláusulas legales. Si hay un error en
un contrato generado, es de la empresa, no nuestro.

**Archivos:**
- `src/lib/templates/org-template-engine.ts` — motor de merge fields + catálogo de 27 placeholders estándar (worker / org / meta) + `renderTemplate(content, mappings, context, options)` + `numberToWords` (soles peruanos)
- `src/app/api/org-templates/*` — CRUD de plantillas
- `src/app/api/org-templates/[id]/generate/route.ts` — merge + PDF jsPDF
- `src/app/dashboard/configuracion/empresa/plantillas/*` — UI lista + editor + preview

**Persistencia sin migración.** Reutilizamos el modelo `OrgDocument` con
`type: 'OTRO'` y **JSON serializado en `description`** con schema
`contract_template_v1`. Estructura de la metadata:
```ts
interface OrgTemplateMeta {
  _schema: 'contract_template_v1'
  documentType: OrgTemplateType  // 17 tipos (CONTRATO_INDEFINIDO, CARTA_DESPIDO, etc.)
  contractType?: TipoContrato
  content: string                 // Texto con {{KEYS}}
  placeholders: string[]          // Derivado, cacheado
  mappings: Record<string, string> // KEY → data path (ej: "worker.firstName")
  notes?: string
  usageCount?: number
}
```

**Regex de detección:** `/\{\{\s*([A-Z_][A-Z0-9_]*)\s*\}\}/g` — solo
MAYÚSCULAS + underscore + dígitos.

**Cross-link con `Contract`**: al generar con `persist=true`, se crea un
`Contract` DRAFT + `WorkerContract` + `AuditLog`, y `usageCount` se
incrementa en la plantilla.

**Plan gate:** `EMPRESA+` (feature `ia_contratos`).

### 6.11 Cascada de onboarding (post-firma de contrato)

Cuando un worker firma su contrato, la empresa debe entregarle RIT + políticas
SST + pedirle su legajo. La cascada automatiza todo eso en una llamada.

**Archivos:**
- `src/lib/onboarding/cascade.ts` — `runOnboardingCascade(workerId, opts)` + `runOnboardingCascadeBatch`
- `src/lib/email/templates.ts` → `workerOnboardingEmail()` — template dedicado
- `src/components/workers/profile/onboarding-cascade-card.tsx` — control admin (visible en tab-info)
- `src/app/api/workers/[id]/onboarding-cascade/route.ts` — trigger manual
- Auto-trigger en `src/app/api/contracts/[id]/route.ts` PATCH (status→SIGNED)
- Auto-trigger en `src/app/api/mi-portal/contratos/[id]/firmar/route.ts` POST

**Qué hace en una sola pasada:**
1. Valida worker existe + no está TERMINATED
2. Chequea **idempotencia** vía `AuditLog` (`ONBOARDING_CASCADE_EXECUTED`) — salvo `force: true`
3. Cuenta `OrgDocument.isPublishedToWorkers` → ya están visibles en `/mi-portal/reglamento`
4. Crea `WorkerRequest` tipo `ACTUALIZAR_DATOS` para los 5 docs obligatorios del trabajador (CV, DNI, declaración, examen médico, AFP) — deduplica vía tag `[doc:<type>]` en `description`
5. Envía email editorial con contadores
6. Registra `AuditLog` con metadata completa

**Fire-and-forget:** nunca bloquea la respuesta al cliente. Si falla, solo
logea en consola.

### 6.12 Firma biométrica (WebAuthn + Ley 27269)

**Nivel de firma** implementado:
- `SIMPLE` — checkbox "acepto"
- `BIOMETRIC` — WebAuthn con Touch ID / huella Android / Windows Hello / Face ID
- `CERTIFIED` — reservado para RENIEC (sprint futuro)

**Validez legal:** firma electrónica **fuerte** según Ley 27269 (Firmas y
Certificados Digitales) + D.S. 052-2008-PCM. El sensor del dispositivo valida
localmente al firmante; el backend solo recibe la prueba criptográfica. La
huella nunca sale del dispositivo.

**Audit trail:** `AuditLog.action='contract.signed_by_worker'` +
`metadataJson: { signatureLevel, userAgent, credentialId, workerId }` +
`ipAddress`.

**Archivos:**
- `src/lib/webauthn.ts` — `tryBiometricCeremony()` + `hasBiometricHardware()` + `isBiometricLikelyAvailable()` con `BiometricCeremonyResult` (verified, reason, credentialId, userAgent)
- `src/app/api/mi-portal/contratos/[id]/firmar/route.ts` — persistir firma en `Contract.formData._signature` + `signedAt` + `status='SIGNED'` + dispatch cascada
- `src/app/mi-portal/contratos/[id]/page.tsx` — lector + `CeremonyModal` con 5 states (idle / ceremony / submitting / success / error)
- Pattern reusado en `src/app/mi-portal/boletas/[id]/page.tsx` para firma de boletas

**Graceful fallback:** si no hay platform authenticator, cae a firma SIMPLE
con checkbox — jamás bloquea al worker.

### 6.13 Auto-verificación de documentos (AI vision)

Cuando el worker sube su DNI / CV / examen médico, GPT-4o-mini con vision:
1. Valida tipo de documento ("¿es un DNI peruano?")
2. Extrae campos (DNI, nombres, fechas)
3. Cross-matchea contra `Worker.dni` / `firstName` / `lastName` con fuzzy match
4. Dictamina decisión:

| Decision | Acción |
|---|---|
| `auto-verified` (confianza ≥ 85% + matches OK) | `status=VERIFIED`, `verifiedBy='ai-v1'` |
| `needs-review` | Deja UPLOADED, logea al admin |
| `mismatch` | Flag al admin (posible fraude) |
| `wrong-type` / `unreadable` / `unsupported` / `error` | No toca nada, devuelve razón |

**Nunca marca REJECTED automáticamente** — decisión final es humana.

**Archivos:**
- `src/lib/ai/document-verifier.ts` — engine con prompts específicos por `documentType` (dni_copia, cv, declaracion_jurada, examen_medico_*, afp_onp_afiliacion)
- `src/app/api/workers/[id]/documents/[docId]/verify/route.ts` — endpoint manual + helper compartido `persistVerification`
- Auto-trigger en `src/app/api/workers/[id]/documents/route.ts` POST
- Auto-trigger en `src/app/api/mi-portal/documentos/route.ts` POST (también subimos a storage real, no placeholder)

**Persistencia sin migración:** decision + confidence + issues + extracted
van en `AuditLog` con `action='document.ai_verified'` (o `'ai_reviewed'`).
El sentinel `WorkerDocument.verifiedBy='ai-v1'` distingue IA vs humano.

**UI:** badge esmerald gradient "IA ✨" con Tooltip en `tab-legajo.tsx` que
muestra summary + confianza + issues al hover. Badge amber "Revisar" si la IA
procesó pero con confianza baja o mismatch.

**Soporta:** JPG/PNG (fotos desde celular). **Pendiente:** PDF (requiere
convertir primera página a imagen con `pdfjs-dist`).

**Plan gate:** `PRO` (feature `review_ia`). Fire-and-forget, requiere
`OPENAI_API_KEY`. Falla segura si cualquiera falta.

---

## 7. Design system — "Emerald Light"

### Filosofía
- **Light-first** (`colorScheme: light` forzado en `layout.tsx`)
- Paleta: Emerald + amber accent + crimson warnings
- Typography pairing: **Geist** (workhorse) + **Instrument Serif** (editorial, 34px+)
- Motion: sutil (breathing halos, stagger-in, hover lift 2px)
- Carácter: editorial, no "SaaS genérico"

### Archivos
- `src/styles/tokens.css` — CSS variables (emerald-*, crimson-*, amber-*, neutral-*, text-*, border-*, bg-*, --font-serif)
- `src/styles/comply360-design.css` — signature CSS (671 LOC) con prefijo `c360-*`
- `src/app/globals.css` — importa Tailwind + tokens + **inline** comply360-design.css (importante: no se puede @import desde otro CSS en Tailwind v4)

### Clases c360-* principales

| Clase | Uso |
|---|---|
| `c360-hero-panel` + `c360-hero-grid` | Signature del dashboard (220px ring) |
| `c360-shield*` (8 variants) | AnimatedShield SVG con gradient + animations |
| `c360-kpi` + `c360-kpi-head` + `c360-kpi-value` + `c360-kpi-foot` | KPI cards premium (variants: accent/crimson/amber) |
| `c360-page-title-editorial` | Títulos serif 34px con `<em>` emerald |
| `c360-sidebar` + `c360-sb-brand` | Sidebar + brand block (Variant A "Sello notarial") |
| `c360-tb-sync` | Topbar pill "SUNAFIL sincronizado" |
| `c360-sparkline` | Mini-gráfico para KpiCard |
| `c360-ring-premium` | RingPremium (220px score) |
| `c360-breathe`, `c360-shieldFloat`, `c360-pulseEmerald` | Keyframe animations |

### Componentes editoriales

| Componente | Ubicación | Uso |
|---|---|---|
| `PageHeader` | `components/comply360/editorial-title.tsx` | Header de páginas dashboard (eyebrow + título + subtitle + actions) |
| `KpiCard` + `KpiGrid` | `components/comply360/kpi-card.tsx` | Filas de KPIs con sparkline + delta |
| `AnimatedShield` | `components/comply360/animated-shield.tsx` | Escudo animado (hero, sign-in, worker header) |
| `RingPremium` | mismo archivo | Ring SVG con gradient emerald |
| `Sparkline` | mismo archivo | Mini-gráfico de tendencia |
| `useCountUp` | mismo archivo | Hook animación de números |
| `BrandBlockA` | `components/comply360/brand-block.tsx` | Logo "Sello notarial" |

### Primitivas UI (`src/components/ui/`)
- `button.tsx` (variants: primary/secondary/ghost/danger/emerald/gold + sizes + loading/icon)
- `card.tsx` (variants: default/emerald/crimson, interactive hover lift)
- `modal.tsx`, `sheet.tsx`, `tooltip.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `tabs.tsx`
- `badge.tsx` (variants: success/warning/danger/neutral, dot)
- `progress-ring.tsx` (SVG animated tipo Apple Watch)
- `skeleton.tsx` + `loading-overlay.tsx`
- `empty-state.tsx`
- `command-palette.tsx` (Cmd+K)
- `calculator-drawer.tsx`
- `sonner-toaster.tsx`, `toast.tsx`
- `error-boundary.tsx`
- `form/*` (Input, Select, Textarea, etc.)

---

## 8. Flujos críticos end-to-end

### 8.1 Signup → Primera calc
```
1. / (landing) → clic "Comenzar gratis"
2. /sign-up → Clerk crea User + Clerk organization
3. Webhook Clerk → POST /api/webhooks/clerk (crea Organization en Prisma)
4. /dashboard/onboarding → wizard 4 pasos (RUC, régimen, primer worker, alertas)
5. Marca organization.onboardingCompleted = true
6. Redirect /dashboard (cockpit narrativo)
7. Usuario abre drawer Cmd+K → "Calcular CTS"
8. CalculatorDrawer abre con form → POST /api/calculations
```

### 8.2 Crear worker → Generar contrato
```
1. /dashboard/trabajadores → clic "Agregar Trabajador"
2. /dashboard/trabajadores/nuevo → form con DNI auto-fetch (RENIEC via apis.net.pe)
3. Validación Zod → POST /api/workers
4. Trigger alert-engine.generateWorkerAlerts() → inserta WorkerAlerts
5. Redirect /dashboard/trabajadores/[id] (Worker Hub)
6. Tab Contratos → clic "Generar nuevo"
7. /dashboard/contratos/nuevo?workerId=X → form pre-filled
8. POST /api/contracts → createContract + createWorkerContract + updateDocument
```

### 8.3 Ejecutar diagnóstico
```
1. /dashboard/diagnostico → elige FULL (135) vs EXPRESS (20)
2. GET /api/diagnostics?action=questions&type=FULL → preguntas filtradas por régimen/tamaño
3. Wizard una-pregunta-por-pantalla (Typeform style)
4. POST /api/diagnostics → scoreDiagnostic() calcula score + gap analysis
5. /dashboard/diagnostico/[id]/resultado → radar chart + top 10 gaps
6. Clic "Generar plan" → actionPlanToTaskInputs + spawnTasksFromActionPlan
7. Tasks aparecen en /dashboard/alertas con owners sugeridos
```

### 8.4 Alerta → Push → Resolve
```
1. Cron 13:00 UTC → GET /api/cron/daily-alerts (con CRON_SECRET header)
2. Para cada org con alertEmail:
   a. Aggregate alerts (contratos por vencer, SST overdue, CTS próxima, denuncias plazos)
   b. sendEmail() con template alertEmail
   c. sendPushToOrg() con payload CRITICAL
3. SW recibe push → showNotification (icon emerald + requireInteraction si CRITICAL)
4. Click notif → focus tab /dashboard/alertas (o abre nueva)
5. Usuario marca como resuelta → POST /api/workers/alerts/[id]/resolve
```

### 8.5 Upgrade → Pago → Activación
```
1. STARTER user clic "Ejecutar diagnóstico"
2. POST /api/diagnostics → 403 { code: PLAN_UPGRADE_REQUIRED, requiredPlan: EMPRESA }
3. UpgradeGateProvider (patch fetch global) detecta → abre UpgradeModal
4. Click "Actualizar a Empresa" → navega /dashboard/planes?highlight=EMPRESA
5. Click card EMPRESA → abre CulqiCheckoutModal
6. Modal carga https://checkout.culqi.com/js/v4
7. Click "Pagar" → Culqi.open() → form seguro PCI
8. Usuario paga → window.culqi callback → POST /api/payments/checkout
9. Backend: createCharge + update Organization.plan = 'EMPRESA'
10. Redirect /dashboard?upgraded=1 → acceso PRO desbloqueado
```

### 8.6 Onboarding loop completo (admin crea worker → worker firma → legajo auto-verified)
```
ADMIN (dashboard):
1. /dashboard/configuracion/empresa/plantillas → crea plantilla "Contrato indefinido"
   • Pega texto con {{NOMBRE_COMPLETO}}, {{DNI}}, {{SUELDO}}, {{FECHA_INGRESO}}
   • Editor detecta placeholders en vivo + catálogo emerald con 24 field options
2. /dashboard/trabajadores/nuevo → crea worker (DNI auto-fetch RENIEC)
3. Desde perfil → modal "Generar" con plantilla → selecciona worker
   • POST /api/org-templates/[id]/generate (merge + PDF)
   • Crea Contract DRAFT + WorkerContract + usageCount++
4. PATCH /api/contracts/[id] { status: 'SIGNED' } (admin pre-firma)
   → triggerOnboardingCascadeForContract (fire-and-forget)
   → runOnboardingCascade(workerId)
       • Crea 5 WorkerRequests (CV, DNI, declaración, examen, AFP)
       • sendEmail con workerOnboardingEmail → "Bienvenido a bordo"
       • AuditLog ONBOARDING_CASCADE_EXECUTED

WORKER (celular):
5. Recibe email → clic link al /mi-portal
6. PWA instalable con beforeinstallprompt
7. /mi-portal/contratos → ve card amber "Firmá ya"
8. Lector + checkbox "He leído" → botón "Firmar con huella"
9. tryBiometricCeremony() → iOS/Android pide Face ID / huella
10. POST /api/mi-portal/contratos/[id]/firmar { signatureLevel: 'BIOMETRIC', credentialId }
    • Update Contract.formData._signature + signedAt + status='SIGNED'
    • AuditLog contract.signed_by_worker + IP + userAgent
    • Re-dispara cascada por si el admin ya lo hizo (idempotente)
11. /mi-portal → ve pending actions (5 docs)
12. Toca "Subí tu DNI" → selecciona foto del camera roll
13. POST /api/mi-portal/documentos → uploadFile (Supabase / local)
    • Crea WorkerDocument UPLOADED
    • recalculateLegajoScore
    • triggerAutoVerify (fire-and-forget, PRO gate)
        → verifyDocument(GPT-4o vision)
        → extrae DNI "45678912", matches Worker.dni → auto-verified
        → status='VERIFIED', verifiedBy='ai-v1'
        → AuditLog document.ai_verified + confidence 0.92 + extracted
        → recalculateLegajoScore (sube ~7%)
        → syncComplianceScore del org

ADMIN (dashboard, mismo día):
14. /dashboard/trabajadores/[id] → tab Legajo
    • Ve doc DNI con badge verde "IA ✨" + tooltip "Confianza: 92%"
    • Legajo score subió
    • Cockpit muestra el score de compliance más alto
```

---

## 9. Tareas comunes — "¿dónde agrego X?"

### Agregar una nueva página de dashboard
1. Crear `src/app/dashboard/mi-pagina/page.tsx` (`'use client'` si interactiva)
2. Copiar el patrón:
```tsx
import { PageHeader } from '@/components/comply360/editorial-title'
import { KpiCard, KpiGrid } from '@/components/comply360/kpi-card'

export default function MiPaginaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Categoría"
        title="Título <em>editorial</em>."
        subtitle="Descripción secundaria en Geist."
        actions={<button>...</button>}
      />
      <KpiGrid>
        <KpiCard label="..." value={42} variant="accent" />
      </KpiGrid>
    </div>
  )
}
```
3. Agregar al sidebar en `src/lib/constants.ts` → `NAV_GROUPS`
4. Si requiere plan → agregar plan-gate en endpoints API

### Agregar un nuevo endpoint API
1. Crear `src/app/api/mi-recurso/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { withPlanGate } from '@/lib/plan-gate'

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const data = await prisma.miModel.findMany({ where: { orgId: ctx.orgId } })
  return NextResponse.json({ data })
})

// Si requiere plan:
export const POST = withPlanGate('mi_feature', async (req, ctx) => {
  // ...
})
```

### Agregar una calculadora nueva
1. Crear `src/lib/legal-engine/calculators/mi-calc.ts`:
```ts
import type { MiCalcInput, MiCalcResult } from '../types'
export function calcularMiCalc(input: MiCalcInput): MiCalcResult {
  // Lógica determinística pura
  return { total, formula: '...', baseLegal: 'D.S. X, Art. Y' }
}
```
2. Agregar tipos a `src/lib/legal-engine/types.ts`
3. Tests en `src/lib/legal-engine/calculators/__tests__/mi-calc.test.ts`
4. UI: `src/components/calculadoras/mi-calc.tsx`
5. Registrar en `src/components/ui/calculator-drawer.tsx`

### Agregar una feature al plan
1. Agregar feature key a `src/lib/plan-features.ts` → `PlanFeature` type + `FEATURE_MIN_PLAN`
2. Agregar copy UX a `src/components/billing/upgrade-modal.tsx` → `FEATURE_COPY`
3. En el endpoint: `export const POST = withPlanGate('mi_feature', handler)`
4. En UI que lista la feature: wrap con `<FeatureLock feature="mi_feature" />`

### Agregar un tab al Worker Hub
1. Crear `src/components/workers/profile/tabs/tab-mi-tab.tsx` (patrón de los 8 existentes)
2. Registrar en `src/components/workers/profile/worker-profile.tsx`:
```tsx
<TabsTrigger variant="underline" value="mi-tab">
  <MiIcon className="h-3.5 w-3.5" /> Mi Tab
</TabsTrigger>
<TabsContent value="mi-tab">
  <TabMiTab workerId={worker.id} workerFirstName={worker.firstName} />
</TabsContent>
```
3. Si requiere datos adicionales → extender fetch en `src/app/dashboard/trabajadores/[id]/page.tsx`

### Agregar un alert type
1. Agregar al enum `WorkerAlertType` en `prisma/schema.prisma`
2. Correr `npx prisma migrate dev --name add_alert_X`
3. Agregar regla en `src/lib/alerts/alert-engine.ts` → `generateWorkerAlerts()`
4. (Opcional) Trigger en mutación relevante (ej: al subir documento)

### Agregar una norma legal al RAG
1. Agregar chunks a `src/lib/ai/rag/legal-corpus.ts` (o `extended-corpus.ts`)
2. Re-indexar embeddings (script pending en `scripts/ingest/`)
3. Test queries contra el corpus

### Agregar un placeholder al catálogo de plantillas
1. Editar `src/lib/templates/org-template-engine.ts` → `PLACEHOLDER_CATALOG`
2. Agregar `{ key, label, description, path, group, example }`
3. Si el path es derivado (ej: `worker.sueldoEnLetras`) → agregar lógica en `resolveFieldPath()`
4. La UI del editor en `/dashboard/configuracion/empresa/plantillas/[id]` lo expone automáticamente

### Agregar un tipo de documento al verifier IA
1. Editar `src/lib/ai/document-verifier.ts` → `DOC_PROMPTS`
2. Agregar entrada con `{ label, expectedFields, instructions, crossMatch }`
3. Si requiere matchear un campo nuevo del worker → extender `WorkerIdentity` + `crossMatchFields()`
4. Probar con un archivo real de prueba antes de shippear (consume tokens OpenAI)
5. Agregar también a `src/lib/compliance/legajo-config.ts` → `REQUIRED_DOC_TYPES` si es del legajo obligatorio

### Agregar una señal que dispare la cascada de onboarding
1. En el handler de la mutación → agregar lazy-import:
```ts
void (async () => {
  const { runOnboardingCascade } = await import('@/lib/onboarding/cascade')
  await runOnboardingCascade(workerId, { triggeredBy: ctx.userId, contractId })
})()
```
2. La cascada es idempotente (AuditLog `ONBOARDING_CASCADE_EXECUTED`) — safe para re-disparar
3. Si querés forzar re-ejecución → pasar `force: true`

### Agregar un signatureLevel nuevo (ej: CERTIFIED via RENIEC)
1. Extender el union en `src/app/api/mi-portal/contratos/[id]/firmar/route.ts` → `VALID_LEVELS`
2. Agregar branch en el modal `CeremonyModal` (`src/app/mi-portal/contratos/[id]/page.tsx`)
3. Persistir en `Contract.formData._signature.level`
4. Mostrar badge correspondiente en `tab-contratos.tsx`
5. **No olvidar:** la evidencia probatoria debe incluir en `AuditLog.metadataJson` todo lo que el cliente firmante proveyó (challenge, response, attestation)

### Migrar una página vieja al design system Emerald Light
1. Reemplazar header `<h1 className="text-white text-2xl">...</h1>` por `<PageHeader eyebrow="..." title="..." subtitle="..." actions={...} />`
2. Reemplazar stat cards dark-mode por `<KpiGrid>` con `<KpiCard variant="accent|crimson|amber" />`
3. Remover clases dark: `text-white`, `text-slate-*`, `bg-surface/75`, `border-glass-border`, `border-white/[0.0X]`. Reemplazarlas por alguno de estos (según contexto): text-primary / text-secondary / text-tertiary usando tokens CSS — por ejemplo `text-[color:var(--text-secondary)]`; para fondos `bg-white` o `bg-[color:var(--neutral-50)]`; para bordes `border-[color:var(--border-default)]`.
4. Primary buttons: `bg-primary` → `bg-emerald-600 hover:bg-emerald-700`
5. Gold accents: `text-gold`/`bg-gold/10` → `text-amber-500`/`bg-amber-50`

---

## 10. Variables de entorno

Ver [`.env.example`](.env.example) para template completo. Agrupadas por función:

### Auth (Clerk)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### DB (PostgreSQL)
```
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

### Storage (Supabase)
```
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
# Bucket: worker-documents
```

### AI (OpenAI)
```
OPENAI_API_KEY=sk-xxx
```

### Pagos (Culqi)
```
CULQI_PUBLIC_KEY=pk_test_xxx
CULQI_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CULQI_PUBLIC_KEY=pk_test_xxx   # Expuesto al browser
```

### Email (Resend)
```
RESEND_API_KEY=re_xxx
```

### Push (Web Push)
```
# Generar con: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:alerts@comply360.pe
```

### Cron (seguridad)
```
CRON_SECRET=random-string-min-32-chars
```

### SUNAT/RENIEC (apis.net.pe)
```
APIS_NET_PE_TOKEN=...
```

### JWT (firmas)
```
JWT_SECRET=random-string-min-32-chars
```

### Sentry (observabilidad)
```
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/0
SENTRY_AUTH_TOKEN=sntrys_xxx
```

### Otros
```
TWILIO_*           # SMS (opcional)
RECAPTCHA_SECRET_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=51999999999    # Fallback
NODE_ENV=development
```

---

## 11. Testing

### Unit/Integration tests (Vitest)
- **31 archivos de test** en `src/**/__tests__/`
- **518 tests** totales (calculadoras + compliance + agents + auth + pdf + sst + exports + integrations)
- Correr: `npm test` (CI) o `npm run test:watch` (dev)
- Coverage: `npm run test:coverage`

### E2E tests (Playwright)
- **5 specs** en `e2e/*.spec.ts`
- Correr: `npm run test:e2e` (headless) o `npm run test:e2e:ui` (debug)
- Configurado en `playwright.config.ts`

### Naming
- `mi-funcion.test.ts` (no `.spec.` para unit)
- `mi-flujo.spec.ts` para E2E

---

## 12. Scripts útiles

```bash
# Desarrollo
npm run dev              # next dev (Turbopack en puerto 3000)

# Build + deploy
npm run build            # next build
npm run start            # servidor producción

# Lint + types
npm run lint             # eslint
npx tsc --noEmit         # typecheck sin generar archivos

# DB (Prisma)
npm run db:migrate       # crear + aplicar migración
npm run db:seed          # tsx prisma/seed.ts (normas + templates)
npm run db:studio        # GUI en http://localhost:5555
npm run db:reset         # reset completo (CUIDADO en prod)

# Tests
npm test                 # vitest run
npm run test:watch       # vitest (hot reload)
npm run test:coverage    # coverage report
npm run test:e2e         # playwright
npm run test:e2e:ui      # playwright UI

# PWA assets (one-shot, no en package.json)
# Ver scripts/gen-icons.mjs (borrado después de usar) — usa sharp
```

### Scripts de CLI (`scripts/`)
- `scripts/export/` — export jobs
- `scripts/ingest/` — ingesta de corpus legal

---

## 13. Deploy

### Target: **Vercel** (recomendado)

**Razones:**
- Next.js 16 App Router optimizado
- Edge functions gratis
- Crons nativos (`vercel.json`)
- Serverless scaling automático

### Config (`vercel.json`)
```json
{
  "crons": [
    { "path": "/api/cron/morning-briefing", "schedule": "0 12 * * *" },
    { "path": "/api/cron/drip-emails", "schedule": "0 11 * * *" },
    { "path": "/api/cron/daily-alerts", "schedule": "0 13 * * *" },
    { "path": "/api/cron/weekly-digest", "schedule": "0 13 * * 1" },
    { "path": "/api/cron/norm-updates", "schedule": "30 12 * * *" },
    { "path": "/api/cron/founder-digest", "schedule": "0 13 * * *" },
    { "path": "/api/cron/check-trials", "schedule": "0 14 * * *" },
    { "path": "/api/cron/risk-sweep", "schedule": "0 7 * * 1" }
  ]
}
```

### Supabase para DB + Storage
1. Crear proyecto Supabase
2. Copiar `DATABASE_URL` + `DIRECT_URL` (pooler + direct)
3. Crear bucket `worker-documents` con policy `authenticated`
4. Agregar `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`

### Primera vez
```bash
# 1. Aplicar migraciones en prod
npx prisma migrate deploy

# 2. Seed (solo primera vez)
npm run db:seed

# 3. Deploy
vercel --prod
```

### Post-deploy checklist
- [ ] Clerk keys de producción (pk_live/sk_live)
- [ ] Culqi keys de producción
- [ ] VAPID keys generadas + en env
- [ ] Resend API key + dominio verificado
- [ ] Sentry DSN activo
- [ ] Cron secret configurado en Vercel
- [ ] DNS apuntando a Vercel (CNAME)
- [ ] SSL verificado

---

## 14. Deuda técnica conocida

Esta sección lista pendientes conocidos para que el próximo ingeniero no se sorprenda.

### Alta prioridad
- **Pricing inconsistency**: `/dashboard/planes/page.tsx` muestra precios 99/249/499, `src/lib/constants.ts` define 49/149/399. Resolver cuál es canónico.
- **Onboarding wizard** (`/dashboard/onboarding`) existe pero sin audit reciente. Copy genérico, no rebrandeado completo.
- **46 `bg-slate-*` residuales** en páginas del dashboard — el último agente que corrió limpió 2,076 tokens dark-mode pero estos 46 fueron innocuos/utility (bg-slate-50/100). Auditar visualmente.
- **End-to-end nunca probado**: signup → onboarding → diagnóstico → upgrade → pago no ha corrido completo con un usuario real. Recomendado antes de shipping.

### Media prioridad
- **`src/lib/signature/` y `src/lib/signatures/`** — duplicación de carpetas, una sola debería existir.
- **`src/app/api/payments/webhook/route.ts`** vs `/api/webhooks/subscriptions/route.ts` — dos webhooks, aclarar cuál usa Culqi.
- **WhatsApp provider** (`src/lib/whatsapp.ts`) es stub — nunca envía realmente.
- **pgvector indexing** — el código RAG tiene `vector-retriever.ts` pero falta el pipeline de indexación automática del corpus.
- **Cron `check-trials`** existe pero no está testeado contra org con trial expirado real.
- **WebAuthn challenge client-side** (`src/lib/webauthn.ts`): el challenge se genera en el browser. Suficiente para validez entre partes (el audit trail server-side es la prueba real), pero para replay-protection estricto hay que mover a `@simplewebauthn/server` con challenge server-side + nuevo modelo Prisma para almacenar challenges pendientes.
- **PDF vision no soportado** (`src/lib/ai/document-verifier.ts`): solo acepta JPG/PNG. CVs y certificados médicos (típicamente PDF) devuelven `decision: 'unsupported'`. Solución: integrar `pdfjs-dist` para renderizar primera página a imagen antes de mandar a GPT-4o.
- **RENIEC firma digital**: `signatureLevel: 'CERTIFIED'` queda como placeholder. Requiere SDK oficial + certificado emitido + cuenta RENIEC.
- **Auto-detección de `expiresAt`**: cuando la IA ve "válido hasta: DD/MM/YYYY" en un certificado médico, no actualiza `WorkerDocument.expiresAt`. Feature pending — desbloquearía alertas `DOCUMENTO_VENCIDO` sin input manual.
- **Flag anti-fraude proactivo**: si `decision: 'mismatch'`, el verifier solo logea. Debería crear `WorkerAlert` severidad CRITICAL "Posible fraude en legajo" visible en cockpit.

### Baja prioridad
- **Dashboard pages count**: 106 páginas en `/dashboard/*` es MUCHO. Plan maestro objetivo era reducir a ~50. Candidatos a consolidar: `/boletas`, `/vacaciones`, `/solicitudes`, `/asistencia` (absorbidas dentro de Worker profile pero las páginas top-level siguen ahí).
- **Chrome extension** (`chrome-extension/`) — bridge SUNAT-SOL — ~680 LOC funcionales, 7 archivos. Sin documentación propia.
- **Admin dashboard** (`/admin`) — sin audit de seguridad reciente.
- **i18n** — infra existe (ES/EN/PT) pero sólo ES está completo en copy.
- **Workflows** (`src/lib/workflows/`) — engine.ts + triggers.ts con framework completo (5 step types, 10+ eventos predefinidos), pero sin UI, sin modelo Prisma, sin cron. Infraestructura lista para wiring.
- **Gamificación** (`/dashboard/gamificacion`) — UI existe, modelo `GamificationEvent` en Prisma, pero la página no consume datos reales.

### Files >600 LOC a considerar extraer
- `src/app/dashboard/terceros/page.tsx` (1,403 LOC)
- `src/app/dashboard/trabajadores/page.tsx` (1,308 LOC)
- `src/app/dashboard/analizar-contrato/page.tsx` (1,277 LOC)
- `src/app/dashboard/expedientes/page.tsx` (1,220 LOC)
- `src/app/dashboard/alertas/page.tsx` (1,026 LOC)
- `src/app/page.tsx` (1,100 LOC — landing)

---

## 15. Glosario

| Término | Significado |
|---|---|
| **Régimen** | Tipo de contrato laboral peruano (GENERAL, MYPE, AGRARIO, etc.) — determina beneficios |
| **RMV** | Remuneración Mínima Vital (S/ 1,130 en 2026) |
| **UIT** | Unidad Impositiva Tributaria (S/ 5,500 en 2026) — base para multas SUNAFIL |
| **CTS** | Compensación por Tiempo de Servicios (depósitos 15-may y 15-nov) |
| **Gratificación** | Pago obligatorio Julio y Diciembre + bono extraordinario 9% (Ley 30334) |
| **AFP/ONP** | Sistemas previsionales (AFP privado o ONP estatal) |
| **EsSalud** | Seguro social de salud (9% del sueldo) |
| **SCTR** | Seguro Complementario Trabajo de Riesgo |
| **T-Registro** | Registro electrónico de trabajadores en MTPE |
| **PLAME** | Planilla Mensual Electrónica (SUNAT) |
| **SUNAFIL** | Superintendencia Nacional de Fiscalización Laboral |
| **SUNAT** | Superintendencia Nacional de Aduanas y Administración Tributaria |
| **RENIEC** | Registro Nacional de Identificación y Estado Civil |
| **MTPE** | Ministerio de Trabajo y Promoción del Empleo |
| **IPERC** | Identificación de Peligros, Evaluación y Control de Riesgos (SST) |
| **EPP** | Equipo de Protección Personal |
| **EMO** | Examen Médico Ocupacional |
| **Acta de Requerimiento** | Documento que genera SUNAFIL tras inspección (R.M. 199-2016-TR) |
| **Legajo** | Expediente digital del trabajador (28 documentos obligatorios) |
| **Triple vacacional** | Sanción cuando trabajador acumula 2+ años sin gozar vacaciones |
| **TFL** | Tribunal de Fiscalización Laboral |
| **IGV** | Impuesto General a las Ventas (18%) |
| **Culqi** | Pasarela de pagos Perú (equivalente a Stripe) |

---

## Mantenimiento de este documento

- Cada vez que agregues una **nueva feature completa** (página + API + componente): agregar bullet en sección 6 + 9
- Cada vez que agregues un **modelo Prisma**: actualizar sección 4
- Cada vez que **elimines deuda técnica**: remover línea de sección 14
- Cada **6 meses**: audit completo con `find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -20` para detectar archivos monstruo

**Última actualización**: 2026-04-21

**Cambios principales desde inicio**:
- Design system "Emerald Light" completo (signature visual)
- Worker Hub con 8 tabs con data real
- PWA + push notifications operativos
- Upgrade funnel Culqi end-to-end cableado (sin test prod todavía)
- 2,076 tokens dark-mode limpiados across the codebase
- 14 páginas migradas a PageHeader editorial

**Cambios 2026-04-20 — Loop de onboarding end-to-end**:
- **Biblioteca de plantillas** (`src/lib/templates/org-template-engine.ts` + UI `/dashboard/configuracion/empresa/plantillas`). Zero-liability: empresa sube su contrato con `{{PLACEHOLDERS}}`, sistema hace merge determinístico. Sin IA escribiendo cláusulas. 17 tipos de documento, 27 placeholders estándar.
- **Cascada de onboarding** (`src/lib/onboarding/cascade.ts`): al firmar contrato → crea WorkerRequests + email + audit. Idempotente, fire-and-forget, trigger automático desde PATCH `/api/contracts/[id]` y POST `/api/mi-portal/contratos/[id]/firmar`.
- **Firma biométrica WebAuthn** (`src/lib/webauthn.ts` + `/mi-portal/contratos/[id]`): Touch ID / huella / Windows Hello con graceful fallback a SIMPLE. Validez Ley 27269.
- **Auto-verificación con IA vision** (`src/lib/ai/document-verifier.ts`): GPT-4o-mini valida tipo + extrae datos + cross-match contra worker. Policy: auto-verified / needs-review / mismatch / wrong-type. Badge "IA ✨" en tab-legajo. Plan gate PRO (`review_ia`).
- **PWA del trabajador** ya cableado: `/mi-portal` mobile-first con bottom nav, firma biométrica de boletas y contratos, upload real a Supabase Storage (antes era placeholder).
- **Persistencia sin migraciones**: todo lo nuevo reutiliza modelos existentes — `OrgDocument` con JSON en `description` (plantillas), `WorkerRequest` con tag `[doc:x]` (cascade), `AuditLog` como source of truth de firmas y verificaciones IA.

**Cambios 2026-04-21 — Auditoría de precisión documental**:
- Corregido conteo de tests: 344+ → **518** (verificado con `vitest run`)
- Corregido conteo de agentes IA: 11 → **14**
- Corregido áreas diagnóstico: 8 → **10**
- Corregido placeholders: 24 → **27**
- Corregido features plan gate: 15 → **16** (agregado `gamificacion`)
- Corregido páginas dashboard: 104 → **106**
- Corregido RAG corpus: +40 → **+75** normas en legal-corpus.ts
- Sincronizado cron jobs con vercel.json real (6 crons: morning-briefing, drip-emails, daily-alerts, weekly-digest, norm-updates, founder-digest)
- Documentados en deuda técnica: workflows framework, gamificación UI, chrome extension (~680 LOC)
