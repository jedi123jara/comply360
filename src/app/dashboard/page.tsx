'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  AlertTriangle,
  Calculator,
  Bell,
  Plus,
  ArrowRight,
  Clock,
  Loader2,
  Scale,
  BarChart3,
  Users,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StatsChart from '@/components/dashboard/stats-chart';
import DonutChart from '@/components/dashboard/donut-chart';
import { OnboardingWizard } from '@/components/dashboard/onboarding-wizard';
import { GettingStartedGuide } from '@/components/dashboard/getting-started-guide';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreHistoryPoint {
  month: string;       // "2026-01"
  scoreGlobal: number;
  scoreContratos: number;
  scoreSst: number;
}

interface BreakdownItem {
  label: string;
  score: number;
  weight: number;
  detail: string;
}

interface DashboardData {
  stats: {
    totalContracts: number;
    totalWorkers: number;
    activeContracts: number;
    expiringCount: number;
    calculationsThisMonth: number;
    criticalAlerts: number;
    templatesAvailable: number;
    complianceScore: number | null;
    multaPotencial: number | null;
  };
  complianceBreakdown: BreakdownItem[];
  contractSegments: { label: string; value: number; color: string }[];
  recentCalculations: {
    id: string;
    type: string;
    totalAmount: number | null;
    createdAt: string;
  }[];
  recentContracts: {
    id: string;
    title: string;
    type: string;
    status: string;
    updatedAt: string;
  }[];
  weeklyActivity: { label: string; value: number }[];
  expiringContracts: {
    id: string;
    title: string;
    type: string;
    expiresAt: string;
    daysLeft: number;
  }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CALC_TYPE_LABELS: Record<string, string> = {
  LIQUIDACION: 'Liquidacion',
  CTS: 'CTS',
  GRATIFICACION: 'Gratificacion',
  INDEMNIZACION: 'Indemnizacion',
  HORAS_EXTRAS: 'Horas Extras',
  VACACIONES: 'Vacaciones',
  MULTA_SUNAFIL: 'Multa SUNAFIL',
  INTERESES_LEGALES: 'Intereses Legales',
};

const QUICK_ACTIONS = [
  {
    title: 'Nuevo Contrato',
    description: 'Crea un contrato laboral desde plantilla',
    href: '/dashboard/contratos/nuevo',
    icon: Plus,
    color: 'text-primary',
    bg: 'bg-primary/10 bg-primary/20',
  },
  {
    title: 'Agregar Trabajador',
    description: 'Registra un nuevo trabajador en T-Registro',
    href: '/dashboard/trabajadores/nuevo',
    icon: Users,
    color: 'text-violet-600',
    bg: 'bg-violet-50 bg-violet-900/30',
  },
  {
    title: 'Diagnostico SUNAFIL',
    description: 'Evalua tu nivel de compliance laboral',
    href: '/dashboard/diagnostico',
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 bg-emerald-900/30',
  },
  {
    title: 'Calculadora',
    description: 'CTS, liquidacion, horas extras y mas',
    href: '/dashboard/calculadoras',
    icon: Calculator,
    color: 'text-blue-600',
    bg: 'bg-blue-50 bg-blue-900/30',
  },
  {
    title: 'Ver Alertas',
    description: 'Revisa vencimientos y obligaciones',
    href: '/dashboard/alertas',
    icon: Bell,
    color: 'text-amber-600',
    bg: 'bg-amber-50 bg-amber-900/30',
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatToday(): string {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

function scoreColor(score: number | null): { text: string; bar: string; bg: string } {
  if (score === null) return { text: 'text-gray-400', bar: 'bg-gray-300', bg: 'bg-white/[0.02] bg-gray-900/20' };
  if (score >= 80) return { text: 'text-emerald-600 text-emerald-400', bar: 'bg-emerald-500', bg: 'bg-emerald-50 bg-emerald-900/20' };
  if (score >= 60) return { text: 'text-amber-600 text-amber-400', bar: 'bg-amber-500', bg: 'bg-amber-50 bg-amber-900/20' };
  return { text: 'text-red-600 text-red-400', bar: 'bg-red-500', bg: 'bg-red-50 bg-red-900/20' };
}

// ─── ComplianceBreakdown sub-component ────────────────────────────────────────

function ComplianceBreakdown({ items, globalScore }: { items: BreakdownItem[]; globalScore: number | null }) {
  if (!items.length) return null;
  const sc = scoreColor(globalScore);
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#141824] shadow-sm">
      <div className="flex items-center justify-between border-b border-white/[0.06] border-white/[0.08] px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-white text-gray-200">Score de Compliance</h2>
          <p className="text-xs text-gray-500 text-gray-400">Puntuacion por area — objetivo: 80+</p>
        </div>
        {globalScore !== null && (
          <div className="text-right">
            <p className={cn('text-3xl font-bold tabular-nums', sc.text)}>{globalScore}%</p>
            <p className={cn('text-xs font-medium', sc.text)}>
              {globalScore >= 80 ? '✓ Cumple' : globalScore >= 60 ? '⚠ En riesgo' : '✗ Critico'}
            </p>
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-50 divide-slate-700/60">
        {items.map((item) => {
          const c = scoreColor(item.score);
          return (
            <div key={item.label} className="px-6 py-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-300 text-slate-300">{item.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 text-slate-500">Peso {item.weight}%</span>
                  <span className={cn('text-sm font-bold tabular-nums w-10 text-right', c.text)}>{item.score}%</span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
                <div
                  className={cn('h-1.5 rounded-full transition-all duration-500', c.bar)}
                  style={{ width: `${item.score}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400 text-slate-500">{item.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/[0.06] border-white/[0.08] px-6 py-3 flex items-center justify-between">
        <span className="text-xs text-gray-400 text-slate-500">Basado en trabajadores activos, contratos, legajos y SST</span>
        <Link href="/dashboard/diagnostico" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
          Diagnostico completo <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── ComplianceScoreTrend sub-component ──────────────────────────────────────

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function ComplianceScoreTrend({
  history,
  onRecalculate,
  recalculating,
}: {
  history: ScoreHistoryPoint[];
  onRecalculate: () => void;
  recalculating: boolean;
}) {
  if (history.length === 0) return null;

  const chartData = history.map(h => ({
    label: MONTH_SHORT[parseInt(h.month.split('-')[1], 10) - 1] ?? h.month,
    value: h.scoreGlobal,
  }));

  const latest = history[history.length - 1];
  const prev   = history.length >= 2 ? history[history.length - 2] : null;
  const trend  = latest && prev ? latest.scoreGlobal - prev.scoreGlobal : null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#141824] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] border-white/[0.08] px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-white text-gray-200">Evolucion del Score</h2>
          <p className="text-xs text-gray-500 text-gray-400">Score global de compliance — ultimos 6 meses</p>
        </div>
        <div className="flex items-center gap-3">
          {trend !== null && (
            <span className={cn(
              'flex items-center gap-1 text-sm font-semibold',
              trend >= 0 ? 'text-emerald-600 text-emerald-400' : 'text-red-600 text-red-400',
            )}>
              <TrendingUp className={cn('h-4 w-4', trend < 0 && 'rotate-180')} />
              {trend >= 0 ? '+' : ''}{trend} pts
            </span>
          )}
          <button
            type="button"
            onClick={onRecalculate}
            disabled={recalculating}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] border-slate-600 bg-[#141824] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.02] hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', recalculating && 'animate-spin')} />
            {recalculating ? 'Calculando...' : 'Recalcular'}
          </button>
        </div>
      </div>

      {/* Line chart */}
      <div className="px-6 pt-4 pb-2">
        <StatsChart data={chartData} />
      </div>

      {/* Latest sub-scores footer */}
      {latest && (
        <div className="border-t border-white/[0.06] border-white/[0.08] px-6 py-3 grid grid-cols-3 divide-x divide-gray-100 divide-slate-700">
          {[
            { label: 'Contratos', value: latest.scoreContratos },
            { label: 'SST',       value: latest.scoreSst },
            { label: 'Global',    value: latest.scoreGlobal },
          ].map(({ label, value }) => {
            const c = scoreColor(value);
            return (
              <div key={label} className="text-center px-4">
                <p className={cn('text-lg font-bold tabular-nums', c.text)}>{value}%</p>
                <p className="text-xs text-gray-400 text-slate-500">{label}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = formatToday();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryPoint[]>([]);
  const [recalculating, setRecalculating] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetch('/api/dashboard')
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((d: DashboardData) => setData(d))
      .catch(err => {
        console.error('Dashboard load error:', err);
        setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard');
      })
      .finally(() => setLoading(false));
  };

  const loadScoreHistory = () => {
    fetch('/api/compliance/score?months=6')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.history?.length) setScoreHistory(d.history as ScoreHistoryPoint[]); })
      .catch(() => {/* non-critical — ignore */});
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch('/api/compliance/score', { method: 'POST' });
      if (res.ok) {
        loadData();
        loadScoreHistory();
      }
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => { loadData(); loadScoreHistory(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-slate-900">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <p className="text-base font-semibold text-white">Error al cargar el dashboard</p>
        <p className="text-sm text-gray-500 text-gray-400">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const stats = data?.stats;
  const complianceScore = stats?.complianceScore ?? null;
  const multaPotencial = stats?.multaPotencial ?? null;
  const sc = scoreColor(complianceScore);

  // ── 5 KPI cards with real data ──
  const STAT_CARDS = [
    {
      label: 'Trabajadores Activos',
      value: stats?.totalWorkers ?? 0,
      suffix: '',
      icon: Users,
      color: 'text-violet-600 text-violet-400',
      bg: 'bg-violet-50 bg-violet-900/30',
      href: '/dashboard/trabajadores',
    },
    {
      label: 'Score Compliance',
      value: complianceScore !== null ? complianceScore : '—',
      suffix: complianceScore !== null ? '%' : '',
      icon: ShieldCheck,
      color: sc.text,
      bg: sc.bg,
      href: '/dashboard/diagnostico',
    },
    {
      label: 'Contratos por Vencer',
      value: stats?.expiringCount ?? 0,
      suffix: '',
      icon: Clock,
      color: 'text-amber-600 text-amber-400',
      bg: 'bg-amber-50 bg-amber-900/30',
      href: '/dashboard/contratos',
    },
    {
      label: 'Alertas Criticas',
      value: stats?.criticalAlerts ?? 0,
      suffix: '',
      icon: Bell,
      color: 'text-red-600 text-red-400',
      bg: 'bg-red-50 bg-red-900/30',
      href: '/dashboard/alertas',
    },
    {
      label: 'Multa Potencial',
      value: multaPotencial !== null
        ? `S/ ${multaPotencial.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        : '—',
      suffix: '',
      icon: TrendingDown,
      color: multaPotencial && multaPotencial > 10000
        ? 'text-red-600 text-red-400'
        : 'text-gray-500 text-gray-400',
      bg: multaPotencial && multaPotencial > 10000
        ? 'bg-red-50 bg-red-900/30'
        : 'bg-white/[0.02] bg-white/[0.04]/40',
      href: '/dashboard/alertas',
    },
  ] as const;

  return (
    <div className="space-y-8">
      {/* ====== Onboarding wizard (solo si no completado) ====== */}
      <OnboardingWizard />

      {/* ====== Getting Started Guide ====== */}
      <GettingStartedGuide />

      {/* ====== Welcome header ====== */}
      <div>
        <h1 className="text-2xl font-bold text-white">Bienvenido de vuelta</h1>
        <p className="mt-1 text-sm capitalize text-gray-500 text-gray-400">{today}</p>
      </div>

      {/* ====== KPI Stat cards — 5 columnas ====== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-[#141824] p-5 shadow-sm hover:shadow-md hover:border-amber-400 hover:border-amber-500 cursor-pointer transition-all"
            >
              <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg', stat.bg)}>
                <Icon className={cn('h-6 w-6', stat.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-white truncate">
                  {stat.value}{stat.suffix}
                </p>
                <p className="text-xs text-gray-500 text-gray-400 leading-tight">{stat.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ====== Charts Row ====== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-[#141824] p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-white text-gray-200 mb-4">Calculos esta semana</h3>
          <StatsChart data={data?.weeklyActivity ?? []} />
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#141824] p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-white text-gray-200 mb-4">Estado de Contratos</h3>
          <DonutChart segments={data?.contractSegments ?? []} />
        </div>
      </div>

      {/* ====== Compliance Breakdown ====== */}
      {(data?.complianceBreakdown ?? []).length > 0 && (
        <ComplianceBreakdown
          items={data?.complianceBreakdown ?? []}
          globalScore={complianceScore}
        />
      )}

      {/* ====== Compliance Score Trend ====== */}
      {scoreHistory.length > 0 && (
        <ComplianceScoreTrend
          history={scoreHistory}
          onRecalculate={handleRecalculate}
          recalculating={recalculating}
        />
      )}

      {/* ====== No-score placeholder (first time) ====== */}
      {(data?.complianceBreakdown ?? []).length === 0 && (stats?.totalWorkers ?? 0) === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 border-slate-600 bg-white/[0.02] bg-white/50 p-8 text-center">
          <CheckCircle className="w-10 h-10 text-gray-300 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400">Aun no hay datos de compliance</p>
          <p className="text-xs text-gray-400 text-slate-500 mt-1 mb-4">
            Registra tus trabajadores para ver tu score de compliance en tiempo real
          </p>
          <Link
            href="/dashboard/trabajadores/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Agregar primer trabajador
          </Link>
        </div>
      )}

      {/* ====== Middle row: Recent Activity + Quick Actions ====== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* --- Recent Calculations --- */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-[#141824] shadow-sm">
          <div className="flex items-center justify-between border-b border-white/[0.06] border-white/[0.08] px-6 py-4">
            <h2 className="text-base font-semibold text-white text-gray-200">Calculos Recientes</h2>
            <Clock className="h-4 w-4 text-gray-400 text-slate-500" />
          </div>

          <ul className="divide-y divide-gray-100 divide-slate-700">
            {(data?.recentCalculations ?? []).length === 0 ? (
              <li className="px-6 py-8 text-center">
                <BarChart3 className="w-8 h-8 text-gray-300 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 text-gray-400">Aun no hay calculos</p>
                <p className="text-xs text-gray-400 text-slate-500 mt-1">Usa las calculadoras para ver tu actividad aqui</p>
              </li>
            ) : (
              data?.recentCalculations.map((calc) => (
                <li key={calc.id}>
                  <Link href="/dashboard/calculadoras" className="flex items-center gap-3 px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
                    <Scale className="h-5 w-5 shrink-0 text-emerald-500" />
                    <span className="flex-1 text-sm text-gray-300 text-slate-300">
                      {CALC_TYPE_LABELS[calc.type] || calc.type}
                      {calc.totalAmount != null && (
                        <span className="ml-1 font-semibold text-gray-200">
                          — S/ {calc.totalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400 text-slate-500">{timeAgo(calc.createdAt)}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* --- Quick Actions --- */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white text-gray-200">Acciones Rapidas</h2>
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-4 rounded-xl border border-white/[0.08] bg-[#141824] p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:bg-white/[0.04]"
              >
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', action.bg)}>
                  <Icon className={cn('h-4 w-4', action.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white text-gray-200">{action.title}</p>
                  <p className="truncate text-xs text-gray-500 text-gray-400">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-primary shrink-0" />
              </Link>
            );
          })}

          {stats?.templatesAvailable ? (
            <div className="rounded-xl border border-dashed border-white/10 border-slate-600 bg-white/[0.02] bg-white/50 p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.templatesAvailable}</p>
              <p className="text-xs text-gray-500 text-gray-400">Templates de contrato disponibles</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* ====== Upcoming expirations ====== */}
      <div className="rounded-xl border border-white/[0.08] bg-[#141824] shadow-sm">
        <div className="flex items-center justify-between border-b border-white/[0.06] border-white/[0.08] px-6 py-4">
          <h2 className="text-base font-semibold text-white text-gray-200">Contratos por Vencer</h2>
          <Link href="/dashboard/contratos" className="text-sm font-medium text-primary hover:underline">
            Ver todos
          </Link>
        </div>

        {(data?.expiringContracts ?? []).length === 0 ? (
          <div className="px-6 py-8 text-center">
            <FileText className="w-8 h-8 text-gray-300 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 text-gray-400">No hay contratos por vencer</p>
            <p className="text-xs text-gray-400 text-slate-500 mt-1">Los contratos proximos a vencer apareceran aqui</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] border-white/[0.08] text-xs uppercase tracking-wider text-gray-500 text-gray-400">
                  <th className="px-6 py-3 font-medium">Contrato</th>
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium">Vencimiento</th>
                  <th className="px-6 py-3 font-medium">Dias restantes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 divide-slate-700">
                {data?.expiringContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-white/[0.02]/50 hover:bg-white/[0.04]/50 cursor-pointer" onClick={() => window.location.href = `/dashboard/contratos/${contract.id}`}>
                    <td className="px-6 py-3 font-medium text-white text-gray-200">{contract.title}</td>
                    <td className="px-6 py-3 text-gray-400">{contract.type.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-3 text-gray-400">
                      {new Date(contract.expiresAt).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          contract.daysLeft <= 14
                            ? 'bg-red-50 text-red-700 bg-red-900/30 text-red-400'
                            : contract.daysLeft <= 21
                              ? 'bg-amber-50 text-amber-700 bg-amber-900/30 text-amber-400'
                              : 'bg-green-50 text-green-700 bg-green-900/30 text-green-400',
                        )}
                      >
                        {contract.daysLeft} dias
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
