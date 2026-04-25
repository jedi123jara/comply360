-- Credenciales WebAuthn registradas por usuarios para firma biométrica fuerte.
-- Ver `prisma/schema.prisma` → model WebAuthnCredential.

CREATE TABLE "webauthn_credentials" (
  "id"            TEXT         NOT NULL,
  "user_id"       TEXT         NOT NULL,
  "credential_id" BYTEA        NOT NULL,
  "public_key"    BYTEA        NOT NULL,
  "counter"       BIGINT       NOT NULL DEFAULT 0,
  "transports"    TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "aaguid"        TEXT,
  "device_type"   TEXT,
  "backed_up"     BOOLEAN      NOT NULL DEFAULT FALSE,
  "nickname"      TEXT,
  "legacy"        BOOLEAN      NOT NULL DEFAULT FALSE,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at"  TIMESTAMP(3),

  CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webauthn_credentials_user_id_credential_id_key"
  ON "webauthn_credentials"("user_id", "credential_id");

CREATE INDEX "webauthn_credentials_user_id_idx"
  ON "webauthn_credentials"("user_id");
