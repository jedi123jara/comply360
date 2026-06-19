-- Jornada nocturna: marca si el trabajador labora en horario nocturno (10pm-6am).
-- Activa la validación del piso de remuneración RMV + 35% (Art. 8 D.S. 007-2002-TR).
ALTER TABLE "workers" ADD COLUMN "turno_nocturno" BOOLEAN NOT NULL DEFAULT false;
