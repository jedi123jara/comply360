'use client'

import { useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Award,
  AlertTriangle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BenchmarkProps {
  companyScore: number // 0-100
  sector: string // e.g. "COMERCIO", "MANUFACTURA"
  areaScores?: { area: string; score: number }[] // per-area scores
}

// ---------------------------------------------------------------------------
// Sector benchmark data (realistic for Peru)
// ---------------------------------------------------------------------------

const SECTOR_BENCHMARKS: Record<
  string,
  { average: number; top25: number; areas: Record<string, number> }
> = {
  COMERCIO: {
    average: 58,
    top25: 78,
    areas: {
      contratos: 62,
      remuneraciones: 55,
      jornada: 60,
      sst: 45,
      documentos: 58,
      relaciones: 65,
      igualdad: 52,
      trabajadores_especiales: 48,
    },
  },
  MANUFACTURA: {
    average: 52,
    top25: 72,
    areas: {
      contratos: 55,
      remuneraciones: 50,
      jornada: 48,
      sst: 58,
      documentos: 52,
      relaciones: 55,
      igualdad: 45,
      trabajadores_especiales: 50,
    },
  },
  SERVICIOS: {
    average: 61,
    top25: 80,
    areas: {
      contratos: 65,
      remuneraciones: 60,
      jornada: 62,
      sst: 50,
      documentos: 62,
      relaciones: 58,
      igualdad: 58,
      trabajadores_especiales: 52,
    },
  },
  CONSTRUCCION: {
    average: 48,
    top25: 68,
    areas: {
      contratos: 50,
      remuneraciones: 45,
      jornada: 42,
      sst: 55,
      documentos: 48,
      relaciones: 50,
      igualdad: 40,
      trabajadores_especiales: 52,
    },
  },
  TECNOLOGIA: {
    average: 65,
    top25: 85,
    areas: {
      contratos: 70,
      remuneraciones: 68,
      jornada: 65,
      sst: 52,
      documentos: 65,
      relaciones: 60,
      igualdad: 62,
      trabajadores_especiales: 55,
    },
  },
  MINERIA: {
    average: 70,
    top25: 88,
    areas: {
      contratos: 75,
      remuneraciones: 72,
      jornada: 68,
      sst: 78,
      documentos: 70,
      relaciones: 65,
      igualdad: 55,
      trabajadores_especiales: 60,
    },
  },
  AGROINDUSTRIA: {
    average: 45,
    top25: 65,
    areas: {
      contratos: 48,
      remuneraciones: 42,
      jornada: 40,
      sst: 50,
      documentos: 45,
      relaciones: 48,
      igualdad: 38,
      trabajadores_especiales: 45,
    },
  },
  OTROS: {
    average: 55,
    top25: 75,
    areas: {
      contratos: 58,
      remuneraciones: 52,
      jornada: 55,
      sst: 48,
      documentos: 55,
      relaciones: 52,
      igualdad: 48,
      trabajadores_especiales: 45,
    },
  },
}

// ---------------------------------------------------------------------------
// Human-readable area labels
// ---------------------------------------------------------------------------

const AREA_LABELS: Record<string, string> = {
  contratos: 'Contratos de Trabajo',
  remuneraciones: 'Remuneraciones y Beneficios',
  jornada: 'Jornada Laboral',
  sst: 'Seguridad y Salud en el Trabajo',
  documentos: 'Documentos Laborales',
  relaciones: 'Relaciones Laborales',
  igualdad: 'Igualdad y No Discriminacion',
  trabajadores_especiales: 'Trabajadores Especiales',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number, reference: number): string {
  const diff = score - reference
  if (diff >= 5) return 'text-emerald-600'
  if (diff >= -5) return 'text-amber-500'
  return 'text-red-500'
}

function getBarColor(score: number, reference: number): string {
  const diff = score - reference
  if (diff >= 5) return 'bg-emerald-500'
  if (diff >= -5) return 'bg-amber-500'
  return 'bg-red-500'
}

function getBadgeBg(score: number, reference: number): string {
  const diff = score - reference
  if (diff >= 5)
    return 'bg-emerald-100 text-emerald-800'
  if (diff >= -5)
    return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

function computePercentile(score: number, average: number, top25: number): number {
  // Simplified: linearly interpolate percentile. 50th = average, 75th = top25.
  if (score <= average) {
    // Map 0..average -> 0..50
    return Math.round((score / average) * 50)
  }
  // Map average..top25 -> 50..75
  if (score <= top25) {
    return Math.round(50 + ((score - average) / (top25 - average)) * 25)
  }
  // Map top25..100 -> 75..99
  return Math.min(99, Math.round(75 + ((score - top25) / (100 - top25)) * 24))
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreRing({
  score,
  label,
  color,
}: {
  score: number
  label: string
  color: string
}) {
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-32 w-32">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-gray-200"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-out ${color}`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white">
          {score}
        </span>
      </div>
      <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </span>
    </div>
  )
}

function ComparisonBar({
  label,
  companyValue,
  sectorValue,
}: {
  label: string
  companyValue: number
  sectorValue: number
}) {
  const diff = companyValue - sectorValue
  const barColor = getBarColor(companyValue, sectorValue)
  const diffColor = getScoreColor(companyValue, sectorValue)

  return (
    <div className="group">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">
          {label}
        </span>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-white">
            {companyValue}%
          </span>
          <span className="text-gray-400">
            vs {sectorValue}%
          </span>
          <span className={`font-semibold ${diffColor}`}>
            {diff > 0 ? '+' : ''}
            {diff}
          </span>
        </div>
      </div>

      {/* Stacked bars */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-[color:var(--neutral-100)] bg-[color:var(--neutral-100)]/50">
        {/* Sector average marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-gray-400 z-10"
          style={{ left: `${sectorValue}%` }}
          title={`Promedio sector: ${sectorValue}%`}
        />
        {/* Company bar */}
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${companyValue}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BenchmarkSectorial({
  companyScore,
  sector,
  areaScores,
}: BenchmarkProps) {
  const benchmark = SECTOR_BENCHMARKS[sector] ?? SECTOR_BENCHMARKS['OTROS']

  const percentile = useMemo(
    () => computePercentile(companyScore, benchmark.average, benchmark.top25),
    [companyScore, benchmark.average, benchmark.top25],
  )

  // Simulated trend (positive bias for scores above average).
  // Se usa un pseudo-random determinístico basado en companyScore para que
  // el valor sea estable entre renders (React 19 prohíbe Math.random durante render).
  // TODO: reemplazar por delta real cuando haya histórico de ComplianceScore.
  const trendDelta = useMemo(() => {
    const base = companyScore >= benchmark.average ? 3 : -2
    // Deterministic "noise" derived from companyScore (rango -2..+2)
    const noise = ((companyScore * 31 + 7) % 5) - 2
    return base + noise
  }, [companyScore, benchmark.average])

  const isImproving = trendDelta > 0

  // Build area comparisons
  const areaComparisons = useMemo(() => {
    const sectorAreas = benchmark.areas
    const companyAreas: Record<string, number> = {}

    if (areaScores) {
      areaScores.forEach(({ area, score }) => {
        companyAreas[area] = score
      })
    }

    return Object.entries(sectorAreas).map(([key, sectorVal], idx) => ({
      key,
      label: AREA_LABELS[key] ?? key,
      // Fallback determinístico cuando no hay areaScores: se deriva del companyScore
      // + índice del área (±20% alrededor del score global).
      company:
        companyAreas[key] ??
        Math.round(companyScore * (0.8 + (((idx * 37) % 10) / 25))),
      sector: sectorVal,
    }))
  }, [benchmark.areas, areaScores, companyScore])

  // Recommendations: areas below sector average
  const recommendations = useMemo(
    () =>
      areaComparisons
        .filter((a) => a.company < a.sector)
        .sort((a, b) => a.company - a.sector - (b.company - b.sector))
        .slice(0, 4),
    [areaComparisons],
  )

  // Overall color for company score ring
  const ringColor =
    companyScore >= benchmark.top25
      ? 'text-emerald-500'
      : companyScore >= benchmark.average
        ? 'text-amber-500'
        : 'text-red-500'

  return (
    <section className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-white">
            Benchmark Sectorial
          </h2>
        </div>
        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
          Sector: {sector}
        </span>
      </div>

      {/* ---- Score overview ---- */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Company vs Sector rings */}
        <div className="col-span-full rounded-2xl border border-white/[0.08] bg-[#141824] p-6 shadow-sm border-white/[0.08] bg-[#141824] md:col-span-2">
          <div className="flex flex-wrap items-center justify-around gap-8">
            <ScoreRing score={companyScore} label="Tu empresa" color={ringColor} />
            <ScoreRing
              score={benchmark.average}
              label="Promedio sector"
              color="text-gray-400"
            />
            <ScoreRing
              score={benchmark.top25}
              label="Top 25%"
              color="text-indigo-500"
            />
          </div>

          {/* Bar comparison */}
          <div className="mt-6 space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
            <div className="relative h-5 w-full overflow-hidden rounded-full bg-[color:var(--neutral-100)] bg-[color:var(--neutral-100)]/50">
              {/* Sector average line */}
              <div
                className="absolute top-0 z-20 h-full w-0.5 bg-gray-500"
                style={{ left: `${benchmark.average}%` }}
              />
              {/* Top 25 line */}
              <div
                className="absolute top-0 z-20 h-full w-0.5 bg-indigo-400"
                style={{ left: `${benchmark.top25}%` }}
              />
              {/* Company bar */}
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  companyScore >= benchmark.top25
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    : companyScore >= benchmark.average
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                      : 'bg-gradient-to-r from-red-400 to-red-500'
                }`}
                style={{ width: `${companyScore}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
              <span />
              <span style={{ marginLeft: `${benchmark.average - 8}%` }}>Promedio</span>
              <span style={{ marginRight: `${100 - benchmark.top25 - 4}%` }}>Top 25%</span>
              <span />
            </div>
          </div>
        </div>

        {/* Percentile & Trend card */}
        <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#141824] p-6 shadow-sm border-white/[0.08] bg-[#141824]">
          {/* Percentile */}
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <Target className="h-8 w-8 text-indigo-500" />
            <p className="text-4xl font-extrabold text-white">
              P{percentile}
            </p>
            <p className="text-xs leading-tight text-gray-500">
              Tu empresa esta en el{' '}
              <span className="font-semibold text-gray-300">
                percentil {percentile}
              </span>{' '}
              de cumplimiento en tu sector
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.08] border-white/[0.08]" />

          {/* Trend */}
          <div className="flex items-center justify-center gap-3">
            {isImproving ? (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  +{trendDelta} pts
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold text-red-700">
                  {trendDelta} pts
                </span>
              </div>
            )}
            <span className="text-xs text-gray-500">
              vs ultimo diagnostico
            </span>
          </div>
        </div>
      </div>

      {/* ---- Per-area comparison ---- */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141824] p-6 shadow-sm border-white/[0.08] bg-[#141824]">
        <div className="mb-5 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-white">
            Comparacion por Area
          </h3>
          <span className="ml-auto text-[10px] text-gray-400">
            La linea gris indica el promedio del sector
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {areaComparisons.map((item) => (
            <ComparisonBar
              key={item.key}
              label={item.label}
              companyValue={Math.min(100, Math.max(0, item.company))}
              sectorValue={item.sector}
            />
          ))}
        </div>
      </div>

      {/* ---- Recommendations ---- */}
      {recommendations.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-900">
              Recomendaciones Prioritarias
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {recommendations.map((rec) => {
              const gap = rec.sector - rec.company
              return (
                <div
                  key={rec.key}
                  className="flex items-start gap-3 rounded-xl bg-white/70 p-4 bg-[#141824]/50"
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${getBadgeBg(rec.company, rec.sector)}`}
                  >
                    <span className="text-xs font-bold">-{gap}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {rec.label}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Tu puntaje ({rec.company}%) esta{' '}
                      <span className="font-semibold text-red-600">
                        {gap} puntos
                      </span>{' '}
                      por debajo del promedio del sector ({rec.sector}%). Prioriza esta
                      area para reducir riesgos de fiscalizacion.
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ---- Top performer badge ---- */}
      {companyScore >= benchmark.top25 && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 p-5">
          <Award className="h-8 w-8 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              Tu empresa es lider en cumplimiento
            </p>
            <p className="text-xs text-emerald-700">
              Estas dentro del Top 25% de empresas de tu sector. Mantener este nivel
              reduce significativamente el riesgo de sanciones de SUNAFIL.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
