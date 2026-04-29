-- Migration: Detección automática de horas extras (Fase 1.3 — Asistencia)
--
-- Razón: D.Leg. 854 + D.S. 007-2002-TR establecen que toda hora trabajada
-- por encima de la jornada diaria pactada (8h máx en general) constituye
-- sobretiempo y debe pagarse con bonificación (25% primeras 2h, 35% el resto).
-- Sin tracking automático, RRHH paga ciegamente o no paga — riesgo SUNAFIL.
--
-- Estos campos los populan automáticamente los endpoints /api/attendance/clock
-- (action='out') y /api/attendance (POST clock_out) al cerrar la jornada.
--
-- Compatible con rolling deploy: ambos campos NOT NULL DEFAULT o NULL.

ALTER TABLE "attendance" ADD COLUMN "is_overtime" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "attendance" ADD COLUMN "overtime_minutes" INTEGER;
