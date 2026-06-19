-- Follow-up #10: garantiza un solo WorkerDocument 'contrato_trabajo' por trabajador.

-- 1) Dedup: deja el más reciente por trabajador y borra los duplicados (necesario
--    ANTES de crear el índice único, que fallaría si hubiera duplicados).
DELETE FROM "worker_documents"
WHERE "document_type" = 'contrato_trabajo'
  AND "id" NOT IN (
    SELECT DISTINCT ON ("worker_id") "id"
    FROM "worker_documents"
    WHERE "document_type" = 'contrato_trabajo'
    ORDER BY "worker_id", "created_at" DESC
  );

-- 2) Índice único PARCIAL: a lo sumo un 'contrato_trabajo' por trabajador.
--    Es parcial porque otros document_type sí pueden repetirse (p.ej. boletas).
--    (Prisma no modela índices parciales en el schema → se gestiona vía SQL.)
CREATE UNIQUE INDEX IF NOT EXISTS "worker_documents_one_contrato_trabajo_per_worker"
  ON "worker_documents" ("worker_id")
  WHERE "document_type" = 'contrato_trabajo';
