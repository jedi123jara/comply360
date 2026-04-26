# 🏛️ COMPLY360 — Plan Maestro v2

> Síntesis estratégica basada en 5 auditorías paralelas (deuda visual, economía del producto, funnel, análisis competitivo, performance/A11y/SEO).
>
> **Versión**: 2026-04-26 · **Branch**: `main` · **Score actual**: ~88/100 (post Sprint 0-4 + fixes auth/CSS de hoy)
> **Destino**: 98/100 — el referente único de compliance laboral peruano.

---

## 📊 NIVEL 1 — DIAGNÓSTICO CRUDO

### Posición actual real
- **94 score técnico** (Sprint 0-4 cerrados, multi-tenant zero-trust, IA observable, workflows reales).
- **88 score de producto percibido** (acabamos de cazar bugs CSS que ocultaban /admin completo — inferiremos hay más).
- **0% adopción medida** del founder console hasta hoy (lo desbloqueamos esta semana).
- **Mercado**: cuadrante "compliance-first mid-market peruano" **VACÍO**, 12-18 meses ventana antes que Buk reaccione.

### Las 5 grietas estratégicas detectadas

| # | Grieta | Impacto | Severidad |
|---|---|---|---|
| 1 | **Animaciones CSS huérfanas** | /admin estuvo en blanco 1+ semana, +2 más cazadas hoy | 🔴 Crítica |
| 2 | **Sub-pricing 40-50% vs benchmark** | EMPRESA $81 vs benchmark $99-199. PRO $176 vs $299-599 | 🔴 Revenue leak |
| 3 | **Calculadoras públicas sin paywall ni lead capture** | 1000s de visitas SEO mensuales con conversión <1% | 🔴 Revenue leak |
| 4 | **Funnel primer minuto = 80% churn** | Onboarding invisible, trial silencioso, empty states pobres | 🔴 Adquisición |
| 5 | **Layout dashboard con 'use client'** | LCP 3.5s en /dashboard, 60% más bundle | 🟡 Performance |

### Falsedades de la auditoría inicial detectadas (cumulado del programa)

Total: **17 falsos positivos** en auditoría original. La métrica más importante: **mucho está mejor de lo que parecía**. El producto está más maduro que lo que el reporte sugería. La verdadera deuda es de **producto + go-to-market**, no de código.

---

## 🌟 NIVEL 2 — VISIÓN "NIVEL DIOS"

### Posicionamiento único defensible

> **"El software peruano que te prepara para SUNAFIL — no solo paga la planilla."**

No competimos con Buk en breadth (RRHH generalista regional). Competimos en **depth de compliance SUNAFIL específico peruano**. Cada feature responde: **¿qué multa SUNAFIL evita esto?**

### North Star metric

**Multa SUNAFIL evitada acumulada por cliente** (S/ por mes).
- Visible en cada dashboard.
- Calculable post-cada-acción (subsanación, capacitación, simulacro).
- ROI directo: "pagas S/299/mes, evitas S/X de multa potencial".

### Promesa de marca en 1 línea

> **"En 30 días, tu empresa pasa de 60/100 de compliance a 90/100 — auditable y firmado por tus trabajadores con huella."**

### Pilares diferenciadores únicos (mantener y magnificar)

1. **Diagnóstico SUNAFIL 135 preguntas + plan de acción ejecutable** — nadie tiene esto en Latam
2. **Simulacro de inspección con Acta R.M. 199-2016-TR** — único en mercado
3. **IA visión auto-verify legajo** — único con OCR de DNI + cross-match
4. **Biblioteca zero-liability de plantillas con merge fields** — innovación legal
5. **Copilot RAG con 75+ normas peruanas** — IA real, no decoración
6. **Firma biométrica WebAuthn (Touch ID/Hello)** — UX 10x mejor que OTP-email
7. **Canal denuncias Ley 27942 con triaje IA** — profundidad MIMP que nadie ofrece

### Pilares competitivos a replicar (gaps reales)

