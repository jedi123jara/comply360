# Organigrama v2 — Plan de mejoras "dinámico, interactivo, fácil, perfecto"

> Revisión profunda multi-agente (7 agentes, ~60 hallazgos) del 2026-06-19.
> Objetivo del fundador: hacer el organigrama **dinámico, interactivo, fácil de
> manejar e interactuar, pulido hasta la perfección.**

Este doc es la fuente de verdad del trabajo. Marca lo implementado y el backlog
priorizado. Muchos ítems son **needs-visual-verification** (cambios de UI que hay
que ver en pantalla) o **risky** (pueden romper) — por eso se separan.

---

## 🧹 Cierre de backlog (rama `feat/organigrama-cierre-backlog`, PR #37) — 2026-06-20

Tras mergear a prod el módulo interactivo (#35) y el fix de preview deploys (#36),
se atacaron los ítems seguros del backlog en 4 lotes (sin schema ni migraciones).
Todos `tsc` 0 + `vitest run src/lib/orgchart` 160/160.

- **Lote 1** (`4b5e44c`): **C2** (modales crear cargo/área reaplican unidad
  preseleccionada al reabrir), **E5** (assign-worker/role comparten
  `useWorkersRosterQuery`), **F7** (mata slices muertos del store), **F5** (error
  del árbol amigable + Reintentar), **C3** (reparent usa snapshotId real).
- **Lote 2** (`9142147`): **E4** (indexa con Map O(n²)→O(n)), **B3** (command
  palette suma Lente + exports PDF/MOF/RIT), **B5** (quita spinner muerto).
- **Lote 3** (`094afa8`): **F3** (ModalShell a11y: focus-trap + role=dialog +
  aria-modal + restaurar foco), **A4** (empty state con 3 tarjetas reales),
  banda salarial en el inspector (chip Dentro/Bajo/Sobre banda, solo lectura).
- **Lote 4**: **B6** (vocabulario "Agregar nivel" → "Agregar área"), **F1**
  (safe-area-inset iOS en FAB + bottom-sheet), **B7** (hook `useClickOutside` +
  CreateMenu/MoreMenu/LensSelector cierran al click-fuera y con Escape; mata el
  `onBlur+setTimeout` frágil), **B2** (botón de Foco visible en el MoreMenu),
  **B4** (MoreMenu agrupado: Inteligencia / Histórico / Exportar / Gestión),
  **F2** (`useIsMobile` con tercer estado `undefined` → sin hydration mismatch
  ni flash canvas→lista en móvil).
- **Lote 5**: **B8** (tooltips Radix reales en botones icon-only: Search +
  MoreMenu del toolbar, LayoutSwitcher, DisplayModeSwitcher, AlertsButton —
  reusan `src/components/ui/tooltip.tsx`, visibles en touch, reemplazan el
  `title` nativo), **C4** (drag-to-close del bottom-sheet mobile revivido vía
  `<LazyMotion features={domMax}>` LOCAL al sheet — el provider global sigue en
  `domAnimation`, sin engordar el bundle), **F8** (el modo "grouped-by-area" era
  un alias de top-down con más espaciado; el label pasó de "Por proceso"
  —prometía clusters que no hace— al honesto **"Disperso"** + hint real). Nota:
  `useIsMobile` quedó con `useSyncExternalStore` (idiomático, sin warning de
  set-state-in-effect) y `useClickOutside` actualiza su ref en efecto.

**Ya estaba hecho (PR #35):** **B1** (AlertsButton montado, commit `2d8240d`).
**Deferidos (con razón):** **E3** (persistir viewport — la receta tocaba la
lógica de cámara/`fitView`, zona crash-prone; se evita), **F9** (auto-abrir
wizard — chocaría con el empty state nuevo de 3 tarjetas), **C1** (Importar
Excel — el *bug* original ya no existe: no hay botón roto; el backend
`import-excel` existe pero armar la UI es feature net-new, no cierre de bug),
**C5** (overlap radial — aun el "safe subset" de subir el radio es un tradeoff
visual que conviene ver en pantalla), **E1** (optimistic updates en
crear/asignar/eliminar — el recon lo marca riesgo ALTO en módulo crash-prone:
invalidaciones separadas tree/alerts + sin rollback visual; mantener bloqueante
es más seguro), **E2** (memoizar `runLayout` — toca el core del render del
canvas; riesgo ALTO sin verificación visual).

**Backlog que aún queda:** D1/D2/D3 (`risky`, ya cubiertos o opt-in), C5/E1/E2
(necesitan tu visto bueno por riesgo), y los `needs-visual` de la sección A.

---

## ✅ Implementado en esta sesión (rama `chore/code-quality-lint-cleanup`)

Todo verificado: `tsc` 0, 2043 tests verde. Commits:

1. **Exit-animations de Copilot y TimeMachine** — entraban con spring pero al cerrar
   desaparecían de golpe (el `if (!open) return null` estaba ANTES del `<AnimatePresence>`).
   Movido el gate adentro → ahora salen animados. + a11y (role/aria/autofocus/Escape) en
   el Copiloto. + dead-code (`void ChevronRight`, `AnimatePresenceWrapper` no-op, `useEffect`
   vacío). `[d390b59]`
2. **Canvas más directo** — fix del prop `dimmed` muerto (el focus mode dimeaba con un
   cambio brusco de opacity del wrapper; ahora se pasa por `data` → **fade suave** vía
   framer). `onPaneClick` → clic en el lienzo deselecciona y cierra el inspector. `fitView`
   ahora re-encuadra también al cambiar de modo (unidades↔cargos) y al aparecer el preview
   del Copiloto. Quitada la doble-selección de cargos. `[06a46c4]`
3. **Escape en cascada** — cierra el panel de mayor prioridad visible (palette → modal →
   copilot → timemachine → alertas → doctor → inspector). + quitado el atajo `k` suelto que
   abría el command palette por accidente al navegar. `[commit teclado]`
4. **ErrorBoundary alrededor del canvas** — un crash de render del organigrama ya no tumba
   todo `/dashboard`; muestra un fallback propio con "Reintentar". (Este módulo crasheó prod
   una vez — Mayo 2026.) + limpieza de tipos de modal/tab fantasma. `[commit boundary]`
5. **Limpieza de lint** previa (imports/vars sin usar). `[d57119e]`

---

## 📋 Backlog priorizado (lo que falta)

### A. Alto impacto — requiere verificación visual (hacer con el fundador mirando)

| # | Mejora | Archivos | Esfuerzo |
|---|---|---|---|
| A1 | **Animar las posiciones de nodos al cambiar de layout** (hoy saltan; solo el viewport anima). Interpolar con rAF o clase CSS `transition: transform` durante el switch. Es el momento "wow". | `org-canvas-v2`, nodos | M |
| A2 | **Animar entrada/salida del Inspector y Alerts drawer** (hoy aparecen/desaparecen de golpe; el inspector mobile SÍ anima — copiar ese patrón al desktop). | `organigrama-shell-v2`, `inspector-panel`, `alerts-drawer` | M |
| A3 | **Hover → resaltar línea de mando** (`onNodeMouseEnter/Leave` + edges conectadas iluminadas). Da lectura instantánea sin clics. | `org-canvas-v2`, `use-focus-set` | M |
| A4 | **Empty state con 3 tarjetas reales** (Crear con IA / Generar desde planilla / Plantillas) en vez de 1 botón + texto gris no-clicable. Priorizar "desde planilla" si hay trabajadores pendientes. | `organigrama-shell-v2` | M |
| A5 | **Conectar el selector de Lente** al render (hoy cambia estado pero NO afecta nada visible — parece roto). Mínimo: lente "Vacantes" resalta cargos vacantes. | `lens-selector`, `org-canvas-v2`, nodos | M |
| A6 | **Completar el AI Org Doctor del v2** (hoy es placeholder: solo score + conteos). Portar la lista de findings con "Ir al nodo" + "Crear tarea" (el patrón ya existe en el inspector tab Cumplimiento). | `organigrama-shell-v2`, `use-doctor-report` | L |
| A7 | **SnapshotModal** — reemplazar los `window.prompt()` nativos (feos) por un modal propio con ModalShell. | `organigrama-shell-v2`, `ui-slice`, `modals-container` | M |
| A8 | **AlertCard interactiva** — botones "Ver en organigrama" + "Crear tarea" (el DTO ya trae `affectedUnitIds` + `suggestedTaskTitle`). | `alerts-drawer` | M |

### B. Descubribilidad / "fácil de manejar" (mayormente safe)

| # | Mejora | Archivos | Esfuerzo |
|---|---|---|---|
| B1 | **Montar AlertsButton** (es dead-code bien hecho con badge de severidad por color) como botón de primer nivel; quitar el item redundante del MoreMenu. | `org-toolbar`, `alerts-button` | S |
| B2 | **Botón de Foco visible** en el toolbar (hoy solo existe como tecla F, invisible). | `org-toolbar` | S |
| B3 | **Expandir el command palette** con acciones de vista (layout, vista, modo, lente, foco, inspector, snapshot, exports) — hoy no las cubre. | `command-palette` | M |
| B4 | **Agrupar el MoreMenu** (20+ items planos) con headings: Inteligencia / Exportar / Gestión / Histórico. | `org-toolbar` | M |
| B5 | **Renombrar "Autoordenar" → "Reorganizar…"** (abre un modal, no autoordena) + quitar el spinner muerto (`reorganizeLoading` hardcodeado a false). | `org-toolbar`, `organigrama-shell-v2` | S |
| B6 | **Unificar vocabulario**: "Agregar nivel" → "Agregar área" (crea una unidad). Glosario: Área/Unidad + Cargo. | header/* | S |
| B7 | **Click-outside + Escape** consistente en los dropdowns (Lente/Agregar/MoreMenu usan `onBlur+setTimeout` frágil; MoreMenu no cierra al click-fuera). | `org-toolbar`, `lens-selector` | M |
| B8 | **Tooltips reales** (Radix) en botones icon-only (hoy `title` nativo, invisible en touch). | header/* | M |

### C. Bugs concretos (mayormente safe)

| # | Bug | Archivos | Esfuerzo |
|---|---|---|---|
| C1 | **"Importar Excel" abre un modal que no existe** (no-op silencioso). Crear `ImportExcelModal` (backend ya existe) o quitar el botón + el texto del empty state. | `org-toolbar`, `modals-container`, `ui-slice` | M |
| C2 | **create-position/create-unit pierden la unidad preseleccionada** (el preset solo se aplica al primer mount). Agregar `useEffect` on-open que sincronice. | `create-position-modal`, `create-unit-modal` | S |
| C3 | **Optimistic reparent invalida `treeKey(null)` ignorando el snapshotId activo** — inconsistencia de keys (mordió en prod). Centralizar la treeKey activa. | `org-canvas-v2`, `node-toolbar`, `use-reparent-position` | S |
| C4 | **El "arrastra para cerrar" del bottom-sheet mobile está muerto** — `drag` necesita `domMax` pero el provider usa `domAnimation`. Habilitar `domMax` local o quitar el grabber. | `mobile-inspector-sheet`, `motion-provider` | M |
| C5 | **radial-adapter**: con árboles grandes/desbalanceados las tarjetas se solapan (ilegible). Usar `d3.cluster` o separación por profundidad + anillos concéntricos. | `radial-adapter` | M |

### D. La gran interacción (risky — drag-and-drop)

| # | Mejora | Esfuerzo | Riesgo |
|---|---|---|---|
| D1 | **Drag-to-reparent real**: `nodesDraggable=true` + `onNodeDragStop` + `getIntersectingNodes` para soltar un nodo sobre su nuevo jefe (con `isValidConnection` anti-ciclo + halo de drop válido/inválido). Hoy solo se reorganiza conectando handles y solo en modo cargos. **LA interacción esperada de un organigrama.** | L | risky |
| D2 | **Expand/collapse de subárboles** (clic en chevron para plegar ramas). Hoy se renderiza todo el árbol siempre — inmanejable en 200+ trabajadores. `collapsedIds` en el store + filtro en `use-tree-to-flow`. | L | risky |
| D3 | **Edición inline** (doble-clic para renombrar un cargo; "Reporta a" como `<select>` en el inspector) en vez de modal pesado. | L | risky |

### E. Rendimiento (mayormente safe)

| # | Mejora | Esfuerzo |
|---|---|---|
| E1 | **Optimistic updates** en crear/asignar/eliminar (hoy spinner + roundtrip; solo el reparent por drag es optimista). No await-ear invalidaciones antes de cerrar el modal (copiar el patrón de `reorganize-hierarchy-modal`). | M–L |
| E2 | **Separar layout de mapeo de datos** — memoizar `runLayout` por clave estructural; actualizar solo `node.data` preservando `node.position` para no re-layoutear todo en cada refetch. | L |
| E3 | **Persistir el viewport** (zoom/pan) en el store — hoy cualquier cambio de vista reposiciona la cámara. | M |
| E4 | **Indexar con Maps** en `operationalSummary`/`buildUnitFlow`/búsqueda mobile (hoy `.find` dentro de loops = O(n²)). | S–M |
| E5 | **useWorkersQuery compartido** — `assign-worker` y `assign-role` refetchean `/api/workers?limit=500` con fetch crudo en cada apertura. | M |

### F. Mobile / a11y / polish (mayormente safe)

| # | Mejora | Esfuerzo |
|---|---|---|
| F1 | **safe-area-inset** para FAB + bottom-sheet en iPhone (hoy se solapan con el home indicator). | S |
| F2 | **useIsMobile** sin guard de hidratación → flash al montar canvas en móvil y saltar a lista. Tercer estado `undefined`. | S |
| F3 | **ModalShell a11y** — `role=dialog`, `aria-modal`, focus-trap, restaurar foco (beneficia a los 18 modales). | M |
| F4 | **Forms con Enter** — envolver modales en `<form onSubmit>` (hoy solo onClick). | M |
| F5 | **Error del árbol amigable** — hoy vuelca `String(error)` crudo; poner empty-state + "Reintentar". | S |
| F6 | **Dedup `severityFromGlobal`** mobile (reusar `toneFromScore` del agregador). + ojo: `TONE_COLOR_HEX.success` es `#2563eb` (azul) con comentario `// emerald-500` (inconsistente). | S |
| F7 | **Slices muertos** — `drafts-slice` (dirtyChanges, pushDirty…), `multiSelectIds`, `canvasMode` están definidos pero nunca se usan. Cablear `canvasMode` (modo presentación/what-if) o eliminar. | S |
| F8 | **grouped-by-area** es un alias de top-down (promete clusters por área, no los hace). Implementar clustering real o renombrar/quitar. | M |
| F9 | **Auto-abrir el wizard** para orgs vacías (hoy depende de descubrir un botón) + paso final del wizard con acciones reales. | S–M |

---

## Notas de implementación

- **El módulo crasheó prod una vez** (Mayo 2026, `/dashboard`, revertido). Validar todo en
  un preview deploy antes de mergear a `main`. El ErrorBoundary nuevo (✅) mitiga, pero no
  reemplaza la verificación visual.
- El provider de framer usa `LazyMotion features={domAnimation}` → **`drag` y `layout`
  projection NO están disponibles** globalmente (afecta C4 y A1).
- Stack: `@xyflow/react` 12, Dagre, d3-hierarchy, Zustand, react-query. Ver `docs/ORGCHART-V2.md`.
