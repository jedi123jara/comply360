-- Generador de Contratos — Chunk 9: Ingestor de Jurisprudencia
-- Pipeline de actualización del catálogo legal: cada casación / sentencia /
-- resolución SUNAFIL se ingresa como una entrada y, tras revisión humana,
-- el "apply" muta `contract_validation_rules` y `contract_clauses` sin
-- requerir redeploy.
-- Ver docs/specs/contract-generator-spec.md §12.

-- CreateEnum
CREATE TYPE "JurisprudenceSource" AS ENUM (
  'CORTE_SUPREMA',
  'TRIBUNAL_CONSTITUCIONAL',
  'SUNAFIL',
  'MTPE',
  'OTRO'
);

-- CreateEnum
CREATE TYPE "JurisprudenceReviewStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'APPLIED',
  'REJECTED'
);

-- CreateTable
CREATE TABLE "jurisprudence_updates" (
    "id" TEXT NOT NULL,
    "source" "JurisprudenceSource" NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publication_date" TIMESTAMP(3) NOT NULL,
    "topic" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "full_text_url" TEXT,
    "affected_rules" JSONB NOT NULL,
    "affected_clauses" JSONB NOT NULL,
    "review_status" "JurisprudenceReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "apply_result" JSONB,
    "applied_at" TIMESTAMP(3),
    "applied_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jurisprudence_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jurisprudence_updates_source_publication_date_idx" ON "jurisprudence_updates"("source", "publication_date");

-- CreateIndex
CREATE INDEX "jurisprudence_updates_review_status_created_at_idx" ON "jurisprudence_updates"("review_status", "created_at");

-- CreateIndex
CREATE INDEX "jurisprudence_updates_reference_idx" ON "jurisprudence_updates"("reference");
