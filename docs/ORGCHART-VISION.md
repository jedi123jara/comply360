# El Organigrama perfecto de Comply360 — visión + plan

> Síntesis de 3 lentes expertas (RRHH diario · oficial de cumplimiento SUNAFIL ·
> diseñador de interacción clase Linear/Figma) + el review de 60 hallazgos + lo
> implementado en jun-2026. Esta es la hoja de ruta de "v2 actual → organigrama perfecto".

---

## La visión en una frase

> **Un organismo legal vivo que esculpes con las manos:** cada gesto sobre el lienzo
> (arrastrar, soltar, editar) cambia la realidad de la empresa al instante, encadena sus
> consecuencias legales solo, te avisa en cristiano si rompes cumplimiento, y el día que
> toca SUNAFIL imprimes el expediente firmado en 3 minutos.

No es un Lucidchart con colores. Es la única estructura del mercado peruano donde **mover
una caja = mover a una persona, generar su adenda, recalcular el riesgo en soles y dejar
rastro firmado** — sin abrir otra pantalla.

## Las 3 verdades (los pilares)

1. **Es la fuente de verdad operativa** (lente RRHH). Un ingreso, una promoción, un cese o
   armar un comité se hacen en **menos de un minuto**, hablando de *personas y cargos* (no
   de "nodos" ni "assignments"), y el organigrama queda **solo en cumplimiento** al hacerlo.

2. **Es un activo legal probatorio** (lente Compliance). Cada color del heatmap tiene un
   **monto en soles** detrás. Un rol no está "en regla" por existir: necesita **responsable +
   acta firmada + vigencia + persona activa**. Y existe un botón **"Preparar para inspección"**
   que arma el expediente defendible (snapshot SHA-256 + actas + base legal + Auditor Link).

3. **Se manipula directamente y nunca da miedo** (lente Diseño). Todo es **optimista** (se
   pinta antes de que el servidor responda) y **reversible** (`Cmd+Z` universal). La
   **animación es información** (un nodo que se desliza cambió de jefe; un borde que vira de
   color perdió cobertura). **Cero controles muertos.** 60fps con 300+ nodos.

## Cómo se siente (un lunes cualquiera)

Entras y no esperas: el árbol ya está encuadrado, el heatmap respira. Pasas el mouse y la
línea de mando se ilumina sola. Arrastras un cargo hacia su nuevo jefe: el destino se
resalta con un anillo, una línea fantasma dibuja el reporte nuevo, sueltas y los nodos se
deslizan a su lugar mientras el color del área **recalcula en vivo** — abajo, un toast
discreto: *"Producción ahora reporta a Operaciones · Deshacer"*. No abriste ningún modal.

Asciende un supervisor: clic derecho → "Promover", y el panel te dice en cristiano *"pasa
a banda S/3,200–3,800, deja vacante su cargo, hay que generar adenda y actualizar su MOF"*
— un clic y la adenda queda en borrador para firma. Cesas a alguien que era Presidente del
Comité SST y el sistema **no te deja seguir en silencio**: *"el comité se queda sin
presidente, observable por SUNAFIL"* + te ofrece reemplazo ahí mismo. Arriba a la izquierda,
la exposición baja de **S/ 84,700 a S/ 71,200**. Y si mañana llama SUNAFIL, presionas
**"Preparar para inspección"** y tienes el dossier firmado listo.

---

## 🔌 La columna vertebral: integración con la plataforma

**Diagnóstico (investigación de 4 agentes, jun-2026):** el organigrama era una **isla**.
Dos representaciones del MISMO dato, **"write-isolated"**, que nunca se hablaban:

| Dato | Trabajadores/planilla | Organigrama | ¿Sync? |
|---|---|---|---|
| Puesto / área | `Worker.position` / `department` (texto) | `OrgAssignment → OrgPosition → OrgUnit` | ❌ |
| Sueldo | `Worker.sueldoBruto` (real) | `OrgPosition.salaryBand` (banda) | ❌ |
| Estado | `Worker.status` / `fechaCese` | `OrgAssignment.endedAt` | ❌ |

