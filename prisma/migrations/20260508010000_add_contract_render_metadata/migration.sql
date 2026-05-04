ALTER TABLE "contracts"
  ADD COLUMN "provenance" TEXT NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN "generation_mode" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN "render_version" TEXT,
  ADD COLUMN "is_fallback" BOOLEAN NOT NULL DEFAULT false;

UPDATE "contracts"
SET
  "provenance" = COALESCE(
    NULLIF("content_json" ->> 'provenance', ''),
    NULLIF("form_data" ->> '_provenance', ''),
    'LEGACY'
  ),
  "generation_mode" = COALESCE(
    NULLIF("content_json" ->> 'generationMode', ''),
    NULLIF("form_data" ->> '_generationMode', ''),
    'legacy'
  ),
  "render_version" = COALESCE(
    NULLIF("content_json" ->> 'renderVersion', ''),
    NULLIF("form_data" ->> '_renderVersion', '')
  ),
  "is_fallback" = COALESCE(
    NULLIF("content_json" ->> 'isFallback', '')::boolean,
    NULLIF("form_data" ->> '_isFallback', '')::boolean,
    false
  )
WHERE "content_json" IS NOT NULL OR "form_data" IS NOT NULL;

CREATE INDEX "contracts_org_id_provenance_idx" ON "contracts"("org_id", "provenance");
CREATE INDEX "contracts_org_id_is_fallback_idx" ON "contracts"("org_id", "is_fallback");