1. **Reloj digital con geofencing + reconocimiento facial** (Worky, Rankmi tienen)
2. **Firma digital certificada PSnet/Indecopi** (Rankmi tiene — superior legal vs WebAuthn)
3. **App nativa iOS/Android** (Buk, Rankmi tienen — PWA está bien pero stores dan trust)
4. **Customer success real** (cero competidor pure self-service en mid-market peruano)

---

## 🗺️ NIVEL 3 — ROADMAP RICE PRIORIZADO

Cada iniciativa: **R**each (cuántos clientes), **I**mpact (1-3), **C**onfidence (1-3), **E**ffort (días). RICE = R × I × C / E.

### TRIMESTRE 1 — Q2 2026 (mayo-julio): "Sellar grietas y monetizar lo existente"

| # | Iniciativa | R | I | C | E | RICE | Lift |
|---|---|---|---|---|---|---|---|
| 1 | **Lead capture en calculadoras públicas** (modal email + 14d trial PRO) | 1000 | 3 | 3 | 3 | **3000** | +5-15% conversion calcs |
| 2 | **Trial banner desde día 1 + email recordatorio día 11** | 100 | 3 | 3 | 1 | **900** | +15-25% trial→paid |
| 3 | **Re-pricing tier-up 20-30%** (STARTER S/149, EMPRESA S/349, PRO S/799) | 100 | 3 | 2 | 1 | **600** | +25% MRR |
| 4 | **Onboarding obligatorio** (no permitir skip step 1) | 100 | 3 | 3 | 0.5 | **1800** | +15% activación |
| 5 | **Enforcement límites usuarios admin + IA quota por plan** | 100 | 2 | 3 | 2 | **300** | -revenue leak |
| 6 | **Server Component dashboard layout** (LCP -1.5s) | 100 | 2 | 3 | 1 | **600** | +Core Web Vitals |
| 7 | **Schema.org + metadata 10 calculadoras faltantes** | 1000 | 2 | 3 | 2 | **3000** | +15-20% organic CTR |
| 8 | **noindex páginas legales** | 1000 | 1 | 3 | 0.1 | **30000** | +SEO authority home |
| 9 | **Page guided tour Intro.js** (primera vez en /dashboard) | 100 | 2 | 2 | 3 | **133** | +12% aha moment |
| 10 | **Empty states con preview/demo** (trabajadores, contratos) | 100 | 2 | 2 | 2 | **200** | +8% first action |

**Outcome Q1**: MRR +30-40%, churn -15%, organic SEO +20%, LCP <2.5s en /dashboard.

### TRIMESTRE 2 — Q3 2026 (agosto-octubre): "Cerrar loops y matar grieta de datos mock"

| # | Iniciativa | R | I | C | E | RICE | Lift |
|---|---|---|---|---|---|---|---|
| 11 | **Unificar Boletas + Planilla** (eliminar duplicación) | 50 | 3 | 3 | 7 | **64** | +30% UX claridad |
| 12 | **Asistencia heatmap con datos reales** (eliminar pseudo-random) | 50 | 3 | 3 | 5 | **90** | -sensación demo |
| 13 | **Resumen mi-portal home con CTS+vacaciones reales** | 200 | 3 | 3 | 2 | **900** | +retención worker portal |
| 14 | **Igualdad salarial conectada a Planilla real** | 30 | 2 | 3 | 4 | **45** | Cumplimiento Ley 30709 real |
| 15 | **Notificación push real** (boleta nueva, solicitud aprobada) | 200 | 3 | 3 | 4 | **450** | +40% engagement |
| 16 | **WebAuthn fallback robusto** + preview PDF antes de firmar | 200 | 3 | 3 | 3 | **600** | +30% tasa firma |
| 17 | **Batch generation paralelo de boletas** | 30 | 3 | 3 | 5 | **54** | -60% tiempo nómina |
| 18 | **Reportes ejecutivos PDF con react-pdf en 5 reportes restantes** | 50 | 2 | 3 | 6 | **50** | +calidad demo |
| 19 | **Casilla SUNAFIL real** (sync notificaciones o CSV upload) | 50 | 3 | 2 | 7 | **43** | Diferenciador SUNAFIL |
| 20 | **Score SST con desglose ponderado + acciones específicas** | 80 | 2 | 3 | 3 | **160** | Coherencia compliance |

