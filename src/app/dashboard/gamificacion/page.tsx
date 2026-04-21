'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Trophy, Star, Medal, Target, Unlock, TrendingUp, TrendingDown,
  Calendar, Award, Shield, Zap, Gift, FileText,
  CheckCircle, AlertCircle, Users,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'

/* ── Animated Counter Hook ─────────────────────────────────────────── */
function useAnimatedCounter(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) ref.current = requestAnimationFrame(step)
    }
    ref.current = requestAnimationFrame(step)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [target, duration])

  return value
}

/* ── Circular Progress Component ──────────────────────────────────── */
function CircularProgress({ score, size = 200, strokeWidth = 14 }: { score: number; size?: number; strokeWidth?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedScore / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100)
    return () => clearTimeout(timer)
  }, [score])

  const getColor = (s: number) => {
    if (s < 50) return { stroke: '#ef4444', glow: 'rgba(239,68,68,0.3)', bg: 'rgba(239,68,68,0.1)' }
    if (s < 70) return { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.1)' }
    if (s < 85) return { stroke: '#22c55e', glow: 'rgba(34,197,94,0.3)', bg: 'rgba(34,197,94,0.1)' }
    return { stroke: '#10b981', glow: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.1)' }
  }

  const colors = getColor(score)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[color:var(--text-secondary)]"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.5s ease-out',
            filter: `drop-shadow(0 0 8px ${colors.glow})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-white">{animatedScore}</span>
        <span className="text-sm text-[color:var(--text-tertiary)] font-medium">/100</span>
      </div>
    </div>
  )
}

/* ── Score Level Helpers ──────────────────────────────────────────── */
function getScoreLevel(score: number) {
  if (score >= 85) return { name: 'Platino', color: 'text-emerald-500', bg: 'bg-emerald-900/40', border: 'border-emerald-700', gradient: 'from-emerald-500 to-teal-400', emoji: '💎' }
  if (score >= 70) return { name: 'Oro', color: 'text-yellow-500', bg: 'bg-yellow-900/40', border: 'border-yellow-700', gradient: 'from-yellow-500 to-amber-400', emoji: '🥇' }
  if (score >= 50) return { name: 'Plata', color: 'text-[color:var(--text-tertiary)]', bg: 'bg-[color:var(--neutral-100)] bg-gray-800', border: 'border-white/10 border-gray-700', gradient: 'from-gray-400 to-gray-300', emoji: '🥈' }
  return { name: 'Bronce', color: 'text-amber-700', bg: 'bg-amber-900/40', border: 'border-amber-700', gradient: 'from-amber-700 to-amber-500', emoji: '🥉' }
}

/* ── Badge Data ────────────────────────────────────────────────────── */
interface Badge {
  id: string
  emoji: string
  name: string
  description: string
  unlocked: boolean
  progress?: number
  maxProgress?: number
  date?: string
}

const BADGES: Badge[] = [
  { id: 'b1', emoji: '🏆', name: 'Primera Auditoría', description: 'Completar primer diagnóstico', unlocked: true, date: '15 Ene 2026' },
  { id: 'b2', emoji: '📋', name: 'Documentador', description: 'Subir 50+ documentos', unlocked: true, date: '02 Feb 2026', progress: 50, maxProgress: 50 },
  { id: 'b3', emoji: '⚡', name: 'Respuesta Rápida', description: 'Resolver alerta en <24h', unlocked: true, date: '10 Feb 2026' },
  { id: 'b4', emoji: '🎓', name: 'Capacitador', description: '100% empleados capacitados', unlocked: true, date: '18 Feb 2026' },
  { id: 'b5', emoji: '📊', name: 'Data Driven', description: 'Generar 10+ reportes', unlocked: true, date: '01 Mar 2026', progress: 10, maxProgress: 10 },
  { id: 'b6', emoji: '🔒', name: 'Compliance Total', description: 'Score >90 por 3 meses', unlocked: false, progress: 1, maxProgress: 3 },
  { id: 'b7', emoji: '⏰', name: 'Sin Vencimientos', description: '0 contratos vencidos', unlocked: true, date: '15 Mar 2026' },
  { id: 'b8', emoji: '💰', name: 'CTS al Día', description: 'CTS depositada a tiempo', unlocked: true, date: '22 Mar 2026' },
  { id: 'b9', emoji: '🛡️', name: 'SST Champion', description: 'Todos los registros SST completos', unlocked: true, date: '28 Mar 2026' },
  { id: 'b10', emoji: '📝', name: 'Contratos OK', description: 'Todos los contratos firmados', unlocked: false, progress: 38, maxProgress: 45 },
  { id: 'b11', emoji: '🌟', name: 'Streak 30', description: '30 días sin alertas críticas', unlocked: false, progress: 18, maxProgress: 30 },
  { id: 'b12', emoji: '👑', name: 'Empresa Modelo', description: 'Score 95+ por 6 meses', unlocked: false, progress: 0, maxProgress: 6 },
]

/* ── Leaderboard Data ─────────────────────────────────────────────── */
interface LeaderboardEntry {
  position: number
  company: string
  score: number
  trend: 'up' | 'down' | 'same'
  isCurrentCompany?: boolean
}

const LEADERBOARD: LeaderboardEntry[] = [
  { position: 1, company: 'Grupo Andino SAC', score: 94, trend: 'same' },
  { position: 2, company: 'TechPeru Solutions', score: 89, trend: 'up' },
  { position: 3, company: 'Mi Empresa SAC', score: 85, trend: 'up', isCurrentCompany: true },
  { position: 4, company: 'Constructora Lima', score: 82, trend: 'down' },
  { position: 5, company: 'Logística Express', score: 78, trend: 'up' },
  { position: 6, company: 'Retail Nacional', score: 75, trend: 'down' },
  { position: 7, company: 'AgroExport Peru', score: 71, trend: 'same' },
  { position: 8, company: 'Industrias del Sur', score: 68, trend: 'down' },
]

/* ── Monthly Challenges ───────────────────────────────────────────── */
interface Challenge {
  id: string
  title: string
  progress: number
  total: number
  reward: number
  icon: typeof Trophy
  done: boolean
}

const CHALLENGES: Challenge[] = [
  { id: 'c1', title: 'Resolver todas las alertas pendientes', progress: 7, total: 12, reward: 200, icon: AlertCircle, done: false },
  { id: 'c2', title: 'Completar diagnóstico mensual', progress: 1, total: 1, reward: 150, icon: CheckCircle, done: true },
  { id: 'c3', title: 'Capacitar 5 trabajadores', progress: 3, total: 5, reward: 100, icon: Users, done: false },
  { id: 'c4', title: 'Actualizar documentación SST', progress: 2, total: 4, reward: 120, icon: FileText, done: false },
]

/* ── Score Timeline Data ──────────────────────────────────────────── */
const TIMELINE_DATA = [
  { month: 'Nov', score: 58 },
  { month: 'Dic', score: 63 },
  { month: 'Ene', score: 71 },
  { month: 'Feb', score: 75 },
  { month: 'Mar', score: 80 },
  { month: 'Abr', score: 85 },
]

/* ── Points History ────────────────────────────────────────────────── */
const HISTORY = [
  { points: 50, label: 'Diagnóstico express completado', time: 'Hace 2 días', icon: Target },
  { points: 100, label: 'Capacitación SST completada', time: 'Hace 5 días', icon: Shield },
  { points: 200, label: 'Score subió a 85%', time: 'Hace 1 semana', icon: TrendingUp },
  { points: 25, label: 'Documento actualizado', time: 'Hace 1 semana', icon: Medal },
  { points: 75, label: 'Workflow activado', time: 'Hace 2 semanas', icon: Zap },
]

/* ── API Response Types ───────────────────────────────────────────── */
interface ApiBadge {
  id: string
  title: string
  description: string
  icon: string
  earned: boolean
  progress: number
  earnedAt?: string
}

interface ApiGamificacion {
  score: number
  level: number
  levelName: string
  badges: ApiBadge[]
  stats: {
    diagnosticosCompletados: number
    simulacrosRealizados: number
    documentosCompletos: number
    alertasResueltas: number
    cursosCompletados: number
    diasSinIncidentes: number
  }
}

/* ── Map API badge to UI badge ───────────────────────────────────── */
const BADGE_EMOJI: Record<string, string> = {
  primer_diagnostico: '🏆',
  diagnostico_experto: '📊',
  inspector_virtual: '🛡️',
  score_60: '⚡',
  score_80: '🥇',
  legajos_completos: '📋',
  alertas_cero: '🔔',
  capacitacion_cumplida: '🎓',
  sin_accidentes_90: '💚',
  score_100: '👑',
}

function mapApiBadge(b: ApiBadge): Badge {
  return {
    id: b.id,
    emoji: BADGE_EMOJI[b.id] ?? '🏅',
    name: b.title,
    description: b.description,
    unlocked: b.earned,
    progress: Math.round(b.progress),
    maxProgress: 100,
    date: b.earnedAt ? new Date(b.earnedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined,
  }
}

/* ── Main Component ────────────────────────────────────────────────── */
export default function GamificacionPage() {
  const [apiData, setApiData] = useState<ApiGamificacion | null>(null)
  const [, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/gamificacion')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setApiData(d as ApiGamificacion) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Use API data when available, fall back to static defaults
  const complianceScore = apiData?.score ?? 85
  const totalPoints = complianceScore * 30 // Derived metric
  const monthlyPoints = Math.round(totalPoints * 0.2)
  const animatedPoints = useAnimatedCounter(totalPoints)
  const animatedMonthly = useAnimatedCounter(monthlyPoints, 1000)
  const scoreLevel = getScoreLevel(complianceScore)
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null)

  // Map API badges to UI format, fall back to static BADGES
  const liveBadges: Badge[] = apiData
    ? apiData.badges.map(mapApiBadge)
    : BADGES
  const unlockedCount = liveBadges.filter(b => b.unlocked).length

  return (
    <div className="min-h-screen bg-[color:var(--neutral-50)] bg-gray-950 p-4 md:p-6 lg:p-8 space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Gamificación"
        title="Racha de compliance <em>activa</em>."
        subtitle="Cumple, gana puntos y desbloquea logros para tu empresa."
        actions={
          <div className="inline-flex items-center gap-3 rounded-lg border border-[color:var(--border-default)] bg-white px-4 py-2">
            <Star className="h-4 w-4 text-amber-500 animate-pulse" />
            <div>
              <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-wider font-medium">Puntos Totales</p>
              <p className="text-lg font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent">
                {animatedPoints.toLocaleString()}
              </p>
            </div>
          </div>
        }
      />

      {/* ── 1. Company Compliance Score Hero ───────────────────────── */}
      <div className="bg-white bg-gray-900 border border-[color:var(--border-default)] border-gray-800 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Circular Score */}
          <div className="flex flex-col items-center">
            <CircularProgress score={complianceScore} size={200} strokeWidth={14} />
            <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full ${scoreLevel.bg} border ${scoreLevel.border}`}>
              <span className="text-lg">{scoreLevel.emoji}</span>
              <span className={`font-bold text-sm ${scoreLevel.color}`}>Nivel {scoreLevel.name}</span>
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Score de Cumplimiento</h2>
              <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
                Basado en diagnósticos, documentación, capacitaciones y alertas resueltas
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[color:var(--neutral-50)] bg-gray-800/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{animatedMonthly}</p>
                <p className="text-xs text-[color:var(--text-tertiary)]">Pts este mes</p>
              </div>
              <div className="bg-[color:var(--neutral-50)] bg-gray-800/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">12</p>
                <p className="text-xs text-[color:var(--text-tertiary)]">Semanas racha</p>
              </div>
              <div className="bg-[color:var(--neutral-50)] bg-gray-800/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{unlockedCount}/{liveBadges.length}</p>
                <p className="text-xs text-[color:var(--text-tertiary)]">Badges</p>
              </div>
              <div className="bg-[color:var(--neutral-50)] bg-gray-800/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">#3</p>
                <p className="text-xs text-[color:var(--text-tertiary)]">Ranking</p>
              </div>
            </div>

            {/* Score thresholds legend */}
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {[
                { label: 'Bronce', range: '<50', color: 'bg-red-500' },
                { label: 'Plata', range: '50-69', color: 'bg-amber-500' },
                { label: 'Oro', range: '70-84', color: 'bg-green-500' },
                { label: 'Platino', range: '85-100', color: 'bg-emerald-500' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-1.5 text-xs text-[color:var(--text-tertiary)]">
                  <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                  <span>{t.label} ({t.range})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Badges & Logros ────────────────────────────────────── */}
      <div className="bg-white bg-gray-900 border border-[color:var(--border-default)] border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            Badges y Logros
          </h2>
          <span className="text-sm font-medium text-[color:var(--text-tertiary)] bg-[color:var(--neutral-100)] bg-gray-800 px-3 py-1 rounded-full">
            {unlockedCount} / {liveBadges.length} desbloqueadas
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {liveBadges.map((badge) => {
            const progressPct = badge.maxProgress ? Math.round((badge.progress || 0) / badge.maxProgress * 100) : 0
            return (
              <div
                key={badge.id}
                className={`relative flex flex-col items-center text-center p-4 rounded-xl border transition-all duration-300 cursor-pointer group ${
                  badge.unlocked
                    ? 'border-[color:var(--border-default)] border-gray-700 bg-[color:var(--neutral-50)] bg-gray-800/50 hover:shadow-lg hover:-translate-y-1 hover:border-purple-300 hover:border-purple-600'
                    : 'border-dashed border-white/10 border-gray-700 bg-[color:var(--neutral-100)]/50 bg-gray-800/20'
                }`}
                onMouseEnter={() => setHoveredBadge(badge.id)}
                onMouseLeave={() => setHoveredBadge(null)}
              >
                {/* Badge emoji */}
                <div className={`text-4xl mb-2 transition-transform duration-300 ${
                  badge.unlocked ? 'group-hover:scale-110' : 'grayscale opacity-40'
                }`}>
                  {badge.unlocked ? badge.emoji : '🔒'}
                </div>

                <p className={`text-xs font-semibold leading-tight ${badge.unlocked ? 'text-white' : 'text-[color:var(--text-tertiary)]'}`}>
                  {badge.name}
                </p>
                <p className="text-[10px] text-[color:var(--text-tertiary)] mt-0.5 leading-tight">
                  {badge.description}
                </p>

                {/* Progress bar for partially earned */}
                {!badge.unlocked && badge.maxProgress && (
                  <div className="w-full mt-2">
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-violet-400 rounded-full transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-purple-400 mt-1 font-medium">
                      {badge.progress}/{badge.maxProgress}
                    </p>
                  </div>
                )}

                {/* Earned date */}
                {badge.unlocked && badge.date && (
                  <span className="mt-2 text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <Unlock className="h-3 w-3" />
                    {badge.date}
                  </span>
                )}

                {/* Hover ping */}
                {hoveredBadge === badge.id && badge.unlocked && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 3. Leaderboard / Rankings ─────────────────────────────── */}
      <div className="bg-white bg-gray-900 border border-[color:var(--border-default)] border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-500" />
            Ranking Sectorial
          </h2>
          <span className="text-xs text-[color:var(--text-tertiary)] bg-[color:var(--neutral-100)] bg-gray-800 px-3 py-1.5 rounded-full font-medium">
            Sector: Servicios Generales
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider border-b border-[color:var(--border-default)] border-gray-800">
                <th className="text-left py-3 px-3 font-medium">#</th>
                <th className="text-left py-3 px-3 font-medium">Empresa</th>
                <th className="text-center py-3 px-3 font-medium">Score</th>
                <th className="text-center py-3 px-3 font-medium">Nivel</th>
                <th className="text-center py-3 px-3 font-medium">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {LEADERBOARD.map((entry) => {
                const level = getScoreLevel(entry.score)
                return (
                  <tr
                    key={entry.position}
                    className={`border-b border-gray-800/50 transition-colors duration-200 ${
                      entry.isCurrentCompany
                        ? 'bg-blue-950/30 border-l-4 border-l-blue-500'
                        : 'hover:bg-[color:var(--neutral-50)] hover:bg-gray-800/30'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        entry.position === 1 ? 'bg-yellow-900/40 text-yellow-400' :
                        entry.position === 2 ? 'bg-[color:var(--neutral-100)] bg-gray-800 text-[color:var(--text-secondary)]' :
                        entry.position === 3 ? 'bg-amber-900/40 text-amber-400' :
                        'bg-[color:var(--neutral-50)] bg-gray-800/50 text-[color:var(--text-tertiary)]'
                      }`}>
                        {entry.position <= 3 ? ['🥇', '🥈', '🥉'][entry.position - 1] : entry.position}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-sm font-medium ${entry.isCurrentCompany ? 'text-emerald-600' : 'text-white'}`}>
                        {entry.company}
                        {entry.isCurrentCompany && (
                          <span className="ml-2 text-[10px] bg-blue-900/50 text-emerald-600 px-2 py-0.5 rounded-full font-semibold">
                            TU EMPRESA
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-sm font-bold ${level.color}`}>{entry.score}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${level.bg} ${level.color}`}>
                        {level.emoji} {level.name}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {entry.trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500 inline" />}
                      {entry.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500 inline" />}
                      {entry.trend === 'same' && <span className="text-[color:var(--text-tertiary)] text-xs font-medium">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Monthly Challenges + 5. Score Timeline ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Challenges */}
        <div className="bg-white bg-gray-900 border border-[color:var(--border-default)] border-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-500" />
              Retos del Mes
            </h2>
            <span className="text-xs text-[color:var(--text-tertiary)] bg-[color:var(--neutral-100)] bg-gray-800 px-3 py-1.5 rounded-full font-medium">
              Abril 2026
            </span>
          </div>
          <div className="space-y-4">
            {CHALLENGES.map((ch) => {
              const Icon = ch.icon
              const pct = Math.round((ch.progress / ch.total) * 100)
              return (
                <div
                  key={ch.id}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    ch.done
                      ? 'bg-emerald-950/20 border-emerald-800'
                      : 'bg-[color:var(--neutral-50)] bg-gray-800/50 border-[color:var(--border-default)] border-gray-700 hover:border-indigo-300 hover:border-indigo-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 p-2 rounded-lg ${
                      ch.done ? 'bg-emerald-900/40' : 'bg-indigo-900/40'
                    }`}>
                      <Icon className={`h-4 w-4 ${ch.done ? 'text-emerald-600' : 'text-indigo-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium ${ch.done ? 'text-emerald-700 line-through' : 'text-white'}`}>
                          {ch.title}
                        </p>
                        <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                          ch.done
                            ? 'bg-emerald-900/30 text-emerald-600'
                            : 'bg-amber-900/30 text-amber-400'
                        }`}>
                          {ch.done ? 'Completado' : `${ch.progress}/${ch.total}`}
                        </span>
                      </div>
                      {!ch.done && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Gift className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs text-yellow-400 font-medium">+{ch.reward} puntos</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 5. Score Timeline */}
        <div className="bg-white bg-gray-900 border border-[color:var(--border-default)] border-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
            <Calendar className="h-5 w-5 text-blue-500" />
            Evolución del Score
          </h2>
          <p className="text-xs text-[color:var(--text-tertiary)] mb-6">Últimos 6 meses</p>

          {/* Chart area */}
          <div className="relative h-48">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-[color:var(--text-tertiary)] w-8">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
            </div>

            {/* Grid lines */}
            <div className="absolute left-10 right-0 top-0 bottom-6 flex flex-col justify-between">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="border-b border-dashed border-[color:var(--border-default)] border-gray-800 h-0" />
              ))}
            </div>

            {/* Bars */}
            <div className="absolute left-10 right-0 top-0 bottom-6 flex items-end justify-around gap-2 px-2">
              {TIMELINE_DATA.map((d, i) => {
                const level = getScoreLevel(d.score)
                const height = `${(d.score / 100) * 100}%`
                const prevScore = i > 0 ? TIMELINE_DATA[i - 1].score : d.score
                const diff = d.score - prevScore
                return (
                  <div key={d.month} className="flex flex-col items-center flex-1 h-full justify-end group">
                    <div className="relative w-full max-w-[48px]">
                      {/* Diff label on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-center mb-1">
                        <span className={`text-[10px] font-bold ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'text-[color:var(--text-tertiary)]'}`}>
                          {diff > 0 ? `+${diff}` : diff === 0 ? '=' : diff}
                        </span>
                      </div>
                      {/* Score label */}
                      <p className="text-xs font-bold text-[color:var(--text-secondary)] text-center mb-1">{d.score}</p>
                      {/* Bar */}
                      <div
                        className={`w-full bg-gradient-to-t ${level.gradient} rounded-t-lg transition-all duration-700 ease-out hover:opacity-90`}
                        style={{
                          height,
                          animationDelay: `${i * 100}ms`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* X-axis labels */}
            <div className="absolute left-10 right-0 bottom-0 flex justify-around px-2">
              {TIMELINE_DATA.map(d => (
                <span key={d.month} className="text-[10px] text-[color:var(--text-tertiary)] font-medium flex-1 text-center">
                  {d.month}
                </span>
              ))}
            </div>
          </div>

          {/* Summary below chart */}
          <div className="mt-6 flex items-center justify-between p-3 bg-emerald-950/20 rounded-xl border border-emerald-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                +27 puntos en 6 meses
              </span>
            </div>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-900/40 px-2 py-1 rounded-full">
              +46.6%
            </span>
          </div>
        </div>
      </div>

      {/* ── Points History ────────────────────────────────────────── */}
      <div className="bg-white bg-gray-900 border border-[color:var(--border-default)] border-gray-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
          <Zap className="h-5 w-5 text-amber-500" />
          Historial de Puntos Recientes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {HISTORY.map((entry, i) => {
            const Icon = entry.icon
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-[color:var(--neutral-50)] bg-gray-800/50 hover:bg-[color:var(--neutral-100)] hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="flex-shrink-0 p-2 rounded-lg bg-emerald-900/40">
                  <Icon className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {entry.label}
                  </p>
                  <p className="text-[10px] text-[color:var(--text-tertiary)]">{entry.time}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-bold text-emerald-600">
                  +{entry.points}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
