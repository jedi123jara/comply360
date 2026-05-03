@AGENTS.md

# COMPLY360 PERU — Plan Maestro de Desarrollo

> Plataforma SaaS de Compliance Laboral Integral para el mercado peruano.
> Este documento es la guia definitiva de desarrollo. Cada sesion de trabajo debe consultarlo.

---

## INDICE

1. [Vision del Producto](#1-vision-del-producto)
2. [Stack Tecnologico](#2-stack-tecnologico)
3. [Estado Actual del Proyecto](#3-estado-actual-del-proyecto)
4. [Arquitectura de Datos](#4-arquitectura-de-datos)
5. [Fases de Desarrollo](#5-fases-de-desarrollo)
6. [Fase 0 — Cimientos](#fase-0--cimientos-estabilizar-lo-existente) ✅
7. [Fase 1 — MVP Vendible](#fase-1--mvp-vendible) ✅
8. [Fase 1.5 — Worker App + Firma biometrica](#fase-15--worker-app--firma-biometrica-nuevo-2026-04) ✅ NUEVO
9. [Fase 2 — Diferenciacion](#fase-2--diferenciacion) ✅
10. [Fase 2.5 — Pivot zero-liability: Biblioteca de plantillas](#fase-25--pivot-zero-liability-biblioteca-de-plantillas-nuevo-2026-04) ✅ NUEVO
11. [Fase 3 — Compliance Completo](#fase-3--compliance-completo) 🟡
12. [Fase 3.5 — IA Vision para legajo](#fase-35--ia-vision-para-legajo-nuevo-2026-04) ✅ NUEVO
13. [Fase 5 — SST Premium](#fase-5--sst-premium-nuevo-2026-05) 🟡 NUEVO
14. [Fase 4 — Ecosistema](#fase-4--ecosistema) 🟡
15. [Mapa de Modulos vs Fases](#6-mapa-de-modulos-vs-fases)
16. [Convenciones de Codigo](#7-convenciones-de-codigo)
17. [Reglas de Negocio Criticas](#8-reglas-de-negocio-criticas)
18. [Base Legal de Referencia](#9-base-legal-de-referencia)

---

## 1. VISION DEL PRODUCTO

COMPLY360 PERU es la primera plataforma SaaS de compliance laboral integral del mercado peruano.

**Propuesta de valor**: Una empresa que use COMPLY360 no necesita contratar un estudio juridico laboral externo, no sufre multas SUNAFIL sorpresa, y opera con plena certeza legal en los 12 regimenes laborales vigentes.

**Posicionamiento**: No compite con Buk (RRHH generalista) ni Ofisis (planillas). Los complementa o reemplaza en el componente critico de compliance.

**Usuarios objetivo**:
- Responsables de RRHH de empresas peruanas (10-500 trabajadores)
- Contadores que gestionan planillas
- Asesores legales laborales
- Gerentes generales de MYPE/PYME

---

## 2. STACK TECNOLOGICO

| Capa | Tecnologia | Notas |
|------|-----------|-------|
| Framework | Next.js 16 (App Router) | Leer `node_modules/next/dist/docs/` antes de tocar APIs nuevas |
| UI | React 19 + Tailwind CSS 4 | Componentes en `src/components/ui/` |
| Auth | Clerk (@clerk/nextjs v7) | Multi-tenant via orgId |
| DB | PostgreSQL + Prisma 7 | Schema en `prisma/schema.prisma` |
| AI | OpenAI API (key en .env) | Para review de contratos y asistente IA |
| Pagos | Culqi (Peru) | Keys en .env |
| Deploy | Pendiente (target: Vercel + Supabase) | -- |

**Directorio principal**: `C:\Users\User\Desktop\LEGALIA PROO\legaliapro-platform\`
**Marketing site**: `C:\Users\User\Desktop\LEGALIA PROO\legaliapro\` (HTML estatico, NO tocar a menos que se pida)

---

## 3. ESTADO ACTUAL DEL PROYECTO

> **Snapshot 2026-04-21**: Fases F0-F2 esencialmente completas. F3 ~60%. F4 ~40% (E-Learning y Crawler mas avanzados de lo previsto).
> Ademas se incorporaron **3 vetas no planificadas** (portal del trabajador PWA + firma biometrica,
> biblioteca de plantillas zero-liability, auto-verify de docs con IA vision) que resuelven
> fricciones reales y desbloquearon nuevo valor. Ver secciones **Fase 1.5**, **Fase 2.5** y **Fase 3.5**.
>
> Para la foto tecnica viva (archivos, modelos, flujos end-to-end), ver [ARCHITECTURE.md](./ARCHITECTURE.md).
>
> **Auditoria 2026-04-21**: se verificaron todos los conteos numericos contra el codebase real. Tests: 518 (vitest run). Agentes IA: 14. Areas diagnostico: 10. Placeholders: 27. Features plan gate: 16. Paginas dashboard: 106. Normas RAG: 75+. Crons: 6.

### 3.1 Lo que FUNCIONA (verificado, 2026-04-21)

**Core legal (F0 + F1.5 + F1.6)**
| Componente | Ubicacion | Estado |
|-----------|-----------|--------|
| 13 Calculadoras laborales | `src/lib/legal-engine/calculators/` | COMPLETAS (+518 tests) - CTS, Liquidacion, Gratificacion, Indemnizacion, Horas Extras, Vacaciones, Multa SUNAFIL, Intereses Legales, Boleta, Aportes previsionales, Renta 5ta, Costo empleador, Utilidades |
| Constantes Peru 2026 | `src/lib/legal-engine/peru-labor.ts` | COMPLETO - RMV 1130, UIT 5500 |
| 12 Regimenes laborales | `src/lib/legal-engine/` + enums Prisma | COMPLETO - GENERAL, MYPE_MICRO/PEQUENA, AGRARIO, CONSTRUCCION, MINERO, PESQUERO, TEXTIL, DOMESTICO, CAS, MODALIDAD_FORMATIVA, TELETRABAJO |
| Templates de contrato | `src/lib/legal-engine/contracts/templates.ts` + **biblioteca org-templates** | COMPLETO - 3 base + plantillas propias por empresa con merge fields (ver Fase 2.5) |

**Multi-tenancy + Auth (F0)**
| Componente | Ubicacion | Estado |
|-----------|-----------|--------|
| Auth Clerk + roles | `src/lib/auth.ts`, `src/lib/api-auth.ts`, `src/proxy.ts` | FUNCIONAL - OWNER/ADMIN/MEMBER/VIEWER/WORKER/SUPER_ADMIN |
| Plan gating | `src/lib/plan-gate.ts`, `plan-features.ts` | FUNCIONAL - 16 features, 4 planes, upgrade funnel Culqi |
| Onboarding wizard | `/dashboard/onboarding` | FUNCIONAL (necesita audit visual) |

**Workers + Legajo (F1)**
| Componente | Ubicacion | Estado |
|-----------|-----------|--------|
| Worker CRUD + bulk import | `src/app/api/workers/` | COMPLETO - manual, Excel, CSV, ingesta batch PDF |
| Legajo Digital | `src/app/api/workers/[id]/documents/` | COMPLETO - 18 docs obligatorios, recalc `legajoScore` |
| Alert engine (12 tipos) | `src/lib/alerts/alert-engine.ts` | COMPLETO - triggers en todas las mutaciones |
| Worker Hub (8 tabs) | `src/components/workers/profile/` | COMPLETO - info, legajo, contratos, remuneraciones, vacaciones, SST, beneficios en vivo, historial |

**Compliance (F1 + F2)**
| Componente | Ubicacion | Estado |
|-----------|-----------|--------|
| Score de compliance | `src/lib/compliance/score-calculator.ts` + `sync-score.ts` | COMPLETO - snapshots historicos |
| Diagnostico SUNAFIL | `src/lib/compliance/diagnostic-scorer.ts` + 135 preguntas | COMPLETO - FULL (135) y EXPRESS (20) + gap analysis + plan de accion |
| Simulacro SUNAFIL | `src/lib/compliance/simulacro-engine.ts` | COMPLETO - inspeccion virtual + Acta PDF |
| Calendario compliance | `/dashboard/calendario` | COMPLETO - CTS, grati, PLAME, AFP, vencimientos worker |
| Dashboard cockpit | `/dashboard/page.tsx` | COMPLETO - narrative, hero ring, heatmap, radar, top risks |

**IA (F2)**
| Componente | Ubicacion | Estado |
|-----------|-----------|--------|
| AI Provider multi-proveedor | `src/lib/ai/provider.ts` | FUNCIONAL - OpenAI/Ollama/Deepseek/Groq |
| Copilot drawer + streaming | `src/components/copilot/` + `src/lib/ai/chat-engine.ts` | COMPLETO - SSE + context injection por ruta |
| RAG sobre +75 normas | `src/lib/ai/rag/` + `legal-corpus.ts` | FUNCIONAL - retriever BM25 + vector-retriever (pgvector pendiente indexado) |
| AI Review de contratos | `src/lib/ai/contract-review.ts` | FUNCIONAL |
| 14 Agentes especializados | `src/lib/agents/` | COMPLETO |
| Auto-verify documentos (IA vision) | `src/lib/ai/document-verifier.ts` | COMPLETO - ver Fase 3.5 |

**SST + Denuncias (F3)**
| Componente | Ubicacion | Estado |
|-----------|-----------|--------|
| Hub SST | `/dashboard/sst/` + `SstRecord` | COMPLETO - politicas, IPERC, accidentes, EMO, EPP, capacitaciones |
| Generadores SST (15) | `src/lib/generators/` | COMPLETO - politica-sst, hostigamiento, cuadro-categorias, acta-comite, plan-anual, iperc, induccion, registro-accidentes, reglamento-interno, mapa-riesgos, capacitacion-sst, entrega-epp, declaracion-jurada, horario-cartel, sintesis-legislacion |
| Canal denuncias (Ley 27942) | `/denuncias/[slug]` publica + `/dashboard/denuncias` | COMPLETO |

**Portal del Trabajador (F1.5 — NUEVO)**
| Componente | Ubicacion | Estado |
|-----------|-----------|--------|
| Portal mobile-first PWA | `/mi-portal/*` | COMPLETO - inicio, documentos, boletas, solicitudes, contratos, capacitaciones, RIT, notificaciones, denuncias |
| Firma biometrica WebAuthn | `src/lib/webauthn.ts` + `/mi-portal/boletas/[id]` + `/mi-portal/contratos/[id]` | COMPLETO - Touch ID/huella/Hello + graceful fallback a SIMPLE |
| Cascada de onboarding | `src/lib/onboarding/cascade.ts` | COMPLETO - trigger automatico al firmar contrato |

**Billing + PWA + Notificaciones**
| Componente | Ubicacion | Estado |
|-----------|-----------|--------|
| Culqi upgrade funnel end-to-end | `src/lib/payments/culqi.ts` + `CulqiCheckoutModal` | COMPLETO (sin test prod todavia) |
| PWA instalable | `public/manifest.webmanifest` + `public/sw.js` + `register-sw.tsx` | COMPLETO |
| Push notifications (VAPID) | `src/lib/notifications/web-push-server.ts` | COMPLETO |
| Email Resend (6 templates) | `src/lib/email/` | COMPLETO - welcome, alert, digest, complaint, password reset, worker onboarding |
| 8 crons operativos | `vercel.json` | FUNCIONAL - morning-briefing, drip-emails, daily-alerts, weekly-digest, norm-updates, founder-digest, check-trials, risk-sweep |

### 3.2 Lo que es STUB/PLACEHOLDER (necesita implementacion real)

| Componente | Problema | Prioridad |
|-----------|---------|-----------|
| WhatsApp Business API | Provider stub en `src/lib/whatsapp.ts` | BAJA |
| PDF vision en auto-verify | Solo JPG/PNG; PDFs devuelven `unsupported` — falta `pdfjs-dist` para renderizar primera pagina | MEDIA |
| Challenge WebAuthn server-side | Challenge actual es client-side (suficiente para validez entre partes, pero ideal moverlo a `@simplewebauthn/server`) | MEDIA |
| pgvector indexing automatico | `vector-retriever.ts` existe, falta pipeline de ingesta | MEDIA |
| Cron `check-trials` | No probado contra org con trial expirado real | MEDIA |
| End-to-end signup → pago | Nunca corrido completo con usuario real | ALTA |

### 3.3 Lo que FALTA por completar

| Modulo del Plan Maestro | Fase objetivo | Estado real |
|------------------------|---------------|-------------|
| E-Learning (cursos + evaluaciones + certificados QR) | F4.1 | 🟡 Modelos Prisma + rutas + UI existen. Falta: generacion QR de certificados |
| Crawler normativo (scraping El Peruano/SUNAFIL) | F4.2 | 🟡 `src/lib/crawler/` tiene fetcher RSS + classifier IA funcionales. Falta: conectar a cron pipeline |
| Integraciones T-REGISTRO / PLAME / RENIEC firma digital | F4.3 | ⏳ No existe |
| Reportes avanzados PDF con `@react-pdf/renderer` | F3.3 (parcial) | ⏳ @react-pdf/renderer no instalado. jsPDF cubre lo basico |
| Marketplace de abogados | F4.4 | ⏳ No existe |
| Flag anti-fraude proactivo en auto-verify | F3.5 extension | ⏳ No existe |
| Auto-detección de `expiresAt` por IA | F3.5 extension | ⏳ No existe |
| Workflows automatizados | F4+ | 🟡 Framework en `src/lib/workflows/` (engine + triggers), sin UI ni DB |
| Gamificacion con datos reales | F4+ | 🟡 UI + modelo GamificationEvent existen, sin wiring |

> **Nota**: para ver cambios especificos desde que este documento empezo, revisar el changelog en [ARCHITECTURE.md §14](./ARCHITECTURE.md#14-deuda-tecnica-conocida) y la seccion de "Mantenimiento" al final del mismo.

---

## 4. ARQUITECTURA DE DATOS

### 4.1 Modelos actuales en Prisma (ya existen)

```
Organization, User, ContractTemplate, Contract, LegalNorm, LegalRule,
Calculation, NormAlert, OrgAlert, Subscription, AuditLog
```

### 4.2 Modelos NUEVOS necesarios (por fase)

#### FASE 0 — Conexion DB
- Conectar Prisma a PostgreSQL real
- Seed de datos iniciales (normas, templates, reglas)

#### FASE 1 — Worker y core compliance

```prisma
// MODELO CENTRAL — Todo el sistema gira alrededor de Worker
model Worker {
  id                String   @id @default(cuid())
  orgId             String   @map("org_id")
  // Datos personales
  dni               String
  firstName         String   @map("first_name")
  lastName          String   @map("last_name")
  email             String?
  phone             String?
  birthDate         DateTime? @map("birth_date")
  gender            String?
  nationality       String?  @default("peruana")
  address           String?
  // Datos laborales
  position          String?  // Cargo
  department        String?  // Area
  regimenLaboral    RegimenLaboral @default(GENERAL) @map("regimen_laboral")
  tipoContrato      TipoContrato @default(INDEFINIDO) @map("tipo_contrato")
  fechaIngreso      DateTime @map("fecha_ingreso")
  fechaCese         DateTime? @map("fecha_cese")
  motivoCese        String?  @map("motivo_cese")
  sueldoBruto       Decimal  @map("sueldo_bruto") @db.Decimal(10, 2)
  asignacionFamiliar Boolean @default(false) @map("asignacion_familiar")
  jornadaSemanal    Int      @default(48) @map("jornada_semanal") // horas
  tiempoCompleto    Boolean  @default(true) @map("tiempo_completo")
  // Previsional
  tipoAporte        TipoAporte @default(AFP) @map("tipo_aporte")
  afpNombre         String?  @map("afp_nombre")
  cuspp             String?
  essaludVida       Boolean  @default(false) @map("essalud_vida")
  sctr              Boolean  @default(false)
  // Estado
  status            WorkerStatus @default(ACTIVE)
  legajoScore       Int?     @map("legajo_score") // 0-100 completitud
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  organization      Organization @relation(fields: [orgId], references: [id])
  documents         WorkerDocument[]
  contracts         WorkerContract[]
  vacations         VacationRecord[]
  alerts            WorkerAlert[]

  @@unique([orgId, dni])
  @@index([orgId, status])
  @@index([orgId, regimenLaboral])
  @@map("workers")
}

enum RegimenLaboral {
  GENERAL           // D.Leg. 728
  MYPE_MICRO        // Ley 32353 (ex 28015) - hasta 10 trabajadores
  MYPE_PEQUENA      // Ley 32353 - hasta 100 trabajadores
  AGRARIO           // Ley 31110
  CONSTRUCCION_CIVIL
  MINERO
  PESQUERO
  TEXTIL_EXPORTACION // D.Ley 22342
  DOMESTICO         // Ley 27986
  CAS               // Contrato Administrativo de Servicios
  MODALIDAD_FORMATIVA // Ley 28518
  TELETRABAJO       // Ley 31572
}

enum TipoContrato {
  INDEFINIDO
  PLAZO_FIJO
  TIEMPO_PARCIAL
  INICIO_ACTIVIDAD
  NECESIDAD_MERCADO
  RECONVERSION
  SUPLENCIA
  EMERGENCIA
  OBRA_DETERMINADA
  INTERMITENTE
  EXPORTACION
}

enum TipoAporte {
  AFP
  ONP
  SIN_APORTE // modalidades formativas
}

enum WorkerStatus {
  ACTIVE
  ON_LEAVE    // licencia/vacaciones
  SUSPENDED   // suspension
  TERMINATED  // cesado
}

// Legajo Digital — 28 documentos obligatorios por trabajador
model WorkerDocument {
  id            String   @id @default(cuid())
  workerId      String   @map("worker_id")
  category      DocCategory
  documentType  String   @map("document_type") // "contrato_trabajo", "boleta_pago", etc.
  title         String
  fileUrl       String?  @map("file_url")
  fileSize      Int?     @map("file_size")
  mimeType      String?  @map("mime_type")
  isRequired    Boolean  @default(false) @map("is_required")
  expiresAt     DateTime? @map("expires_at")
  verifiedAt    DateTime? @map("verified_at")
  verifiedBy    String?  @map("verified_by")
  status        DocStatus @default(PENDING)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  worker        Worker   @relation(fields: [workerId], references: [id])

  @@index([workerId, category])
  @@index([expiresAt])
  @@map("worker_documents")
}

enum DocCategory {
  INGRESO       // Contrato, CV, DNI, antecedentes
  VIGENTE       // Boletas, vacaciones, capacitaciones
  SST           // IPERC, EPP, examenes medicos
  PREVISIONAL   // AFP/ONP, SCTR, EsSalud
  CESE          // Liquidacion, carta cese, CTS final
}

enum DocStatus {
  PENDING
  UPLOADED
  VERIFIED
  EXPIRED
  MISSING
}

// Registro de vacaciones por periodo
model VacationRecord {
  id              String   @id @default(cuid())
  workerId        String   @map("worker_id")
  periodoInicio   DateTime @map("periodo_inicio")
  periodoFin      DateTime @map("periodo_fin")
  diasCorresponden Int     @default(30) @map("dias_corresponden")
  diasGozados     Int      @default(0) @map("dias_gozados")
  diasPendientes  Int      @default(30) @map("dias_pendientes")
  fechaGoce       DateTime? @map("fecha_goce")
  esDoble         Boolean  @default(false) @map("es_doble") // doble por no goce
  createdAt       DateTime @default(now()) @map("created_at")

  worker          Worker   @relation(fields: [workerId], references: [id])

  @@index([workerId])
  @@map("vacation_records")
}

// Relacion Worker <-> Contract generado
model WorkerContract {
  id          String   @id @default(cuid())
  workerId    String   @map("worker_id")
  contractId  String   @map("contract_id")
  assignedAt  DateTime @default(now()) @map("assigned_at")

  worker      Worker   @relation(fields: [workerId], references: [id])
  contract    Contract @relation(fields: [contractId], references: [id])

  @@unique([workerId, contractId])
  @@map("worker_contracts")
}

// Alertas especificas por trabajador
model WorkerAlert {
  id          String   @id @default(cuid())
  workerId    String   @map("worker_id")
  orgId       String   @map("org_id")
  type        WorkerAlertType
  severity    AlertSeverity
  title       String
  description String?
  dueDate     DateTime? @map("due_date")
  multaEstimada Decimal? @map("multa_estimada") @db.Decimal(10, 2)
  resolvedAt  DateTime? @map("resolved_at")
  resolvedBy  String?  @map("resolved_by")
  createdAt   DateTime @default(now()) @map("created_at")

  worker      Worker   @relation(fields: [workerId], references: [id])

  @@index([orgId, severity])
  @@index([dueDate])
  @@map("worker_alerts")
}

enum WorkerAlertType {
  CONTRATO_POR_VENCER
  CONTRATO_VENCIDO
  CTS_PENDIENTE
  GRATIFICACION_PENDIENTE
  VACACIONES_ACUMULADAS
  VACACIONES_DOBLE_PERIODO
  DOCUMENTO_FALTANTE
  DOCUMENTO_VENCIDO
  EXAMEN_MEDICO_VENCIDO
  CAPACITACION_PENDIENTE
  AFP_EN_MORA
  REGISTRO_INCOMPLETO
}

enum AlertSeverity {
  CRITICAL  // Rojo — accion inmediata, multa inminente
  HIGH      // Naranja — actuar esta semana
  MEDIUM    // Amarillo — planificar
  LOW       // Azul — informativo
}
```

#### FASE 2 — Diagnostico y Simulacro SUNAFIL

```prisma
// Diagnostico de Compliance
model ComplianceDiagnostic {
  id            String   @id @default(cuid())
  orgId         String   @map("org_id")
  type          DiagnosticType
  scoreGlobal   Int      @map("score_global") // 0-100
  scoreByArea   Json     @map("score_by_area") // { "contratos": 85, "sst": 60, ... }
  totalMultaRiesgo Decimal @map("total_multa_riesgo") @db.Decimal(12, 2)
  questionsJson Json     @map("questions_json") // preguntas y respuestas
  gapAnalysis   Json?    @map("gap_analysis") // brechas priorizadas
  actionPlan    Json?    @map("action_plan") // plan de accion generado
  completedAt   DateTime? @map("completed_at")
  createdAt     DateTime @default(now()) @map("created_at")

  organization  Organization @relation(fields: [orgId], references: [id])

  @@index([orgId, createdAt])
  @@map("compliance_diagnostics")
}

enum DiagnosticType {
  FULL          // 120 preguntas — diagnostico completo
  EXPRESS       // 20 preguntas — rapido mensual
  SIMULATION    // Simulacro SUNAFIL interactivo
}

// Score historico de compliance (se recalcula periodicamente)
model ComplianceScore {
  id            String   @id @default(cuid())
  orgId         String   @map("org_id")
  scoreGlobal   Int      @map("score_global")
  scoreContratos Int?    @map("score_contratos")
  scoreSst      Int?     @map("score_sst")
  scoreDocumentos Int?   @map("score_documentos")
  scoreVencimientos Int? @map("score_vencimientos")
  scorePlanilla Int?     @map("score_planilla")
  multaEvitada  Decimal? @map("multa_evitada") @db.Decimal(12, 2)
  calculatedAt  DateTime @default(now()) @map("calculated_at")

  @@index([orgId, calculatedAt])
  @@map("compliance_scores")
}
```

#### FASE 3 — SST y Canal de Denuncias

```prisma
// SST — Seguridad y Salud en el Trabajo
model SstRecord {
  id            String   @id @default(cuid())
  orgId         String   @map("org_id")
  type          SstRecordType
  title         String
  description   String?
  data          Json?    // contenido variable segun tipo
  responsibleId String?  @map("responsible_id")
  dueDate       DateTime? @map("due_date")
  completedAt   DateTime? @map("completed_at")
  status        SstStatus @default(PENDING)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([orgId, type])
  @@map("sst_records")
}

enum SstRecordType {
  POLITICA_SST
  IPERC
  PLAN_ANUAL
  CAPACITACION
  ACCIDENTE
  INCIDENTE
  EXAMEN_MEDICO
  ENTREGA_EPP
  ACTA_COMITE
  MAPA_RIESGOS
}

enum SstStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  OVERDUE
}

// Canal de Denuncias
model Complaint {
  id            String   @id @default(cuid())
  orgId         String   @map("org_id")
  code          String   @unique // DENUNCIA-2026-001
  type          ComplaintType
  isAnonymous   Boolean  @default(true) @map("is_anonymous")
  description   String
  evidenceUrls  String[] @map("evidence_urls")
  status        ComplaintStatus @default(RECEIVED)
  assignedTo    String?  @map("assigned_to")
  resolution    String?
  protectionMeasures Json? @map("protection_measures")
  receivedAt    DateTime @default(now()) @map("received_at")
  resolvedAt    DateTime? @map("resolved_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  timeline      ComplaintTimeline[]

  @@index([orgId, status])
  @@map("complaints")
}

enum ComplaintType {
  HOSTIGAMIENTO_SEXUAL
  DISCRIMINACION
  ACOSO_LABORAL
  OTRO
}

enum ComplaintStatus {
  RECEIVED          // Recibida
  UNDER_REVIEW      // En evaluacion
  INVESTIGATING     // En investigacion
  PROTECTION_APPLIED // Medidas de proteccion aplicadas
  RESOLVED          // Resuelta
  DISMISSED         // Desestimada
}

model ComplaintTimeline {
  id            String   @id @default(cuid())
  complaintId   String   @map("complaint_id")
  action        String
  description   String?
  performedBy   String?  @map("performed_by")
  createdAt     DateTime @default(now()) @map("created_at")

  complaint     Complaint @relation(fields: [complaintId], references: [id])

  @@map("complaint_timeline")
}
```

---

## 5. FASES DE DESARROLLO

Cada fase tiene un objetivo de negocio claro. NO saltar fases.

```
FASE 0 ──> FASE 1 ──> FASE 1.5 ──> FASE 2 ──> FASE 2.5 ──> FASE 3 ──> FASE 3.5 ──> FASE 4
Cimientos   MVP       Worker App   Diferenc.  Plantillas   Compliance  IA Vision   Ecosistema
                       + Firma                 zero-liab.              legajo
 ✅ DONE   ✅ DONE    ✅ DONE     ✅ DONE    ✅ DONE     🟡 60%     ✅ DONE     🟡 30%
```

**Fases "punto cinco" (1.5, 2.5, 3.5)** fueron incorporadas en 2026-04 como resultado de iteracion con usuarios y no estaban en el plan original. Resuelven fricciones reales que no se veian en el plan teorico inicial. Cada una se describe en detalle abajo.

---

### FASE 0 — CIMIENTOS (Estabilizar lo existente)

**Objetivo**: Que lo que ya existe funcione con datos reales, no mock.

#### F0.1 — Conectar base de datos PostgreSQL ✅
- [x] Configurar PostgreSQL local o Supabase
- [x] Verificar que DATABASE_URL en .env funciona
- [x] Ejecutar `npx prisma migrate dev` con el schema actual
- [x] Verificar que Prisma Client se genera correctamente en `src/generated/prisma`

#### F0.2 — Seed de datos iniciales ✅
- [x] Crear `prisma/seed.ts` con:
  - Normas legales base (D.Leg. 728, Ley 29783, Ley 27942, Ley 32353, etc.)
  - Reglas de compliance con sus formulas
  - Templates de contrato (los 3 existentes + nuevos)
  - Alertas normativas de ejemplo
- [x] Configurar seed en package.json

#### F0.3 — Conectar paginas existentes a datos reales ✅
- [x] Dashboard: reemplazar STATS, RECENT_ACTIVITY, etc. con queries Prisma
- [x] Contratos: CRUD real (crear, listar, editar, eliminar)
- [x] Calculadoras: guardar resultados en tabla Calculation
- [x] Alertas: leer de NormAlert/OrgAlert reales
- [x] Expedientes: mantenido como ruta independiente, integracion parcial con Contracts

#### F0.4 — Onboarding funcional ✅ (necesita audit visual)
- [x] Implementar `onboarding-wizard.tsx` real:
  - Paso 1: Datos empresa (RUC, razon social, sector, tamanio)
  - Paso 2: Seleccion de regimen principal
  - Paso 3: Configuracion de alertas (email del responsable RRHH)
  - Paso 4: Resumen y creacion de Organization en DB
- [x] Al completar onboarding, marcar `organization.onboardingCompleted = true`
- [x] Redirigir a onboarding si no completado

**Criterio de completitud Fase 0**: Puedes crear una cuenta, completar onboarding, generar un contrato real que se guarde en DB, hacer un calculo que se guarde, y ver alertas reales.

---

### FASE 1 — MVP VENDIBLE

**Objetivo**: Un producto por el que una empresa pague S/49-149/mes. Gestion de trabajadores + alertas inteligentes + contratos.

#### F1.1 — Modelo Worker y CRUD de Trabajadores (Modulo 2) ✅

Este es el modulo MAS CRITICO. Todo el sistema gira alrededor de los trabajadores.

- [x] Agregar modelo Worker al schema Prisma (ver seccion 4.2)
- [x] Agregar modelos WorkerDocument, VacationRecord, WorkerContract, WorkerAlert
- [x] Crear migracion y verificar
- [x] Pagina `/dashboard/trabajadores` — Lista de trabajadores (con KpiGrid + filtros)
- [x] Pagina `/dashboard/trabajadores/nuevo` — Formulario alta (con DNI auto-fetch RENIEC)
- [x] Pagina `/dashboard/trabajadores/[id]` — Worker Hub con 8 tabs (Informacion | Legajo | Contratos | Remuneraciones | Vacaciones | SST | Beneficios | Historial)

#### F1.2 — Importacion masiva de trabajadores ✅
- [x] Boton "Importar Excel" en pagina de trabajadores
- [x] Template Excel descargable con columnas esperadas
- [x] Parser de Excel (usar `xlsx` o `exceljs`)
- [x] Vista previa de datos parseados con validacion (DNI duplicado, campos requeridos)
- [x] Importacion en lote con reporte de errores
- [x] Alternativa: importar desde archivo CSV + ingesta batch de PDFs con IA

#### F1.3 — Alertas Inteligentes por Trabajador (Modulo 4 mejorado) ✅
- [x] Crear servicio `src/lib/alerts/alert-engine.ts`
- [x] Generar alertas automaticas al crear/editar trabajador (12 tipos):
  - CONTRATO_POR_VENCER, CONTRATO_VENCIDO, VACACIONES_ACUMULADAS,
    VACACIONES_DOBLE_PERIODO, DOCUMENTO_FALTANTE, DOCUMENTO_VENCIDO,
    REGISTRO_INCOMPLETO, EXAMEN_MEDICO_VENCIDO, CAPACITACION_PENDIENTE
- [x] Generar alertas por calendario (CTS_PENDIENTE, GRATIFICACION_PENDIENTE, AFP_EN_MORA)
- [x] Pagina `/dashboard/alertas` con severidad + navegacion + resolve + conteo sidebar

#### F1.4 — Calendario de Compliance (Modulo 4) ✅
- [x] Pagina `/dashboard/calendario`
- [x] Vista mensual con vencimientos pre-cargados + dinamicos
- [x] Vista "Proximos 30 dias" tipo lista priorizada
- [x] Exportacion iCal para Google Calendar / Outlook
- [x] Agregar item al sidebar NAV_ITEMS en constants.ts

#### F1.5 — Contratos expandidos (Modulo 3 mejorado) ✅ (evolucionado en Fase 2.5)
- [x] Agregar templates nuevos a `contracts/templates.ts` (3 base)
- [x] Vincular generacion de contrato con Worker: al generar contrato desde perfil del trabajador, pre-llenar datos
- [x] Validacion legal automatica basica: verificar que tipo de contrato sea compatible con regimen
- [x] **Pivot zero-liability (Fase 2.5)**: biblioteca de plantillas propias de la empresa con merge fields `{{PLACEHOLDERS}}` — reemplaza la ruta original de "templates codificados en src/lib"

#### F1.6 — Dashboard mejorado con Score de Compliance (Modulo 1) ✅
- [x] Crear servicio `src/lib/compliance/score-calculator.ts`
- [x] Score Global (0-100) = promedio ponderado por area (contratos, legajo, CTS, grati, vac, SST, docs)
- [x] Reemplazar stats mock del dashboard con datos reales
- [x] Semaforo visual: >= 80 verde, 60-79 amarillo, < 60 rojo
- [x] Monto total de multa potencial estimada
- [x] **Cockpit narrativo** (reemplazo del dashboard-grid tradicional): hero ring animado + heatmap + radar sectorial + top 5 workers riesgo + next deadlines

**Criterio de completitud Fase 1**: Una empresa puede registrar sus trabajadores (manual o Excel), ver el legajo digital con % completitud, recibir alertas automaticas de vencimientos, generar contratos vinculados a trabajadores, ver su score de compliance y calendario de obligaciones. ESTO YA SE PUEDE VENDER.

---

### FASE 1.5 — WORKER APP + FIRMA BIOMETRICA (NUEVO, 2026-04)

**Objetivo**: darle al TRABAJADOR su propio canal digital — app instalable en su celular, con firma biometrica legal y flujo de onboarding automatizado post-firma de contrato.

**Razon estrategica**: sin esto, la empresa dependia de mandar PDFs por email y rezar que los trabajadores los firmaran. Con el portal:
1. El trabajador tiene un unico lugar donde ver boletas, firmar contratos, subir documentos, ver RIT/politicas y hacer solicitudes
2. La empresa tiene **audit trail criptografico** de cada firma (IP + userAgent + credentialId + timestamp) — evidencia solida ante SUNAFIL y juicios laborales
3. **Zero fricción**: el trabajador firma con su Touch ID / huella / Face ID sin pelear con DocuSign ni impresoras
4. **Cascada automatica**: al firmar contrato → cadena de onboarding (legajo + politicas + emails) sin intervencion admin

#### F1.5.1 — Portal del Trabajador (PWA mobile-first) ✅
- [x] Modelo `User` con rol `WORKER` + vinculo a `Worker` via `userId`
- [x] Layout `/mi-portal/layout.tsx` mobile-first con bottom tab nav (5 tabs) + drawer secundario
- [x] 5 tabs principales: Inicio, Documentos, Boletas, Solicitudes, Perfil
- [x] Nav secundaria: Contratos, Capacitaciones, RIT y Politicas, Notificaciones, Canal de Denuncias
- [x] PWA instalable (manifest + service worker) con install prompt beforeinstallprompt
- [x] Push notifications VAPID desde /mi-portal
- [x] Logout via `useClerk().signOut({ redirectUrl: '/sign-in' })`
- [x] Safe-area-inset handling para iOS

#### F1.5.2 — Firma biometrica WebAuthn (Ley 27269) ✅
- [x] Lib `src/lib/webauthn.ts` con `tryBiometricCeremony()` + `hasBiometricHardware()` + graceful fallback
- [x] 3 niveles de firma: `SIMPLE` (checkbox), `BIOMETRIC` (WebAuthn), `CERTIFIED` (reservado para RENIEC futuro)
- [x] Firma de **boletas** en `/mi-portal/boletas/[id]` con `BiometricCeremonyModal`
- [x] Firma de **contratos** en `/mi-portal/contratos/[id]` con el mismo patron
- [x] Audit trail en `AuditLog` con IP + userAgent + credentialId + timestamp
- [x] Metadata de firma persistida en `Contract.formData._signature` y `Payslip.acceptedAt`
- [ ] **Pendiente**: challenge server-side con `@simplewebauthn/server` (hoy el challenge es client-side — suficiente para validez entre partes, ideal para replay-protection fuerte)

#### F1.5.3 — Cascada de onboarding ✅
- [x] Lib `src/lib/onboarding/cascade.ts` con `runOnboardingCascade(workerId, opts)` + `runOnboardingCascadeBatch`
- [x] Template `workerOnboardingEmail()` dedicado en `src/lib/email/templates.ts`
- [x] Auto-trigger en `PATCH /api/contracts/[id]` cuando `status → SIGNED`
- [x] Auto-trigger en `POST /api/mi-portal/contratos/[id]/firmar`
- [x] Endpoint manual `POST /api/workers/[id]/onboarding-cascade` para re-disparar
- [x] UI `OnboardingCascadeCard` en tab-info del worker profile (admin puede disparar + ver resultado)
- [x] Idempotencia via `AuditLog.action='ONBOARDING_CASCADE_EXECUTED'` (salvo `force: true`)

**Criterio de completitud Fase 1.5**: el trabajador recibe un email tras firmar su contrato, entra al portal desde su celular, firma con huella, sube los documentos que le piden y la empresa ve todo reflejado en tiempo real en el worker profile. Cero mails con PDFs sueltos.

---

### FASE 2 — DIFERENCIACION

**Objetivo**: Las funcionalidades que hacen que COMPLY360 sea unico en el mercado peruano. El "wow factor" que justifica el plan PRO.

#### F2.1 — Diagnostico SUNAFIL con Score (Modulo 5) ✅

- [x] Crear base de preguntas de compliance en `src/lib/compliance/questions/`
  - **135 preguntas** agrupadas en 10 areas (superamos las 120 planificadas)
  - 20 preguntas para diagnostico express
  - Cada pregunta con texto, area, base_legal, multa_asociada, peso, logica condicional
- [x] Logica condicional (régimen, tamaño org, sector)
- [x] Pagina `/dashboard/diagnostico` con wizard Typeform-style + progress bar
- [x] Pagina de resultados con radar chart + gap analysis + action plan
- [x] Modelos `ComplianceDiagnostic` y `ComplianceScore` en Prisma
- [x] Historial de diagnosticos con grafico de evolucion del score
- [x] **`ComplianceTask` spawner** (`task-spawner.ts`): action plan → tareas ejecutables con owners sugeridos

#### F2.2 — Simulacro SUNAFIL Interactivo (Modulo 6) ✅

- [x] Pagina `/dashboard/simulacro` con los 4 pasos (config → visita virtual → requerimiento → informe)
- [x] Base de conocimiento: 28 tipos de documentos que SUNAFIL solicita, por sector
- [x] Guardar resultado como ComplianceDiagnostic tipo SIMULATION
- [x] Generacion de Acta de Requerimiento (R.M. 199-2016-TR) en PDF

#### F2.3 — IA Laboral Peruana (Modulo 9) ✅

- [x] Arquitectura RAG (wrapper multi-proveedor: OpenAI / Ollama / Deepseek / Groq)
- [x] Indexar corpus legal: +75 normas + resoluciones TFL en `src/lib/ai/rag/legal-corpus.ts` y `extended-corpus.ts`
- [x] **Copilot drawer persistente** (reemplazo evolutivo de `/dashboard/asistente-ia` como pagina aislada):
  - Chat con historial por conversacion
  - Streaming SSE
  - Context injection automatico por ruta (worker, contract, etc.)
  - Shortcut global `Cmd+I` / `Ctrl+I`
- [x] API route `/api/ai-chat` con streaming + context injection
- [x] AI Review de contratos con scoring de riesgo + clausulas peligrosas (`src/lib/ai/contract-review.ts`)
- [x] **14 agentes especializados** en `src/lib/agents/` (review, generacion, plan de accion, inspector SUNAFIL, OCR, payslip-auditor, risk-monitor, etc.)
- [ ] **Pendiente**: pipeline automatico de indexado pgvector (el vector-retriever existe pero la ingesta inicial es manual)

**Criterio de completitud Fase 2**: Una empresa puede correr un diagnostico completo, simular una inspeccion SUNAFIL interactiva, consultar al asistente IA sobre cualquier tema laboral peruano, y recibir revision inteligente de contratos. ESTO JUSTIFICA EL PLAN PRO A S/399/mes.

---

### FASE 2.5 — PIVOT ZERO-LIABILITY: BIBLIOTECA DE PLANTILLAS (NUEVO, 2026-04)

**Decision estrategica**: el plan original apuntaba a "IA genera contratos" (F2 Modulo 3+9), pero esto crea **riesgo legal** para Comply360 — si la IA escribe una clausula invalida y la empresa la firma, somos corresponsables.

**Pivot**: en lugar de IA escribiendo clausulas, la empresa **sube su propio contrato** (ya revisado por su abogado) con placeholders `{{NOMBRE_COMPLETO}}`, `{{DNI}}`, `{{SUELDO}}` — y el sistema hace **sustitucion deterministica**. Zero IA escribiendo contenido legal → zero liability.

**Tradeoff**: perdemos el "wow" de "IA te escribe el contrato". Ganamos:
- Cero riesgo legal para Comply360
- La empresa mantiene su branding y lenguaje juridico propio
- Es lo que **sus abogados ya validaron** — menos fricción de adopcion
- Podemos sumar IA generativa mas adelante como feature opt-in (plan PRO+) cuando el producto madure

#### F2.5.1 — Motor de merge fields ✅
- [x] Lib `src/lib/templates/org-template-engine.ts` con:
  - Schema `contract_template_v1` (metadata JSON serializada)
  - Catalogo de 27 placeholders estandar (worker.firstName, worker.dni, worker.sueldoEnLetras, org.ruc, meta.today, etc.)
  - `detectPlaceholders(content)` — regex `/\{\{\s*([A-Z_][A-Z0-9_]*)\s*\}\}/g`
  - `renderTemplate(content, mappings, context, options)` — sustitucion pura
  - `numberToWords` (soles peruanos para `SUELDO_LETRAS`)
  - `formatDateDMY` / `formatDateInWords` / `formatMoney`
- [x] 17 tipos de documento soportados: CONTRATO_INDEFINIDO, CONTRATO_PLAZO_FIJO, CONTRATO_TIEMPO_PARCIAL, CONTRATO_MYPE, CONTRATO_LOCACION_SERVICIOS, CONVENIO_PRACTICAS, ADDENDUM_AUMENTO, ADDENDUM_CAMBIO_CARGO, CARTA_PREAVISO_DESPIDO, CARTA_DESPIDO, CARTA_RENUNCIA, CERTIFICADO_TRABAJO, CONSTANCIA_HABERES, LIQUIDACION_BENEFICIOS, FINIQUITO, MEMORANDUM, AUMENTO_SUELDO

#### F2.5.2 — API CRUD + generador PDF ✅
- [x] `GET/POST /api/org-templates` — lista y creacion (plan gate EMPRESA+ via `ia_contratos`)
- [x] `GET/PATCH/DELETE /api/org-templates/[id]` — editor detalle con auto-bump de `version`
- [x] `POST /api/org-templates/[id]/generate?format=json|pdf` — merge con worker → crea `Contract` DRAFT + `WorkerContract` + AuditLog + incrementa `usageCount`
- [x] PDF con jsPDF usando helpers compartidos (`src/lib/pdf/server-pdf.ts`)

#### F2.5.3 — UI admin ✅
- [x] `/dashboard/configuracion/empresa/plantillas/page.tsx` — lista + stats (placeholders / mapeados / usos)
- [x] `/dashboard/configuracion/empresa/plantillas/[id]/page.tsx` — editor split con:
  - Editor de contenido en mono font
  - Sidebar de placeholders detectados con select agrupado (Trabajador / Empresa / Metadata)
  - Boton "Auto-mapear" que cruza contra catalogo
  - Catalogo completo de 24 fields inyectables con click
  - Modal "Generar" con preview JSON + download PDF
- [x] Plantilla de ejemplo precargada en modal de creacion para onboarding suave
- [x] Sidebar: nuevo item "Plantillas de contratos" en hub **Contratos & Docs**

#### F2.5.4 — Persistencia sin migracion ✅
- [x] Reuso `OrgDocument` con `type: 'OTRO'` + metadata JSON serializada en `description` (schema `contract_template_v1`)
- [x] `parseTemplate(doc.description)` + `isOrgTemplate(doc)` helpers para filtrar docs de plantillas
- [x] **Zero DB migrations** para todo el feature

**Criterio de completitud Fase 2.5**: el admin sube el contrato que le paso su abogado, marca `{{VARIABLES}}`, las mapea al catalogo, y genera un PDF listo para firma por cada trabajador en 2 clicks. Cero riesgo legal porque el contenido es suyo.

---

### FASE 3 — COMPLIANCE COMPLETO

**Objetivo**: Cubrir los modulos especializados que completan la oferta integral.

#### F3.1 — SST Completo (Modulo 7) ✅
- [x] Pagina `/dashboard/sst` con sub-secciones operativas (politicas, IPERC, plan anual, comite, accidentes, EMO, capacitaciones, EPP, mapa riesgos)
- [x] Modelos SstRecord y sub-tipos en Prisma
- [x] Integracion con score de compliance: SST pesa 15% del score global
- [x] **15 generadores de documentos compliance** en `src/lib/generators/` (politica-sst, hostigamiento, cuadro-categorias, acta-comite, plan-anual-sst, iperc, induccion-sst, registro-accidentes, reglamento-interno, capacitacion-sst, entrega-epp, mapa-riesgos, declaracion-jurada, horario-cartel, sintesis-legislacion)

#### F3.2 — Canal de Denuncias (Modulo 8) ✅
- [x] URL publica por empresa: `comply360.pe/denuncias/[org-slug]`
- [x] Formulario sin login + opcion anonima/nominada + upload evidencia
- [x] Pagina `/dashboard/denuncias` con lista + gestion Comite + timeline + resolucion
- [x] Modelos `Complaint` y `ComplaintTimeline` en Prisma
- [x] Politica de hostigamiento: generador conforme D.S. 014-2019-MIMP
- [ ] **Pendiente**: triaje automatico con IA + estadisticas anuales anonimizadas para informe gestion

#### F3.3 — Reportes Avanzados (Modulo 12) 🟡 PARCIAL
- [x] Pagina `/dashboard/reportes/*` (rutas existen para los 7 tipos)
- [x] PDF generacion base con jsPDF (helpers compartidos en `src/lib/pdf/server-pdf.ts`)
- [ ] **Pendiente**: refactor con @react-pdf/renderer para reportes ejecutivos profesionales
- [ ] **Pendiente**: exportacion Excel de los reportes (CSV existe via `src/lib/exports/`)
- [ ] **Pendiente**: programar reportes periodicos (mensual/trimestral) — hoy son on-demand

#### F3.4 — Notificaciones Multi-Canal 🟡 PARCIAL (email + push done)
- [x] Email Resend con 6 templates (welcome, alert, digest, complaint, password reset, worker onboarding)
- [x] Alertas a 30, 15, 7, 3 y 1 dia de vencimiento via cron daily-alerts
- [x] Push notifications VAPID operativas (solo CRITICAL)
- [x] Preferencias de notificacion en `/dashboard/configuracion/notificaciones`
- [ ] **Pendiente**: WhatsApp Business API (stub en `src/lib/whatsapp.ts`)

**Criterio de completitud Fase 3**: Compliance laboral integral. SST operativo, canal de denuncias funcional, reportes profesionales exportables, notificaciones automaticas. La empresa puede demostrar compliance total ante SUNAFIL.

---

### FASE 3.5 — IA VISION PARA LEGAJO (NUEVO, 2026-04)

**Objetivo**: cuando el trabajador sube su DNI / CV / examen medico desde el celular, la IA valida el documento, extrae los datos, los cruza contra el worker y **auto-marca** `status=VERIFIED` sin intervencion del admin.

**Razon estrategica**: sin esto, el admin tiene que abrir cada documento manualmente, leer, cruzar datos, y marcar verified. Es una **friccion enorme** para empresas con >50 trabajadores. La IA vision lo elimina.

**Zero-knowledge**: la huella biometrica del trabajador nunca sale del dispositivo, y las fotos de sus documentos nunca se guardan en logs ni se mandan a otros proveedores que OpenAI (uso por request, sin training opt-out gracias al TOS de OpenAI API enterprise).

#### F3.5.1 — Motor de verificacion con GPT-4o vision ✅
- [x] Lib `src/lib/ai/document-verifier.ts` con:
  - `verifyDocument(document, worker): Promise<VerificationResult>`
  - Prompts especificos por `documentType` (dni_copia, cv, declaracion_jurada, examen_medico_*, afp_onp_afiliacion)
  - Cross-match fuzzy de DNI + nombres (tolerante a tildes, orden, case)
  - 4 decisiones: `auto-verified` (≥85% + todos los matches) / `needs-review` / `mismatch` / `wrong-type` / `unreadable` / `unsupported` / `error`
  - Jamas marca REJECTED automaticamente — decision final es humana
- [x] Soporta JPG/PNG (fotos desde celular)
- [ ] **Pendiente**: soporte PDF (renderizar primera pagina con `pdfjs-dist` antes de mandar a GPT-4o) — CVs y certificados medicos vienen PDF

#### F3.5.2 — Persistencia sin migracion ✅
- [x] Sentinel `WorkerDocument.verifiedBy='ai-v1'` distingue IA vs humano
- [x] Metadata completa (decision, confidence, issues, extracted, model) en `AuditLog` con `action='document.ai_verified'` o `'document.ai_reviewed'`
- [x] `GET /api/workers/:id/documents` hace join con AuditLog y devuelve `aiVerification` inline

#### F3.5.3 — API + auto-trigger ✅
- [x] `POST /api/workers/[id]/documents/[docId]/verify` — endpoint manual ADMIN+ (re-correr)
- [x] Auto-trigger fire-and-forget en `POST /api/workers/[id]/documents` (admin uploads)
- [x] Auto-trigger fire-and-forget en `POST /api/mi-portal/documentos` (worker uploads, ahora con upload real a Supabase)
- [x] Helper compartido `persistVerification` para no duplicar logica
- [x] Plan gate: **PRO** (feature `review_ia`) — diferenciador premium
- [x] Requiere `OPENAI_API_KEY` — falla segura si falta

#### F3.5.4 — UI ✅
- [x] Badge esmerald gradient "IA ✨" en `tab-legajo.tsx` al lado del titulo del doc si `verifiedBy==='ai-v1'`
- [x] Tooltip con summary + confidence % + primeros 3 issues detectados
- [x] Badge amber "Revisar" si IA procesó pero con confianza baja o mismatch
- [x] Data flow: `/api/workers/:id/documents` con AuditLog join → tab-legajo via `worker-profile.tsx`

**Criterio de completitud Fase 3.5**: un worker sube la foto de su DNI desde su celular un domingo a las 11pm, y cuando el admin entra el lunes ya esta marcado como VERIFIED con tooltip explicando "DNI validado con IA, confianza 92%, DNI 45678912 coincide con el trabajador". Cero intervencion humana.

---

### FASE 5 — SST PREMIUM (NUEVO, 2026-05)

**Objetivo**: extender el SST base (Fase 3) a un módulo enterprise con estructura tabular real, motor IPERC oficial SUNAFIL, sub-schema médico cifrado (Ley 29733), Field Audit con captura offline, Comité paritario operativo, y scoring SUNAFIL específico.

**Por qué**: la Fase 3 dejó SST funcional con `SstRecord` genérico + 15 generadores de documentos. Para clientes enterprise (≥200 trabajadores, sectores Anexo 5 SCTR, holdings) hace falta:
- Matriz IPERC tabular con índices P×S oficiales R.M. 050-2013-TR (no JSON suelto)
- Sede + PuestoTrabajo como entidades de primera clase (multi-sede, multi-puesto)
- EMO con sub-schema médico cifrado (Ley 29733 no perdona)
- Accidente con tracking SAT (D.S. 006-2022-TR)
- Comité SST con elecciones y libro de actas (R.M. 245-2021-TR)
- Field Audit con inspectores presenciales + GPS + fotos
- Scoring SUNAFIL específico con exposición económica

**Decisiones congeladas (Sprint 1)**:

1. **Nomenclatura**: `Organization` + `orgId` (NO `Tenant` + `tenantId`). El blueprint externo usa "Tenant" — mapear, no duplicar.
2. **Multi-tenancy**: `withAuth() + orgId` filter (ya existe) **+ RLS Postgres activado en todas las nuevas tablas SST tenant-scoped** (defensa en profundidad). Tablas globales sin RLS: `colaboradores_sst`, `catalogo_peligros`, `catalogo_controles`.
3. **Auth**: Clerk v7 (NO migrar a NextAuth v5).
4. **Queue**: Vercel Cron para todo el calendarizador SST. **BullMQ + Redis NO se introducen** en Ola 1 (al haberse descartado el RPA SAT).
5. **LLM**: wrapper multi-provider existente. **DeepSeek V4 1M** primario para motor IPERC por su context window.
6. **Datos médicos**: sub-schema con `pgcrypto.pgp_sym_encrypt`. Solo **Aptitud** persistida en claro. **El diagnóstico jamás toca COMPLY360**.
7. **Trazabilidad**: hash chain SHA-256 + Merkle (ya existen en `AuditLog` y `MerkleAnchor`) + endpoint público de verificación con QR. **Sin TSA INDECOPI, sin OpenTimestamps Bitcoin**.
8. **Notificación SAT**: wizard pre-llenado + PDF imprimible Form. 1/2 + tracking manual. **Sin RPA Playwright**.
9. **Inspectores**: `ColaboradorSST` interno COMPLY360 (empleados/contratistas). **Sin marketplace, sin escrow, sin ratings, sin KYC**.
10. **Field Audit**: captura offline en tablet/móvil con IndexedDB local + ingesta en oficina. **Sin Service Worker complejo, sin sync online crítico**.

**Piezas DESCARTADAS del blueprint externo (no se construyen ni en este sprint ni en sprints futuros)**:

- ❌ RPA SAT con Playwright + Clave SOL (riesgo legal alto, infra compleja)
- ❌ TSA INDECOPI / RFC 3161 (legacy SOAP, costo recurrente, postergar hasta cliente enterprise)
- ❌ OpenTimestamps Bitcoin (sin valor probatorio peruano adicional)
- ❌ Marketplace de partners estilo Uber (cambio de modelo: inspectores son colaboradores directos)
- ❌ App móvil React Native nativa (web responsive cubre el flujo aclarado)
- ❌ ML predictivo accidentes Ola 2 (cold start, postergar hasta tracción)
- ❌ API pública + 3 SDKs (premature, solo si cliente enterprise lo pide)

#### F5.1 — Schema tabular SST + sub-schema médico cifrado ✅ (Sprint 1, 2026-05)

- [x] 13 modelos Prisma SST (`Sede`, `PuestoTrabajo`, `IPERCBase`, `IPERCFila`, `Accidente`, `InvestigacionAccidente`, `ComiteSST`, `MiembroComite`, `ColaboradorSST`, `VisitaFieldAudit`, `HallazgoFieldAudit`, `CatalogoPeligro`, `CatalogoControl`)
- [x] 3 modelos sub-schema médico (`EMO`, `ConsentimientoLey29733`, `SolicitudARCO`) con columnas `Bytes` cifradas
- [x] 17 enums nuevos (TipoInstalacion, NivelRiesgoIPERC, EstadoSAT, etc.)
- [x] Extensión `WorkerAlertType` con 8 nuevos tipos SST (IPERC_VENCIDO, EMO_PROXIMO, SAT_PLAZO_PROXIMO, COMITE_REUNION_PENDIENTE, etc.)
- [x] Migración `add_sst_premium_schema` con `CREATE EXTENSION IF NOT EXISTS pgcrypto`
- [x] RLS Postgres en 13 tablas tenant-scoped (`prisma/rls-policies.sql`)
- [x] Motor IPERC determinístico [src/lib/sst/iperc-matrix.ts](legaliapro-platform/src/lib/sst/iperc-matrix.ts) — matriz P×S oficial R.M. 050-2013-TR (Tablas 9, 11, 12). 38 tests verdes en `__tests__/iperc-matrix.test.ts` (incluye barrido exhaustivo de los 243 inputs posibles).
- [x] Helpers de cifrado médico [src/lib/sst/medical-vault.ts](legaliapro-platform/src/lib/sst/medical-vault.ts) usando `pgp_sym_encrypt`
- [x] Seeds: 80 peligros base distribuidos en 8 familias + 40 controles distribuidos en 5 niveles de jerarquía + colaborador SST demo (`prisma/seed-sst.ts`)
- [x] Variable de entorno `MEDICAL_VAULT_KEY` documentada en `.env.example`

#### F5.2 — Endpoints API SST + onboarding wizard (Sprint 2-3, futuro)
- [ ] `POST /api/sst/sedes` — CRUD sedes
- [ ] `POST /api/sst/puestos` — CRUD puestos de trabajo
- [ ] `POST /api/sst/iperc/base` + `/iperc/{id}/filas` — motor IPERC con LLM (sugerencias) + función pura para cálculo
- [ ] Onboarding wizard SST: alta de Sede + Puesto + plano + asignación de trabajadores

#### F5.3 — Field Audit captura offline + ingesta oficina (Sprint 14-15, futuro)
- [ ] SPA mobile-first dentro del monolito (web responsive, no React Native)
- [ ] IndexedDB local para borradores + sync diferido al regresar a oficina
- [ ] Geolocalización + captura nativa de fotos vía `<input capture>`
- [ ] 12 pasos de visita (agendamiento → cierre)
- [ ] Generación de PDF de hallazgos con foto-evidencia georreferenciada

#### F5.4 — Wizard SAT manual + tracking (Sprint 12, futuro)
- [ ] Wizard pre-llenado para Form. 1 (mortal) y Form. 2 (no mortal) según D.S. 006-2022-TR
- [ ] PDF imprimible para presentación en mesa de partes / portal gob.pe/774
- [ ] Tracking de fecha de envío + carga de cargo (foto/PDF) por el cliente
- [ ] Recordatorios automatizados según `plazoLegalHoras` (24/720/120)
- [ ] **NO ejecuta RPA**: COMPLY360 asiste, el cliente notifica manualmente

#### F5.5 — Comité SST elecciones electrónicas (Sprint 8, futuro)
- [ ] Junta electoral + cédulas electrónicas + votación con WebAuthn (huella)
- [ ] Acta de instalación + libro de actas versionado
- [ ] Mandato 2 años con recordatorio 60 días antes del vencimiento

#### F5.6 — Calendarizador SST sobre Vercel Cron (Sprint 10, futuro)
- [ ] Reglas declarativas JSON en `/rules/sst/*.json`
- [ ] 40+ obligaciones cíclicas modeladas (EMO, SCTR, capacitaciones, simulacros, auditoría externa, etc.)
- [ ] Re-evaluación diaria a las 02:00 PET via cron
- [ ] Integración como cliente del Alert Engine existente

#### F5.7 — Scoring SUNAFIL específico + dashboard (Sprint 16, futuro)
- [ ] Extender [src/lib/compliance/score-calculator.ts](legaliapro-platform/src/lib/compliance/score-calculator.ts) con dimensiones SST (cobertura SCTR, IPERC vigente, capacitaciones, mantenimiento equipos)
- [ ] Cálculo de exposición económica S/ basado en escala SUNAFIL 2026
- [ ] Heatmap por sede + tendencias 24 meses + benchmarking sectorial

#### F5.8 — Editor visual mapa de riesgos con Konva.js (Sprint 7, futuro)
- [ ] Subida de planos (PDF rasterizado, JPG/PNG, AutoCAD .dwg → SVG vía LibreCAD)
- [ ] Biblioteca de iconos NTP 399.010-1 (~120 SVG seed — trabajo de diseñador SST)
- [ ] Drag-and-drop con coordenadas sobre el plano + capas (peligros, equipos seguridad, rutas evacuación)
- [ ] Generación SVG normalizado A2/A1 para impresión exhibida

---

### FASE 4 — ECOSISTEMA

**Objetivo**: Funcionalidades de valor agregado que generan revenue adicional y lock-in.

#### F4.1 — E-Learning (Modulo 10)
- [ ] Cursos obligatorios: SST (4 temas), hostigamiento sexual, derechos trabajador
- [ ] Cursos RRHH: contratos por regimen, planilla electronica, inspecciones SUNAFIL
- [ ] Player de video, lecturas interactivas, evaluacion final (70% para aprobar)
- [ ] Certificado con QR de verificacion
- [ ] Asignacion automatica por cargo y regimen al registrar trabajador
- [ ] Registro automatico como evidencia en SST

#### F4.2 — Crawler Normativo (Modulo 11)
- [ ] Scraper de El Peruano (normas laborales)
- [ ] Scraper de portal SUNAFIL (directivas, circulares)
- [ ] Analisis de impacto con IA: determinar si norma afecta a la empresa
- [ ] Resumen ejecutivo automatico: que cambio, que hacer, en que plazo
- [ ] Actualizacion automatica de templates cuando norma los afecta
- [ ] Job programado (diario)

#### F4.3 — Integraciones
- [ ] Importacion desde T-REGISTRO (cuando API disponible, mientras tanto Excel)
- [ ] Exportacion formato PLAME
- [ ] Firma digital basica (PDF con timestamp, NO RENIEC por ahora)
- [ ] Webhook API para integracion con ERPs

#### F4.4 — Modelo de negocio adicional
- [ ] Marketplace de abogados: directorio + derivacion de casos complejos
- [ ] Certificacion COMPLY360: sello "Empresa Compliance-Ready" verificable
- [ ] Informes sectoriales: reportes de compliance por industria

---

## 6. MAPA DE MODULOS VS FASES

| Modulo Plan Maestro | Fase | Prioridad | Estado |
|---|---|---|---|
| M1: Dashboard Compliance | F0 base + F1.6 score + Cockpit narrativo | CRITICA | ✅ DONE |
| M2: Trabajadores y Legajo | F1.1 - F1.2 | CRITICA | ✅ DONE |
| M3: Contratos y Documentos | F0 + F1.5 + **F2.5 pivot zero-liability** | ALTA | ✅ DONE |
| M4: Alertas y Calendario | F1.3 - F1.4 | CRITICA | ✅ DONE |
| M5: Diagnostico SUNAFIL | F2.1 (135 preguntas) | ALTA | ✅ DONE |
| M6: Simulacro SUNAFIL | F2.2 | ALTA | ✅ DONE |
| M7: SST Completo | F3.1 (+ 15 generadores) | MEDIA | ✅ DONE |
| M8: Canal Denuncias | F3.2 | MEDIA | ✅ DONE (triaje IA + stats anuales pendientes) |
| M9: IA Laboral | F2.3 (RAG + 14 agentes + copilot) | ALTA | ✅ DONE (pgvector indexing pendiente) |
| M10: E-Learning | F4.1 | BAJA | 🟡 90% (modelos + rutas + UI existen, falta QR certificados) |
| M11: Actualizaciones Normativas | F4.2 | BAJA | 🟡 PARCIAL (fetcher RSS + classifier IA existen, no conectados a cron) |
| M12: Reportes y Auditoria | F3.3 | MEDIA | 🟡 PARCIAL (rutas existen, templates @react-pdf/renderer pendientes) |
| **M13: Portal del Trabajador + Firma biometrica** | **F1.5 (nuevo)** | **ALTA** | **✅ DONE** |
| **M14: Biblioteca de plantillas propias** | **F2.5 (nuevo)** | **ALTA** | **✅ DONE** |
| **M15: Auto-verificacion IA de legajo** | **F3.5 (nuevo)** | **MEDIA** | **✅ DONE (PDF support pendiente)** |
| **M16: SST Premium (schema tabular + motor IPERC + sub-DB médica + Field Audit + Comité + scoring)** | **F5 (nuevo)** | **ALTA** | **🟡 Sprint 1 DONE (schema + RLS + motor IPERC + seeds + medical-vault). Sprints 2-18 pendientes** |

---

## 7. CONVENCIONES DE CODIGO

### Idioma y tono (OBLIGATORIO en todo el producto)

**Todo el copy, comentarios, mensajes de commit y respuestas al usuario van en español peruano con tuteo neutro. NUNCA voseo argentino.**

El fundador es peruano y el producto es para el mercado peruano. Un "tenés que firmar" rompe credibilidad local.

| NO usar (voseo) | SI usar (tuteo peruano) |
|---|---|
| tenés, querés, podés, sabés | tienes, quieres, puedes, sabes |
| mirá, decime, contame, fijate | mira, dime, cuéntame, fíjate |
| corré, hacé, abrí, dejá, andá | corre, haz, abre, deja, anda/ve |
| ponele, dale, che | ponle, ya/listo, oye |
| boludo, pibe, guita, laburo | (usar palabras neutras: amigo, chico, dinero, trabajo) |

Aplica a:
- Toasts, empty states, alerts, error messages
- Emails (welcome, alert, digest, complaint, password reset, worker onboarding)
- Copy de landing, planes, calculadoras publicas
- Mensajes del Copilot IA
- Labels de botones, placeholders, tooltips
- Comentarios en codigo, commits, docs
- Respuestas al usuario en cada sesion

Peruanismos OK si encajan: "ahorita", "nomas", "chevere/bacan", "plata", "pe" (con moderacion en copy casual).

### Estructura de archivos
```
src/
  app/
    dashboard/
      [modulo]/          # Cada modulo tiene su carpeta
        page.tsx         # Pagina principal del modulo
        [id]/page.tsx    # Pagina de detalle
        nuevo/page.tsx   # Pagina de creacion
    api/
      [recurso]/route.ts # API routes RESTful
  components/
    [modulo]/            # Componentes especificos del modulo
    ui/                  # Componentes base reutilizables
  lib/
    legal-engine/        # Motor de reglas y calculadoras
    compliance/          # Score, diagnostico, alertas
    ai/                  # IA, RAG, review
    utils.ts
    constants.ts
  generated/prisma/      # Auto-generado por Prisma
prisma/
  schema.prisma
  seed.ts
  migrations/
```

### Patrones
- **Paginas**: `'use client'` solo cuando necesiten interactividad. Preferir Server Components cuando sea posible
- **Data fetching**: Server Components con queries Prisma directas (no API routes para paginas propias)
- **API Routes**: Solo para operaciones mutativas (POST/PUT/DELETE) y para consumo externo
- **Formularios**: Componentes client con estado local, submit a Server Action o API route
- **Validacion**: Zod schemas compartidos entre frontend y backend
- **Estilos**: Tailwind CSS con `cn()` helper. NO agregar CSS custom a menos que sea estrictamente necesario
- **Iconos**: Lucide React (ya instalado). NO agregar otra libreria de iconos
- **Fechas**: `date-fns` (ya instalado). NO usar moment.js ni dayjs
- **Montos**: Siempre en soles (PEN). Mostrar con 2 decimales. Usar Decimal de Prisma para DB

### Naming
- Archivos: kebab-case (`worker-form.tsx`, `cts-calculator.ts`)
- Componentes: PascalCase (`WorkerForm`, `CTSCalculator`)
- Variables/funciones: camelCase (`calcularCTS`, `sueldoBruto`)
- Constantes: UPPER_SNAKE_CASE (`PERU_LABOR`, `PLANS`)
- Modelos Prisma: PascalCase singular (`Worker`, `Contract`)
- Tablas DB: snake_case plural (`workers`, `contracts`) via @@map

### NO hacer
- NO agregar dependencias sin justificacion. El bundle ya incluye lo esencial
- NO crear archivos de documentacion (README, .md) a menos que se pida
- NO modificar el marketing site (`legaliapro/`) a menos que se pida explicitamente
- NO usar `any` en TypeScript. Definir tipos siempre
- NO hardcodear valores legales. Todo en `peru-labor.ts`
- NO duplicar logica de calculo. Reutilizar las calculadoras del legal engine

---

## 8. REGLAS DE NEGOCIO CRITICAS

### Multi-tenancy
- Cada Organization es un tenant
- TODAS las queries deben filtrar por `orgId`
- Un Worker pertenece a UNA Organization
- Row Level Security se implementara en PostgreSQL cuando se migre a produccion

### Regimenes laborales
- Los beneficios varian drasticamente segun regimen:
  - GENERAL (D.Leg. 728): CTS, gratificaciones, vacaciones 30 dias, indemnizacion 1.5 sueldos/anio
  - MYPE_MICRO: Sin CTS, sin gratificaciones, vacaciones 15 dias, indemnizacion 10 rem diarias/anio
  - MYPE_PEQUENA: 50% CTS, 50% gratificaciones, vacaciones 15 dias, indemnizacion 20 rem diarias/anio
  - AGRARIO: CTS incluida en remuneracion diaria (9.72%), gratificacion incluida (16.66%)
  - Cada regimen tiene sus propias reglas en el legal engine

### Calculo de multas SUNAFIL
- Base: D.S. 019-2006-TR (cuadro de infracciones)
- Multas van de 0.045 UIT (leve, 1 trabajador) hasta 52.53 UIT (muy grave, 1000+ trabajadores)
- UIT 2026 = S/ 5,500
- Reincidencia: +50% de la multa
- Subsanacion voluntaria antes de inspeccion: -90% de descuento (art. 40 Ley 28806)
- Subsanacion durante inspeccion: hasta -70%

### Plazos criticos del calendario laboral peruano
- CTS: deposito antes del 15 de mayo y 15 de noviembre
- Gratificaciones: pago antes del 15 de julio y 15 de diciembre
- AFP: pago dias 1-5 de cada mes (cronograma por ultimo digito RUC)
- PLAME: segun cronograma SUNAT mensual
- Vacaciones: derecho al goce despues de 1 anio de servicios. Si acumula 2 periodos → triple vacacional
- T-REGISTRO: registrar trabajador dentro de 1 dia habil del inicio de labores

---

## 9. BASE LEGAL DE REFERENCIA

### Normas principales (ya deben estar en peru-labor.ts y seed)
| Norma | Tema | Modulo que impacta |
|---|---|---|
| D.Leg. 728 / D.S. 003-97-TR | Regimen laboral general | M2, M3, M4, M5 |
| D.S. 001-97-TR | CTS | M2, M4, Calculadora |
| Ley 27735 | Gratificaciones | M2, M4, Calculadora |
| D.Leg. 713 | Vacaciones | M2, M4, Calculadora |
| Ley 29783 / D.S. 005-2012-TR | SST | M7 |
| D.S. 019-2006-TR | Infracciones laborales (SUNAFIL) | M5, M6, Calculadora |
| Ley 27942 / D.S. 014-2019-MIMP | Hostigamiento sexual | M8 |
| Ley 32353 | Regimen MYPE (2025) | M2, M3 |
| Ley 31110 | Regimen agrario | M2, M3 |
| Ley 30709 | Igualdad salarial | M5, M8 |
| Ley 28806 | Inspeccion del trabajo | M5, M6 |
| Ley 29973 | Personas con discapacidad (cuota 3%) | M5 |
| D.Ley 22342 | Exportacion no tradicional | M2, M3 |
| Ley 31572 | Teletrabajo | M2, M3 |
| Ley 28518 | Modalidades formativas | M2, M3 |
| R.M. 050-2013-TR | Formatos SST | M7 |
| R.M. 199-2016-TR | Protocolo inspeccion SUNAFIL | M6 |

---

## COMO USAR ESTE DOCUMENTO

1. **Al iniciar cada sesion**: Consultar en que fase estamos y cual es el siguiente item pendiente
2. **Al crear un archivo nuevo**: Verificar que sigue la estructura y convenciones de la seccion 7
3. **Al tocar calculadoras o reglas legales**: Verificar contra la seccion 8 y 9
4. **Al agregar un modelo Prisma**: Copiar la definicion de la seccion 4.2, no improvisar
5. **Al completar un item de fase**: Marcar con [x] en este documento
6. **Si hay duda sobre que hacer**: Seguir el orden de las fases. La prioridad es FASE 0 → 1 → 2 → 3 → 4

> REGLA DE ORO: Nunca avanzar a la siguiente fase sin que la anterior este funcionalmente completa.
> COMPLY360 se construye como un edificio: primero los cimientos, luego los pisos.
