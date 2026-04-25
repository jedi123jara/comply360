-- Sello "Compliance-Ready" — distintivo público.
-- Ver `prisma/schema.prisma` → model OrgComplianceSeal.

CREATE TABLE "org_compliance_seals" (
  "id"             TEXT         NOT NULL,
  "org_id"         TEXT         NOT NULL,
  "slug"           TEXT         NOT NULL,
  "score_at_issue" INT4         NOT NULL,
  "score_avg_90d"  INT4         NOT NULL,
  "tier"           TEXT         NOT NULL DEFAULT 'BRONZE',
  "issued_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "valid_until"    TIMESTAMP(3) NOT NULL,
  "revoked_at"     TIMESTAMP(3),
  "revoked_reason" TEXT,

  CONSTRAINT "org_compliance_seals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_compliance_seals_slug_key"
  ON "org_compliance_seals"("slug");

CREATE INDEX "org_compliance_seals_org_id_issued_at_idx"
  ON "org_compliance_seals"("org_id", "issued_at");

CREATE INDEX "org_compliance_seals_valid_until_idx"
  ON "org_compliance_seals"("valid_until");
