'use client'

import { useState } from 'react'
import {
  Sparkles,
  ShieldCheck,
  Users,
  AlertTriangle,
  FileText,
  Calculator,
  Bell,
  Settings,
  Calendar,
  Download,
  ArrowRight,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Tooltip } from '@/components/ui/tooltip'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ProgressRing } from '@/components/ui/progress-ring'
import {
  Skeleton,
  SkeletonCard,
  SkeletonText,
  SkeletonStats,
} from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner-toaster'
import { BRAND_COLORS } from '@/lib/brand'

/**
 * /dev/ui — COMPLY360 Design System showcase.
 *
 * Living reference of every base component after the "Obsidian + Esmeralda"
 * rebrand. Use this page to:
 * - Visually validate tokens.css + globals.css
 * - Verify every variant renders correctly
 * - Copy/paste examples for new module pages
 *
 * NOT meant to ship in production — it's a dev-only page.
 */
export default function DevUiShowcase() {
  const [modalOpen, setModalOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <main className="min-h-screen px-6 py-12 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-16">
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <header className="motion-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </span>
            <Badge variant="emerald" size="sm" dot>
              Design System v2
            </Badge>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-[color:var(--text-primary)]">
            COMPLY360 — Obsidian + Esmeralda
          </h1>
          <p className="mt-3 text-lg text-[color:var(--text-secondary)] max-w-2xl">
            Sistema de componentes base para la revolución UI. Cada pieza de
            este catálogo alimenta los 7 hubs del producto.
          </p>
        </header>

        {/* ── COLOR TOKENS ───────────────────────────────────────────── */}
        <Section
          title="Paleta"
          description="Obsidian para fondos, Esmeralda para compliance positivo, Crimson para riesgo, Gold para logros."
        >
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(BRAND_COLORS).map(([family, scale]) => (
              <div key={family} className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                  {family}
                </p>
                {Object.entries(scale as Record<string, string>).map(
                  ([shade, hex]) => (
                    <div
                      key={shade}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="h-6 w-6 rounded-md border border-white/10"
                        style={{ background: hex as string }}
                      />
                      <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
                        {shade} {String(hex)}
                      </span>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* ── BUTTONS ────────────────────────────────────────────────── */}
        <Section title="Botones" description="6 variants × 5 sizes + iconos + loading.">
          <div className="space-y-6">
            {/* Variants */}
            <div className="space-y-2">
              <Label>Variants</Label>
              <div className="flex flex-wrap gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="gold">Gold</Button>
                <Button variant="emerald-soft">Emerald soft</Button>
                <Button variant="link">Link style</Button>
              </div>
            </div>

            {/* Sizes */}
            <div className="space-y-2">
              <Label>Sizes</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="xs">xs</Button>
                <Button size="sm">sm</Button>
                <Button size="md">md</Button>
                <Button size="lg">lg</Button>
                <Button size="xl">xl</Button>
                <Button size="icon" variant="secondary" aria-label="Nuevo">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* With icons */}
            <div className="space-y-2">
              <Label>Con iconos</Label>
              <div className="flex flex-wrap gap-3">
                <Button icon={<Download className="h-4 w-4" />}>
                  Descargar reporte
                </Button>
                <Button
                  variant="secondary"
                  iconRight={<ArrowRight className="h-4 w-4" />}
                >
                  Ver trabajadores
                </Button>
                <Button variant="emerald-soft" icon={<ShieldCheck className="h-4 w-4" />}>
                  Simular SUNAFIL
                </Button>
                <Button loading>Procesando</Button>
                <Button variant="danger" disabled>
                  Deshabilitado
                </Button>
              </div>
            </div>
          </div>
        </Section>

        {/* ── BADGES ─────────────────────────────────────────────────── */}
        <Section title="Badges" description="Severidad + semánticos + solid.">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="critical" dot pulse>Crítica</Badge>
              <Badge variant="high" dot>Alta</Badge>
              <Badge variant="medium" dot>Media</Badge>
              <Badge variant="low" dot>Baja</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Compliance OK</Badge>
              <Badge variant="warning">Por vencer</Badge>
              <Badge variant="danger">Multa SUNAFIL</Badge>
              <Badge variant="info">Informativo</Badge>
              <Badge variant="gold">Plan PRO</Badge>
              <Badge variant="emerald">Legajo 100%</Badge>
              <Badge variant="neutral">Neutro</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="solid-emerald" size="pill">3 nuevos</Badge>
              <Badge variant="solid-crimson" size="pill">12 críticas</Badge>
              <Badge variant="solid-amber" size="pill">5 por vencer</Badge>
            </div>
          </div>
        </Section>

        {/* ── CARDS ──────────────────────────────────────────────────── */}
        <Section title="Cards" description="Glassmorphism Obsidian con 6 variantes.">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Default</CardTitle>
                  <CardDescription>Glass con hover emerald</CardDescription>
                </div>
                <Users className="h-5 w-5 text-[color:var(--text-tertiary)]" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[color:var(--text-secondary)]">
                  La superficie base. Usada para KPIs, listados, widgets.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm">
                  Ver más
                </Button>
              </CardFooter>
            </Card>

            <Card variant="emerald">
              <CardHeader>
                <div>
                  <CardTitle>Emerald</CardTitle>
                  <CardDescription>Estado compliance positivo</CardDescription>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-700">87</div>
                <p className="text-xs text-[color:var(--text-tertiary)] mt-1">
                  Score de compliance
                </p>
              </CardContent>
            </Card>

            <Card variant="crimson">
              <CardHeader>
                <div>
                  <CardTitle>Crimson</CardTitle>
                  <CardDescription>Riesgo / critical</CardDescription>
                </div>
                <AlertTriangle className="h-5 w-5 text-crimson-700" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-crimson-700">S/ 24,500</div>
                <p className="text-xs text-[color:var(--text-tertiary)] mt-1">
                  Multa SUNAFIL estimada
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="md">
              <p className="text-sm font-semibold mb-1">Elevated</p>
              <p className="text-xs text-[color:var(--text-secondary)]">
                Para hero elements del cockpit.
              </p>
            </Card>

            <Card variant="outline" padding="md">
              <p className="text-sm font-semibold mb-1">Outline</p>
              <p className="text-xs text-[color:var(--text-secondary)]">
                Para listas anidadas.
              </p>
            </Card>

            <Card variant="solid" padding="md" interactive>
              <p className="text-sm font-semibold mb-1">Solid · Interactive</p>
              <p className="text-xs text-[color:var(--text-secondary)]">
                Hover para ver el lift.
              </p>
            </Card>
          </div>
        </Section>

        {/* ── PROGRESS RING ──────────────────────────────────────────── */}
        <Section
          title="Compliance Ring"
          description="Hero component del Cockpit. Color se adapta al score."
        >
          <div className="flex flex-wrap items-center gap-10">
            {[42, 68, 84, 94].map((score) => (
              <div key={score} className="text-center">
                <ProgressRing value={score} size={160} stroke={12}>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[color:var(--text-primary)]">
                      {score}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
                      score
                    </div>
                  </div>
                </ProgressRing>
                <p className="mt-2 text-xs text-[color:var(--text-tertiary)]">
                  {score < 60
                    ? 'crítico'
                    : score < 80
                      ? 'mejorable'
                      : score < 90
                        ? 'saludable'
                        : 'excelente'}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── TABS ───────────────────────────────────────────────────── */}
        <Section title="Tabs" description="3 variantes: pills, underline, segmented.">
          <div className="space-y-8">
            <div>
              <Label>Pills (default)</Label>
              <Tabs defaultValue="info" className="mt-2">
                <TabsList>
                  <TabsTrigger value="info">
                    <Users className="h-3.5 w-3.5" />
                    Información
                  </TabsTrigger>
                  <TabsTrigger value="legajo">
                    <FileText className="h-3.5 w-3.5" />
                    Legajo
                  </TabsTrigger>
                  <TabsTrigger value="contratos">Contratos</TabsTrigger>
                  <TabsTrigger value="vacaciones">Vacaciones</TabsTrigger>
                </TabsList>
                <TabsContent value="info">
                  <Card padding="md">Información personal del trabajador…</Card>
                </TabsContent>
                <TabsContent value="legajo">
                  <Card padding="md">Legajo digital 18/28 documentos…</Card>
                </TabsContent>
                <TabsContent value="contratos">
                  <Card padding="md">2 contratos vigentes.</Card>
                </TabsContent>
                <TabsContent value="vacaciones">
                  <Card padding="md">15 días pendientes de goce.</Card>
                </TabsContent>
              </Tabs>
            </div>

            <div>
              <Label>Underline</Label>
              <Tabs defaultValue="activos" className="mt-2">
                <TabsList variant="underline">
                  <TabsTrigger variant="underline" value="activos">
                    Activos (42)
                  </TabsTrigger>
                  <TabsTrigger variant="underline" value="cesados">
                    Cesados (8)
                  </TabsTrigger>
                  <TabsTrigger variant="underline" value="todos">
                    Todos
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="activos" />
                <TabsContent value="cesados" />
                <TabsContent value="todos" />
              </Tabs>
            </div>

            <div>
              <Label>Segmented</Label>
              <Tabs defaultValue="mes" className="mt-2">
                <TabsList variant="segmented">
                  <TabsTrigger variant="segmented" value="semana">
                    Semana
                  </TabsTrigger>
                  <TabsTrigger variant="segmented" value="mes">
                    Mes
                  </TabsTrigger>
                  <TabsTrigger variant="segmented" value="trimestre">
                    Trimestre
                  </TabsTrigger>
                  <TabsTrigger variant="segmented" value="año">
                    Año
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </Section>

        {/* ── OVERLAYS ───────────────────────────────────────────────── */}
        <Section
          title="Overlays"
          description="Modal, Sheet, Popover, Dropdown, Tooltip — todos con a11y de Radix."
        >
          <div className="flex flex-wrap gap-3">
            {/* Modal */}
            <Button onClick={() => setModalOpen(true)}>Abrir Modal</Button>
            <Modal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Generar liquidación"
              description="El cálculo usa CTS, gratificación trunca y vacaciones no gozadas."
              footer={
                <>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      setModalOpen(false)
                      toast.success('Liquidación generada', {
                        description: 'PDF disponible en el legajo del trabajador.',
                      })
                    }}
                  >
                    Generar
                  </Button>
                </>
              }
            >
              <div className="space-y-3">
                <p className="text-sm text-[color:var(--text-secondary)]">
                  Vas a generar la liquidación de beneficios sociales para el
                  trabajador seleccionado. El documento se archiva en el legajo
                  con firma timestamp.
                </p>
                <Card variant="emerald" padding="md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[color:var(--text-tertiary)]">
                      Monto total estimado
                    </span>
                    <span className="font-mono text-xl font-bold text-emerald-700">
                      S/ 8,450.00
                    </span>
                  </div>
                </Card>
              </div>
            </Modal>

            {/* Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary" icon={<Sparkles className="h-4 w-4" />}>
                  Abrir AI Copilot
                </Button>
              </SheetTrigger>
              <SheetContent size="md">
                <SheetHeader>
                  <SheetTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    AI Copilot
                  </SheetTitle>
                  <SheetDescription className="text-xs text-[color:var(--text-tertiary)]">
                    Contexto: Perfil de Juan García · Régimen MYPE Pequeña
                  </SheetDescription>
                </SheetHeader>
                <SheetBody>
                  <div className="space-y-3">
                    <Card variant="emerald" padding="md">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">
                        Sugerencia
                      </p>
                      <p className="text-sm">
                        Este trabajador tiene vacaciones acumuladas por más de
                        un año. Te recomiendo generar una carta de otorgamiento
                        de vacaciones.
                      </p>
                    </Card>
                    <Button variant="emerald-soft" size="sm" fullWidth>
                      Generar carta
                    </Button>
                  </div>
                </SheetBody>
                <SheetFooter>
                  <input
                    className="flex-1 rounded-lg bg-[color:var(--bg-surface)] border border-[color:var(--border-default)] px-3 py-2 text-sm"
                    placeholder="Pregunta al copilot…"
                  />
                  <Button size="sm">Enviar</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            {/* Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="secondary" icon={<Bell className="h-4 w-4" />}>
                  Popover
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-sm font-semibold mb-2">Notificaciones</p>
                <p className="text-xs text-[color:var(--text-secondary)]">
                  3 alertas críticas te esperan.
                </p>
              </PopoverContent>
            </Popover>

            {/* Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" icon={<Settings className="h-4 w-4" />}>
                  Dropdown
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Acciones rápidas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Calculator className="h-3.5 w-3.5" />
                  Calcular CTS
                  <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="h-3.5 w-3.5" />
                  Generar contrato
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Calendar className="h-3.5 w-3.5" />
                  Ver calendario
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive>Eliminar trabajador</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tooltip */}
            <Tooltip content="Esto es un tooltip accesible con Radix">
              <Button variant="ghost">Hover para tooltip</Button>
            </Tooltip>

            {/* Toast triggers */}
            <Button
              variant="emerald-soft"
              onClick={() => toast.success('Documento subido al legajo')}
            >
              Toast success
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                toast.error('No se pudo guardar', {
                  description: 'Verifica tu conexión.',
                })
              }
            >
              Toast error
            </Button>
          </div>
        </Section>

        {/* ── SKELETONS ──────────────────────────────────────────────── */}
        <Section title="Skeletons" description="Shimmer loaders para cada layout común.">
          <div className="space-y-5">
            <SkeletonStats count={4} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <Card padding="md">
              <div className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <SkeletonText lines={4} />
              </div>
            </Card>
          </div>
        </Section>

        {/* ── MOTION PRIMITIVES ──────────────────────────────────────── */}
        <Section
          title="Motion primitives"
          description="CSS animations con respect-reduced-motion. Framer Motion via <m.div /> para transiciones de ruta."
        >
          <div className="motion-stagger grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Fade', 'Scale', 'Stagger', 'Pulse'].map((name) => (
              <Card key={name} padding="md" interactive>
                <div className="text-sm font-semibold">{name}</div>
                <div className="text-xs text-[color:var(--text-tertiary)] mt-1">
                  motion-{name.toLowerCase()}
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Demos navegables" description="Explorá los ensamblajes de la revolución antes de conectar datos reales.">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { href: '/dev/shell', title: 'Shell completo', description: 'Sidebar 7 hubs + Topbar + Cmd+K + Copilot' },
              { href: '/dev/cockpit', title: 'Cockpit narrativo', description: 'ScoreRing + Momentos + Radar + Heatmap' },
              { href: '/dev/worker', title: 'Worker super-perfil', description: '8 tabs Notion-style' },
              { href: '/dev/diagnostic-intro', title: 'Diagnóstico Typeform', description: '120 preguntas · 1 por pantalla' },
              { href: '/dev/simulacro-intro', title: 'Simulacro immersive', description: 'Inspector virtual chat' },
              { href: '/dashboard/ia-laboral', title: 'Hub IA Laboral', description: 'Unifica 3 chatbots + calculadoras' },
            ].map((d) => (
              <a
                key={d.href}
                href={d.href}
                className="group flex flex-col gap-1 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]/40 p-4 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
              >
                <p className="text-sm font-semibold">{d.title}</p>
                <p className="text-[11px] text-[color:var(--text-tertiary)] leading-relaxed">
                  {d.description}
                </p>
                <span className="mt-1 text-[11px] font-mono text-emerald-600 group-hover:text-emerald-700">
                  {d.href} →
                </span>
              </a>
            ))}
          </div>
        </Section>

        <footer className="pt-8 pb-4 text-center text-xs text-[color:var(--text-tertiary)]">
          COMPLY360 · Design System v2 · Obsidian + Esmeralda
        </footer>
      </div>
    </main>
  )
}

/* ── Helpers locales del showcase ────────────────────────────────────── */

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          {description}
        </p>
      </div>
      <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]/30 backdrop-blur-md p-6">
        {children}
      </div>
    </section>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)] mb-2">
      {children}
    </p>
  )
}
