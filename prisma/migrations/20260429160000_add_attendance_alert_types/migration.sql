-- Migration: 2 nuevos tipos de alerta para patrones de asistencia (Fase 3)
--
-- Razón: con el scan periódico de patrones (5+ tardanzas en 15 días o 3+
-- ausencias sin justificar en el mes), generamos WorkerAlert dedicadas que
-- el admin puede ver junto con las demás alertas críticas. Estos enum values
-- los consume el helper src/lib/alerts/attendance-patterns.ts.
--
-- ALTER TYPE ... ADD VALUE es seguro y rolling-deploy compatible en Postgres
-- (no bloquea, no requiere recrear la tabla).

ALTER TYPE "WorkerAlertType" ADD VALUE IF NOT EXISTS 'TARDANZAS_CRONICAS';
ALTER TYPE "WorkerAlertType" ADD VALUE IF NOT EXISTS 'AUSENTISMO_CRONICO';
