-- Security hardening for public complaint tracking and evidence custody.
ALTER TABLE "complaints"
  ADD COLUMN "tracking_token_hash" TEXT,
  ADD COLUMN "tracking_token_rotated_at" TIMESTAMP(3);

CREATE INDEX "complaints_org_id_code_tracking_token_hash_idx" ON "complaints"("org_id", "code", "tracking_token_hash");

ALTER TABLE "complaint_timeline"
  ADD COLUMN "visible_to_reporter" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "public_description" TEXT;

ALTER TABLE "complaint_documents"
  ADD COLUMN "hash_sha256" TEXT;
