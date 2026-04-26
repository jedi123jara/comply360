-- Migration: Sprint 0 → 6 (90-day transformation plan)
--
-- Cambios:
--  1. Worker: campos peruanos críticos (Ley 29973 discapacidad, tipo jornada,
--     attendance PIN para backup sin smartphone, AFP comisión, SCTR riesgo)
--  2. Subscription: grandfather pricing (precio congelado N meses tras re-pricing)
--  3. Attendance: anti-fraude (geolocalización + selfie hash) — PRO+
--  4. NpsFeedback: nuevo modelo para encuesta NPS in-product (UNIQUE userId)
--
-- Las nuevas columnas son nullable o tienen DEFAULT, así que el ALTER no
-- bloquea filas existentes. Compatible con rollout en caliente.

-- AlterTable: workers — Sprint 3 form trabajador peruano + Sprint 3 PIN backup
ALTER TABLE "workers" ADD COLUMN "afp_comision_tipo" TEXT,
ADD COLUMN "attendance_pin" TEXT,
ADD COLUMN "discapacidad" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "discapacidad_tipo" TEXT,
ADD COLUMN "sctr_riesgo_nivel" TEXT,
ADD COLUMN "tipo_jornada" TEXT NOT NULL DEFAULT 'DIURNO';

-- AlterTable: subscriptions — Sprint 2 grandfather pricing
ALTER TABLE "subscriptions" ADD COLUMN "pricing_frozen_amount" INTEGER,
ADD COLUMN "pricing_frozen_until" TIMESTAMP(3);

-- AlterTable: attendance — Sprint 3 geofence + selfie anti-fraude
ALTER TABLE "attendance" ADD COLUMN "geo_accuracy" DECIMAL(8,2),
ADD COLUMN "geo_lat" DECIMAL(10,7),
ADD COLUMN "geo_lng" DECIMAL(10,7),
ADD COLUMN "selfie_hash" TEXT;

-- CreateTable: nps_feedback — Sprint 6 NPS in-product
CREATE TABLE "nps_feedback" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nps_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: un solo NPS por user (idempotencia + previene spam)
CREATE UNIQUE INDEX "nps_feedback_user_id_key" ON "nps_feedback"("user_id");

-- CreateIndex: query por org ordenado por fecha (dashboard founder-digest)
CREATE INDEX "nps_feedback_org_id_created_at_idx" ON "nps_feedback"("org_id", "created_at");
