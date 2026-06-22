-- Sede/centro de trabajo del trabajador (Worker.sedeId): base de la dotación por
-- sede para dimensionar los subcomités SST por sede (Art. 44 D.S. 005-2012-TR).
-- 100% ADITIVO y REVERSIBLE: columna nullable + FK ON DELETE SET NULL + índices.
-- Backfill best-effort (NO obligatorio): la columna queda nullable y la lógica de
-- comités degrada al total de la empresa cuando una sede no tiene dotación, así
-- que el deploy nunca falla aunque el backfill no llegue a correr (vía db push).

ALTER TABLE "workers" ADD COLUMN "sede_id" TEXT;

ALTER TABLE "workers"
  ADD CONSTRAINT "workers_sede_id_fkey"
  FOREIGN KEY ("sede_id") REFERENCES "sedes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "workers_sede_id_idx" ON "workers"("sede_id");
CREATE INDEX "workers_org_id_sede_id_idx" ON "workers"("org_id", "sede_id");

-- BACKFILL 1: deriva la sede del puesto de trabajo (SST) donde el worker está
-- asignado. Multi-tenant: el AND w.org_id = sub.org_id evita cruzar orgs. Si un
-- worker tiene >1 puesto, DISTINCT ON toma el más reciente (created_at DESC).
UPDATE "workers" w
SET "sede_id" = sub."sede_id"
FROM (
  SELECT DISTINCT ON (pt."worker_id")
         pt."worker_id", pt."sede_id", pt."org_id"
  FROM "puestos_trabajo" pt
  WHERE pt."worker_id" IS NOT NULL
  ORDER BY pt."worker_id", pt."created_at" DESC
) sub
WHERE w."id" = sub."worker_id"
  AND w."org_id" = sub."org_id"
  AND w."sede_id" IS NULL
  AND w."deleted_at" IS NULL;

-- BACKFILL 2: para orgs con EXACTAMENTE UNA sede activa, asígnala a todos sus
-- workers que aún no tengan sede. La correctitud depende ENTERAMENTE del
-- HAVING COUNT(*) = 1: con el grupo de tamaño 1, MIN(s.id) es solo el agregado
-- obligatorio por sintaxis (devuelve esa única sede), NO una elección de negocio.
-- ⚠️ Si se relaja el HAVING o el filtro activa, MIN asignaría una sede arbitraria.
-- Idempotente: solo toca workers vigentes con sede_id NULL.
UPDATE "workers" w
SET "sede_id" = single."sede_id"
FROM (
  SELECT s."org_id", MIN(s."id") AS "sede_id"
  FROM "sedes" s
  WHERE s."activa" = true
  GROUP BY s."org_id"
  HAVING COUNT(*) = 1
) single
WHERE w."org_id" = single."org_id"
  AND w."sede_id" IS NULL
  AND w."deleted_at" IS NULL;
