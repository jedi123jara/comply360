-- Migration: Geofences persistentes + AttendanceAttempt log (Fase 4 — Asistencia)
--
-- Geofence:
-- Antes vivían en Map<orgId, Geofence[]> en memoria del proceso Node — lo
-- que rompía en Vercel multi-instance y se perdía en cada rolling deploy.
-- Ahora son persistentes en Postgres.
--
-- AttendanceAttempt:
-- Persiste TODOS los intentos de fichado (éxito + fallidos). Sin esto, si un
-- worker intenta fichar 5x fuera de geofence o brute-force PIN, el sistema
-- es ciego al patrón sospechoso. Con esto, se puede dashboard de heatmap
-- y alertas anti-fraude.
--
-- Compatible con rolling deploy: tablas nuevas, no toca nada existente.

CREATE TYPE "GeofenceType" AS ENUM ('CIRCLE', 'POLYGON');

CREATE TYPE "AttendanceAttemptResult" AS ENUM (
  'SUCCESS', 'TOKEN_EXPIRED', 'TOKEN_INVALID', 'ORG_MISMATCH',
  'GEOFENCE_OUT', 'GEOLOCATION_REQUIRED', 'PIN_WRONG', 'RATE_LIMITED',
  'ALREADY_CLOCKED', 'WORKER_NOT_FOUND', 'ERROR'
);

CREATE TABLE "geofences" (
  "id"           TEXT PRIMARY KEY,
  "org_id"       TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "type"         "GeofenceType" NOT NULL,
  "center_lat"   DECIMAL(10, 7),
  "center_lng"   DECIMAL(10, 7),
  "radius_meters" INTEGER,
  "vertices"     JSONB,
  "location_id"  TEXT,
  "is_active"    BOOLEAN NOT NULL DEFAULT true,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "geofences_org_id_is_active_idx" ON "geofences"("org_id", "is_active");

CREATE TABLE "attendance_attempts" (
  "id"            TEXT PRIMARY KEY,
  "org_id"        TEXT NOT NULL,
  "worker_id"     TEXT,
  "result"        "AttendanceAttemptResult" NOT NULL,
  "reason"        TEXT,
  "via"           TEXT,
  "geo_lat"       DECIMAL(10, 7),
  "geo_lng"       DECIMAL(10, 7),
  "geo_accuracy"  DECIMAL(8, 2),
  "ip_address"    TEXT,
  "user_agent"    TEXT,
  "metadata_json" JSONB,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "attendance_attempts_org_id_created_at_idx" ON "attendance_attempts"("org_id", "created_at");
CREATE INDEX "attendance_attempts_worker_id_created_at_idx" ON "attendance_attempts"("worker_id", "created_at");
CREATE INDEX "attendance_attempts_result_created_at_idx" ON "attendance_attempts"("result", "created_at");
