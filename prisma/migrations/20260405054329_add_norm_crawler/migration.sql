-- CreateEnum
CREATE TYPE "NormSource" AS ENUM ('EL_PERUANO', 'SUNAFIL', 'MTPE', 'SUNAT', 'MANUAL');

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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "norm_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "norm_updates_external_id_key" ON "norm_updates"("external_id");

-- CreateIndex
CREATE INDEX "norm_updates_category_published_at_idx" ON "norm_updates"("category", "published_at");

-- CreateIndex
CREATE INDEX "norm_updates_is_processed_idx" ON "norm_updates"("is_processed");
