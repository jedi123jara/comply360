# 🎨 COMPLY360 — Rebrand Blue Authority v4

**Auditoría intensiva de las 13 olas — 2026-05-08**

---

## 📊 Resumen ejecutivo

| Métrica | Antes | Después |
|---|---|---|
| **Brand color** | Esmerald `#10b981` | Navy `#1e3a8a` + Brand blue `#2563eb` |
| **Acento premium** | Gold subtle (3 tonos) | Gold expandido (8 tonos para PRO) |
| **Success state** | Mismo brand (verde) | Verde nativo `#16a34a` (separado del brand) |
| **Tests** | 2019 verdes | **2019 verdes** ✅ |
| **TypeScript** | OK | **OK** ✅ |
| **Build prod** | OK | **OK** ✅ |
| **Hex verdes residuales** | 223+ | **0** ✅ |
| **Refs `teal-*` (no WA)** | 25+ | **0** ✅ |
| **Refs `emerald-*`** | 2962 (verde) | 2760 (ahora **navy**) |
| **Refs `gold-*`** | ~30 | 99 (premium reforzado) |

---

## 🌊 Las 13 olas — completadas

### Ola 1 · Tokens base (afecta TODO por cascada)
**Commit:** `e74ea65`
- `tokens.css`: namespace `--emerald-*` ahora contiene la rampa **NAVY/BLUE AUTHORITY** (`#eff6ff` → `#172554`).
- Mantenido el nombre `emerald` por compat — las 2962 utilidades Tailwind cambian automáticamente sin tocar componentes.
- Nuevos alias semánticos: `--brand-*` (50–900) para código moderno.
- Gold expandido a 8 tonos (50–700) para acento premium PRO.
- `--color-success` → verde nativo `#16a34a` para no confundirse con brand.
- 64 archivos con hex hardcoded migrados (`#10b981` → `#2563eb`, etc.).

### Ola 2 · Layout shell
**Commit:** `758ea81`
- `sidebar.tsx`: badge "PRO" / "EMP" / "PLUS" ahora usa **gold gradient** en lugar de emerald gradient. Refuerza el split semántico: navy = brand, gold = premium.

### Ola 3 · Cockpit (`/dashboard`)
**Commit:** `d9dea93`
- `calendar-widget.tsx`: badge `VACATION` `bg-teal-50 text-teal-700` → `bg-sky-50 text-sky-700` (alinea con paleta A, mantiene contraste).

### Ola 4 · Workers
**Commit:** `2a50834`
- Cascada automática vía tokens. Lista, perfil 8 tabs, alta, import, importar-pdf — todos los emerald son ahora navy.
- Success states (`text-green-500` para "✓ validado") preservados en verde.

### Ola 5 · SST hub + 17 sub-páginas
**Commit:** `9cb4bd3`
- Cascada automática. `IPERC base`, accidentes, EMO, sedes, comités, visitas, etc. — todos cambian a navy via tokens.

### Ola 6 · Calendario + Alertas + Reportes
**Commit:** `761faed`
- 3 archivos con hardcoded `teal-*` migrados a `sky-*`:
  - `calendario/page.tsx`: badge VACACIONES (5 props teal→sky)
  - `alertas/page.tsx`: categoría CTS (2 ocurrencias)
  - `reportes/page.tsx`: card "Costos Laborales" (4 props)

### Ola 7 · Diagnóstico + Simulacro + IA
**Commit:** `edcb04a`
- Cascada automática via tokens. Copilot drawer, diagnóstico wizard, simulacro 4-pasos — coherentes.

### Ola 8 · Denuncias
**Commit:** `c9cace6`
- Cascada automática. `/dashboard/denuncias`, `/denuncias/[slug]` público — coherentes.

### Ola 9 · Configuración + Planes + Onboarding
**Commit:** `9bd21e6`
- `planes/page.tsx`: ya usaba `gold` para Plan PRO ⭐ — perfectamente alineado con paleta A "navy + gold".

### Ola 10 · Portal del Trabajador (mi-portal)
**Commit:** `66a8a4a`
- `mi-portal/calendario/client.tsx`: VACATION badge teal → sky.
- 9 referencias `emerald-*` en `mi-portal/asistencia/page.tsx` ahora son navy via tokens.

### Ola 11 · Auth + Landing pública
**Commit:** `2e7c0ec`
- `sign-in`/`sign-up`: botones primary y focus ring ahora navy (cascadeado).
- Landing `(marketing)/`: logo "COMPLY**360**" — el "360" se ve **navy** por la cascada de tokens.

### Ola 12 · Emails + PDFs
**Commit:** `8eec3c1`
- `pdf/react-pdf/theme.ts`: paleta refinada y ampliada — `primary: #1e3a8a` (navy), `accent: #2563eb` (brand blue), `premium: #b45309` (gold dark), `success: #16a34a` (verde nativo).
- `scoreSemantic` ahora usa **verde nativo** para "OK ≥80%" en vez de brand blue.
- Email templates ya usaban `BRAND_BLUE = '#1e3a6e'` desde antes — coherentes sin cambios.