**Outcome Q2**: Producto 100% sin datos mock visibles, push notifications activas, generación masiva acelerada, 7 reportes ejecutivos profesionales.

### TRIMESTRE 3 — Q4 2026 (noviembre-enero): "Diferenciadores que justifican PRO+"

| # | Iniciativa | R | I | C | E | RICE | Lift |
|---|---|---|---|---|---|---|---|
| 21 | **Generar contrato corregido por IA** (analiza→hallazgos→versión limpia) | 50 | 3 | 2 | 10 | **30** | Único en mercado peruano |
| 22 | **Agente Descargo SUNAFIL automático** (notif→análisis→draft) | 30 | 3 | 2 | 12 | **15** | Diferenciador EMPRESA+ |
| 23 | **Vacaciones truncas tiempo real en card worker** | 200 | 2 | 3 | 3 | **400** | -disputas legales |
| 24 | **RAG real + prompt caching en Copilot** (citas verificables) | 100 | 3 | 2 | 8 | **75** | IA real vs decoración |
| 25 | **Reloj digital geofencing + reconocimiento facial** | 80 | 3 | 2 | 15 | **32** | Replica Worky/Rankmi |
| 26 | **Firma digital certificada PSnet/Indecopi (CERTIFIED tier)** | 30 | 3 | 2 | 10 | **18** | Iguala Rankmi legal |
| 27 | **App móvil nativa iOS/Android** (React Native) | 100 | 2 | 2 | 30 | **13** | Stores trust |
| 28 | **T-REGISTRO + PLAME export real con SUNAT API** | 50 | 3 | 2 | 20 | **15** | Cierra ciclo planilla |
| 29 | **Marketplace de abogados** | 30 | 2 | 1 | 15 | **4** | Revenue adicional |
| 30 | **Add-on IA Tokens (S/50/100 tokens extras)** | 50 | 2 | 2 | 4 | **50** | Captura upsell sin redesign |

**Outcome Q3**: 3 features únicas en mercado peruano (contrato corregido IA, descargo SUNAFIL automático, RAG real), capacidad de competir con Rankmi en firma digital, plan PRO+ realmente diferenciado.

### TRIMESTRE 4 — Q1 2027 y más allá: "Escala regional"

- Internacionalización a Chile, Colombia, México (cada uno 6 meses)
- ENTERPRISE con SLA real, BI dashboard, datalake
- Marca blanca (PRO++)
- Customer success real (chico que explica)

---

## 🛠️ NIVEL 4 — EJECUTABLES INMEDIATOS

### YA HECHO HOY (commits `c3a6029`, `2151c3a`, `ba5d85b`)

✅ Fix `fadeInUp` keyframes (panel admin no estaba en blanco)
✅ Fix `pulseEmerald` keyframes (status dots ahora pulsan)
✅ Fix `shimmer` keyframes (adoption bars con brillo)
✅ Post-login routing por role (SUPER_ADMIN→/admin, etc.)
✅ Endpoint `/api/me/role` para diagnóstico vivo
✅ Error boundary específico /admin con stack trace

### Sprint próxima semana (5 días, todos < 4h cada uno)

#### Lunes — SEO + Empty states
- [ ] `noindex` en 7 páginas legales (`src/app/(marketing)/legal/*`) — 30min
- [ ] Schema.org `Calculator` + `FAQSchema` en `cts`, `gratificacion`, `multa-sunafil` — 2h
- [ ] Metadata + canonical en 10 calculadoras faltantes — 1h

#### Martes — Performance
- [ ] Convertir `dashboard/layout.tsx` a server component (mantener `<ClientShell>` para interactividad) — 3h
- [ ] `next/dynamic({ ssr: false })` para `recharts`, `framer-motion`, `pdf-lib` — 1.5h

