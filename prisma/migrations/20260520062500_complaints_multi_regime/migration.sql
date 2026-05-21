-- Canal de denuncias multi-regimen: HSL, SST y MPD.
-- Compatible con denuncias existentes: todas quedan como HSL por default.

CREATE TYPE "ComplaintRegime" AS ENUM ('HSL', 'SST', 'MPD');
CREATE TYPE "ComplaintChannel" AS ENUM ('WEB', 'EMAIL', 'PHONE', 'IN_PERSON', 'ANONYMOUS');

ALTER TYPE "ComplaintType" ADD VALUE IF NOT EXISTS 'SST_ACCIDENTE_MORTAL';
ALTER TYPE "ComplaintType" ADD VALUE IF NOT EXISTS 'SST_INCIDENTE_PELIGROSO';
ALTER TYPE "ComplaintType" ADD VALUE IF NOT EXISTS 'SST_ACCIDENTE_NO_MORTAL';
ALTER TYPE "ComplaintType" ADD VALUE IF NOT EXISTS 'SST_ENFERMEDAD_OCUPACIONAL';
ALTER TYPE "ComplaintType" ADD VALUE IF NOT EXISTS 'SST_CONDICION_INSEGURA';
ALTER TYPE "ComplaintType" ADD VALUE IF NOT EXISTS 'MPD_CORRUPCION';
ALTER TYPE "ComplaintType" ADD VALUE IF NOT EXISTS 'MPD_LAVADO_ACTIVOS';
ALTER TYPE "ComplaintType" ADD VALUE IF NOT EXISTS 'MPD_TRIBUTARIO_ADUANERO';
ALTER TYPE "ComplaintType" ADD VALUE IF NOT EXISTS 'MPD_TERRORISMO';
ALTER TYPE "ComplaintType" ADD VALUE IF NOT EXISTS 'MPD_OTRO';

ALTER TABLE "complaints"
  ADD COLUMN "regime" "ComplaintRegime" NOT NULL DEFAULT 'HSL',
  ADD COLUMN "channel" "ComplaintChannel" NOT NULL DEFAULT 'WEB',
  ADD COLUMN "occurred_at" TIMESTAMP(3),
  ADD COLUMN "location" TEXT,
  ADD COLUMN "witnesses" JSONB,
  ADD COLUMN "case_metadata" JSONB;

CREATE INDEX "complaints_org_id_regime_status_idx" ON "complaints"("org_id", "regime", "status");
