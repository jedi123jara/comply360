-- Puente Comité SST (módulo SST Premium) ↔ unidad del organigrama.
-- 100% ADITIVO y REVERSIBLE: columna nullable + índice único + FK ON DELETE SET NULL.
-- No requiere backfill (nullable) y no altera ninguna query existente.

ALTER TABLE "comites_sst" ADD COLUMN "org_unit_id" TEXT;

CREATE UNIQUE INDEX "comites_sst_org_unit_id_key" ON "comites_sst"("org_unit_id");

ALTER TABLE "comites_sst"
  ADD CONSTRAINT "comites_sst_org_unit_id_fkey"
  FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
