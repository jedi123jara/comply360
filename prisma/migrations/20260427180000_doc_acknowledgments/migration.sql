-- Migration: Idea 1 — Auto-notificación con acuse de recibo de documentos
--
-- Cambios:
--  1. Extiende org_documents con campos de control del flow de acuse:
--     - ack_required (default false)
--     - ack_deadline_days (nullable)
--     - scope_filter (JSONB nullable)
--     - last_notified_at (nullable, para throttling)
--
--  2. Crea document_acknowledgments para registrar cada firma de worker
--     con valor legal SUNAFIL (Ley 27269 firma electrónica):
--     - documentVersion garantiza trazabilidad exacta del texto firmado
--     - signature_method: SIMPLE | OTP_EMAIL | BIOMETRIC
--     - ip + user_agent + scrolled_to_end + reading_time_ms = evidencia técnica
--     - UNIQUE (worker_id, document_id, document_version) — un ack por versión
--
-- Compatible con rolling deploy (todos nuevos campos nullable o con default).

-- AlterTable: org_documents
ALTER TABLE "org_documents" ADD COLUMN "ack_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "ack_deadline_days" INTEGER,
ADD COLUMN "scope_filter" JSONB,
ADD COLUMN "last_notified_at" TIMESTAMP(3);

-- CreateTable: document_acknowledgments
CREATE TABLE "document_acknowledgments" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "document_version" INTEGER NOT NULL,
    "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signature_method" TEXT NOT NULL,
    "signature_proof" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "scrolled_to_end" BOOLEAN NOT NULL DEFAULT false,
    "reading_time_ms" INTEGER,

    CONSTRAINT "document_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: un ack por (worker, doc, version) — re-firma si la versión cambia
CREATE UNIQUE INDEX "document_acknowledgments_worker_id_document_id_document_ver_key"
ON "document_acknowledgments"("worker_id", "document_id", "document_version");

-- CreateIndex: query rápido del admin "todos los acuses de este doc"
CREATE INDEX "document_acknowledgments_org_id_document_id_idx"
ON "document_acknowledgments"("org_id", "document_id");

-- CreateIndex: query del worker "histórico de mis firmas ordenado"
CREATE INDEX "document_acknowledgments_worker_id_acknowledged_at_idx"
ON "document_acknowledgments"("worker_id", "acknowledged_at");

-- ForeignKey: worker → si el worker se elimina, sus acks se cascadean
ALTER TABLE "document_acknowledgments"
ADD CONSTRAINT "document_acknowledgments_worker_id_fkey"
FOREIGN KEY ("worker_id") REFERENCES "workers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- ForeignKey: documento → si el doc se elimina, sus acks se cascadean
ALTER TABLE "document_acknowledgments"
ADD CONSTRAINT "document_acknowledgments_document_id_fkey"
FOREIGN KEY ("document_id") REFERENCES "org_documents"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- ForeignKey: organization
ALTER TABLE "document_acknowledgments"
ADD CONSTRAINT "document_acknowledgments_org_id_fkey"
FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
