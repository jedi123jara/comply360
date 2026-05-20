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
import { evaluatorCR08 } from './cr-08'
import { evaluatorCR09 } from './cr-09'
import { evaluatorCR10 } from './cr-10'
import { evaluatorCR11 } from './cr-11'
import { evaluatorCR12 } from './cr-12'
import { evaluatorCR13 } from './cr-13'
import { evaluatorCR14 } from './cr-14'
import { evaluatorCR15 } from './cr-15'

// ── RB — Remuneraciones y Beneficios ─────────────────────────────────
import { evaluatorRB01 } from './rb-01'
import { evaluatorRB02 } from './rb-02'
import { evaluatorRB03 } from './rb-03'
import { evaluatorRB04 } from './rb-04'
import { evaluatorRB05 } from './rb-05'
import { evaluatorRB06 } from './rb-06'
import { evaluatorRB07 } from './rb-07'
import { evaluatorRB08 } from './rb-08'
import { evaluatorRB09 } from './rb-09'
import { evaluatorRB10 } from './rb-10'
import { evaluatorRB13 } from './rb-13'
import { evaluatorRB14 } from './rb-14'
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
import { evaluatorSST06 } from './sst-06'
import { evaluatorSST07 } from './sst-07'
import { evaluatorSST08 } from './sst-08'
import { evaluatorSST12 } from './sst-12'
import { evaluatorSST10 } from './sst-10'
import { evaluatorSST11 } from './sst-11'
import { evaluatorSST13 } from './sst-13'
import { evaluatorSST14 } from './sst-14'
import { evaluatorSST17 } from './sst-17'
import { evaluatorSST18 } from './sst-18'
import { evaluatorSST20 } from './sst-20'
import { evaluatorSST21 } from './sst-21'
import { evaluatorSST22 } from './sst-22'
import { evaluatorSST24 } from './sst-24'
import { evaluatorSST25 } from './sst-25'

// ── DO — Documentos Obligatorios ─────────────────────────────────────
import { evaluatorDO01 } from './do-01'
import { evaluatorDO02 } from './do-02'
import { evaluatorDO04 } from './do-04'
import { evaluatorDO05 } from './do-05'
import { evaluatorDO06 } from './do-06'
import { evaluatorDO08 } from './do-08'
import { evaluatorDO09 } from './do-09'
import { evaluatorDO10 } from './do-10'
import { evaluatorDO11 } from './do-11'
import { evaluatorDO12 } from './do-12'
import { evaluatorDO13 } from './do-13'
import { evaluatorDO14 } from './do-14'
import { evaluatorDO15 } from './do-15'

// ── RL — Relaciones Laborales ────────────────────────────────────────
import { evaluatorRL02 } from './rl-02'
import { evaluatorRL07 } from './rl-07'
import { evaluatorRL08 } from './rl-08'

// ── IN — Igualdad y No Discriminación ────────────────────────────────
import { evaluatorIN01 } from './in-01'
import { evaluatorIN02 } from './in-02'
import { evaluatorIN03 } from './in-03'
import { evaluatorIN06 } from './in-06'
import { evaluatorIN07 } from './in-07'
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

// ── TI — Tercerización e Intermediación ──────────────────────────────
import { evaluatorTI01 } from './ti-01'
import { evaluatorTI04 } from './ti-04'
import { evaluatorTI05 } from './ti-05'
import { evaluatorTI08 } from './ti-08'

// ── HS — Hostigamiento Sexual ────────────────────────────────────────
import { evaluatorHS01 } from './hs-01'
import { evaluatorHS02 } from './hs-02'
import { evaluatorHS03 } from './hs-03'
import { evaluatorHS04 } from './hs-04'
import { evaluatorHS06 } from './hs-06'
import { evaluatorHS07 } from './hs-07'

export const ALL_EVALUATORS: QuestionEvaluator[] = [
  // CR (11)
  evaluatorCR01,
  evaluatorCR04,
  evaluatorCR06,
  evaluatorCR08,
  evaluatorCR09,
  evaluatorCR10,
  evaluatorCR11,
  evaluatorCR12,
  evaluatorCR13,
  evaluatorCR14,
  evaluatorCR15,
  // RB (18)
  evaluatorRB01,
  evaluatorRB02,
  evaluatorRB03,
  evaluatorRB04,
  evaluatorRB05,
  evaluatorRB06,
  evaluatorRB07,
  evaluatorRB08,
  evaluatorRB09,
  evaluatorRB10,
  evaluatorRB13,
  evaluatorRB14,
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
  // SST (19)
  evaluatorSST01,
  evaluatorSST02,
  evaluatorSST03,
  evaluatorSST04,
  evaluatorSST05,
  evaluatorSST06,
  evaluatorSST07,
  evaluatorSST08,
  evaluatorSST10,
  evaluatorSST11,
  evaluatorSST12,
  evaluatorSST13,
  evaluatorSST14,
  evaluatorSST17,
  evaluatorSST18,
  evaluatorSST20,
  evaluatorSST21,
  evaluatorSST22,
  evaluatorSST24,
  evaluatorSST25,
  // DO (13)
  evaluatorDO01,
  evaluatorDO02,
  evaluatorDO04,
  evaluatorDO05,
  evaluatorDO06,
  evaluatorDO08,
  evaluatorDO09,
  evaluatorDO10,
  evaluatorDO11,
  evaluatorDO12,
  evaluatorDO13,
  evaluatorDO14,
  evaluatorDO15,
  // RL (3)
  evaluatorRL02,
  evaluatorRL07,
  evaluatorRL08,
  // IN (6)
  evaluatorIN01,
  evaluatorIN02,
  evaluatorIN03,
  evaluatorIN06,
  evaluatorIN07,
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
  // TI (4)
  evaluatorTI01,
  evaluatorTI04,
  evaluatorTI05,
  evaluatorTI08,
  // HS (6)
  evaluatorHS01,
  evaluatorHS02,
  evaluatorHS03,
  evaluatorHS04,
  evaluatorHS06,
  evaluatorHS07,
]
