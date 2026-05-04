# Organigrama v2 — Runbook operativo

> Última actualización: 2026-05-04
> Stack: Next.js 16 · React 19 · Tailwind 4 · `@xyflow/react` 12 · Dagre · Zustand · @tanstack/react-query

El módulo Organigrama v2 es un rediseño completo del módulo v1, activable mediante feature flag por organización. Mantiene **paridad funcional total con v1** y agrega 8 features diferenciadores.

## Tabla de contenidos

1. [Activar el v2 (rollout)](#1-activar-el-v2-rollout)
2. [Health-check antes de deploy](#2-health-check-antes-de-deploy)
3. [Mapa del módulo](#3-mapa-del-módulo)
4. [Endpoints expuestos](#4-endpoints-expuestos)
5. [Dependencias](#5-dependencias)
6. [Variables de entorno requeridas](#6-variables-de-entorno-requeridas)
7. [Rollback](#7-rollback-si-algo-sale-mal)
8. [Troubleshooting común](#8-troubleshooting-común)
9. [Métricas a monitorear post-deploy](#9-métricas-a-monitorear-post-deploy)
10. [Roadmap de mantenimiento](#10-roadmap-de-mantenimiento)

---

## 1. Activar el v2 (rollout)

El v2 vive detrás de un feature flag (`orgchart_v2`) gestionado en `src/lib/plan-features.ts` con la función `isRolloutEnabled()`.

### Modo A — Activar globalmente (todos los tenants)

```bash
# .env.production.local (o Vercel env vars)
NEXT_PUBLIC_ORGCHART_V2=true
```

### Modo B — Whitelist por orgId (rollout gradual)

```bash
# .env.production.local (o Vercel env vars)
ORGCHART_V2_ORGS=org_abc123,org_xyz789
```

Para sacar el orgId de un cliente:

```bash
npx tsx -e "import('@prisma/client').then(async (p) => { const c = new p.PrismaClient(); const orgs = await c.organization.findMany({ select: { id: true, name: true, ruc: true } }); console.table(orgs); await c.\$disconnect() })"
```

### Modo C — Apagar completamente

No setear ninguna de las dos. El feature flag devuelve `false` y los usuarios siguen en v1.

### Verificar el flag activo

```bash
# En la app autenticada como usuario de la org piloto
curl -H "Cookie: __session=..." https://app.comply360.pe/dashboard/organigrama
# Si v2 está activo, el HTML servirá <OrganigramaV2Wrapper />.
```

---

## 2. Health-check antes de deploy

Corre el script de verificación incluido:

```bash
npx tsx scripts/verify-orgchart-v2.ts
```

Esto valida:

- ✅ Dependencias instaladas (`@xyflow/react`, `@dagrejs/dagre`, `d3-hierarchy`, `zustand`, `react-window`)
- ✅ Variables de entorno críticas (`OPENAI_API_KEY`, `JWT_SECRET`, `DATABASE_URL`)
- ✅ Migraciones Prisma al día (modelos OrgUnit, OrgPosition, OrgAssignment, etc.)
- ✅ Tests vitest del módulo en verde (135+ tests)
- ✅ TypeScript del módulo sin errores

**No deployes si algún check falla.**

---

## 3. Mapa del módulo

```
src/app/dashboard/organigrama/
├── page.tsx                                    Server Component que decide v1 vs v2
├── _components/
│   ├── organigrama-client.tsx                  v1 god-component (DEPRECATED, eliminar 2026-Q3)
│   └── v2-wrapper.tsx                          Carga lazy del Shell v2 (dynamic import)
├── _v2/
│   ├── shell/organigrama-shell-v2.tsx          Shell top-level del v2
│   ├── canvas/                                 Canvas con @xyflow/react
│   │   ├── org-canvas-v2.tsx                   Wrapper de ReactFlow
│   │   ├── nodes/{unit,position}-node.tsx      Nodos custom con LOD + Toolbar
│   │   ├── edges/                              (vacío — usamos smoothstep nativo)
│   │   ├── layouts/                            Dagre + d3-hierarchy adapters
│   │   ├── overlays/                           Heatmap legend, NudgeBadge, NodeToolbar
│   │   └── hooks/                              use-lod, use-tree-to-flow, etc.
│   ├── header/                                 Toolbar simplificada (5 botones)
│   ├── inspector/                              Panel lateral (6 tabs)
│   ├── modals/                                 5 modales state-driven
│   ├── timemachine/                            Drawer scrubber + Sankey diff
│   ├── copilot/                                Panel IA conversacional
│   ├── command/                                Command palette (cmdk)
│   ├── mobile/                                 MobileTreeView + MobileInspectorSheet
│   ├── onboarding/                             Wizard "Tu organigrama en 60 seg"
│   ├── state/                                  Zustand store con 6 slices
│   └── data/                                   react-query queries + mutations
├── people/                                     Trombinoscopio compliance
└── _v2-utils/silent-log.ts                     Helper Sentry para audit logs no-críticos

src/lib/orgchart/
├── coverage-aggregator.ts                      Backend del Compliance Heatmap
├── snapshot-thumbnail.ts                       Renderiza SVG 400×120 de snapshots
├── time-machine-narrative.ts                   Genera narrativa IA del diff
├── people-view.ts + people-score.ts            Trombinoscopio
├── memoria-pdf/                                Generador PDF (9 páginas)
├── onboarding-ai/                              Onboarding IA + fallback templates
├── copilot/                                    Copiloto IA (NL → ops)
└── public-link/guided-tour.ts                  Modo Inspector SUNAFIL

src/app/api/orgchart/
├── memoria-anual/route.tsx                     Memoria Anual PDF
├── onboarding-ai/route.ts                      Wizard IA
├── copilot/route.ts                            Copiloto IA
├── people/route.ts                             Trombinoscopio
└── snapshots/[id]/thumbnail.svg/route.ts       Thumbnails Time Machine

src/app/api/public/orgchart/[token]/
├── route.ts                                    Auditor Link (con guidedTour)
└── track/route.ts                              Audit log de visitas SUNAFIL
```

---

## 4. Endpoints expuestos

### Internos (con auth Clerk)

| Método | URL | Propósito | Roles mínimos |
|--------|-----|-----------|---------------|
| GET | `/api/orgchart/people` | Trombinoscopio | MEMBER |
| GET | `/api/orgchart/memoria-anual?year=YYYY` | Memoria Anual PDF | MEMBER |
| GET | `/api/orgchart/snapshots/[id]/thumbnail.svg` | Thumbnail SVG | MEMBER |
| GET | `/api/orgchart/snapshots/diff/narrative` | Narrativa IA | MEMBER |
| POST | `/api/orgchart/onboarding-ai` | Wizard IA (preview / apply) | ADMIN |
| POST | `/api/orgchart/copilot` | Copiloto IA (plan / apply) | ADMIN |

### Públicos (sin auth, con JWT firmado)

| Método | URL | Propósito |
|--------|-----|-----------|
| GET | `/api/public/orgchart/[token]` | Auditor Link payload (incluye guidedTour) |
| POST | `/api/public/orgchart/[token]/track` | Track de pasos del tour SUNAFIL |

---

## 5. Dependencias

| Paquete | Versión | Bundle gzip | Para qué |
|---------|---------|-------------|----------|
| `@xyflow/react` | ^12.4 | ~75 kB | Canvas |
| `@dagrejs/dagre` | ^1.1 | ~32 kB | Layout TB / LR |
| `d3-hierarchy` | ^3.1 | ~12 kB | Layout radial |
| `zustand` | ^5.0 | ~3 kB | State management |
| `react-window` | ^1.8 | ~6 kB | Virtualización mobile |

Total: **~128 kB gzip** añadidos al bundle del módulo (sólo se carga en `/dashboard/organigrama` con dynamic import).

---

## 6. Variables de entorno requeridas

Verifica con:

```powershell
# PowerShell
Get-Content .env | Select-String "^[A-Z_]+=" | ForEach-Object { ($_.Line -split "=")[0] } | Sort-Object
```

| Variable | Crítica | Para qué |
|----------|---------|----------|
| `OPENAI_API_KEY` | ✅ | Copiloto IA, Onboarding IA, Narrativa Time Machine |
| `DEEPSEEK_API_KEY` | opcional | Provider alternativo (multi-provider fallback) |
| `JWT_SECRET` | ✅ | Auditor Links firmados (24/48/72h) |
| `DATABASE_URL` | ✅ | Postgres / Supabase |
| `NEXT_PUBLIC_SENTRY_DSN` | recomendada | Captura errores no-críticos del v2 |
| `NEXT_PUBLIC_ORGCHART_V2` | rollout | `true` para activar v2 globalmente |
| `ORGCHART_V2_ORGS` | rollout | Whitelist comma-separated de orgIds |

---

## 7. Rollback si algo sale mal

### Opción A — Apagar feature flag (recomendado)

Tiempo: <1 minuto. Sin pérdida de datos.

```bash
# Vercel → Project Settings → Environment Variables
NEXT_PUBLIC_ORGCHART_V2=false   # o eliminar la variable
ORGCHART_V2_ORGS=               # vaciar whitelist
```

Re-deploy. Todos los tenants vuelven a ver v1.

### Opción B — Rollback de código

```bash
git revert <commit-del-v2>
```

Solo si el v1 está intacto (lo está hasta que decidamos eliminarlo).

### Opción C — Revertir solo a una org

Si solo una org reporta problemas:

```bash
ORGCHART_V2_ORGS=org_a,org_b   # quita el orgId problemático
```

---

## 8. Troubleshooting común

### Síntoma: el canvas no aparece, sólo veo el spinner

**Causa probable**: el dynamic import del shell v2 falló. Revisa la consola del navegador.

**Diagnóstico**:
```bash
# En el cliente con DevTools abiertos
# Network tab → buscar "organigrama-shell-v2.tsx" → ver si es 404 o 500
```

**Fix**: re-deploy. Si persiste, verificar que el bundle de `@xyflow/react` esté en producción.

### Síntoma: Copiloto IA siempre devuelve "Error generando plan"

**Causa probable**: `OPENAI_API_KEY` no configurada o inválida.

**Diagnóstico**:
```bash
# En Vercel → Logs → buscar "DEEPSEEK_API_KEY no está configurada" o
# "OPENAI_API_KEY no está configurada"
```

**Fix**: agregar la key en Vercel Environment Variables y re-deploy.

### Síntoma: Memoria Anual PDF tarda >30s y devuelve 504

**Causa probable**: org muy grande (500+ trabajadores) + Org Doctor lento.

**Fix temporal**: en `route.tsx` aumentar `maxDuration` (ya está en 60s).
**Fix definitivo**: cachear el doctor report con `staleTime: 5 minutos`.

### Síntoma: Time Machine thumbnails se ven todos en blanco

**Causa probable**: el snapshot tiene `units: []` (organigrama vacío en ese momento).

**Fix**: esperado — `renderSnapshotThumbnailSVG` muestra "Sin unidades".

### Síntoma: Auditor Link devuelve 401 a un inspector real

**Causa probable**: el snapshot fue alterado (hash no coincide) o el token expiró.

**Diagnóstico**:
```bash
# Decodificar el token sin verificar:
node -e "console.log(require('jsonwebtoken').decode('TOKEN_AQUI'))"
```

**Fix**: regenerar el link desde el toolbar → Compartir → Auditor Link.

### Síntoma: drag-and-drop no funciona

**Causa probable**: estás en modo unidad (`positionMode: false`). El drag-reparenting está habilitado solo en modo cargo.

**Fix**: cambiar al View toggle "Cargos" en el header o usar el NodeToolbar contextual con click en el cargo.

---

## 9. Métricas a monitorear post-deploy

### En Sentry

Tags:
- `module: orgchart-v2` — todos los errores del módulo
- `tag: orgchart.copilot.audit_log_failed` — fallos del audit del Copiloto
- `tag: orgchart.onboarding.audit_log_failed` — fallos del audit del wizard
- `tag: orgchart.auditor_link.track_failed` — fallos del track público

### En Plausible/Analytics

Eventos a trackear:
- Vista de `/dashboard/organigrama` — adopción del v2
- Vista de `/dashboard/organigrama/people` — uso del Trombinoscopio
- Click en "Generar Memoria Anual" — uso del PDF
- Click en "Copiloto IA" — uso del feature de marketing
- Generación de Auditor Link — uso pre-SUNAFIL

### En logs de Vercel

Búsquedas útiles:
- `orgchart.copilot_applied` — operaciones aplicadas
- `orgchart.onboarding_ai_applied` — onboardings exitosos
- `orgchart.memoria_anual_generated` — PDFs generados
- `orgchart.auditor_link.tour-completed` — tours SUNAFIL completos

### Performance

- Bundle del módulo organigrama < 250 kB gzip (verificar con `next build`)
- p95 latency de `/api/orgchart` < 800 ms
- p95 latency de `/api/orgchart/copilot` < 8 s (requiere LLM)
- p95 latency de `/api/orgchart/memoria-anual` < 15 s

---

## 10. Roadmap de mantenimiento

### Inmediato

- [ ] Activar `NEXT_PUBLIC_ORGCHART_V2=true` en producción para 1-3 orgs piloto
- [ ] Monitorear Sentry durante primera semana
- [ ] Recoger feedback de RRHH del cliente piloto

### Corto plazo (30-60 días)

- [ ] Eliminar god component v1 (`organigrama-client.tsx`, 6,039 líneas) si v2 estable
- [ ] Activar `NEXT_PUBLIC_ORGCHART_V2=true` para todos los tenants
- [ ] Agregar cron semanal de snapshots automáticos en `vercel.json`
- [ ] Tests E2E con auth real (requiere credenciales Clerk dev)

### Mediano plazo (3-6 meses)

- [ ] Pgvector indexing del corpus legal (75 normas) para Copiloto IA
- [ ] Modales como parallel routes Next 16 (`@modal/`)
- [ ] Heatmap overlay 2D con Canvas API (gradientes radiales)
- [ ] Onboarding plantillas adicionales (construcción, salud, manufactura, agro)
- [ ] Storytelling feed semanal (email digest "Esta semana en tu organización")

### Largo plazo (6+ meses, opt-in)

- [ ] Live collaboration con Liveblocks (multi-cursor, comments, @menciones)
- [ ] Workflows automatizados (ej. "al crear COMITE_LEGAL → crear cargos Pres+Sec+Miembros")

---

## Anexo — Comandos útiles

```bash
# Reset completo de la DB local (cuidado: borra todo)
npx prisma migrate reset

# Seed con org demo de retail PYME peruano
npm run db:seed
npx tsx scripts/seed-orgchart-demo.ts

# Ver el bundle del módulo
npm run build && npx next-bundle-analyzer

# Tests del módulo
npx vitest run src/lib/orgchart/__tests__/

# Lint solo del v2
npx eslint src/app/dashboard/organigrama/_v2 src/lib/orgchart

# Typecheck completo
npx tsc --noEmit
```

---

**Mantenedor**: equipo Comply360
**Plan original**: `C:\Users\User\.claude\plans\quiero-que-revises-el-quiet-forest.md`
