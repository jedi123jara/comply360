-- Comply360 Pulse: capa social positiva para el portal trabajador.
-- Cambios aditivos: enums, eventos, reacciones, retos y progreso cacheado.

CREATE TYPE "WorkerPulseEventType" AS ENUM (
  'SYSTEM_ACHIEVEMENT',
  'KUDO',
  'TEAM_CHALLENGE'
);

CREATE TYPE "WorkerPulseVisibility" AS ENUM (
  'WORKER',
  'TEAM',
  'ORG'
);

CREATE TYPE "WorkerPulseReactionType" AS ENUM (
  'APPLAUSE',
  'THANKS',
  'CELEBRATE'
);

CREATE TYPE "WorkerKudoType" AS ENUM (
  'BUEN_COMPANERO',
  'PUNTUALIDAD',
  'APOYO_EQUIPO',
  'CAPACITACION_COMPLETADA'
);

CREATE TYPE "WorkerChallengeType" AS ENUM (
  'DOCUMENTS_COMPLETE',
  'TRAINING_COMPLETE',
  'PAYSLIPS_SIGNED',
  'ATTENDANCE_STREAK'
);

CREATE TYPE "WorkerChallengeStatus" AS ENUM (
  'ACTIVE',
  'COMPLETED',
  'ARCHIVED'
);

CREATE TABLE "worker_challenges" (
  "id"          TEXT NOT NULL,
  "org_id"      TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type"        "WorkerChallengeType" NOT NULL,
  "status"      "WorkerChallengeStatus" NOT NULL DEFAULT 'ACTIVE',
  "scope_label" TEXT,
  "target"      INTEGER NOT NULL DEFAULT 100,
  "progress"    INTEGER NOT NULL DEFAULT 0,
  "starts_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ends_at"     TIMESTAMP(3),
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "worker_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "worker_pulse_events" (
  "id"              TEXT NOT NULL,
  "org_id"          TEXT NOT NULL,
  "worker_id"       TEXT,
  "actor_worker_id" TEXT,
  "challenge_id"    TEXT,
  "type"            "WorkerPulseEventType" NOT NULL,
  "visibility"      "WorkerPulseVisibility" NOT NULL DEFAULT 'ORG',
  "title"           TEXT NOT NULL,
  "description"     TEXT NOT NULL,
  "icon"            TEXT,
  "tone"            TEXT,
  "metadata"        JSONB,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "worker_pulse_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "worker_pulse_reactions" (
  "id"         TEXT NOT NULL,
  "event_id"   TEXT NOT NULL,
  "worker_id"  TEXT NOT NULL,
  "org_id"     TEXT NOT NULL,
  "type"       "WorkerPulseReactionType" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "worker_pulse_reactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "worker_challenge_progress" (
  "id"           TEXT NOT NULL,
  "challenge_id" TEXT NOT NULL,
  "worker_id"    TEXT,
  "org_id"       TEXT NOT NULL,
  "progress"     INTEGER NOT NULL DEFAULT 0,
  "metadata"     JSONB,
  "updated_at"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "worker_challenge_progress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "worker_challenges_org_id_status_idx"
  ON "worker_challenges"("org_id", "status");

CREATE INDEX "worker_challenges_org_id_ends_at_idx"
  ON "worker_challenges"("org_id", "ends_at");

CREATE INDEX "worker_pulse_events_org_id_created_at_idx"
  ON "worker_pulse_events"("org_id", "created_at");

CREATE INDEX "worker_pulse_events_worker_id_created_at_idx"
  ON "worker_pulse_events"("worker_id", "created_at");

CREATE INDEX "worker_pulse_events_actor_worker_id_created_at_idx"
  ON "worker_pulse_events"("actor_worker_id", "created_at");

CREATE INDEX "worker_pulse_events_challenge_id_idx"
  ON "worker_pulse_events"("challenge_id");

CREATE UNIQUE INDEX "worker_pulse_reactions_event_id_worker_id_type_key"
  ON "worker_pulse_reactions"("event_id", "worker_id", "type");

CREATE INDEX "worker_pulse_reactions_org_id_created_at_idx"
  ON "worker_pulse_reactions"("org_id", "created_at");

CREATE UNIQUE INDEX "worker_challenge_progress_challenge_id_worker_id_key"
  ON "worker_challenge_progress"("challenge_id", "worker_id");

CREATE INDEX "worker_challenge_progress_org_id_updated_at_idx"
  ON "worker_challenge_progress"("org_id", "updated_at");

ALTER TABLE "worker_challenges"
  ADD CONSTRAINT "worker_challenges_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "worker_pulse_events"
  ADD CONSTRAINT "worker_pulse_events_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "worker_pulse_events"
  ADD CONSTRAINT "worker_pulse_events_worker_id_fkey"
  FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "worker_pulse_events"
  ADD CONSTRAINT "worker_pulse_events_actor_worker_id_fkey"
  FOREIGN KEY ("actor_worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "worker_pulse_events"
  ADD CONSTRAINT "worker_pulse_events_challenge_id_fkey"
  FOREIGN KEY ("challenge_id") REFERENCES "worker_challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "worker_pulse_reactions"
  ADD CONSTRAINT "worker_pulse_reactions_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "worker_pulse_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "worker_pulse_reactions"
  ADD CONSTRAINT "worker_pulse_reactions_worker_id_fkey"
  FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "worker_pulse_reactions"
  ADD CONSTRAINT "worker_pulse_reactions_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "worker_challenge_progress"
  ADD CONSTRAINT "worker_challenge_progress_challenge_id_fkey"
  FOREIGN KEY ("challenge_id") REFERENCES "worker_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "worker_challenge_progress"
  ADD CONSTRAINT "worker_challenge_progress_worker_id_fkey"
  FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "worker_challenge_progress"
  ADD CONSTRAINT "worker_challenge_progress_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
