-- Agrega DOCUMENTO_SOSPECHOSO al enum WorkerAlertType.
-- Disparado por document-verifier cuando suspicionScore >= 0.6 (anti-fraude IA).
ALTER TYPE "WorkerAlertType" ADD VALUE IF NOT EXISTS 'DOCUMENTO_SOSPECHOSO';
