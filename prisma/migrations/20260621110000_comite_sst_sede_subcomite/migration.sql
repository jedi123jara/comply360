-- Subcomité de SST por sede (Art. 44 D.S. 005-2012-TR): sede_id NULL = Comité
-- principal del empleador; con sede_id = Subcomité de esa sede (facultativo).
-- 100% ADITIVO y REVERSIBLE: columna nullable + índice + FK ON DELETE SET NULL.
-- Sin backfill: los comités existentes quedan con sede_id NULL (el principal).

ALTER TABLE "comites_sst" ADD COLUMN "sede_id" TEXT;

CREATE INDEX "comites_sst_org_id_sede_id_idx" ON "comites_sst"("org_id", "sede_id");

ALTER TABLE "comites_sst"
  ADD CONSTRAINT "comites_sst_sede_id_fkey"
  FOREIGN KEY ("sede_id") REFERENCES "sedes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
