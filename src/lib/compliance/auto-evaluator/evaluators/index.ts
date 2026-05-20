/**
 * Barrel de evaluators. Cada evaluator vive en su propio archivo (un archivo
 * por questionId) para mantener la lógica aislada y testeable.
 *
 * Naming: `{area-lowercase}-{id}.ts` → exporta `evaluator{ID}`.
 * Ej: `cr-01.ts` → exporta `evaluatorCR01`.
 *
 * Para agregar un evaluator nuevo:
 *   1. Crear archivo `{area}-{id}.ts` en este directorio.
 *   2. Implementar `QuestionEvaluator` con la lógica.
 *   3. Importarlo y agregarlo al array ALL_EVALUATORS.
 */

import type { QuestionEvaluator } from '../types'

// ── CR — Contratos y Registro ────────────────────────────────────────
import { evaluatorCR01 } from './cr-01'
import { evaluatorCR04 } from './cr-04'
import { evaluatorCR06 } from './cr-06'
import { evaluatorCR09 } from './cr-09'
import { evaluatorCR10 } from './cr-10'
import { evaluatorCR11 } from './cr-11'
import { evaluatorCR12 } from './cr-12'
import { evaluatorCR14 } from './cr-14'

// ── RB — Remuneraciones y Beneficios ─────────────────────────────────
import { evaluatorRB01 } from './rb-01'
import { evaluatorRB03 } from './rb-03'
import { evaluatorRB04 } from './rb-04'
import { evaluatorRB05 } from './rb-05'
import { evaluatorRB06 } from './rb-06'
import { evaluatorRB09 } from './rb-09'
import { evaluatorRB10 } from './rb-10'
import { evaluatorRB15 } from './rb-15'
import { evaluatorRB16 } from './rb-16'
import { evaluatorRB17 } from './rb-17'
import { evaluatorRB18 } from './rb-18'
import { evaluatorRB19 } from './rb-19'
import { evaluatorRB20 } from './rb-20'

// ── JD — Jornada y Descansos ─────────────────────────────────────────
import { evaluatorJD01 } from './jd-01'
import { evaluatorJD02 } from './jd-02'
import { evaluatorJD03 } from './jd-03'
import { evaluatorJD05 } from './jd-05'
import { evaluatorJD09 } from './jd-09'
import { evaluatorJD10 } from './jd-10'
import { evaluatorJD11 } from './jd-11'
import { evaluatorJD13 } from './jd-13'
import { evaluatorJD14 } from './jd-14'
import { evaluatorJD15 } from './jd-15'

// ── SST — Seguridad y Salud en el Trabajo ────────────────────────────
import { evaluatorSST01 } from './sst-01'
import { evaluatorSST02 } from './sst-02'
import { evaluatorSST03 } from './sst-03'
import { evaluatorSST04 } from './sst-04'
import { evaluatorSST05 } from './sst-05'
import { evaluatorSST07 } from './sst-07'
import { evaluatorSST10 } from './sst-10'
import { evaluatorSST11 } from './sst-11'
import { evaluatorSST14 } from './sst-14'
import { evaluatorSST18 } from './sst-18'
import { evaluatorSST24 } from './sst-24'
import { evaluatorSST25 } from './sst-25'

// ── DO — Documentos Obligatorios ─────────────────────────────────────
import { evaluatorDO01 } from './do-01'
import { evaluatorDO02 } from './do-02'
import { evaluatorDO05 } from './do-05'
import { evaluatorDO06 } from './do-06'
import { evaluatorDO09 } from './do-09'
import { evaluatorDO14 } from './do-14'
import { evaluatorDO15 } from './do-15'

// ── RL — Relaciones Laborales ────────────────────────────────────────
import { evaluatorRL02 } from './rl-02'
import { evaluatorRL07 } from './rl-07'
import { evaluatorRL08 } from './rl-08'

// ── IN — Igualdad y No Discriminación ────────────────────────────────
import { evaluatorIN03 } from './in-03'
import { evaluatorIN06 } from './in-06'
import { evaluatorIN09 } from './in-09'

// ── TE — Trabajadores Especiales ─────────────────────────────────────
import { evaluatorTE01 } from './te-01'
import { evaluatorTE03 } from './te-03'
import { evaluatorTE04 } from './te-04'
import { evaluatorTE05 } from './te-05'
import { evaluatorTE06 } from './te-06'
import { evaluatorTE07 } from './te-07'
import { evaluatorTE09 } from './te-09'
import { evaluatorTE10 } from './te-10'

// ── HS — Hostigamiento Sexual ────────────────────────────────────────
import { evaluatorHS01 } from './hs-01'
import { evaluatorHS02 } from './hs-02'
import { evaluatorHS03 } from './hs-03'

export const ALL_EVALUATORS: QuestionEvaluator[] = [
  // CR (8)
  evaluatorCR01,
  evaluatorCR04,
  evaluatorCR06,
  evaluatorCR09,
  evaluatorCR10,
  evaluatorCR11,
  evaluatorCR12,
  evaluatorCR14,
  // RB (13)
  evaluatorRB01,
  evaluatorRB03,
  evaluatorRB04,
  evaluatorRB05,
  evaluatorRB06,
  evaluatorRB09,
  evaluatorRB10,
  evaluatorRB15,
  evaluatorRB16,
  evaluatorRB17,
  evaluatorRB18,
  evaluatorRB19,
  evaluatorRB20,
  // JD (10)
  evaluatorJD01,
  evaluatorJD02,
  evaluatorJD03,
  evaluatorJD05,
  evaluatorJD09,
  evaluatorJD10,
  evaluatorJD11,
  evaluatorJD13,
  evaluatorJD14,
  evaluatorJD15,
  // SST (12)
  evaluatorSST01,
  evaluatorSST02,
  evaluatorSST03,
  evaluatorSST04,
  evaluatorSST05,
  evaluatorSST07,
  evaluatorSST10,
  evaluatorSST11,
  evaluatorSST14,
  evaluatorSST18,
  evaluatorSST24,
  evaluatorSST25,
  // DO (7)
  evaluatorDO01,
  evaluatorDO02,
  evaluatorDO05,
  evaluatorDO06,
  evaluatorDO09,
  evaluatorDO14,
  evaluatorDO15,
  // RL (3)
  evaluatorRL02,
  evaluatorRL07,
  evaluatorRL08,
  // IN (3)
  evaluatorIN03,
  evaluatorIN06,
  evaluatorIN09,
  // TE (8)
  evaluatorTE01,
  evaluatorTE03,
  evaluatorTE04,
  evaluatorTE05,
  evaluatorTE06,
  evaluatorTE07,
  evaluatorTE09,
  evaluatorTE10,
  // HS (3)
  evaluatorHS01,
  evaluatorHS02,
  evaluatorHS03,
]
