-- ============================================================
-- Comply360 — RESET + CREATE Schema (idempotente)
-- ============================================================
-- Esto limpia cualquier objeto previo y crea el schema desde cero.
-- Seguro de correr múltiples veces.
-- ============================================================

-- 1. Drop everything in public schema
DROP SCHEMA IF EXISTS public CASCADE;

-- 2. Recreate public schema with proper permissions
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 3. Apply full Comply360 schema below
-- ============================================================


-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'STARTER', 'EMPRESA', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "GamificationEventType" AS ENUM ('WORKER_CREATED', 'DOCUMENT_UPLOADED', 'ALERT_RESOLVED', 'DIAGNOSTIC_COMPLETED', 'SIMULACRO_COMPLETED', 'CONTRACT_SIGNED', 'DAILY_STREAK', 'BADGE_UNLOCKED', 'SCORE_MILESTONE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'OWNER', 'ADMIN', 'MEMBER', 'VIEWER', 'WORKER');

-- CreateEnum
CREATE TYPE "RegimenLaboral" AS ENUM ('GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA', 'AGRARIO', 'CONSTRUCCION_CIVIL', 'MINERO', 'PESQUERO', 'TEXTIL_EXPORTACION', 'DOMESTICO', 'CAS', 'MODALIDAD_FORMATIVA', 'TELETRABAJO');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('INDEFINIDO', 'PLAZO_FIJO', 'TIEMPO_PARCIAL', 'INICIO_ACTIVIDAD', 'NECESIDAD_MERCADO', 'RECONVERSION', 'SUPLENCIA', 'EMERGENCIA', 'OBRA_DETERMINADA', 'INTERMITENTE', 'EXPORTACION');

-- CreateEnum
CREATE TYPE "TipoAporte" AS ENUM ('AFP', 'ONP', 'SIN_APORTE');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "DocCategory" AS ENUM ('INGRESO', 'VIGENTE', 'SST', 'PREVISIONAL', 'CESE');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('PENDING', 'UPLOADED', 'VERIFIED', 'EXPIRED', 'MISSING');

-- CreateEnum
CREATE TYPE "WorkerAlertType" AS ENUM ('CONTRATO_POR_VENCER', 'CONTRATO_VENCIDO', 'CTS_PENDIENTE', 'GRATIFICACION_PENDIENTE', 'VACACIONES_ACUMULADAS', 'VACACIONES_DOBLE_PERIODO', 'DOCUMENTO_FALTANTE', 'DOCUMENTO_VENCIDO', 'EXAMEN_MEDICO_VENCIDO', 'CAPACITACION_PENDIENTE', 'AFP_EN_MORA', 'REGISTRO_INCOMPLETO');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO', 'LABORAL_TIEMPO_PARCIAL', 'LOCACION_SERVICIOS', 'CONFIDENCIALIDAD', 'NO_COMPETENCIA', 'POLITICA_HOSTIGAMIENTO', 'POLITICA_SST', 'REGLAMENTO_INTERNO', 'ADDENDUM', 'CONVENIO_PRACTICAS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NormCategory" AS ENUM ('LABORAL', 'SUNAFIL', 'SEGURIDAD_SALUD', 'TRIBUTARIO', 'PROCESAL', 'GENERAL');

-- CreateEnum
CREATE TYPE "RuleOutput" AS ENUM ('NUMBER', 'BOOLEAN', 'PERCENTAGE', 'TEXT', 'CLAUSE');

-- CreateEnum
CREATE TYPE "CalculationType" AS ENUM ('LIQUIDACION', 'CTS', 'GRATIFICACION', 'INDEMNIZACION', 'HORAS_EXTRAS', 'VACACIONES', 'MULTA_SUNAFIL', 'INTERESES_LEGALES', 'APORTES_PREVISIONALES', 'UTILIDADES');

-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('UNREAD', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING');

-- CreateEnum
CREATE TYPE "ComplianceTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "InfracGravedad" AS ENUM ('LEVE', 'GRAVE', 'MUY_GRAVE');

-- CreateEnum
CREATE TYPE "DiagnosticType" AS ENUM ('FULL', 'EXPRESS', 'SIMULATION');

-- CreateEnum
CREATE TYPE "SstRecordType" AS ENUM ('POLITICA_SST', 'IPERC', 'PLAN_ANUAL', 'CAPACITACION', 'ACCIDENTE', 'INCIDENTE', 'EXAMEN_MEDICO', 'ENTREGA_EPP', 'ACTA_COMITE', 'MAPA_RIESGOS', 'SIMULACRO_EVACUACION', 'MONITOREO_AGENTES');

-- CreateEnum
CREATE TYPE "SstStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM ('HOSTIGAMIENTO_SEXUAL', 'DISCRIMINACION', 'ACOSO_LABORAL', 'OTRO');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'INVESTIGATING', 'PROTECTION_APPLIED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CourseCategory" AS ENUM ('SST', 'HOSTIGAMIENTO', 'DERECHOS_LABORALES', 'CONTRATOS', 'PLANILLA', 'INSPECCIONES', 'IGUALDAD', 'GENERAL');

-- CreateEnum
CREATE TYPE "LessonContentType" AS ENUM ('VIDEO', 'READING', 'INTERACTIVE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'EXAM_PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "NormSource" AS ENUM ('EL_PERUANO', 'SUNAFIL', 'MTPE', 'SUNAT', 'MANUAL');

-- CreateEnum
CREATE TYPE "NormStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TipoCese" AS ENUM ('RENUNCIA_VOLUNTARIA', 'DESPIDO_CAUSA_JUSTA', 'DESPIDO_ARBITRARIO', 'MUTUO_DISENSO', 'TERMINO_CONTRATO', 'NO_RENOVACION', 'FALLECIMIENTO', 'JUBILACION', 'PERIODO_PRUEBA');

-- CreateEnum
CREATE TYPE "EtapaCese" AS ENUM ('INICIADO', 'CARTA_PREAVISO', 'PERIODO_DESCARGOS', 'CARTA_DESPIDO', 'LIQUIDACION_CALCULADA', 'LIQUIDACION_PAGADA', 'COMPLETADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "SindicalRecordType" AS ENUM ('SINDICATO', 'CONVENIO_COLECTIVO', 'NEGOCIACION', 'PLIEGO_RECLAMOS', 'FUERO_SINDICAL', 'HUELGA');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('EMITIDA', 'ENVIADA', 'ACEPTADA', 'OBSERVADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "WorkerRequestType" AS ENUM ('VACACIONES', 'PERMISO', 'LICENCIA_MEDICA', 'LICENCIA_MATERNIDAD', 'LICENCIA_PATERNIDAD', 'ADELANTO_SUELDO', 'CTS_RETIRO_PARCIAL', 'CONSTANCIA_TRABAJO', 'CERTIFICADO_5TA', 'ACTUALIZAR_DATOS', 'OTRO');

-- CreateEnum
CREATE TYPE "WorkerRequestStatus" AS ENUM ('PENDIENTE', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "OrgDocType" AS ENUM ('RIT', 'REGLAMENTO_SST', 'POLITICA_HOSTIGAMIENTO', 'POLITICA_IGUALDAD', 'CODIGO_ETICA', 'MOF', 'ROF', 'PLAN_SST', 'PROTOCOLO_DENUNCIAS', 'CONVENIO_COLECTIVO', 'COMUNICADO', 'OTRO');

-- CreateEnum
CREATE TYPE "ServiceProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED', 'AT_RISK');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('DIAGNOSTICO_GRATIS', 'LANDING_PAGE', 'REFERRAL', 'WEBINAR', 'MANUAL');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruc" TEXT,
    "razon_social" TEXT,
    "nombre_comercial" TEXT,
    "sector" TEXT,
    "size_range" TEXT,
    "logo_url" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "plan_expires_at" TIMESTAMP(3),
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "regimen_principal" TEXT,
    "regimen_tributario" TEXT,
    "alert_email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "district" TEXT,
    "rep_nombre" TEXT,
    "rep_dni" TEXT,
    "rep_cargo" TEXT,
    "cont_nombre" TEXT,
    "cont_cpc" TEXT,
    "cont_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_credentials" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT,
    "encrypted_config" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_tested_at" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "last_sync_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "org_id" TEXT,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "avatar_url" TEXT,
    "push_subscription" JSONB,
    "streak_current" INTEGER NOT NULL DEFAULT 0,
    "streak_longest" INTEGER NOT NULL DEFAULT 0,
    "streak_last_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT,
    "type" "GamificationEventType" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT,
    "dni" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "birth_date" TIMESTAMP(3),
    "gender" TEXT,
    "nationality" TEXT DEFAULT 'peruana',
    "address" TEXT,
    "position" TEXT,
    "department" TEXT,
    "regimen_laboral" "RegimenLaboral" NOT NULL DEFAULT 'GENERAL',
    "tipo_contrato" "TipoContrato" NOT NULL DEFAULT 'INDEFINIDO',
    "fecha_ingreso" TIMESTAMP(3) NOT NULL,
    "fecha_cese" TIMESTAMP(3),
    "motivo_cese" TEXT,
    "sueldo_bruto" DECIMAL(10,2) NOT NULL,
    "asignacion_familiar" BOOLEAN NOT NULL DEFAULT false,
    "jornada_semanal" INTEGER NOT NULL DEFAULT 48,
    "tiempo_completo" BOOLEAN NOT NULL DEFAULT true,
    "tipo_aporte" "TipoAporte" NOT NULL DEFAULT 'AFP',
    "afp_nombre" TEXT,
    "cuspp" TEXT,
    "essalud_vida" BOOLEAN NOT NULL DEFAULT false,
    "sctr" BOOLEAN NOT NULL DEFAULT false,
    "status" "WorkerStatus" NOT NULL DEFAULT 'ACTIVE',
    "legajo_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_documents" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "category" "DocCategory" NOT NULL,
    "document_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacation_records" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "periodo_inicio" TIMESTAMP(3) NOT NULL,
    "periodo_fin" TIMESTAMP(3) NOT NULL,
    "dias_corresponden" INTEGER NOT NULL DEFAULT 30,
    "dias_gozados" INTEGER NOT NULL DEFAULT 0,
    "dias_pendientes" INTEGER NOT NULL DEFAULT 30,
    "fecha_goce" TIMESTAMP(3),
    "es_doble" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_contracts" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_alerts" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "type" "WorkerAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "multa_estimada" DECIMAL(10,2),
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fields_schema" JSONB NOT NULL,
    "content_blocks" JSONB NOT NULL,
    "legal_basis" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "template_id" TEXT,
    "type" "ContractType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "form_data" JSONB,
    "content_json" JSONB,
    "content_html" TEXT,
    "docx_url" TEXT,
    "pdf_url" TEXT,
    "expires_at" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "ai_risk_score" INTEGER,
    "ai_risks_json" JSONB,
    "ai_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_norms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body_text" TEXT,
    "category" "NormCategory" NOT NULL,
    "published_at" TIMESTAMP(3),
    "effective_at" TIMESTAMP(3),
    "repealed_at" TIMESTAMP(3),
    "source_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_norms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_rules" (
    "id" TEXT NOT NULL,
    "norm_id" TEXT NOT NULL,
    "rule_key" TEXT NOT NULL,
    "description" TEXT,
    "condition_json" JSONB,
    "formula" TEXT,
    "parameters" JSONB,
    "output_type" "RuleOutput" NOT NULL DEFAULT 'NUMBER',
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculations" (
    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "user_id" TEXT,
    "type" "CalculationType" NOT NULL,
    "inputs_json" JSONB NOT NULL,
    "result_json" JSONB NOT NULL,
    "total_amount" DECIMAL(12,2),
    "pdf_url" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "norm_alerts" (
    "id" TEXT NOT NULL,
    "norm_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "impact_level" "ImpactLevel" NOT NULL,
    "affected_contract_types" "ContractType"[],
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "norm_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_alerts" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "norm_alert_id" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'UNREAD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "payment_provider" TEXT,
    "external_subscription_id" TEXT,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_diagnostics" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "type" "DiagnosticType" NOT NULL,
    "score_global" INTEGER NOT NULL,
    "score_by_area" JSONB NOT NULL,
    "total_multa_riesgo" DECIMAL(12,2) NOT NULL,
    "questions_json" JSONB NOT NULL,
    "gap_analysis" JSONB,
    "action_plan" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_diagnostics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_tasks" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "diagnostic_id" TEXT,
    "source_id" TEXT,
    "area" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "base_legal" TEXT,
    "gravedad" "InfracGravedad" NOT NULL DEFAULT 'LEVE',
    "multa_evitable" DECIMAL(12,2),
    "plazo_sugerido" TEXT,
    "due_date" TIMESTAMP(3),
    "assigned_to" TEXT,
    "status" "ComplianceTaskStatus" NOT NULL DEFAULT 'PENDING',
    "evidence_url" TEXT,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_scores" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "score_global" INTEGER NOT NULL,
    "score_contratos" INTEGER,
    "score_sst" INTEGER,
    "score_documentos" INTEGER,
    "score_vencimientos" INTEGER,
    "score_planilla" INTEGER,
    "multa_evitada" DECIMAL(12,2),
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sst_records" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "type" "SstRecordType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB,
    "responsible_id" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" "SstStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sst_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ComplaintType" NOT NULL,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "reporter_name" TEXT,
    "reporter_email" TEXT,
    "reporter_phone" TEXT,
    "accused_name" TEXT,
    "accused_position" TEXT,
    "description" TEXT NOT NULL,
    "evidence_urls" TEXT[],
    "status" "ComplaintStatus" NOT NULL DEFAULT 'RECEIVED',
    "assigned_to" TEXT,
    "resolution" TEXT,
    "protection_measures" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_timeline" (
    "id" TEXT NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "CourseCategory" NOT NULL,
    "thumbnail_url" TEXT,
    "duration_min" INTEGER NOT NULL DEFAULT 30,
    "is_obligatory" BOOLEAN NOT NULL DEFAULT false,
    "target_regimen" "RegimenLaboral"[],
    "target_roles" TEXT[],
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content_type" "LessonContentType" NOT NULL,
    "content_url" TEXT,
    "content_html" TEXT,
    "duration_min" INTEGER NOT NULL DEFAULT 10,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "org_id" TEXT NOT NULL,
    "worker_name" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "exam_score" INTEGER,
    "exam_attempts" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "certificate_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "time_spent_sec" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "explanation" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "worker_name" TEXT NOT NULL,
    "worker_dni" TEXT,
    "course_title" TEXT NOT NULL,
    "course_category" "CourseCategory" NOT NULL,
    "score" INTEGER NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "qr_data" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "norm_updates" (
    "id" TEXT NOT NULL,
    "source" "NormSource" NOT NULL,
    "external_id" TEXT,
    "norm_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "full_text" TEXT,
    "category" "NormCategory" NOT NULL,
    "published_at" TIMESTAMP(3),
    "effective_at" TIMESTAMP(3),
    "source_url" TEXT,
    "impact_analysis" TEXT,
    "impact_level" "ImpactLevel",
    "affected_modules" TEXT[],
    "affected_regimens" "RegimenLaboral"[],
    "action_required" TEXT,
    "action_deadline" TIMESTAMP(3),
    "is_processed" BOOLEAN NOT NULL DEFAULT false,
    "status" "NormStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "norm_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cese_records" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "tipo_cese" "TipoCese" NOT NULL,
    "causa_detalle" TEXT,
    "fecha_inicio_proceso" TIMESTAMP(3) NOT NULL,
    "fecha_cese" TIMESTAMP(3) NOT NULL,
    "fecha_carta_preaviso" TIMESTAMP(3),
    "fecha_limite_descargos" TIMESTAMP(3),
    "fecha_carta_despido" TIMESTAMP(3),
    "fecha_pago_liquidacion" TIMESTAMP(3),
    "sueldo_bruto" DECIMAL(10,2) NOT NULL,
    "cts_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vacaciones_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gratificacion_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "indemnizacion_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_liquidacion" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "detalle_json" JSONB,
    "etapa" "EtapaCese" NOT NULL DEFAULT 'INICIADO',
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cese_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terceros" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "actividad_principal" TEXT,
    "tipo_servicio" TEXT,
    "contrato_url" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "trabajadores_asignados" INTEGER NOT NULL DEFAULT 0,
    "is_actividad_principal" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terceros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sindical_records" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "type" "SindicalRecordType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sindical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata_json" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "clock_in" TIMESTAMP(3) NOT NULL,
    "clock_out" TIMESTAMP(3),
    "hours_worked" DECIMAL(5,2),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL,
    "sueldo_bruto" DECIMAL(10,2) NOT NULL,
    "asignacion_familiar" DECIMAL(10,2),
    "horas_extras" DECIMAL(10,2),
    "bonificaciones" DECIMAL(10,2),
    "total_ingresos" DECIMAL(10,2) NOT NULL,
    "aporte_afp_onp" DECIMAL(10,2),
    "renta_quinta_cat" DECIMAL(10,2),
    "otros_descuentos" DECIMAL(10,2),
    "total_descuentos" DECIMAL(10,2) NOT NULL,
    "neto_pagar" DECIMAL(10,2) NOT NULL,
    "essalud" DECIMAL(10,2),
    "pdf_url" TEXT,
    "detalle_json" JSONB,
    "status" "PayslipStatus" NOT NULL DEFAULT 'EMITIDA',
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_requests" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "type" "WorkerRequestType" NOT NULL,
    "status" "WorkerRequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "days_requested" INTEGER,
    "amount" DECIMAL(10,2),
    "attachment_url" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_documents" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "type" "OrgDocType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_published_to_workers" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_providers" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL DEFAULT 'DNI',
    "document_number" TEXT NOT NULL,
    "ruc" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "profession" TEXT,
    "servicio_descripcion" TEXT NOT NULL,
    "area" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "monthly_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "payment_frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "has_suspension_retencion" BOOLEAN NOT NULL DEFAULT false,
    "suspension_expiry_date" TIMESTAMP(3),
    "has_fixed_schedule" BOOLEAN NOT NULL DEFAULT false,
    "has_exclusivity" BOOLEAN NOT NULL DEFAULT false,
    "works_on_premises" BOOLEAN NOT NULL DEFAULT false,
    "uses_company_tools" BOOLEAN NOT NULL DEFAULT false,
    "reports_to_supervisor" BOOLEAN NOT NULL DEFAULT false,
    "receives_orders" BOOLEAN NOT NULL DEFAULT false,
    "desnaturalizacion_risk" INTEGER NOT NULL DEFAULT 0,
    "contract_file_url" TEXT,
    "status" "ServiceProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_invoices" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "periodo" TEXT NOT NULL,
    "gross_amount" DECIMAL(10,2) NOT NULL,
    "retention" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "has_retention" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "file_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rh_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultor_clients" (
    "id" TEXT NOT NULL,
    "consultor_user_id" TEXT NOT NULL,
    "consultor_org_id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "client_org_name" TEXT,
    "client_ruc" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultor_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspecciones_en_vivo" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "inspector_name" TEXT,
    "inspector_dni" TEXT,
    "orden_inspeccion" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "hallazgos_json" JSONB,
    "resultado_json" JSONB,
    "evidencias_json" JSONB,
    "multa_estimada" DECIMAL(12,2),
    "score_inspeccion" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspecciones_en_vivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company_name" TEXT,
    "company_size" TEXT,
    "sector" TEXT,
    "phone" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'DIAGNOSTICO_GRATIS',
    "score_global" INTEGER,
    "multa_estimada" DECIMAL(12,2),
    "score_by_area" JSONB,
    "converted_at" TIMESTAMP(3),
    "converted_org_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sunat_query_cache" (
    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "ruc" TEXT NOT NULL,
    "query_type" TEXT NOT NULL,
    "result_json" JSONB NOT NULL,
    "queried_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sunat_query_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_ruc_key" ON "organizations"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "integration_credentials_org_id_provider_key" ON "integration_credentials"("org_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "gamification_events_user_id_created_at_idx" ON "gamification_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "gamification_events_org_id_type_idx" ON "gamification_events"("org_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_org_id_email_key" ON "invitations"("org_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "workers_user_id_key" ON "workers"("user_id");

-- CreateIndex
CREATE INDEX "workers_org_id_status_idx" ON "workers"("org_id", "status");

-- CreateIndex
CREATE INDEX "workers_org_id_regimen_laboral_idx" ON "workers"("org_id", "regimen_laboral");

-- CreateIndex
CREATE UNIQUE INDEX "workers_org_id_dni_key" ON "workers"("org_id", "dni");

-- CreateIndex
CREATE INDEX "worker_documents_worker_id_category_idx" ON "worker_documents"("worker_id", "category");

-- CreateIndex
CREATE INDEX "worker_documents_expires_at_idx" ON "worker_documents"("expires_at");

-- CreateIndex
CREATE INDEX "vacation_records_worker_id_idx" ON "vacation_records"("worker_id");

-- CreateIndex
CREATE INDEX "worker_contracts_worker_id_idx" ON "worker_contracts"("worker_id");

-- CreateIndex
CREATE INDEX "worker_contracts_contract_id_idx" ON "worker_contracts"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "worker_contracts_worker_id_contract_id_key" ON "worker_contracts"("worker_id", "contract_id");

-- CreateIndex
CREATE INDEX "worker_alerts_org_id_severity_idx" ON "worker_alerts"("org_id", "severity");

-- CreateIndex
CREATE INDEX "worker_alerts_org_id_resolved_at_idx" ON "worker_alerts"("org_id", "resolved_at");

-- CreateIndex
CREATE INDEX "worker_alerts_due_date_idx" ON "worker_alerts"("due_date");

-- CreateIndex
CREATE INDEX "contracts_org_id_status_idx" ON "contracts"("org_id", "status");

-- CreateIndex
CREATE INDEX "contracts_org_id_type_idx" ON "contracts"("org_id", "type");

-- CreateIndex
CREATE INDEX "contracts_org_id_expires_at_idx" ON "contracts"("org_id", "expires_at");

-- CreateIndex
CREATE INDEX "contracts_expires_at_idx" ON "contracts"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "legal_norms_code_key" ON "legal_norms"("code");

-- CreateIndex
CREATE INDEX "legal_norms_category_idx" ON "legal_norms"("category");

-- CreateIndex
CREATE UNIQUE INDEX "legal_rules_rule_key_key" ON "legal_rules"("rule_key");

-- CreateIndex
CREATE INDEX "legal_rules_rule_key_idx" ON "legal_rules"("rule_key");

-- CreateIndex
CREATE INDEX "calculations_org_id_type_idx" ON "calculations"("org_id", "type");

-- CreateIndex
CREATE INDEX "calculations_created_at_idx" ON "calculations"("created_at");

-- CreateIndex
CREATE INDEX "norm_alerts_impact_level_published_at_idx" ON "norm_alerts"("impact_level", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "org_alerts_org_id_norm_alert_id_key" ON "org_alerts"("org_id", "norm_alert_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_org_id_key" ON "subscriptions"("org_id");

-- CreateIndex
CREATE INDEX "compliance_diagnostics_org_id_created_at_idx" ON "compliance_diagnostics"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "compliance_diagnostics_org_id_type_idx" ON "compliance_diagnostics"("org_id", "type");

-- CreateIndex
CREATE INDEX "compliance_tasks_org_id_status_idx" ON "compliance_tasks"("org_id", "status");

-- CreateIndex
CREATE INDEX "compliance_tasks_org_id_due_date_idx" ON "compliance_tasks"("org_id", "due_date");

-- CreateIndex
CREATE INDEX "compliance_tasks_diagnostic_id_idx" ON "compliance_tasks"("diagnostic_id");

-- CreateIndex
CREATE INDEX "compliance_scores_org_id_calculated_at_idx" ON "compliance_scores"("org_id", "calculated_at");

-- CreateIndex
CREATE INDEX "sst_records_org_id_type_idx" ON "sst_records"("org_id", "type");

-- CreateIndex
CREATE INDEX "sst_records_org_id_status_idx" ON "sst_records"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_code_key" ON "complaints"("code");

-- CreateIndex
CREATE INDEX "complaints_org_id_status_idx" ON "complaints"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_category_idx" ON "courses"("category");

-- CreateIndex
CREATE INDEX "lessons_course_id_idx" ON "lessons"("course_id");

-- CreateIndex
CREATE INDEX "enrollments_org_id_status_idx" ON "enrollments"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_course_id_worker_id_org_id_key" ON "enrollments"("course_id", "worker_id", "org_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_enrollment_id_lesson_id_key" ON "lesson_progress"("enrollment_id", "lesson_id");

-- CreateIndex
CREATE INDEX "exam_questions_course_id_idx" ON "exam_questions"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");

-- CreateIndex
CREATE INDEX "certificates_org_id_idx" ON "certificates"("org_id");

-- CreateIndex
CREATE INDEX "certificates_code_idx" ON "certificates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "norm_updates_external_id_key" ON "norm_updates"("external_id");

-- CreateIndex
CREATE INDEX "norm_updates_category_published_at_idx" ON "norm_updates"("category", "published_at");

-- CreateIndex
CREATE INDEX "norm_updates_is_processed_idx" ON "norm_updates"("is_processed");

-- CreateIndex
CREATE INDEX "norm_updates_status_idx" ON "norm_updates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cese_records_worker_id_key" ON "cese_records"("worker_id");

-- CreateIndex
CREATE INDEX "cese_records_org_id_idx" ON "cese_records"("org_id");

-- CreateIndex
CREATE INDEX "terceros_org_id_idx" ON "terceros"("org_id");

-- CreateIndex
CREATE INDEX "sindical_records_org_id_type_idx" ON "sindical_records"("org_id", "type");

-- CreateIndex
CREATE INDEX "audit_logs_org_id_created_at_idx" ON "audit_logs"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_org_id_action_idx" ON "audit_logs"("org_id", "action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "attendance_org_id_clock_in_idx" ON "attendance"("org_id", "clock_in");

-- CreateIndex
CREATE INDEX "attendance_worker_id_clock_in_idx" ON "attendance"("worker_id", "clock_in");

-- CreateIndex
CREATE INDEX "payslips_org_id_periodo_idx" ON "payslips"("org_id", "periodo");

-- CreateIndex
CREATE INDEX "payslips_org_id_status_idx" ON "payslips"("org_id", "status");

-- CreateIndex
CREATE INDEX "payslips_worker_id_periodo_idx" ON "payslips"("worker_id", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_worker_id_periodo_key" ON "payslips"("worker_id", "periodo");

-- CreateIndex
CREATE INDEX "worker_requests_org_id_status_idx" ON "worker_requests"("org_id", "status");

-- CreateIndex
CREATE INDEX "worker_requests_worker_id_created_at_idx" ON "worker_requests"("worker_id", "created_at");

-- CreateIndex
CREATE INDEX "org_documents_org_id_type_idx" ON "org_documents"("org_id", "type");

-- CreateIndex
CREATE INDEX "org_documents_org_id_is_published_to_workers_idx" ON "org_documents"("org_id", "is_published_to_workers");

-- CreateIndex
CREATE INDEX "service_providers_org_id_status_idx" ON "service_providers"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "service_providers_org_id_document_number_key" ON "service_providers"("org_id", "document_number");

-- CreateIndex
CREATE INDEX "rh_invoices_org_id_periodo_idx" ON "rh_invoices"("org_id", "periodo");

-- CreateIndex
CREATE INDEX "rh_invoices_provider_id_issue_date_idx" ON "rh_invoices"("provider_id", "issue_date");

-- CreateIndex
CREATE INDEX "consultor_clients_consultor_user_id_is_active_idx" ON "consultor_clients"("consultor_user_id", "is_active");

-- CreateIndex
CREATE INDEX "consultor_clients_consultor_org_id_idx" ON "consultor_clients"("consultor_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "consultor_clients_consultor_user_id_client_org_id_key" ON "consultor_clients"("consultor_user_id", "client_org_id");

-- CreateIndex
CREATE INDEX "inspecciones_en_vivo_org_id_status_idx" ON "inspecciones_en_vivo"("org_id", "status");

-- CreateIndex
CREATE INDEX "inspecciones_en_vivo_org_id_created_at_idx" ON "inspecciones_en_vivo"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_source_created_at_idx" ON "leads"("source", "created_at");

-- CreateIndex
CREATE INDEX "sunat_query_cache_ruc_query_type_idx" ON "sunat_query_cache"("ruc", "query_type");

-- CreateIndex
CREATE INDEX "sunat_query_cache_expires_at_idx" ON "sunat_query_cache"("expires_at");

-- AddForeignKey
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_events" ADD CONSTRAINT "gamification_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_documents" ADD CONSTRAINT "worker_documents_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_records" ADD CONSTRAINT "vacation_records_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_contracts" ADD CONSTRAINT "worker_contracts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_contracts" ADD CONSTRAINT "worker_contracts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_alerts" ADD CONSTRAINT "worker_alerts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_rules" ADD CONSTRAINT "legal_rules_norm_id_fkey" FOREIGN KEY ("norm_id") REFERENCES "legal_norms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "norm_alerts" ADD CONSTRAINT "norm_alerts_norm_id_fkey" FOREIGN KEY ("norm_id") REFERENCES "legal_norms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_alerts" ADD CONSTRAINT "org_alerts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_alerts" ADD CONSTRAINT "org_alerts_norm_alert_id_fkey" FOREIGN KEY ("norm_alert_id") REFERENCES "norm_alerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_diagnostics" ADD CONSTRAINT "compliance_diagnostics_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_diagnostic_id_fkey" FOREIGN KEY ("diagnostic_id") REFERENCES "compliance_diagnostics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_timeline" ADD CONSTRAINT "complaint_timeline_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cese_records" ADD CONSTRAINT "cese_records_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_requests" ADD CONSTRAINT "worker_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_requests" ADD CONSTRAINT "worker_requests_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_requests" ADD CONSTRAINT "worker_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_documents" ADD CONSTRAINT "org_documents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_invoices" ADD CONSTRAINT "rh_invoices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_invoices" ADD CONSTRAINT "rh_invoices_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultor_clients" ADD CONSTRAINT "consultor_clients_consultor_org_id_fkey" FOREIGN KEY ("consultor_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultor_clients" ADD CONSTRAINT "consultor_clients_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones_en_vivo" ADD CONSTRAINT "inspecciones_en_vivo_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

