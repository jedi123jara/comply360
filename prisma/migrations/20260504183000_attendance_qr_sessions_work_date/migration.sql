-- Persist QR sessions so short-code fallback can validate org, expiry, and mode.
CREATE TABLE "attendance_qr_sessions" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "short_code" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'both',
  "grace_minutes" INTEGER NOT NULL DEFAULT 15,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_by" TEXT,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "attendance_qr_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attendance_qr_sessions_org_id_short_code_expires_at_idx"
  ON "attendance_qr_sessions"("org_id", "short_code", "expires_at");
CREATE INDEX "attendance_qr_sessions_token_hash_idx"
  ON "attendance_qr_sessions"("token_hash");
CREATE INDEX "attendance_qr_sessions_expires_at_idx"
  ON "attendance_qr_sessions"("expires_at");

ALTER TABLE "attendance_qr_sessions"
  ADD CONSTRAINT "attendance_qr_sessions_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Store the local work date separately from the UTC timestamp.
ALTER TABLE "attendance" ADD COLUMN "work_date" DATE;

UPDATE "attendance"
SET "work_date" = ("clock_in" AT TIME ZONE 'America/Lima')::date
WHERE "work_date" IS NULL;

ALTER TABLE "attendance" ALTER COLUMN "work_date" SET NOT NULL;

CREATE INDEX "attendance_org_id_worker_id_work_date_idx"
  ON "attendance"("org_id", "worker_id", "work_date");

CREATE UNIQUE INDEX "attendance_org_id_worker_id_work_date_key"
  ON "attendance"("org_id", "worker_id", "work_date");

CREATE TABLE "attendance_justifications" (
  "id" TEXT NOT NULL,
  "attendance_id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "worker_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "files" JSONB,
  "requested_by" TEXT NOT NULL,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_justifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attendance_justifications_org_id_worker_id_requested_at_idx"
  ON "attendance_justifications"("org_id", "worker_id", "requested_at");
CREATE INDEX "attendance_justifications_attendance_id_idx"
  ON "attendance_justifications"("attendance_id");
ALTER TABLE "attendance_justifications"
  ADD CONSTRAINT "attendance_justifications_attendance_id_fkey"
  FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "attendance_approvals" (
  "id" TEXT NOT NULL,
  "attendance_id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "approved" BOOLEAN NOT NULL,
  "comment" TEXT,
  "justification_id" TEXT,
  "approved_by" TEXT NOT NULL,
  "approved_by_name" TEXT,
  "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attendance_approvals_org_id_approved_at_idx"
  ON "attendance_approvals"("org_id", "approved_at");
CREATE INDEX "attendance_approvals_attendance_id_idx"
  ON "attendance_approvals"("attendance_id");
ALTER TABLE "attendance_approvals"
  ADD CONSTRAINT "attendance_approvals_attendance_id_fkey"
  FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "attendance_evidence" (
  "id" TEXT NOT NULL,
  "attendance_id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "worker_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" TEXT,
  "metadata_json" JSONB,
  "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_evidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attendance_evidence_org_id_worker_id_captured_at_idx"
  ON "attendance_evidence"("org_id", "worker_id", "captured_at");
CREATE INDEX "attendance_evidence_attendance_id_idx"
  ON "attendance_evidence"("attendance_id");
ALTER TABLE "attendance_evidence"
  ADD CONSTRAINT "attendance_evidence_attendance_id_fkey"
  FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