#### Miércoles — Funnel primera vez
- [ ] Onboarding wizard obligatorio (no skip step 0) — 2h
- [ ] Trial banner desde día 1 (cambiar `trialDaysRemaining <= 3` → `>= 0`) — 30min
- [ ] Modal "✓ Trial PRO activado por 14 días" post-onboarding — 1.5h

#### Jueves — Revenue leaks
- [ ] Enforcement límite admins por plan en `POST /api/users/invite` — 1.5h
- [ ] Quota IA por plan: throttle 20 req/mes en STARTER/EMPRESA — 2h
- [ ] Lead capture modal en calculadoras públicas (email → 14d trial PRO) — 2h

#### Viernes — UI polish
- [ ] Empty state `/trabajadores` con preview demo trabajador — 1.5h
- [ ] Empty state `/contratos` con sample IA-generado — 2h
- [ ] Honest copy en alertas planned ("Lista en Q3") — 30min

**Total**: 21h en 5 días. **Impacto esperado**: +15-25% conversión free→paid, +20% organic SEO, LCP -1.5s, sensación "producto vivo y polido".

### Comandos exactos para ejecutar mañana

```bash
# 1. SEO noindex páginas legales
# Editar src/app/(marketing)/legal/*/page.tsx
# Agregar: export const metadata = { robots: { index: false } }

# 2. Performance — analizar bundle
ANALYZE=true npm run build
# Identificar top 10 módulos más pesados

# 3. Server component dashboard
# src/app/dashboard/layout.tsx → quitar 'use client' del root
# Crear src/app/dashboard/_client-shell.tsx con la interactividad
```

---

## 📈 MÉTRICAS DE ÉXITO TRIMESTRAL

### Q2 2026 (Sprint actual)
- **MRR**: +30-40% ($X → $Y)
- **Conversión free→paid**: 8% → 15%
- **LCP /dashboard**: 3.5s → 2.0s
- **Organic search traffic**: +20%

### Q3 2026
- **NPS**: medirlo (probablemente 40-50, target 60+)
- **Cero datos mock visibles** en producción
- **DAU/MAU**: 25% → 35% (stickiness)

### Q4 2026
- **Diferenciadores únicos**: 5 → 8 (en marketing material)
- **Plan PRO conversión**: 5% → 12% del total paid

---

## ⚠️ RIESGOS

| Riesgo | Mitigación |
|---|---|
| **Buk decide priorizar compliance SUNAFIL** | Velocidad: clavar cuña con SUNAFIL-as-a-service ANTES de Q4 2026 |
| **Trial expiry abandonment >60%** | Email sequence robusto + ROI calculator |
| **Re-pricing genera churn de existentes** | Grandfather pricing 12 meses para clientes activos |
| **Performance regression al agregar features** | Lighthouse CI + budget por ruta |
| **A11y/legal compliance** | Audit axe + WCAG AA cada release |

---

## 🎯 DECISIÓN INMEDIATA REQUERIDA DEL FOUNDER

1. **¿Apruebas el re-pricing tier-up 20-30% para Q2?** Decide hoy, anuncia 30 días antes a clientes existentes con grandfather.
2. **¿Marketplace abogados sí/no en Q4?** Si no, libera 15 días de dev. Mi voto: **NO** (foco en producto core, no expansión horizontal).
3. **¿App móvil nativa o seguimos PWA?** PWA cubre 90% de casos. Móvil nativa solo si hay 50+ clientes pidiéndola explícitamente.

---

## 🚀 SI HAY QUE ELEGIR UNA SOLA INICIATIVA

**RICE 30000: `noindex` en páginas legales** (0.1 días, impacto outsized en SEO).
**RICE 3000: Lead capture en calculadoras + Schema.org** (5 días, multiplica el funnel).
**RICE 1800: Onboarding obligatorio** (0.5 días, +15% activación inmediato).

**Tres iniciativas de menos de 6 días con impacto monumental.** Si solo puedes una, anda con la #1 mañana.

---

*Plan vivo — actualizar trimestralmente con métricas reales.*
