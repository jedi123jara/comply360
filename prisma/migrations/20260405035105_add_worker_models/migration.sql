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

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "worker_contracts_worker_id_contract_id_key" ON "worker_contracts"("worker_id", "contract_id");

-- CreateIndex
CREATE INDEX "worker_alerts_org_id_severity_idx" ON "worker_alerts"("org_id", "severity");

-- CreateIndex
CREATE INDEX "worker_alerts_due_date_idx" ON "worker_alerts"("due_date");

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_documents" ADD CONSTRAINT "worker_documents_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_records" ADD CONSTRAINT "vacation_records_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_contracts" ADD CONSTRAINT "worker_contracts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_contracts" ADD CONSTRAINT "worker_contracts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_alerts" ADD CONSTRAINT "worker_alerts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
