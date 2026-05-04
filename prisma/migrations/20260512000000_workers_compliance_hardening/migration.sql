-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: workers_compliance_hardening
-- Fecha:     2026-05-12
-- Olas:      1 (compliance crítico SUNAFIL) + 2 (hardening legajo)
--
-- Cambios:
--   1. Worker.deletedAt/deletedBy/deleteReason         → soft delete (Ley 27444)
--   2. Worker + 9 campos compliance peruano            → numeroEssalud, tipoSangre,
--      nivelEducativo, condicionEspecial, discapacidadCertificado,
--      conadisCertificadoNum, flagTRegistroPresentado, flagTRegistroFecha
--   3. WorkerAlertType + 4 valores                     → T_REGISTRO_NO_PRESENTADO,
--      SCTR_VENCIDO, CAMBIO_REGIMEN_SIN_ADENDA, LICENCIA_MEDICA_VENCIDA
--   4. Tabla worker_dependents + enum DependentRelation
--   5. Tabla worker_history_events + enum WorkerEventType
--   6. Índice composite (org_id, deleted_at) para listas activas
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Soft delete + 9 campos compliance en workers ─────────────────────────
ALTER TABLE "workers"
  ADD COLUMN "deleted_at"                TIMESTAMP(3),
  ADD COLUMN "deleted_by"                TEXT,
  ADD COLUMN "delete_reason"             TEXT,
  ADD COLUMN "numero_essalud"            TEXT,
  ADD COLUMN "tipo_sangre"               TEXT,
  ADD COLUMN "nivel_educativo"           TEXT,
  ADD COLUMN "condicion_especial"        TEXT,
  ADD COLUMN "discapacidad_certificado"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "conadis_certificado_num"   TEXT,
  ADD COLUMN "flag_t_registro_presentado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "flag_t_registro_fecha"     TIMESTAMP(3);

CREATE INDEX "workers_org_id_deleted_at_idx" ON "workers"("org_id", "deleted_at");

-- ── 2. WorkerAlertType: 4 valores nuevos ────────────────────────────────────
ALTER TYPE "WorkerAlertType" ADD VALUE IF NOT EXISTS 'T_REGISTRO_NO_PRESENTADO';
ALTER TYPE "WorkerAlertType" ADD VALUE IF NOT EXISTS 'SCTR_VENCIDO';
ALTER TYPE "WorkerAlertType" ADD VALUE IF NOT EXISTS 'CAMBIO_REGIMEN_SIN_ADENDA';
ALTER TYPE "WorkerAlertType" ADD VALUE IF NOT EXISTS 'LICENCIA_MEDICA_VENCIDA';

-- ── 3. Enum DependentRelation ───────────────────────────────────────────────
CREATE TYPE "DependentRelation" AS ENUM (
  'CONYUGE',
  'CONVIVIENTE',
  'HIJO',
  'HIJO_ADOPTIVO',
  'HIJO_DISCAPACITADO',
  'PADRE',
  'MADRE',
  'HERMANO_DISCAPACITADO',
  'OTRO'
);

-- ── 4. Tabla worker_dependents ──────────────────────────────────────────────
CREATE TABLE "worker_dependents" (
  "id"                       TEXT NOT NULL,
  "worker_id"                TEXT NOT NULL,
  "org_id"                   TEXT NOT NULL,
  "relacion"                 "DependentRelation" NOT NULL,
  "documento_tipo"           TEXT NOT NULL DEFAULT 'DNI',
  "documento_num"            TEXT NOT NULL,
  "full_name"                TEXT NOT NULL,
  "birth_date"               TIMESTAMP(3) NOT NULL,
  "acta_url"                 TEXT,
  "es_beneficiario_esalud"   BOOLEAN NOT NULL DEFAULT true,
  "es_beneficiario_asig_fam" BOOLEAN NOT NULL DEFAULT false,
  "verified_at"              TIMESTAMP(3),
  "verified_by"              TEXT,
  "notas"                    TEXT,
  "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL,
  "deleted_at"               TIMESTAMP(3),

  CONSTRAINT "worker_dependents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "worker_dependents_worker_id_documento_tipo_documento_num_key"
  ON "worker_dependents"("worker_id", "documento_tipo", "documento_num");

CREATE INDEX "worker_dependents_worker_id_deleted_at_idx"
  ON "worker_dependents"("worker_id", "deleted_at");

CREATE INDEX "worker_dependents_org_id_idx"
  ON "worker_dependents"("org_id");

ALTER TABLE "worker_dependents"
  ADD CONSTRAINT "worker_dependents_worker_id_fkey"
  FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 5. Enum WorkerEventType ─────────────────────────────────────────────────
CREATE TYPE "WorkerEventType" AS ENUM (
  'ALTA',
  'CAMBIO_SUELDO',
  'CAMBIO_CARGO',
  'CAMBIO_DEPARTAMENTO',
  'CAMBIO_REGIMEN',
  'CAMBIO_TIPO_CONTRATO',
  'CAMBIO_HORARIO',
  'CAMBIO_REGIMEN_PREVISIONAL',
  'SUSPENSION',
  'REINCORPORACION',
  'LICENCIA_MEDICA',
  'LICENCIA_MATERNIDAD',
  'LICENCIA_PATERNIDAD',
  'VACACIONES_INICIO',
  'VACACIONES_FIN',
  'CESE',
  'REINGRESO',
  'ACTUALIZACION_LEGAJO',
  'T_REGISTRO_PRESENTADO'
);

-- ── 6. Tabla worker_history_events ──────────────────────────────────────────
CREATE TABLE "worker_history_events" (
  "id"           TEXT NOT NULL,
  "worker_id"    TEXT NOT NULL,
  "org_id"       TEXT NOT NULL,
  "type"         "WorkerEventType" NOT NULL,
  "before"       JSONB,
  "after"        JSONB,
  "reason"       TEXT,
  "evidence_url" TEXT,
  "triggered_by" TEXT NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "worker_history_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "worker_history_events_worker_id_created_at_idx"
  ON "worker_history_events"("worker_id", "created_at");

CREATE INDEX "worker_history_events_org_id_type_idx"
  ON "worker_history_events"("org_id", "type");

CREATE INDEX "worker_history_events_org_id_created_at_idx"
  ON "worker_history_events"("org_id", "created_at");

ALTER TABLE "worker_history_events"
  ADD CONSTRAINT "worker_history_events_worker_id_fkey"
  FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
