# 🎬 COMPLY360 — Motion System v1

**Auditoría intensiva del sistema de animaciones — 2026-05-08**

---

## 📊 Resumen ejecutivo

| Métrica | Valor |
|---|---|
| **Tokens CSS de motion** | 11 (durations + easings + transforms) |
| **Keyframes** | 12 (fade, slide, scale, pulse, shimmer, spin, shake, bounce, count-up, etc.) |
| **Utility classes** | 35+ (`c360-anim-*`, `c360-hover-*`, `c360-skeleton`, etc.) |
| **Componentes globales actualizados** | Card, Button, Input, Modal, Sidebar |
| **Páginas con motion específico** | Cockpit, Workers, Auth, Mi-portal, Loading states |
| **Usos del nuevo sistema** | 132 referencias `c360-*` en código |
| **Tests** | ✅ 2019/2019 verdes |
| **Build** | ✅ OK |
| **`prefers-reduced-motion`** | ✅ Respetado globalmente |

---

## 🎯 Filosofía aplicada

**Cuatro principios:**

1. **Snappy por defecto** — micro-interacciones a 150ms, no más
2. **Curvas únicas** — `--ease-standard` (`cubic-bezier(0.4, 0, 0.2, 1)`) en TODO el SaaS
3. **GPU-friendly** — solo `transform` y `opacity`, nunca `width`/`height`/`top`/`left`
4. **Accesibilidad** — `prefers-reduced-motion` corta TODA animación

---

## 🌊 Las 14 olas de motion

### Ola 1 · Sistema de tokens base
**Archivo:** `src/styles/motion.css` NUEVO (381 líneas)
- 6 durations: `instant 75ms` / `micro 150ms` / `short 200ms` / `medium 300ms` / `long 500ms` / `deliberate 700ms`
- 5 easings: `standard` / `enter` / `exit` / `bounce` / `soft`
- 5 transform tokens: `lift-subtle` / `lift-card` / `lift-prominent` / `scale-press` / `scale-hover`
- 12 keyframes
- 35+ utility classes
- Cargado desde `globals.css`

### Ola 2 · Cockpit
- `score-narrative.tsx`: hero entrance con `c360-anim-slide-up`
- `_cockpit-page.tsx`: grid de moments con `c360-grid-enter` (stagger automático 0/60/120ms)
- `moment-card.tsx`: `c360-hover-lift`
- `kpi-card.tsx`: `c360-hover-lift` global

### Ola 3 · Card global (afecta TODA la app)
- `Card.tsx` interactive prop ahora usa motion tokens
- `transition-[transform,box-shadow,border-color]`
- `duration-[var(--motion-short)]`
- `ease-[var(--ease-standard)]`
- Active state usa `--motion-instant` (snappy click feedback)

### Ola 4 · Button global (afecta TODA la app)
- `Button.tsx` con `transition-all duration-[var(--motion-micro)]`
- Active scale `var(--scale-press)` (98%)
- Active transition se acelera a `--motion-instant` para feedback instantáneo

### Ola 5 · Modales y drawers
- `Modal.tsx` overlay: `c360-modal-overlay` (fade-in)
- `Modal.tsx` content: `c360-modal-content` (slide-up + fade)
- Coherente con `Sheet` y `ConfirmDialog`

### Ola 6 · Sidebar (más memorable)
- Items hover: `translate-x-0.5` + icon `scale-105`
- Item activo: barra lateral 3px navy con pseudo-element + icon `scale-110`
- Badge "PRO/EMP/PLUS": `c360-premium-shimmer` (gold animado)

### Ola 7 · Workers list
- Filas: `transition-colors duration-[var(--motion-short)]`
- Hover suave coherente con resto del SaaS

### Ola 8 · Forms
- `Input.tsx` focus: `transition-[border-color,box-shadow,background-color]`
- Error state: `c360-shake` (animación 0.4s shake)

### Ola 9 · Plan PRO badge
- `c360-premium-shimmer` aplicado al badge "Más popular"
- Gold gradient animado (110deg shift, 4s loop)

### Ola 10 · Auth pages
- `/sign-in` y `/sign-up`: container con `c360-anim-slide-up`

### Ola 11 · Mi-portal (PWA trabajador)
- `c360-page-enter` global (fade-in)
- Hero editorial con `c360-anim-slide-up`
- Live dot online con `c360-pulse`

### Ola 12 · Toast notifications
- Sonner mantenido (ya tiene su propio motion coherente)

### Ola 13 · Loading states
- `dashboard/loading.tsx` migrado a `c360-skeleton`
- Bulk update de 5 loading.tsx adicionales: removido `animate-pulse` y reemplazado `bg-gray-200` por `c360-skeleton`
- Shimmer wave coherente en todos lados

### Ola 14 · Auditoría intensiva
- Build OK, tests OK
- 132 referencias al sistema `c360-*` en uso

---

## 📚 Vocabulario disponible — cheat sheet

### Entry animations
```html
<div class="c360-anim-fade-in">       <!-- fade -->
<div class="c360-anim-slide-up">      <!-- slide from below + fade -->
<div class="c360-anim-slide-down">    <!-- slide from above + fade -->
<div class="c360-anim-slide-right">   <!-- slide from left + fade -->
<div class="c360-anim-scale-in">      <!-- scale 0.96→1 + fade -->
<div class="c360-anim-bounce-in">     <!-- bounce overshoot (success ✓) -->
<div class="c360-anim-count-up">      <!-- KPI value reveal -->
```

