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
6. [Fase 0 — Cimientos](#fase-0--cimientos-estabilizar-lo-existente)
7. [Fase 1 — MVP Vendible](#fase-1--mvp-vendible)
8. [Fase 2 — Diferenciacion](#fase-2--diferenciacion)
9. [Fase 3 — Compliance Completo](#fase-3--compliance-completo)
10. [Fase 4 — Ecosistema](#fase-4--ecosistema)
11. [Mapa de Modulos vs Fases](#6-mapa-de-modulos-vs-fases)
12. [Convenciones de Codigo](#7-convenciones-de-codigo)
13. [Reglas de Negocio Criticas](#8-reglas-de-negocio-criticas)
14. [Base Legal de Referencia](#9-base-legal-de-referencia)

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

> **Nota (2026-04)**: El codigo avanzo mas rapido que este documento. El arbol de `src/app/api/` y `src/app/dashboard/` contiene carpetas para practicamente todos los modulos del plan maestro (workers, alertas, denuncias, sst, diagnostico, simulacro, asistente-ia, etc.). Esta seccion lista solo lo **verificado como funcional**; los modulos no listados pueden existir en distintos grados de avance y requieren auditoria individual.

### 3.1 Lo que FUNCIONA (verificado)

| Componente | Ubicacion | Estado |
|-----------|-----------|--------|
| 8 Calculadoras laborales | `src/lib/legal-engine/calculators/` | COMPLETAS - CTS, Liquidacion, Gratificacion, Indemnizacion, Horas Extras, Vacaciones, Multa SUNAFIL, Intereses Legales (344 tests pasando) |
| Constantes laborales Peru 2026 | `src/lib/legal-engine/peru-labor.ts` | COMPLETO - RMV 1130, UIT 5500, tasas actualizadas |
| Types del legal engine | `src/lib/legal-engine/types.ts` | COMPLETO - Interfaces para todas las calculadoras |
| 3 Templates de contrato | `src/lib/legal-engine/contracts/templates.ts` | COMPLETOS - Indefinido (con contentBlocks), Plazo Fijo (con contentBlocks), Locacion Servicios (con contentBlocks) |
| Worker CRUD + bulk import | `src/app/api/workers/`, `[id]/`, `import/`, `save-from-batch/` | FUNCIONAL - POST/PUT/DELETE, importacion CSV con token, ingesta batch por PDF |
| Legajo Digital (documentos) | `src/app/api/workers/[id]/documents/route.ts` | FUNCIONAL - Upload + recalculo de legajoScore (18 tipos obligatorios) |
| Alert engine (worker + org) | `src/lib/alerts/alert-engine.ts` | FUNCIONAL - `generateWorkerAlerts()` con alertas de contratos, vacaciones, documentos, SCTR, calendario CTS/gratificacion |
| Alert triggers en mutaciones | `src/app/api/workers/**/route.ts` | Conectado en POST, PUT, DELETE, import, save-from-batch y documents POST |
| Cron daily-alerts | `src/app/api/cron/daily-alerts/route.ts` + `vercel.json` | FUNCIONAL - Cronograma `0 13 * * *`, envia email por contratos proximos a vencer, SST overdue, CTS proximo |
| Cron weekly-digest | `src/app/api/cron/weekly-digest/` + `vercel.json` | Configurado (`0 13 * * 1`) |
| Email con Resend | `src/lib/email/client.ts`, `src/lib/email/index.ts` | FUNCIONAL - Resend API, fallback a console.log sin API key, templates HTML con branding (alertEmail, digest, welcome, complaint, password reset, newsletter) |
| UI de calculadoras (8 forms) | `src/components/calculadoras/` | COMPLETAS - Formularios con calculo en tiempo real |
| Sidebar + Topbar | `src/app/dashboard/_components/` | COMPLETO |
| Auth con Clerk | `src/middleware.ts` | FUNCIONAL - Rutas protegidas |
| Landing page | `src/app/page.tsx` | COMPLETA |
| Componentes UI base | `src/components/ui/` | badge, button, card, input, modal, select, tabs, toast, etc. |
| Planes y pricing | `src/lib/constants.ts` | STARTER S/49, EMPRESA S/149, PRO S/399 |

### 3.2 Lo que es STUB/PLACEHOLDER (necesita implementacion real)

| Componente | Problema | Prioridad |
|-----------|---------|-----------|
| API /api/ai-review | Endpoint placeholder, no implementado | ALTA |
| Generacion PDF real | Funcion existe pero no genera PDF descargable | MEDIA |
| Activity heatmap | `src/components/dashboard/activity-heatmap.tsx` placeholder | BAJA |
| WhatsApp Business API | Provider stub en `src/lib/notifications/index.ts` | BAJA |

> **Nota**: Persistencia Prisma, onboarding wizard, AI review de contratos (analyzer funcional), notificaciones email (Resend) y API de alertas ya estan implementados. Ver 3.1.

### 3.3 Lo que NO EXISTE (por construir)

| Modulo del Plan Maestro | Dependencias |
|------------------------|-------------|
| Diagnostico SUNAFIL (120 preguntas) | Workers, legajo, reglas compliance |
| Simulacro SUNAFIL interactivo | Diagnostico, legajo, reglas |
| IA Laboral con RAG (vector store + embeddings) | Vector DB, indexado de corpus legal |
| E-Learning | Cursos, evaluaciones, certificados |
| Crawler normativo (scraping El Peruano/SUNAFIL) | Job scheduler, parser normas |
| Reportes avanzados (PDF con @react-pdf/renderer) | Todos los modulos generando data real |
| Integraciones T-REGISTRO / PLAME / firma digital | APIs externas |

> **Nota**: Worker CRUD + Legajo + Alertas + Calendario + Score de compliance + SST + Denuncias + 12 regimenes + notificaciones email estan en 3.1 como FUNCIONA.

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
FASE 0 ──> FASE 1 ──> FASE 2 ──> FASE 3 ──> FASE 4
Cimientos   MVP        Diferenc.  Compliance  Ecosistema
(1-2 sem)   (4-6 sem)  (4-6 sem)  (4-6 sem)   (continuo)
```

---

### FASE 0 — CIMIENTOS (Estabilizar lo existente)

**Objetivo**: Que lo que ya existe funcione con datos reales, no mock.

#### F0.1 — Conectar base de datos PostgreSQL
- [ ] Configurar PostgreSQL local o Supabase
- [ ] Verificar que DATABASE_URL en .env funciona
- [ ] Ejecutar `npx prisma migrate dev` con el schema actual
- [ ] Verificar que Prisma Client se genera correctamente en `src/generated/prisma`

#### F0.2 — Seed de datos iniciales
- [ ] Crear `prisma/seed.ts` con:
  - Normas legales base (D.Leg. 728, Ley 29783, Ley 27942, Ley 32353, etc.)
  - Reglas de compliance con sus formulas
  - Templates de contrato (los 3 existentes + nuevos)
  - Alertas normativas de ejemplo
- [ ] Configurar seed en package.json

#### F0.3 — Conectar paginas existentes a datos reales
- [ ] Dashboard: reemplazar STATS, RECENT_ACTIVITY, etc. con queries Prisma
- [ ] Contratos: CRUD real (crear, listar, editar, eliminar)
- [ ] Calculadoras: guardar resultados en tabla Calculation
- [ ] Alertas: leer de NormAlert/OrgAlert reales
- [ ] Expedientes: evaluar si se mantiene o se integra en contratos

#### F0.4 — Onboarding funcional
- [ ] Implementar `onboarding-wizard.tsx` real:
  - Paso 1: Datos empresa (RUC, razon social, sector, tamanio)
  - Paso 2: Seleccion de regimen principal
  - Paso 3: Configuracion de alertas (email del responsable RRHH)
  - Paso 4: Resumen y creacion de Organization en DB
- [ ] Al completar onboarding, marcar `organization.onboardingCompleted = true`
- [ ] Redirigir a onboarding si no completado

**Criterio de completitud Fase 0**: Puedes crear una cuenta, completar onboarding, generar un contrato real que se guarde en DB, hacer un calculo que se guarde, y ver alertas reales.

---

### FASE 1 — MVP VENDIBLE

**Objetivo**: Un producto por el que una empresa pague S/49-149/mes. Gestion de trabajadores + alertas inteligentes + contratos.

#### F1.1 — Modelo Worker y CRUD de Trabajadores (Modulo 2)

Este es el modulo MAS CRITICO. Todo el sistema gira alrededor de los trabajadores.

- [ ] Agregar modelo Worker al schema Prisma (ver seccion 4.2)
- [ ] Agregar modelos WorkerDocument, VacationRecord, WorkerContract, WorkerAlert
- [ ] Crear migracion y verificar
- [ ] Pagina `/dashboard/trabajadores` — Lista de trabajadores
  - Vista tabla con columnas: Nombre, DNI, Cargo, Regimen, Fecha Ingreso, Sueldo, Score Legajo, Estado
  - Filtros: por regimen, por estado, por departamento
  - Busqueda por nombre o DNI
  - Paginacion
  - Boton "Agregar Trabajador"
- [ ] Pagina `/dashboard/trabajadores/nuevo` — Formulario alta
  - Datos personales: DNI (validar 8 digitos), nombres, apellidos, fecha nacimiento, genero, direccion, email, telefono
  - Datos laborales: cargo, area, regimen laboral (dropdown con los 12 regimenes), tipo contrato, fecha ingreso, sueldo bruto, jornada semanal, asignacion familiar
  - Datos previsionales: AFP/ONP, nombre AFP, CUSPP, SCTR
  - Deteccion automatica de regimen: si la empresa tiene < 10 trabajadores y ventas < 150 UIT → sugerir MYPE_MICRO
  - Validacion de duplicados por DNI dentro de la misma org
- [ ] Pagina `/dashboard/trabajadores/[id]` — Perfil del trabajador
  - Header con foto placeholder, nombre, cargo, regimen, estado
  - Tabs: Informacion | Legajo Digital | Contratos | Vacaciones | Beneficios | Historial
  - Tab Informacion: datos editables del trabajador
  - Tab Legajo Digital: lista de 28 documentos obligatorios con estado (subido/faltante/vencido), upload de archivos, % de completitud
  - Tab Contratos: contratos vinculados, generar nuevo contrato para este trabajador
  - Tab Vacaciones: periodos, dias gozados/pendientes, alertas de doble periodo
  - Tab Beneficios: calculo en tiempo real de CTS, gratificacion, vacaciones usando las calculadoras existentes y los datos del trabajador
  - Tab Historial: audit log filtrado por este trabajador

#### F1.2 — Importacion masiva de trabajadores
- [ ] Boton "Importar Excel" en pagina de trabajadores
- [ ] Template Excel descargable con columnas esperadas
- [ ] Parser de Excel (usar `xlsx` o `exceljs`)
- [ ] Vista previa de datos parseados con validacion (DNI duplicado, campos requeridos)
- [ ] Importacion en lote con reporte de errores
- [ ] Alternativa: importar desde archivo CSV

#### F1.3 — Alertas Inteligentes por Trabajador (Modulo 4 mejorado)
- [ ] Crear servicio `src/lib/alerts/alert-engine.ts`
- [ ] Generar alertas automaticas al crear/editar trabajador:
  - CONTRATO_POR_VENCER: contrato plazo fijo con < 30 dias para vencer
  - CONTRATO_VENCIDO: contrato ya vencido sin renovar
  - VACACIONES_ACUMULADAS: > 1 periodo sin goce
  - VACACIONES_DOBLE_PERIODO: 2+ periodos → triple vacacional
  - DOCUMENTO_FALTANTE: documentos obligatorios no subidos
  - DOCUMENTO_VENCIDO: SCTR, examen medico, etc. vencido
  - REGISTRO_INCOMPLETO: legajo < 70% completo
- [ ] Generar alertas por calendario:
  - CTS_PENDIENTE: 15 de mayo y noviembre
  - GRATIFICACION_PENDIENTE: julio y diciembre
  - AFP_EN_MORA: dia 5 de cada mes
- [ ] Pagina `/dashboard/alertas` mejorada:
  - Reemplazar alertas mock con alertas reales de WorkerAlert + NormAlert
  - Filtros por severidad (CRITICAL/HIGH/MEDIUM/LOW)
  - Accion directa: clic en alerta → navega al trabajador/documento afectado
  - Marcar como resuelta con evidencia
  - Conteo en badge del sidebar

#### F1.4 — Calendario de Compliance (Modulo 4)
- [ ] Pagina `/dashboard/calendario`
- [ ] Vista mensual con vencimientos:
  - Pre-cargados: CTS (15 may/nov), Gratificaciones (15 jul/dic), PLAME (cronograma SUNAT), AFP (1-5 cada mes)
  - Dinamicos: vencimientos de contratos, vacaciones, documentos, SCTR
- [ ] Vista "Proximos 30 dias" tipo lista priorizada
- [ ] Exportacion iCal para Google Calendar / Outlook
- [ ] Agregar item al sidebar NAV_ITEMS en constants.ts

#### F1.5 — Contratos expandidos (Modulo 3 mejorado)
- [ ] Agregar templates nuevos a `contracts/templates.ts`:
  - Contrato tiempo parcial (< 4 horas)
  - Contrato MYPE microempresa
  - Contrato MYPE pequena empresa
  - Carta de amonestacion
  - Carta de pre-aviso de despido
  - Carta de despido
  - Carta de renuncia (para firma del trabajador)
  - Certificado/Constancia de trabajo
  - Liquidacion de beneficios sociales
- [ ] Vincular generacion de contrato con Worker: al generar contrato desde perfil del trabajador, pre-llenar datos
- [ ] Validacion legal automatica basica: verificar que tipo de contrato sea compatible con regimen

#### F1.6 — Dashboard mejorado con Score de Compliance (Modulo 1)
- [ ] Crear servicio `src/lib/compliance/score-calculator.ts`
- [ ] Score Global (0-100) = promedio ponderado:
  - Contratos vigentes y registrados: peso 20%
  - Legajos completos: peso 15%
  - CTS al dia: peso 15%
  - Gratificaciones al dia: peso 10%
  - Vacaciones sin acumulacion ilegal: peso 10%
  - SST basico (documentos): peso 15%
  - Documentos obligatorios completos: peso 15%
- [ ] Reemplazar stats mock del dashboard con datos reales:
  - Total trabajadores activos
  - Alertas criticas abiertas
  - Score de compliance
  - Contratos por vencer en 30 dias
- [ ] Semaforo visual: >= 80 verde, 60-79 amarillo, < 60 rojo
- [ ] Monto total de multa potencial estimada

**Criterio de completitud Fase 1**: Una empresa puede registrar sus trabajadores (manual o Excel), ver el legajo digital con % completitud, recibir alertas automaticas de vencimientos, generar contratos vinculados a trabajadores, ver su score de compliance y calendario de obligaciones. ESTO YA SE PUEDE VENDER.

---

### FASE 2 — DIFERENCIACION

**Objetivo**: Las funcionalidades que hacen que COMPLY360 sea unico en el mercado peruano. El "wow factor" que justifica el plan PRO.

#### F2.1 — Diagnostico SUNAFIL con Score (Modulo 5)

- [ ] Crear base de preguntas de compliance en `src/lib/compliance/questions/`
  - 120 preguntas para diagnostico completo, agrupadas por area:
    - Contratos y registro (15 preguntas)
    - Remuneraciones y beneficios (20 preguntas)
    - Jornada y descansos (15 preguntas)
    - Seguridad y Salud en el Trabajo (25 preguntas)
    - Documentos obligatorios (15 preguntas)
    - Relaciones laborales (10 preguntas)
    - Igualdad y no discriminacion (10 preguntas)
    - Trabajadores especiales (10 preguntas)
  - 20 preguntas para diagnostico express
  - Cada pregunta tiene: texto, area, base_legal, multa_asociada, peso, logica_condicional
- [ ] Logica condicional: si empresa < 20 trabajadores → omitir preguntas de Comite SST, si regimen MYPE → ajustar beneficios esperados
- [ ] Pagina `/dashboard/diagnostico`
  - Seleccion: Diagnostico Completo (120) vs Express (20)
  - Wizard de preguntas agrupadas por area
  - Para cada pregunta: Si/No/Parcial + campo para subir evidencia
  - Barra de progreso
- [ ] Pagina de resultados `/dashboard/diagnostico/[id]/resultado`
  - Score global ponderado por area
  - Desglose por area con semaforo
  - Gap Analysis: top 10 items urgentes ordenados por (multa_estimada x probabilidad_deteccion)
  - Plan de accion generado: por cada brecha → tarea, responsable sugerido, plazo, documento a generar
  - Monto total de multa potencial
  - Boton "Generar Plan de Accion" que crea tareas en el sistema
- [ ] Crear modelos ComplianceDiagnostic y ComplianceScore en Prisma (ver seccion 4.2)
- [ ] Historial de diagnosticos con grafico de evolucion del score

#### F2.2 — Simulacro SUNAFIL Interactivo (Modulo 6)

- [ ] Pagina `/dashboard/simulacro`
  - PASO 1 — Configuracion:
    - Tipo de inspeccion: preventiva, por denuncia, por programa sectorial
    - El sistema adapta el checklist al tipo + sector de la empresa
  - PASO 2 — Visita Virtual:
    - UI tipo chat/conversacion con "Inspector Virtual"
    - Solicitudes secuenciales: "Muestreme el registro de asistencia del mes anterior"
    - Para cada solicitud, buscar en legajo digital si existe el documento
    - Si existe y vigente: verde con checkmark
    - Si falta o vencido: rojo con multa estimada
  - PASO 3 — Requerimiento Virtual:
    - Genera "Acta de Requerimiento" con hallazgos (formato R.M. 199-2016-TR)
  - PASO 4 — Informe de Riesgo:
    - PDF descargable: infracciones por categoria (leves/graves/muy graves), multa total, plan de subsanacion
    - Calculo del 90% de descuento si subsana antes de inspeccion real
- [ ] Base de conocimiento: 28 tipos de documentos que SUNAFIL solicita, por sector
- [ ] Guardar resultado como ComplianceDiagnostic tipo SIMULATION

#### F2.3 — IA Laboral Peruana (Modulo 9)

- [ ] Definir arquitectura RAG:
  - Vector store: Supabase pgvector (aprovechar PostgreSQL existente) o Pinecone
  - Embeddings: OpenAI text-embedding-3-small
  - LLM: GPT-4o o Claude (segun costo)
- [ ] Indexar corpus legal:
  - D.Leg. 728 y reglamento (D.S. 003-97-TR)
  - Ley 29783 y reglamento (D.S. 005-2012-TR)
  - Ley 27942 (hostigamiento)
  - Ley 32353 (MYPE)
  - Ley 31110 (agrario)
  - Ley 30709 (igualdad salarial)
  - D.S. 019-2006-TR (infracciones SUNAFIL)
  - +40 normas adicionales
  - Resoluciones TFL de SUNAFIL (top 500 mas relevantes)
- [ ] Pagina `/dashboard/asistente-ia`
  - Chat interface con historial de conversaciones
  - Modo contextual: el asistente conoce datos de la empresa (regimen, sector, n trabajadores)
  - Respuestas con citacion de base legal exacta
  - Capacidades: consultas, calculos, borradores de documentos, explicacion de procesos
  - Escalamiento: si la consulta excede capacidades → boton "Consultar con abogado"
- [ ] API route `/api/ai-chat` con:
  - Context injection (datos de la empresa)
  - RAG pipeline (retrieve relevant law chunks → generate answer)
  - Guardar conversaciones para historial
- [ ] Implementar tambien el AI Review de contratos (completar el stub existente):
  - Analizar contrato generado vs normas aplicables
  - Score de riesgo 0-100
  - Lista de clausulas riesgosas con recomendacion

**Criterio de completitud Fase 2**: Una empresa puede correr un diagnostico completo, simular una inspeccion SUNAFIL interactiva, consultar al asistente IA sobre cualquier tema laboral peruano, y recibir revision inteligente de contratos. ESTO JUSTIFICA EL PLAN PRO A S/399/mes.

---

### FASE 3 — COMPLIANCE COMPLETO

**Objetivo**: Cubrir los modulos especializados que completan la oferta integral.

#### F3.1 — SST Completo (Modulo 7)
- [ ] Pagina `/dashboard/sst` con sub-secciones:
  - Politica SST: generador con los 8 elementos obligatorios (Art. 22 Ley 29783)
  - IPERC Digital: biblioteca de +500 peligros por sector, calculo AxB, matriz formato R.M. 050-2013-TR
  - Plan Anual SST: asistente paso a paso con diagnostico, objetivos SMART, cronograma
  - Comite/Supervisor SST: gestion electoral, mandato, actas mensuales
  - Registro de accidentes/incidentes: formulario formato SUNAFIL, notificacion 24h MTPE
  - Examenes medicos: control de vencimientos
  - Capacitaciones SST: 4 minimas/anio, registro de asistencia
  - Entrega de EPP: control por trabajador
  - Mapa de riesgos: generador con senaletica estandarizada
- [ ] Modelos SstRecord y sub-tipos en Prisma (ver seccion 4.2)
- [ ] Integracion con score de compliance: SST pesa 15% del score global

#### F3.2 — Canal de Denuncias (Modulo 8)
- [ ] URL publica por empresa: `comply360.pe/denuncias/[org-slug]`
  - Formulario accesible SIN login
  - Opcion anonima o nominada
  - Campos: tipo de conducta, descripcion, evidencia (upload), datos del denunciante (opcional)
- [ ] Triaje con IA: clasificar tipo (hostigamiento, discriminacion, acoso laboral, otro)
- [ ] Pagina `/dashboard/denuncias` (solo visible para Admin/Owner):
  - Lista de denuncias con estado
  - Gestion del Comite de Intervencion
  - Timeline visual del proceso (plazos: 3 dias medidas proteccion, 30 dias investigacion, 5 dias resolucion)
  - Registro de declaraciones y evidencias
  - Resolucion con base legal
  - Medidas de proteccion (checklist)
- [ ] Modelos Complaint y ComplaintTimeline en Prisma (ver seccion 4.2)
- [ ] Politica de hostigamiento: generador conforme D.S. 014-2019-MIMP
- [ ] Estadisticas anuales anonimizadas para informe de gestion

#### F3.3 — Reportes Avanzados (Modulo 12)
- [ ] Refactorizar pagina `/dashboard/reportes` con reportes reales:
  - Reporte Ejecutivo de Compliance: score, evolucion, areas en riesgo, multas evitadas
  - Reporte SUNAFIL-Ready: inventario de 28 documentos con estado
  - Reporte SST Anual: accidentabilidad, frecuencia, gravedad, capacitaciones
  - Reporte de Nomina y Beneficios: CTS, gratificaciones, vacaciones por periodo
  - Reporte de Contratos: vigentes por modalidad, por vencer, renovaciones
  - Reporte de Hostigamiento: denuncias (anonimizado), tiempos resolucion
  - Reporte para Auditor Externo: ZIP con todos los documentos de un periodo
- [ ] Generacion PDF profesional con logo de empresa (usar @react-pdf/renderer o similar)
- [ ] Exportacion Excel y CSV
- [ ] Programar reportes periodicos (mensual/trimestral)

#### F3.4 — Notificaciones Multi-Canal
- [ ] Email: integrar con servicio de email (Resend, SendGrid o SES)
  - Alertas a 30, 15, 7, 3 y 1 dia de vencimiento
  - Template HTML profesional con instrucciones de accion
- [ ] WhatsApp Business API: mensajes para alertas criticas al responsable RRHH
- [ ] Preferencias de notificacion en configuracion (ya existe el UI)

**Criterio de completitud Fase 3**: Compliance laboral integral. SST operativo, canal de denuncias funcional, reportes profesionales exportables, notificaciones automaticas. La empresa puede demostrar compliance total ante SUNAFIL.

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

| Modulo Plan Maestro | Fase | Prioridad |
|---|---|---|
| M1: Dashboard Compliance | F0 base + F1 score | CRITICA |
| M2: Trabajadores y Legajo | F1.1 - F1.2 | CRITICA |
| M3: Contratos y Documentos | F0 existente + F1.5 expand | ALTA |
| M4: Alertas y Calendario | F1.3 - F1.4 | CRITICA |
| M5: Diagnostico SUNAFIL | F2.1 | ALTA |
| M6: Simulacro SUNAFIL | F2.2 | ALTA |
| M7: SST Completo | F3.1 | MEDIA |
| M8: Canal Denuncias | F3.2 | MEDIA |
| M9: IA Laboral | F2.3 | ALTA |
| M10: E-Learning | F4.1 | BAJA |
| M11: Actualizaciones Normativas | F4.2 | BAJA |
| M12: Reportes y Auditoria | F3.3 | MEDIA |

---

## 7. CONVENCIONES DE CODIGO

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