Existe un **event-bus** (pub/sub tipado) pero está apagado por flag y sus handlers solo
**notifican** (push/webhook), ninguno **propaga estado**. `worker.terminated` está definido
pero nunca se emite.

**Diseño:** una **capa única de propagación** por la que pasa cualquier cambio (venga del
organigrama o de Trabajadores), espejando `Worker` ↔ `OrgAssignment` + contrato/adenda +
alertas. Fuente del sueldo = `Worker.sueldoBruto` (la banda valida, no compite).

**Implementado (Fase 1A, en curso):**
- ✅ **Cesar/eliminar un trabajador cierra su `OrgAssignment`** (`endedAt`) → mata el "asiento
  fantasma" que mantenía el cargo ocupado y bloqueaba al reemplazo. (`closeWorkerOrgAssignments`)
- ✅ **Asignar el cargo titular en el organigrama espeja `Worker.position/department`** → el
  perfil/planilla/filtros reflejan el organigrama, cero doble digitación. (`mirrorPrimaryAssignmentToWorker`)
- ⏳ **Pendiente:** mover puesto desde Trabajadores → mover la `OrgAssignment`; encender el
  event-bus + eventos de dominio + sync handlers; reconciliar sueldo (validar contra banda);
  nuevo trabajador entra al organigrama; suspensión → badge en el nodo; servicio compartido
  `applyWorkerChange` para promoción/cese guiados desde el organigrama.

Helper: `src/lib/orgchart/worker-sync.ts`.

---

## El plan por fases

### ✅ Fase 0 — Cimientos (hecho en esta sesión)
Drag-to-reparent (anti-ciclo), hover ilumina la línea de mando, nodos se deslizan al cambiar
de layout, Escape en cascada, command palette como centro de mando, animaciones de paneles,
ErrorBoundary, limpieza de dead-code.

### 🆕 Pedidos del fundador (jun-2026)
- ✅ **Pantalla completa**: botón que oculta el chrome del dashboard (sidebar+topbar) para
  dar más espacio al canvas. *(hecho)*
- ⏳ **Panel de Trabajadores (roster dockable)**: panel lateral con TODOS los trabajadores,
  **filtros** (Con puesto · Sin puesto · por Área · búsqueda) y **arrastrar un trabajador al
  canvas para asignarlo** a un cargo (drop-on-node → POST assignments, que ya espeja a Worker).
  Es el "modo operativo de RRHH" de la lente #1. *(siguiente build enfocado: panel + filtros,
  luego HTML5 drag + canvas onDrop con screenToFlowPosition)*

### 🥇 Fase 1 — Manipulación directa sin miedo (*"tocar = cambiar"*)
La base de la sensación. Hace que el lienzo se sienta **vivo**.
- **Undo/redo universal** (`Cmd+Z` / `Cmd+Shift+Z`) + toast "Deshacer" en cada cambio. *(la base: arrastrar deja de dar miedo)*
- **Edición inline**: doble-clic en el título → renombrar en sitio; reasignar ocupante sin modal.
- **Optimistic updates en TODO el CRUD** (hoy solo el reparent lo es) → todo se siente del mismo material rápido.
- **Drag pulido**: anillo en el destino + línea fantasma + rebote rojo animado al intentar un ciclo.
- **Menú contextual con verbos de RRHH** (clic derecho: Asignar · Promover · Reemplazar · Dar de baja · Designar responsable · Marcar crítico).
- **Plegar/desplegar ramas** con contador "+12" animado.
- **Matar `window.prompt`** → SnapshotModal propio.

### 🥈 Fase 2 — Cumplimiento vivo (*el diferenciador*)
Convierte la estructura en cumplimiento cuantificado y siempre presente.
- **Conectar la Lente** (hoy es un control muerto): SST / Vacantes / Cumplimiento / MOF re-tintan el árbol en vivo. "La misma estructura, otra verdad encima."
- **Exposición legal en soles** (Legal Exposure Meter): cada brecha del Org Doctor → multa SUNAFIL en S/ (escala D.S. 019-2006-TR por tamaño). Pasa de "score 62" a "S/ 84,700".
- **Panel "Estado de inspección"**: readiness por comité/rol en 4 columnas (designado · acta firmada · vigencia · persona activa). Siempre visible, no en un modal.
- **Completar el AI Org Doctor** (hoy placeholder): findings accionables con "Ir al nodo" + "Crear tarea".
- **Tarjeta de comité como órgano vivo**: paridad, votación, mandato 24 meses, acta — preventivo, no reactivo.
- **Bloqueo de cumplimiento** en cese/movimiento riesgoso (te avisa qué se rompe + ofrece el arreglo).