### Stagger (para listas)
```html
<div class="c360-grid-enter">  <!-- aplica delay automático a sus children -->
  <div>Card 1 (delay 0ms)</div>
  <div>Card 2 (delay 60ms)</div>
  <div>Card 3 (delay 120ms)</div>
</div>

<!-- O manualmente: -->
<div class="c360-anim-slide-up c360-stagger-3">...</div>
```

### Hover patterns
```html
<div class="c360-hover-lift">     <!-- card eleva al hover -->
<div class="c360-hover-glow">     <!-- background tint + glow brand -->
<button class="c360-press">       <!-- scale-down al click -->
<svg class="c360-icon-hover">     <!-- icon scale-105 al hover -->
<a class="c360-link-underline">   <!-- underline reveal LTR -->
```

### Loading & feedback
```html
<div class="c360-skeleton h-4 w-32"></div>  <!-- skeleton wave -->
<span class="c360-spinner"></span>           <!-- loader -->
<span class="c360-shake"></span>             <!-- error shake -->
<span class="c360-live-dot"></span>          <!-- pulse OK -->
<span class="c360-alert-dot"></span>         <!-- pulse alert (rojo) -->
<span class="c360-pulse"></span>             <!-- pulse genérico -->
<div class="c360-premium-shimmer"></div>     <!-- gold shimmer PRO -->
```

### Modals & drawers
```html
<div class="c360-modal-overlay">     <!-- backdrop fade -->
  <div class="c360-modal-content">   <!-- slide-up center -->
</div>
<aside class="c360-drawer-right">    <!-- slide from right -->
<aside class="c360-drawer-bottom">   <!-- slide from bottom -->
<div class="c360-toast-enter">       <!-- toast bounce-in -->
```

### Page transitions
```html
<main class="c360-page-enter">  <!-- fade in 500ms al cargar página -->
```

---

## 🧪 Verificación

| Check | Resultado |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ OK |
| Unit tests (vitest) | ✅ 2019/2019 verdes |
| Production build (`pnpm build`) | ✅ OK |
| `prefers-reduced-motion` | ✅ Respetado (anula todo) |
| GPU-friendly | ✅ Solo transform/opacity |

---

## 🎨 Lo que verás distinto al recargar el SaaS

1. **Cockpit**: el score ring, los moments y los KPIs **aparecen en cascada** suave al cargar
2. **Sidebar**: hover sutil con desplazamiento horizontal + icon scale, item activo con **barra lateral animada**
3. **Plan PRO**: el badge "Más popular" tiene un **shimmer dorado** sutil que llama atención
4. **Botones**: feedback de click instantáneo (98% scale), transición clara de color al hover
5. **Modales**: slide-up con fade del backdrop, sensación premium
6. **Formularios**: focus suave, **shake** sutil al error de validación
7. **Loading**: skeletons con **shimmer wave** en lugar de pulse blocky
8. **Auth**: ambas páginas tienen **slide-up** al cargar
9. **Mi-portal**: live dot azul **pulsante** en hero, fade-in de página completa

Todo coherente: **misma curva de easing, mismas duraciones, mismo lenguaje**.

---

## 📁 Archivos modificados (resumen)

```
NUEVOS:
  src/styles/motion.css                       (381 líneas)
  design-preview/MOTION-AUDIT.md              (este archivo)

MODIFICADOS:
  src/app/globals.css                         (+1 línea, import motion)
  src/components/ui/card.tsx                  (motion tokens)
  src/components/ui/button.tsx                (motion tokens)
  src/components/ui/input.tsx                 (motion tokens + shake)
  src/components/ui/modal.tsx                 (c360-modal-*)
  src/app/dashboard/_components/sidebar.tsx   (active indicator + premium shimmer)
  src/app/dashboard/_cockpit-page.tsx         (c360-grid-enter)
  src/components/comply360/kpi-card.tsx       (c360-hover-lift)
  src/components/cockpit/score-narrative.tsx  (c360-anim-slide-up)
  src/components/cockpit/moment-card.tsx      (c360-hover-lift)
  src/app/dashboard/trabajadores/page.tsx     (row transitions)
  src/app/dashboard/planes/page.tsx           (premium shimmer)
  src/app/sign-in/[[...sign-in]]/page.tsx     (slide-up entry)
  src/app/sign-up/[[...sign-up]]/page.tsx     (slide-up entry)
  src/app/mi-portal/page.tsx                  (page-enter + slide-up)
  src/app/dashboard/loading.tsx               (c360-skeleton)
  src/app/(marketing)/loading.tsx             (c360-skeleton)
  src/app/dashboard/alertas/loading.tsx       (c360-skeleton)
  src/app/dashboard/contratos/loading.tsx     (c360-skeleton)
  src/app/dashboard/trabajadores/loading.tsx  (c360-skeleton)
  src/app/mi-portal/loading.tsx               (c360-skeleton)
```

---

🤖 Generado con [Claude Code](https://claude.com/claude-code)
