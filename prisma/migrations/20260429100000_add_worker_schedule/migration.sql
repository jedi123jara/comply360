-- Migration: Horario laboral pactado por worker (Fase 1.2 — Asistencia)
--
-- Razón: hoy el endpoint de fichado usa hardcodeo 8:00 AM con 15 min de tolerancia
-- para todos los workers. R.M. 037-2024-TR exige documentar la política de entrada
-- y tolerancia. Estos 5 campos permiten:
--   - turnos diferenciados (mañana 8am, tarde 14pm, etc.)
--   - tolerancia configurable por trabajador o área
--   - hora de salida pactada (base para horas extras en Fase 1.3)
--
-- Compatible con rolling deploy: todos los campos tienen NOT NULL DEFAULT,
-- así workers existentes adoptan el horario default sin migration manual de datos.

ALTER TABLE "workers" ADD COLUMN "expected_clock_in_hour" INTEGER NOT NULL DEFAULT 8;
ALTER TABLE "workers" ADD COLUMN "expected_clock_in_minute" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "workers" ADD COLUMN "expected_clock_out_hour" INTEGER NOT NULL DEFAULT 17;
ALTER TABLE "workers" ADD COLUMN "expected_clock_out_minute" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "workers" ADD COLUMN "late_tolerance_minutes" INTEGER NOT NULL DEFAULT 15;