### Ola 13 · Auditoría intensiva final
**Commit final** (este)
- 7 archivos limpiados de remanentes `teal-*`:
  - `costo-empleador/page.tsx`
  - `gamificacion/page.tsx`
  - `organigrama/_v2/canvas/nodes/unit-node.tsx`
  - `organigrama/_v2/shell/organigrama-shell-v2.tsx`
  - `benchmark-sectorial.tsx`
  - `getting-started-guide.tsx`
  - `portal-empleado/page.tsx`

---

## 🔍 Auditoría intensiva — resultados

### ✅ Limpieza confirmada

```
Hex codes verdes hardcoded residuales:        0
Tailwind teal-* (excluyendo WhatsApp):        0
Tailwind lime-* o mint-*:                     0
Gradients from-green-* to-emerald-*:          0
```

### 📦 Inventario actual del codebase

```
Refs emerald-* (ahora navy via tokens):    2760  ← brand cascadeado
Refs green-* (success states):              348  ← verde nativo (correcto)
Refs gold-* (premium PRO):                   99  ← acento secundario
Refs sky-* (vacaciones, info):              ~50  ← reemplazo de teal
Refs blue-* (alias del brand):              ~80  ← coherente
```

### ⚠️ Excepciones documentadas (intencionales)

| Componente | Color | Razón |
|---|---|---|
| `floating-wa.tsx` | `bg-green-600` (WhatsApp) | Brand de tercero (WhatsApp). NO tocar. |
| `import-wizard.tsx` | `text-green-500` (✓ válido) | Success state, no brand. |
| `trabajadores/page.tsx` | `bg-green-500` (legajoScore ≥70) | Indicador de salud, no brand. |
| `gamificacion/page.tsx` | `text-emerald-500` "Platino" | Ahora navy (cascadeado), nivel premium. |

---

## 🎯 Mapeo de la paleta aplicada

### Brand Navy (`emerald-*` namespace)
```css
--emerald-50:  #eff6ff   /* fondo card info, badges suaves */
--emerald-100: #dbeafe   /* tints, hover states */
--emerald-200: #bfdbfe   /* borders suaves */
--emerald-300: #93c5fd   /* ilustraciones */
--emerald-400: #60a5fa   /* accent claro */
--emerald-500: #2563eb   ← CTA principal, links activos
--emerald-600: #1d4ed8   ← CTA hover, botón primary hover
--emerald-700: #1e40af   /* navy strong, headings */
--emerald-800: #1e3a8a   ← Navy authority — hero band, modal headers
--emerald-900: #172554   /* deep navy — overlays, gradient end */
```

### Gold Premium (acento PRO)
```css
--gold-50:  #fefce8
--gold-100: #fef9c3
--gold-200: #fef08a
--gold-300: #fde047
--gold-400: #facc15
--gold-500: #d4a853   ← gold subtle (badges, sellos)
--gold-600: #b45309   ← gold dark (texto sobre claro, plan PRO)
--gold-700: #92400e   /* gold deep — sello compliance certificado */
```

### Success Green (semántico, NO brand)
```css
--success-green-50:  #f0fdf4
--success-green-100: #dcfce7
--success-green-500: #22c55e   ← checks, "OK", "vigente"
--success-green-600: #16a34a   ← `--color-success` (text)
--success-green-700: #15803d
```

---

## 🧪 Verificación

| Check | Resultado |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ OK |
| Unit tests (vitest) | ✅ 2019/2019 verdes |
| Production build (`pnpm build`) | ✅ OK |
| Static export | ✅ Sin errores |

---

## 📁 Archivos modificados (resumen)

```
Ola 1  →  65 files (tokens cascade + 64 hex hardcoded)
Ola 2  →   1 file  (sidebar premium badge)
Ola 3  →   1 file  (cockpit calendar widget)
Ola 6  →   3 files (calendario, alertas, reportes)
Ola 10 →   1 file  (mi-portal calendario)
Ola 12 →   1 file  (PDF theme)
Ola 13 →   8 files (limpieza final teal residual)
─────────────────────
Total:    80 files cambiados
```

---

## 🚀 Próximos pasos sugeridos

1. **Browser test manual** — Abre el dashboard y navega:
   - Cockpit → KPIs deben verse navy con score badges en colores semánticos
   - Sidebar → Plan PRO debe verse en gold
   - Trabajadores → Lista coherente, sin verdes residuales
   - SST → IPERC matrices, accidentes, comité — todo navy
   - Mi-portal → Botón "Firmar con huella" navy, badges sky para vacaciones
   - Reportes PDF — Generar uno y verificar paleta

2. **Si algo se ve raro** después del browser test, dime el componente y la pantalla y lo ajusto.

3. **Eventual**: rename `--emerald-*` → `--brand-*` en una ola futura (deuda técnica baja, namespace legacy mantenido por compat).

4. **Considerar**: actualizar el favicon, OG image y logo SVG para reflejar el nuevo brand navy.

---

🤖 Generado con [Claude Code](https://claude.com/claude-code)
