-- Migration: agrega valor BUSINESS al enum Plan
--
-- Plan tier intermedio entre PRO (300 workers) y ENTERPRISE (custom):
-- BUSINESS cubre 300-750 workers a S/3,999/mes con per-seat overflow.
--
-- Es ALTER TYPE ADD VALUE — operación NO-bloqueante en PostgreSQL,
-- compatible con rolling deploy y rollback (orden del enum se preserva).

ALTER TYPE "Plan" ADD VALUE 'BUSINESS' AFTER 'PRO';
