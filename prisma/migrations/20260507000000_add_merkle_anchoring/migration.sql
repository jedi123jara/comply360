-- Generador de Contratos — Chunk 8: Anclaje criptográfico externo
-- MerkleAnchor agrupa todas las versionHash de un tenant en un día UTC en
-- un árbol binario SHA-256. La raíz se ancla externamente vía RFC 3161
-- (TSA INDECOPI) y/o OpenTimestamps (Bitcoin) — campos nullable hasta que
-- el cron diario procese.
-- Ver docs/specs/contract-generator-spec.md §10.

-- CreateTable
CREATE TABLE "merkle_anchors" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "anchor_date" DATE NOT NULL,
    "leaf_count" INTEGER NOT NULL,
    "leaves" JSONB NOT NULL,
    "merkle_root" TEXT NOT NULL,
    "rfc3161_token" BYTEA,
    "rfc3161_tsa" TEXT,
    "rfc3161_at" TIMESTAMP(3),
    "ots_proof" BYTEA,
    "ots_calendar" TEXT,
    "ots_at" TIMESTAMP(3),
    "bitcoin_block_height" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merkle_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merkle_anchors_org_id_anchor_date_key" ON "merkle_anchors"("org_id", "anchor_date");

-- CreateIndex
CREATE INDEX "merkle_anchors_anchor_date_idx" ON "merkle_anchors"("anchor_date");

-- CreateIndex
CREATE INDEX "merkle_anchors_org_id_status_idx" ON "merkle_anchors"("org_id", "status");

-- AlterTable: enlazar ContractVersion → MerkleAnchor
ALTER TABLE "contract_versions"
  ADD COLUMN "merkle_anchor_id" TEXT,
  ADD COLUMN "leaf_index" INTEGER,
  ADD COLUMN "merkle_proof" JSONB;

-- CreateIndex
CREATE INDEX "contract_versions_merkle_anchor_id_idx" ON "contract_versions"("merkle_anchor_id");

-- AddForeignKey
ALTER TABLE "contract_versions"
  ADD CONSTRAINT "contract_versions_merkle_anchor_id_fkey"
  FOREIGN KEY ("merkle_anchor_id") REFERENCES "merkle_anchors"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