### 🥉 Fase 3 — Flujos de RRHH de una pasada (*la fuente de verdad operativa*)
Una tarea = un gesto, con todas sus consecuencias legales encadenadas.
- **Cese guiado**: detecta rol legal/cargo crítico → reemplazo + liquidación + documentos de cese.
- **Promoción/cambio de cargo** con impacto en vivo (banda salarial, vacante, adenda, MOF) ejecutado de un golpe.
- **Asistente de comités**: sugerencia paritaria desde la planilla + validación de quórum + acta de instalación.
- **Buscador de personas inteligente**: rankea candidatos sensatos, advierte "ya asignado" / "cesado".
- **Acta vinculada y verificada por rol** (reusa el auto-verify IA del legajo): sin acta, el rol está "designado pero indefendible".

### 🏅 Fase 4 — El momento "valió la plata" (*blindaje SUNAFIL*)
- **Botón "Preparar para inspección"** → Dossier PDF firmado (estructura + responsables + actas + hash) + Auditor Link con tour. *El expediente que costaba 3 días de estudio jurídico, en 3 minutos.*
- **Priorizador de subsanación voluntaria**: ordena brechas por "soles ahorrados si subsanas hoy" (el -90% del art. 40 Ley 28806) con countdown.
- **Línea de tiempo de defensa**: Time Machine con lente legal ("¿el comité estaba vigente en la fecha del accidente?").
- **Detector de comité de fachada**: cruza orphaned + votación + paridad → "3 de tus 4 comités no resistirían inspección".

### ✨ Fase 5 — Pulido de clase mundial (*"se siente mágico"*)
- **Spotlight de navegación**: Cmd+K / inspector → el canvas hace pan+zoom suave + pulso de halo al nodo.
- **Onboarding por gesto**: 3 coach-marks la primera vez ("arrástrame", "doble-clic para renombrar", "⌘K para todo").
- **Micro-física consistente**: una sola curva de spring, un lenguaje de elevación/halo en todo.
- **Empty state con 3 caminos** reales (IA · planilla · plantillas).
- **Performance 60fps** (300+ nodos), mobile, accesibilidad, safe-area iOS.

---

## Trampas a evitar (de las 3 lentes)
- **Cero controles muertos** (la Lente que no re-tinta, un botón sin efecto). Erosiona la confianza más que una feature ausente.
- **No modal para microcambios** (renombrar ≠ 4 clics). El modal es para formularios legales complejos.
- **`Designado ≠ cumplido`**: pintar verde un comité de fachada (presidente renunciado, mandato vencido) es darle al cliente una falsa sensación que SUNAFIL destroza.
- **No inventar montos de multa** sin calibrar por tamaño/régimen. Un rango honesto > un número falso preciso.
- **Optimismo a medias se siente como bug**: si arrastrar es instantáneo pero crear tiene parpadeo, rompe la ilusión.
- **No doble digitación**: lo que ya está en la planilla, no se vuelve a escribir.
- **Animación sin significado** es ruido. Cada transición responde "¿qué pasó y por qué?".

---

## Recomendación de arranque
Empezar por la **Fase 1** — es la que más se *siente*, construye directo sobre el drag/hover/
animaciones de hoy, y `Cmd+Z` + edición inline + menú contextual son la base sobre la que
todo lo demás se vuelve seguro de usar. Dentro de la Fase 1, el orden sugerido:
**1) Undo/redo + Deshacer** (desbloquea el "sin miedo"), **2) menú contextual con verbos**,
**3) edición inline**, **4) plegar/desplegar**, **5) drag pulido**, **6) SnapshotModal**.
