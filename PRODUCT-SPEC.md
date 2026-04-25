# COMPLY360 — Product Spec: Cómo debería funcionar

> **Lo que sigue es cómo DEBERÍA funcionar el producto cuando esté al nivel "top top"**.
> No es cómo funciona hoy. Es el north star — cada decisión de producto, cada ticket de
> diseño, cada review de código debería poder pasarse por este documento y responder
> la pregunta "¿acercó o alejó del ideal?".
>
> Hermano de:
> - [VISION.md](./VISION.md) — estrategia de negocio
> - [CLAUDE.md](./CLAUDE.md) — plan maestro técnico
> - [ARCHITECTURE.md](./ARCHITECTURE.md) — guía de ingeniería

---

## Índice

1. [Filosofía del producto](#1-filosofía-del-producto)
2. [Los 4 roles y a dónde los manda el sistema](#2-los-4-roles)
3. [El visitante anónimo — landing + marketing](#3-visitante-anónimo)
4. [Signup y primer login](#4-signup-primer-login)
5. [Worker: Mi Portal](#5-worker-mi-portal)
6. [Org Owner / Admin: Dashboard](#6-org-owner-dashboard)
7. [Consultor: Dashboard multi-empresa](#7-consultor-dashboard)
8. [Super Admin: Founder Console](#8-super-admin-founder-console)
9. [El Copilot IA — cómo se debería sentir](#9-copilot-ia)
10. [Notificaciones y emails](#10-notificaciones-emails)
11. [Mobile y PWA](#11-mobile-pwa)
12. [Estados críticos](#12-estados-críticos)
13. [Accesibilidad](#13-accesibilidad)

---

## 1. Filosofía del producto

Todo lo que sigue deriva de cinco principios. Si algo en el producto los viola,
está mal diseñado — sin importar qué tan funcional sea.

### Principio 1 — "El cliente no llega a aprender, llega a resolver"

Nadie entra a Comply360 porque le gusta el software. Entra porque tiene un dolor
(miedo a SUNAFIL, CTS por depositar, un cese difícil) y necesita resolverlo YA.

**Consecuencia operativa**:
- **Nunca** mostramos el producto "vacío y entero" — siempre guiamos la próxima acción.
- **Nunca** pedimos configuración antes de mostrar valor — primero la calculadora, después los ajustes.
- **Nunca** usamos jerga técnica ("legajo digital" está bien, "score de completitud" está bien, "API endpoint" no).

### Principio 2 — "Cada pantalla tiene UNA sola cosa importante"

Una pantalla con 12 botones del mismo tamaño es una pantalla con cero dirección.

**Consecuencia operativa**:
- Un CTA primario visible (verde esmeralda), el resto secundario.
- Cuando hay múltiples acciones, hay jerarquía visual clara.
- La información no crítica se esconde detrás de "ver más" o tabs.

### Principio 3 — "Honesto > Inteligente"

La IA a veces se equivoca. La ley cambia. Los cálculos tienen supuestos.

**Consecuencia operativa**:
- Cada cálculo muestra la fórmula Y la base legal.
- La IA cita la norma específica — si no puede, dice "no tengo certeza, consultá a un abogado".
- Los scores muestran cómo se calcularon ("tu 72/100 es: SST 60, contratos 85, ...").
- Nunca inventamos confianza falsa.

### Principio 4 — "Móvil es primero para el worker, desktop para el admin"

El trabajador usa el celular 100% del tiempo. El contador/dueño de PYME usa la
laptop 80% del tiempo.

**Consecuencia operativa**:
- `/mi-portal/*` se diseña para 375px de ancho primero, crece a 1024px.
- `/dashboard/*` se diseña para 1440px primero, se adapta a 375px sin romper.
- `/admin/*` es desktop-first casi siempre — founder usa laptop.

### Principio 5 — "Velocidad como feature"

Un cálculo que tarda 3 segundos se siente quebrado comparado con Excel local.

**Consecuencia operativa**:
- Cualquier cálculo: < 500ms.
- Cualquier navegación entre páginas ya visitadas: < 200ms (cache client-side).
- Carga inicial de cualquier página crítica (cockpit, worker profile, diagnóstico): < 2s en 4G.
- Los spinners son el último recurso. Primero skeletons. Primero optimistic updates.

---

## 2. Los 4 roles y a dónde los manda el sistema {#2-los-4-roles}

Cuando alguien hace login (o completa signup + onboarding), el sistema mira su
rol y lo redirige AUTOMÁTICAMENTE a su "home" correspondiente.

| Rol | Home por default | Puede acceder a |
|---|---|---|
| **SUPER_ADMIN** (founder + colaboradores invitados) | `/admin` — Founder Console | TODO el admin + puede impersonar cualquier org y ver su dashboard |
| **OWNER / ADMIN** (dueño de una empresa o admin delegado por el owner) | `/dashboard` — Cockpit de su empresa | Todo su dashboard · su mi-portal (si además es worker) · NADA de /admin |
| **MEMBER / VIEWER** (empleado de RRHH con acceso parcial) | `/dashboard` — Cockpit con permisos limitados | Lo mismo que admin pero con botones destructivos ocultos |
| **WORKER** (trabajador con cuenta personal) | `/mi-portal` — Su hub personal | Solo `/mi-portal/*` · nunca `/dashboard/*` · nunca `/admin/*` |
| **CONSULTOR** (contador o abogado con cartera) | `/dashboard/consultor` — Lista de empresas gestionadas | Dashboards de las N empresas que gestiona · `/dashboard/consultor` como home |

### La regla de oro de routing

**Un usuario que intenta acceder a una ruta que no le corresponde NUNCA ve un
403 plano. Siempre lo redirigimos a SU home con un toast explicativo.**

Ejemplo: un WORKER que intenta visitar `/dashboard/trabajadores` por curiosidad →
redirect a `/mi-portal` + toast "Esta sección es solo para administradores. Te
llevamos a tu portal".

### Switcher para roles múltiples

Un mismo usuario puede tener **dos roles a la vez** (el caso común: founder que
también es el admin de su empresa). Entonces aparece un **switcher en el topbar**
tipo "☰ Founder Console ⇄ Mi Empresa" que alterna el contexto.

---

## 3. El visitante anónimo — landing + marketing {#3-visitante-anónimo}

Este es el 95% del tráfico al principio. Nadie todavía es cliente. Todo tiene
que convencer.

### 3.1. `/` — Landing page

#### Qué ve en los primeros 5 segundos
- **Headline dominante**: "Tu escudo contra multas SUNAFIL" (o variante A/B probada).
- **Subheader**: "Compliance laboral completo para empresas peruanas. Diagnóstico, simulacro, IA y garantía anti-multa. Desde S/ 129/mes."
- **2 CTAs visibles**: "Calcular multa que me tocaría" (secundario, lead magnet) y "Probar gratis 14 días" (primario, signup).
- **Prueba social inmediata**: "+300 empresas peruanas nos usan" (cuando llegue ese número) o "3 de las 10 mineras más grandes" (cuando llegue).

#### Scroll hacia abajo
- **Sección "El problema"**: Trauma post-SUNAFIL cuantificado. "Una multa promedio en construcción civil = S/ 142,000. Evitala por S/ 129/mes."
- **Sección "Cómo funciona"**: 3 pasos visuales (Diagnóstico → Plan de acción → Cumplimiento).
- **Sección "Qué incluye"**: Grid de 6-8 features con íconos. Sin explicaciones largas — que hagan clic si quieren detalle.
- **Testimonios**: 3-4 clientes reales con foto, nombre, cargo, empresa, quote.
- **Comparación**: Tabla "Comply360 vs Excel vs Abogado externo" (ahorro anual calculado).
- **FAQ**: 6-8 preguntas típicas del mercado peruano.
- **CTA final**: "Probá gratis 14 días" + "Agendar demo con nuestro equipo".

#### Lo que NO debería verse
- Lista de "features" técnicos tipo "Soporte OAuth 2.0" — a la PYME peruana no le importa.
- "Logos" de tecnologías (Next.js, Supabase) — es posturear.
- Paredes de texto de más de 3 líneas seguidas.

### 3.2. `/calculadoras` — Hub de calculadoras públicas

**Propósito**: lead magnet de SEO. El cliente llega buscando "calcular CTS 2026" y
encuentra nuestra calculadora.

#### Qué ve
- Grid de 5-8 tiles (CTS, Gratificación, Liquidación, Vacaciones, Horas Extras, Multa SUNAFIL, Aportes, Renta 5ta).
- Cada tile muestra: ícono, título, frase de valor ("el depósito semestral"), base legal en monospace.
- Badge "Popular" en las 3 más buscadas.
- Footer de "Esto es solo el 5% de Comply360" con CTA a /planes.

#### Cada calculadora específica (`/calculadoras/cts`, etc.)
- **Hero**: "Calcula tu CTS gratis, sin registro" con subtítulo de base legal.
- **Form**: 5-8 campos máximo. Inputs numéricos con `prefix="S/"`. Fechas con calendario nativo mobile.
- **Resultado EN VIVO** (mientras el usuario escribe, no "Calcular" button):
  - Número grande del monto (ej: "S/ 2,349.17").
  - Breakdown con fórmula paso a paso.
  - Base legal citada al pie.
- **CTA contextual**: "¿Quieres el análisis completo de tu empresa? Regístrate gratis → calculas TODOS los workers a la vez, guardas histórico, recibes alertas."

#### Lo que NO debería pasar
- El CTA de signup tapando el resultado.
- Un loading state aunque el cálculo sea instantáneo (es matemática, no API call).
- Preguntar email ANTES del resultado.

### 3.3. `/planes` — Pricing page

#### Qué ve
- Hero "Un precio simple. Pagas lo que usas."
- Subhero cuantificado: "Un abogado te cobra S/ 3K-8K/mes por llevarte la planilla. Nosotros S/ 299."
- 4 cards de planes (STARTER / EMPRESA / PRO / ENTERPRISE) con EMPRESA destacado.
- Cada card: precio grande, tagline, 5-8 features con checks, CTA.
- ENTERPRISE dice "Hablar con ventas" (no self-serve).
- Sección "3 razones para elegirnos": trial 14 días, migración gratis, acreditación SUNAFIL.
- **FAQ extensa** — 6-10 preguntas cubriendo objeciones típicas:
  - ¿Puedo cambiar de plan?
  - ¿Incluye IGV?
  - ¿Qué pasa si cancelo?
  - ¿Tengo soporte?
  - ¿Hay descuento anual? (Sí: -15% pago anual adelantado).
  - ¿Acepta boleta o factura?
  - ¿Qué pasa con mis datos si me voy?
- CTA final grande de "Empezar prueba gratis".

#### Después del demo ideal
- Botón "Comparar planes lado a lado" abre una tabla detallada con scroll horizontal en móvil.
- ROI calculator: "Si evitas 1 multa al año, pagas Comply360 por los próximos 24 años".

### 3.4. `/diagnostico-gratis` — Lead magnet principal

**Propósito**: captar email de alguien que está preocupado por SUNAFIL, darle un
preview útil, y convertirlo en signup.

#### Flujo
1. **Landing**: "Descubre en 3 minutos qué tan expuesto estás a una multa SUNAFIL".
2. **20 preguntas tipo Typeform**: una por pantalla, progress bar, botón "Siguiente" (Enter para avanzar).
3. **Resultado parcial gratis**:
   - Score (ej: "Tu score: 58/100").
   - "Riesgo de multa estimado: S/ 45,000–S/ 180,000".
   - Las 3 brechas más graves (solo nombres, sin detalle).
4. **CTA de conversión**: "Regístrate gratis para ver tu reporte completo — 135 preguntas, plan de acción priorizado, simulacro de inspección".
5. El email del visitante queda registrado en `Lead` para seguimiento.

### 3.5. `/recursos` — Blog SEO

- Lista de artículos con tags por tema (CTS, SST, Contratos, MYPE, etc.).
- Cada artículo: título grande, tiempo de lectura, fecha, autor (abogado real que revisó).
- Al final de cada artículo: "Esto que leíste es el 5%. Nuestra plataforma lo automatiza para tu empresa" + CTA.
- Sidebar con "Calculadoras relacionadas" y "Preguntas frecuentes del tema".

### 3.6. `/contadores` — Landing para contadores

**Propósito**: canal consultor (ver VISION §10).

- Copy distinto: no vende al empleador, vende al CONTADOR.
- Headline: "Cobra más a tus clientes con compliance digital — sin aumentar tu trabajo".
- Cards con el CASO: "Hoy llevas 25 empresas en Excel. Mañana con Comply360: 1 dashboard, alertas automáticas, diagnóstico en clics."
- Pricing especial (S/ 79-119/empresa según volumen).
- CTA: "Ser Consultor Partner" (abre flow específico con demo personalizado).

---

## 4. Signup y primer login {#4-signup-primer-login}

### 4.1. `/sign-up`

#### Lo que ve
- Hero editorial con animación sutil de escudo.
- Copy: "Protege a tu equipo en 5 minutos".
- Sub-copy: "Creá tu cuenta empresarial. Sin tarjeta de crédito."
- **3 beneficios visibles** antes del form:
  - ✓ Diagnóstico SUNAFIL en 5 minutos
  - ✓ 28 documentos obligatorios pre-cargados
  - ✓ Calendario fiscal peruano automático
- Form Clerk: email + password, o "Continuar con Google".
- Legal footer: "Al continuar aceptas nuestros términos y privacidad".

#### Lo que pasa detrás
- Clerk crea el usuario.
- JIT provisioning (nuestro código) detecta el signup y:
  - Crea una Organization con `id = org-<email-normalized>`.
  - Asigna rol OWNER al user.
  - Si el email está en `FOUNDER_EMAILS` env var o tiene un `ADMIN_PENDING` audit log → asigna SUPER_ADMIN.
  - Si el email matchea invitaciones de consultor pendientes → asigna MEMBER de la org del consultor.
- Trial PRO 14 días se activa automáticamente (mientras no haya usado antes).
- Redirect al onboarding.

### 4.2. `/dashboard/onboarding` — Primer wizard

**Tiempo objetivo**: < 5 minutos de signup a ver el cockpit.

#### 4 pasos con progress bar visible

**Paso 1 — Datos de empresa**
- RUC → auto-completa razón social + dirección desde apis.net.pe.
- Nombre comercial (puede ser distinto de razón social).
- Sector (dropdown: Comercio, Industria, Servicios, Construcción, Agro, Minería, Tech, Otro).
- Tamaño (1-10, 11-50, 51-200, 200+).

**Paso 2 — Régimen laboral principal**
- Radio cards grandes con los 12 regímenes.
- Por cada uno: descripción corta + "ver detalle" popover con beneficios clave.
- Recomendación sutil: "El sistema elige automáticamente según tu sector, pero puedes cambiarlo".

**Paso 3 — Configuración de alertas**
- Email del responsable RRHH (default: email del signup, editable).
- Checkboxes: "Alertarme sobre CTS / gratificación / vacaciones / contratos / SST".
- "¿Quieres notificaciones push en tu celular?" (pide permiso del browser).

**Paso 4 — Confirmación**
- Resumen visual (como un card con los datos).
- 2 botones: "Empezar a usar Comply360" (primario) / "Agregar mi primer trabajador" (secundario, lo lleva directo al modal de creación).

#### Después del onboarding
- Redirect al `/dashboard` (cockpit).
- **Tour guiado de 4 pasos** la primera vez (tipo Intro.js):
  1. "Este es tu score de compliance — hoy 0 porque no cargaste workers".
  2. "Aquí verás alertas críticas que salen automáticamente".
  3. "Aquí puedes hacer el diagnóstico completo en 20 min".
  4. "Y este es tu Copilot IA — preguntale cualquier cosa (Cmd+I)".
- Un botón "Omitir" siempre visible.

### 4.3. `/sign-in`

- Mismo look que sign-up pero con copy "Bienvenido de vuelta".
- Clerk form con email + password + Google OAuth + "¿Olvidaste tu contraseña?".
- Post-login: redirect automático a la home del rol.

---

## 5. Worker: Mi Portal {#5-worker-mi-portal}

**Quién lo usa**: el trabajador peruano. Promedio 35-45 años, smartphone básico,
conexión 4G a veces lenta. Se conecta 2-3 veces por mes (cuando le llega la
boleta, cuando le piden firmar contrato, cuando quiere pedir vacaciones).

**Regla**: cada fricción aquí destruye el efecto de red de Capa 2 (ver VISION §7).

### 5.1. `/mi-portal` — Home del trabajador

#### Layout mobile (375px)
```
┌─────────────────────────────────┐
│  [avatar] Hola, Juan            │
│  Bodega Flores · Cajero         │
├─────────────────────────────────┤
│  🟠 Acción pendiente            │
│  Firmá tu boleta de abril       │
│         [Firmar ahora →]        │
├─────────────────────────────────┤
│  ACCIONES RÁPIDAS (grid 2×2)    │
│  ┌─────────┐  ┌─────────┐       │
│  │ Boletas │  │ Vacac. │        │
│  │ 🟢 OK    │  │ 18 d   │        │
│  └─────────┘  └─────────┘       │
│  ┌─────────┐  ┌─────────┐       │
│  │ Docs    │  │ Capac.  │        │
│  │ 85%     │  │ 2 pend │        │
│  └─────────┘  └─────────┘       │
├─────────────────────────────────┤
│  🎯 Beneficios acumulados       │
│  CTS: S/ 4,850                  │
│  Próxima grati: S/ 1,200 (Jul)  │
│  Vacaciones: 18 días            │
├─────────────────────────────────┤
│  Historial laboral              │
│  [Ver mi Vida Laboral →]        │
└─────────────────────────────────┘

 ┌─────┬─────┬─────┬─────┬─────┐
 │ 🏠  │ 📄  │ 💰  │ 📋  │ 👤  │
 │Hogar│Docs │Bolet│Solic│Perfi│
 └─────┴─────┴─────┴─────┴─────┘
```

#### Qué debería aparecer siempre
- **Saludo por hora del día**: "Buenos días, Juan" / "Buenas tardes, Juan".
- **Acción pendiente más urgente**: si hay boleta sin firmar → arriba. Si no, si hay doc por subir → arriba. Si no, si hay capacitación vencida → arriba. Si todo OK → "¡Todo al día!" con ilustración.
- **4 tiles de acción rápida** con estado resumido (verde = OK, ámbar = 1-2 pendientes, rojo = 3+ pendientes).
- **Beneficios acumulados** (CTS, próxima grati, vacaciones pendientes) — calculados en tiempo real usando las calculadoras.
- **Link a "Mi Vida Laboral"** (ver §5.8).

### 5.2. `/mi-portal/boletas` — Lista de boletas

- Lista cronológica (más recientes primero).
- Cada item: mes/año, monto neto, status (Pendiente de firma / Firmada / Revisar).
- Click → detalle de la boleta.

### 5.3. `/mi-portal/boletas/[id]` — Detalle + firma

#### Qué ve
- Boleta renderizada en PDF-like view.
- Breakdown: sueldo base, bonos, descuentos AFP/ONP, descuentos 5ta, neto.
- Si NO está firmada: botón grande verde "Firmar con huella" (o Touch ID / Face ID).
- Si YA está firmada: badge verde "Firmada el DD/MM/YYYY" + link "Ver PDF descargable".

#### Flujo de firma biométrica
1. Worker tap "Firmar con huella".
2. Navegador pide autenticación nativa (Touch ID / fingerprint / Windows Hello).
3. Si hay hardware biométrico: proceso en 2 segundos, confirma.
4. Si NO hay hardware: fallback a "Firma simple" (checkbox + enter) con disclaimer.
5. Success animation: ✓ con scale-in. Toast "Boleta firmada".
6. Status cambia a "Firmada". Audit log con IP + userAgent + credentialId + timestamp.

#### Qué debería sentirse
- La firma con huella es el **wow moment** del producto para el worker.
- No debería haber splash de "cargando huella" — es instantáneo.
- El PDF descargable tiene el sello "Firmado biométricamente por [nombre] · [timestamp]".

### 5.4. `/mi-portal/documentos` — Legajo digital

#### Qué ve
- Score grande arriba: "Tu legajo: 85/100" con anillo emerald.
- Debajo: "Falta subir 4 docs para estar al 100%".
- 5 tabs categoría: Ingreso · Vigente · SST · Previsional · Cese.
- En cada tab: lista de docs con status visual:
  - ✅ Verificado por IA (emerald badge "IA ✨")
  - 🟢 Subido, pendiente verificación
  - 🟡 Vence pronto (fecha)
  - 🔴 Vencido (fecha)
  - ⬜ Falta (click para subir)

#### Flujo de subida
1. Click "Subir DNI" → abre cámara del celular directo.
2. Toma foto → preview.
3. "Confirmar" → upload.
4. **Instantáneo (máximo 5 seg)**: IA procesa con GPT-4o vision, verifica que sea DNI, cross-match DNI + nombre contra el worker.
5. Si 85%+ confianza: ✅ Verificado automático.
6. Si baja confianza: 🟡 "Lo revisará el admin" + el admin recibe notificación.
7. Score del legajo se recalcula en vivo.

#### Lo que debería sentirse
- Subir un doc es taaan fácil que no se posterga.
- El emerald badge "IA ✨" es un orgullo — certificación instantánea.
- El admin NO tiene que hacer nada el 90% del tiempo (la IA lo aprueba).

### 5.5. `/mi-portal/solicitudes` — Pedir cosas al admin

#### Qué ve
- Botón grande "+ Nueva solicitud".
- Tipos:
  - 📅 Vacaciones
  - 🏥 Permiso por enfermedad
  - 📜 Constancia de trabajo
  - 📜 Constancia de haberes
  - 🔄 Cambio de datos (dirección, teléfono, cuenta bancaria)
  - 💬 Otra consulta al RRHH
- Historial: lista de solicitudes previas con status (En revisión / Aprobada / Rechazada / Completada).

#### Flujo de vacaciones (el más usado)
1. Worker tap "Solicitar vacaciones".
2. Calendar picker: rango de fechas (no puede pedir más de lo que le corresponde).
3. Preview: "14 días del 15 de julio al 29 de julio. Te quedan 4 días para este año."
4. Campo opcional "Motivo / notas".
5. Submit → toast "Solicitud enviada. Tu admin recibió notificación."
6. Notificación push al admin + email.
7. Worker ve la solicitud en su historial con status "En revisión".

### 5.6. `/mi-portal/contratos` — Historial de contratos

- Lista cronológica de contratos firmados con esta empresa.
- Click → PDF viewer con firma biométrica visible al pie.
- Si hay contrato pendiente de firma: aparece destacado arriba con CTA grande.

### 5.7. `/mi-portal/capacitaciones` — Obligaciones SST

- Lista de capacitaciones obligatorias según el régimen laboral del worker.
- Estado: Pendiente / En curso / Completada / Certificada.
- Click en pendiente → video + quiz + certificado al final.
- Certificados con QR verificable (otro admin puede escanear y confirmar).

### 5.8. `/mi-portal/vida-laboral` — El diferenciador de Capa 2

#### Qué ve

Su perfil laboral completo, verificado, controlado por él.

```
┌──────────────────────────────────────────┐
│  MI VIDA LABORAL                          │
│  Juan Carlos Pérez Quispe                 │
│  DNI 45678912 · Nivel verif: 3/4          │
│  🔗 comply360.pe/vl/jcpq-45678912         │
├──────────────────────────────────────────┤
│  EXPERIENCIA                              │
│  ▸ Bodega Flores E.I.R.L. · Desde 01/2024 │
│     Cargo: Cajero · S/ 1,130              │
│     Legajo: 92/100 · 12 boletas firmadas  │
│  ▸ Constructora ABC · 2021-2024           │
│     Cargo: Operario · Cesó 12/2023        │
│     Motivo: Renuncia voluntaria           │
├──────────────────────────────────────────┤
│  CAPACITACIONES (3)                       │
│  SST General · 92% · 15/04/2025           │
│  Hostigamiento · 88% · 16/04/2025         │
│  IPERC · 95% · 20/04/2025                 │
│                                           │
│  [Ver todas con QR verificable →]         │
├──────────────────────────────────────────┤
│  DOCUMENTOS                               │
│  ✅ DNI · IA verif · 97%                  │
│  ✅ CV · IA verif · 91%                   │
│  ✅ Examen médico · 89% · Vence 2026      │
│  ✅ Afiliación Prima AFP · 94%            │
├──────────────────────────────────────────┤
│  [Compartir perfil] [Descargar PDF QR]    │
│  [Generar link temporal (72h)]            │
└──────────────────────────────────────────┘
```

#### Qué puede hacer

- **Compartir perfil completo** con un link permanente (ej: postular a un trabajo).
- **Descargar PDF** con firma digital y QR verificable.
- **Generar link temporal** (72h, revocable) para una oferta específica.
- **Revocar accesos previamente compartidos**.

#### Lo que debería sentirse

El worker debería pensar: "Esto es MÍO. Me va a servir toda la vida. Lo llevo
conmigo a cualquier empresa."

---

## 6. Org Owner / Admin: Dashboard {#6-org-owner-dashboard}

**Quién lo usa**: dueño de PYME (40-55 años), gerente de RRHH, contador
externalizando una empresa, admin de planilla. Desktop 80% del tiempo.

### 6.1. `/dashboard` — Cockpit narrativo

#### Qué ve al entrar

```
╔══════════════════════════════════════════════════════════════╗
║  Buenos días, equipo.                                         ║
║                                                                ║
║  Tu empresa necesita atención esta semana:                    ║
║  el contrato de Juan Pérez vence en 3 días y                  ║
║  7 trabajadores aún no firmaron su boleta de abril.           ║
║                                                                ║
║  [Ver plan de acción →]  [Preguntar al asistente →]           ║
╠══════════════════════════════════════════════════════════════╣
║                                                                ║
║   [Score ring animado 78/100]    MULTA EVITADA: S/ 142K      ║
║                                   TRABAJADORES: 47            ║
║   TU SCORE DE COMPLIANCE          DÍAS SIN MULTA: 384        ║
║                                                                ║
╠══════════════════════════════════════════════════════════════╣
║                                                                ║
║  📅 LO QUE SE VIENE ESTA SEMANA                              ║
║  • Lunes: Contrato Juan P. vence                             ║
║  • Martes: Pago AFP (cronograma 3er dígito)                  ║
║  • Viernes: Capacitación SST obligatoria                     ║
║                                                                ║
╠══════════════════════════════════════════════════════════════╣
║  🟥 TUS 5 MAYORES RIESGOS       🏆 CUMPLIMIENTO SECTORIAL    ║
║  [Leaderboard de workers riesgo] [Radar chart vs sector]      ║
╚══════════════════════════════════════════════════════════════╝
```

#### Qué debería sentirse
- **Narrativa**: el cockpit "habla" al admin en lenguaje natural. No "Query A devolvió X resultados".
- **Prioridad cristalina**: las 2 cosas más importantes de hoy están visibles sin hacer scroll.
- **El ring es ansiolítico**: verde grande = tranquilidad. Rojo = "aquí viene el dolor".
- **Quick actions siempre accesibles**: desde el cockpit puedo llegar en 1 click a: agregar worker, resolver alerta, generar contrato, hacer diagnóstico, chatear con IA.

#### Empty state (empresa recién creada, 0 workers)

```
¡Bienvenido a Comply360!

Tu empresa todavía no tiene trabajadores cargados. Arranquemos con el
primer paso que desbloquea TODO lo demás:

  [Agregar primer trabajador]  [Importar desde Excel]

Una vez cargues a tus trabajadores, esta pantalla mostrará:
  ✓ Tu score de compliance automático
  ✓ Alertas por vencimientos críticos
  ✓ Riesgo de multa estimado en S/
```

### 6.2. Sidebar (7 hubs + Config)

Navegación principal siempre visible en desktop, colapsable a íconos en mobile.

```
COMPLY 360
🏠  Panel (cockpit)
👥  Equipo (trabajadores, prestadores, importar)
🛡️  Riesgo (diagnóstico, simulacro, alertas, denuncias)
📅  Calendario (vencimientos, obligaciones)
📄  Contratos & Docs (legajo, plantillas, SST)
🤖  IA Laboral (copilot, agentes, análisis)

⚙️  Config
  Empresa
  Equipo
  Planes y facturación
  Integraciones
  Notificaciones
  Plantillas
  Soporte

[Plan: EMPRESA · 14d trial]
[User avatar + settings]
```

#### Badges dinámicos en items
- **Riesgo** con número rojo si hay alertas CRITICAL pendientes ("Riesgo · 3").
- **Calendario** con el número de vencimientos en próximos 7 días.
- **Contratos & Docs** con el número de contratos por vencer este mes.

### 6.3. `/dashboard/trabajadores` — El workhorse

#### Qué ve
- **KpiGrid** arriba: Total workers · Activos · En riesgo · Score legajo promedio.
- **Filtros compactos**: régimen, estado, búsqueda texto, dept, ordenamiento.
- **Tabla con vista Dense/Comfortable toggle** (admin decide).
- Cada fila: avatar, nombre, cargo, régimen, fecha ingreso, legajo score mini-ring.
- Hover en fila: aparecen acciones rápidas (editar, ver, archivar).
- Click en fila → `/dashboard/trabajadores/[id]`.

#### Acciones masivas
- Checkbox por fila + "Seleccionar todos".
- Con selección: botones "Exportar CSV", "Enviar recordatorio", "Archivar".

#### Empty state ideal
- Ilustración de 3 siluetas con el mensaje "Empezá protegiendo a tu primer trabajador".
- 3 hints: "Score de compliance automático", "Alertas de CTS, vacaciones y SCTR", "Cálculo de beneficios en vivo".
- CTA: "Agregar primer trabajador" + "Importar desde Excel" secundario.

### 6.4. `/dashboard/trabajadores/[id]` — Worker Hub (8 tabs)

Esta es **LA página más usada del producto**. Tiene que ser perfecta.

#### Header fijo arriba
```
┌────────────────────────────────────────────────────────┐
│  [Avatar]  Juan Carlos Pérez Quispe     [Editar] [⋮]   │
│            Cargo: Cajero · Régimen: MYPE_MICRO         │
│            Legajo: 🟢 92/100    [Copilot 💬]           │
└────────────────────────────────────────────────────────┘
```

#### 8 tabs horizontales (sticky al hacer scroll)

**Tab 1 — Información**
- Datos personales + laborales + previsional, en cards editables.
- "Regenerar onboarding cascade" si falta algún paso.

**Tab 2 — Legajo**
- Los 28 documentos obligatorios con estado.
- Botón "Pedir al trabajador que suba los faltantes" → notificación push + email al worker.
- Badges IA "✨" visibles cuando aplica.

**Tab 3 — Contratos**
- Lista de contratos generados para este worker.
- Botón "Nuevo contrato" abre wizard con merge fields pre-llenados.
- Detalle de cada contrato: estado (DRAFT / SIGNED / EXPIRED), aiRiskScore, hallazgos IA.

**Tab 4 — Remuneraciones**
- Sueldo actual, historial de cambios (incrementos).
- Boletas (mini-lista con acceso rápido).
- **Calculadora embedded**: "¿Cuánto sería su CTS hoy?" → usa sus datos, resultado instantáneo.

**Tab 5 — Vacaciones**
- Saldo actual: "18 días disponibles".
- Historial: períodos gozados, días acumulados.
- Si tiene alerta de doble período → badge rojo "ATENCIÓN: triple pago aplica".
- Botón "Programar vacaciones" (admin aprueba en nombre del worker).

**Tab 6 — SST**
- Capacitaciones realizadas + pendientes.
- EPP entregado.
- Exámenes médicos (con fechas de vencimiento).
- IPERC específico del puesto.

**Tab 7 — Beneficios en vivo**
- Dashboard con todos los números:
  - CTS al corte: S/ 4,850
  - Próxima grati (julio): S/ 1,200 + bono 9%
  - Vacaciones: S/ 847 (si se las tomara hoy)
  - Si lo despido sin causa: indemnización S/ 3,500
- **Botón "Generar hoja de liquidación"** exporta a PDF.

**Tab 8 — Historial**
- Timeline de todo lo que pasó con este worker:
  - "Ingresó el 15/01/2024"
  - "Contrato indefinido firmado biométricamente"
  - "Documento DNI verificado por IA"
  - "Alerta: doc médico venció (resuelta)"
- Cada evento con timestamp + quién lo hizo.

### 6.5. `/dashboard/alertas`

#### Qué ve
- Total de alertas abiertas arriba como contador grande.
- 4 tabs por severidad (Crítica / Alta / Media / Baja).
- Lista de alertas, cada una con:
  - Severidad (badge de color)
  - Tipo (CONTRATO_POR_VENCER, CTS_PENDIENTE, etc.)
  - Worker asociado
  - Fecha límite
  - Multa potencial estimada
  - Botón "Resolver" (requiere evidencia)

#### Click en alerta → detalle
- Qué pasó, por qué salió la alerta, qué hacer.
- Base legal citada.
- Sugerencia del copilot: "Puedes resolverlo generando este contrato → [Generar]".

#### Filtros
- Por worker, régimen, tipo, severidad, fecha.
- Exportar a CSV o PDF el reporte completo.

### 6.6. `/dashboard/diagnostico`

#### Experiencia
- Wizard tipo Typeform (una pregunta por pantalla).
- Progress bar persistente.
- Save-as-you-go — si cierro el browser, la próxima vez arranca donde iba.
- Tiempo estimado visible: "Quedan ~15 minutos".

#### Resultado
- Score global con breakdown por área (radar chart).
- Top 5 brechas con: qué pasa, qué multa, cómo resolver.
- Plan de acción priorizado (las brechas se convierten en `ComplianceTask`).
- Export a PDF ejecutivo.

### 6.7. `/dashboard/simulacro`

#### Experiencia immersive
- "Te vamos a simular una inspección SUNAFIL. Vas a ver qué documentos te pedirían."
- UI tipo chat con "Inspector Virtual".
- Cada documento: lo tienes / no lo tienes / lo tienes vencido.
- Al final: Acta de Requerimiento PDF lista para archivo.

### 6.8. `/dashboard/contratos`

- Lista de contratos generados.
- Botón "Nuevo contrato" → wizard con plantilla + worker → merge fields → PDF.
- Cada contrato con status visual (DRAFT / IN_REVIEW / SIGNED / EXPIRED).

### 6.9. `/dashboard/calendario`

- Vista mensual con todos los vencimientos.
- Color coding por tipo: CTS, grati, vacaciones, contratos, SST.
- Click en día → lista de eventos de ese día.
- Export a iCal (Google Calendar / Outlook) con botón grande.

### 6.10. `/dashboard/sst`

Hub SST con sub-secciones operativas:
- Política SST (documento generado)
- IPERC (matriz por puesto)
- Plan Anual
- Comité SST
- Accidentes (registro)
- Exámenes médicos
- EPP (entregas registradas)
- Capacitaciones
- Mapa de Riesgos

### 6.11. `/dashboard/denuncias`

- Canal de denuncias internas (Ley 27942).
- URL pública por empresa: `comply360.pe/denuncias/bodega-flores`.
- Dashboard interno: lista de denuncias recibidas con status + timeline + resolución.

### 6.12. `/dashboard/configuracion/*`

- **Empresa**: datos, RUC, sector, régimen, plantilla de firma.
- **Equipo**: invitar otros admins/members/viewers con sus permisos.
- **Planes y facturación**: plan actual, próximo cobro, historial facturas, upgrade/downgrade.
- **Integraciones**: T-REGISTRO, PLAME, Buk, Ofisis (placeholders hasta que existan).
- **Notificaciones**: preferencias por canal (email, push, whatsapp).
- **Plantillas**: biblioteca de contratos propios con merge fields.
- **Soporte**: crear ticket + base de conocimiento.

---

## 7. Consultor: Dashboard multi-empresa {#7-consultor-dashboard}

**Quién lo usa**: contador o abogado laboralista que gestiona 10-50 empresas
como clientes. Necesita eficiencia máxima.

### 7.1. `/dashboard/consultor` — Home del consultor

```
╔═════════════════════════════════════════════════════════╗
║  Cartera de clientes · 23 empresas activas              ║
║                                                           ║
║  🟥 ALERTAS CRÍTICAS: 7 (en 4 empresas)                 ║
║  🟠 Vencimientos esta semana: 12                        ║
║  🟢 Empresas compliance OK: 16                          ║
║                                                           ║
║  [Agregar empresa]  [Exportar reporte global]           ║
╠═════════════════════════════════════════════════════════╣
║  TUS CLIENTES                                            ║
║                                                           ║
║  Búsqueda [           ]  Filtro: Todas ▼                 ║
║                                                           ║
║  ┌──────────────────────────────────────────────────┐   ║
║  │ Bodega Flores       🟥 3 alertas   Score 58/100   │   ║
║  │ MYPE_MICRO · 10 workers · Plan EMPRESA            │   ║
║  │                               [Abrir dashboard →]  │   ║
║  ├──────────────────────────────────────────────────┤   ║
║  │ Constructora Andina  🟢 OK         Score 87/100   │   ║
║  │ CONSTRUCCION · 15 workers · Plan PRO              │   ║
║  │                               [Abrir dashboard →]  │   ║
║  └──────────────────────────────────────────────────┘   ║
║  ... (21 más)                                           ║
╚═════════════════════════════════════════════════════════╝
```

#### Qué puede hacer
- **Click en empresa** → entra al dashboard de esa empresa AS IF fuera el admin de ella.
- Banner visible arriba: "Gestionando Bodega Flores como consultor — [volver]".
- Agregar empresas a su cartera (con permiso del owner).
- Exportar reportes consolidados por cartera completa.
- Filtros: empresas con alertas críticas, por sector, por régimen.

### 7.2. Experiencia ideal del consultor
- **Dashboard consolidado** con números agregados de toda la cartera.
- **Cambio rápido de empresa** con keyboard shortcut (Cmd+K → buscar empresa).
- **Alertas globales**: "En tu cartera hay 7 alertas críticas — resolvé primero las de multa ≥S/ 50K".
- **Facturación unificada**: ve el total mensual que le cobra Comply360 + cuánto le cobra él a sus clientes + su margen.
- **Reporte mensual automatizado** que le llega al email para mandar a cada cliente (branded con su logo si tiene plan premium consultor).

---

## 8. Super Admin: Founder Console {#8-super-admin-founder-console}

**Quién lo usa**: founder, co-founders, colaboradores (devs, marketing, admins)
invitados por el founder.

### 8.1. `/admin` — Vista general

```
╔════════════════════════════════════════════════════════════╗
║  Panel de administración global · martes 22 abr · 21:30    ║
║                                                              ║
║  💎 TODAY AT A GLANCE                                       ║
║  ▸ 1 empresa nueva esta semana                             ║
║  ▸ Stickiness: 100% (DAU/MAU)                              ║
║  ▸ 2 alertas críticas sin resolver                         ║
║                                                              ║
╠════════════════════════════════════════════════════════════╣
║  💰 BUSINESS                                                ║
║  MRR  S/ 1,500   ARR S/ 18,000   Activas 6    Trial 4      ║
║                                                              ║
║  🎯 GROWTH                                                  ║
║  Empresas: 6   Nuevas 7d: 2   Activación 7d: 50%           ║
║                                                              ║
║  🔥 ENGAGEMENT                                              ║
║  DAU 2   WAU 4   MAU 6   Stickiness 100%                   ║
║                                                              ║
║  🎯 HEALTH                                                  ║
║  Churn rate: 0%   Churn risk: 0 orgs   Past due: 0         ║
╠════════════════════════════════════════════════════════════╣
║  RECIENTES SIGN-UPS                ALERTAS OPS              ║
║  [lista]                            [lista]                   ║
╚════════════════════════════════════════════════════════════╝
```

### 8.2. `/admin/empresas` — Todas las orgs

- Lista con búsqueda + filtros (plan, estado, región, sector).
- Cada row: nombre, RUC, plan, trabajadores, score, MRR.
- Click → `/admin/empresas/[id]`.

### 8.3. `/admin/empresas/[id]` — Detalle de una org

- Panel editorial con todos los datos de la empresa.
- Métricas: score history, revenue, uso de features, last activity.
- **Botón "Impersonar esta empresa"** → entro al dashboard de ella como si fuera el admin. Banner rojo arriba "Impersonando [nombre] — volver al Founder Console".
- Timeline de eventos: signups, upgrades, downgrades, support tickets, inspecciones simuladas.
- Botones ops: cancelar suscripción (con confirm), extender trial, bloquear empresa.

### 8.4. `/admin/admins` — Gestión de colaboradores

- Lista de los SUPER_ADMIN activos con sus títulos (Founder, Admin, Dev, Marketing, Diseño, Ventas).
- Invitaciones pendientes (no se han registrado aún).
- Form para invitar por email + título.
- Cuando el invitado se registra, automáticamente obtiene SUPER_ADMIN.
- Botón "Revocar" baja a OWNER (de su propia org).

### 8.5. `/admin/billing` — Vista financiera

- MRR/ARR evolución en gráfico.
- Suscripciones por plan.
- Trial expiring soon.
- Failed payments.
- Por cada empresa: historial de pagos Culqi + factura electrónica.

### 8.6. `/admin/soporte` — Inbox de tickets

- Todos los tickets de soporte creados por users.
- Filtros por prioridad, categoría, org.
- Click → detalle + botón "Responder por email" con mailto pre-configurado.
- Marcar como resuelto + dejar nota interna.

### 8.7. `/admin/auditoria`

- Audit log global de eventos importantes:
  - ADMIN_PROMOTED / ADMIN_REVOKED
  - Payments (OK / failed)
  - Org cancelations
  - Impersonations (quién, cuándo, a qué org)
  - Cambios de plan
- Filtros por tipo, usuario, fecha.
- Export CSV.

### 8.8. `/admin/analytics`

- Funnel: signups → onboarding → primer worker → primer contrato → diagnóstico → pago.
- Retention cohorts (% que siguen pagando a M+1, M+3, M+6).
- Feature usage: qué partes del producto se usan más / menos.
- Geographic heatmap (si es relevante).

### 8.9. `/admin/configuracion`

- Constantes legales (UIT, RMV, etc.) con auditoría de cambios.
- Toggle features globalmente (kill-switch).
- Banner de sistema (mostrar mensaje a todos los usuarios, ej: "Mantenimiento Sábado 10am").
- Datos de la entidad Comply360 S.A.C. (RUC, domicilio, responsable DPO).

---

## 9. El Copilot IA — cómo se debería sentir {#9-copilot-ia}

**Omnipresente**. Cmd+I abre un drawer desde la derecha en cualquier página.

### 9.1. Comportamiento ideal

#### Context awareness
- Estoy en `/dashboard/trabajadores/[id]` de Juan Pérez → el copilot tiene cargado su contexto.
- Le pregunto "¿Cuánto sería su CTS hoy?" → responde con el número exacto + breakdown + base legal.
- No necesito repetirle "me refiero a Juan" — ya lo sabe.

#### Streaming
- Respuestas aparecen palabra por palabra (SSE) — se siente conversacional.
- Si la respuesta es larga, puedo interrumpir con "stop".

#### Acciones sugeridas
- Cada respuesta termina con 2-3 botones contextuales:
  - "Ver contrato de Juan"
  - "Generar carta de cese"
  - "Calcular indemnización si lo despido sin causa"
- Click ejecuta la acción dentro del app.

#### Citas obligatorias
- Cada dato legal cita la norma específica.
- Si la IA no tiene certeza: "No tengo esta información con suficiente certeza. Te recomiendo consultar a un abogado laboralista o revisar directamente [Art. X de la Ley Y]".

#### Historial
- Conversaciones guardadas por usuario.
- Botón "Exportar conversación" → PDF.

### 9.2. Modos del copilot

Selector arriba del drawer:

- **💬 Chat general** (default) — conversación libre sobre derecho laboral.
- **🔍 Review de contrato** — subo PDF, me devuelve hallazgos con severidad.
- **📊 Análisis de boleta** — subo boleta, me dice si tiene errores.
- **🎯 Plan de acción** — basado en mi diagnóstico, me propone las 5 cosas a hacer esta semana.
- **👨‍⚖️ Simulador de inspector SUNAFIL** — me simula una inspección para entrenar al equipo.

---

## 10. Notificaciones y emails {#10-notificaciones-emails}

### 10.1. Canales por tipo de evento

| Evento | Push | Email | Dashboard | Slack founder |
|---|:-:|:-:|:-:|:-:|
| Boleta lista para firma (worker) | ✓ | ✓ | ✓ | — |
| Alerta CRITICAL generada | ✓ | ✓ | ✓ | — |
| CTS próximo a depósito (7d) | — | ✓ | ✓ | — |
| Contrato por vencer (30d) | — | ✓ | ✓ | — |
| Pago Culqi procesado OK | — | ✓ | ✓ | ✓ |
| Pago Culqi falló | — | ✓ | ✓ | ✓ |
| Nueva empresa signup | — | — | — | ✓ |
| Ticket soporte alta/crítica | — | ✓ | ✓ | ✓ |
| Invitación a colaborador | — | ✓ | — | — |
| Denuncia nueva | — | ✓ | ✓ | — |
| Founder digest (daily 8am) | — | ✓ | — | — |

### 10.2. Tone & voice

- **Tuteo peruano**, no usted ni voseo. "Juan, tienes una boleta pendiente".
- **Asunto cortos y concretos**: `[URGENTE] Contrato de Juan Pérez vence el 15 de mayo`.
- **Cuerpos breves** (máx 4 párrafos + CTA).
- **Branded**: logo, color primary emerald, footer con "Puedes gestionar tus notificaciones en [settings]".
- **Unsubscribe obvio** en cada email no crítico.

### 10.3. Frecuencia

- **Máximo 1 push/día** por worker salvo URGENTE (SCTR vencido, firma biométrica requerida).
- **Máximo 1 email/día** por admin salvo URGENTE.
- **Founder digest**: 1x por día a las 8am Lima.
- **Weekly digest**: lunes 9am a cada admin con "lo más importante de tu semana".

---

## 11. Mobile y PWA {#11-mobile-pwa}

### 11.1. Instalación

- El primer hint "Instala Comply360 en tu celular" aparece después de 3 visitas.
- Es dismissible pero reaparece si no lo hizo en 2 semanas.
- En iOS Safari: instrucciones visuales ("Toca compartir → Añadir a pantalla de inicio").
- En Android Chrome: botón directo "Instalar app".

### 11.2. Experiencia offline

- Worker abre la PWA en el subte sin conexión.
- Ve su última boleta cacheada.
- Puede marcar "firmar" → queda en cola → se sincroniza cuando vuelva la conexión.
- Toast al volver online: "Se sincronizaron 2 acciones pendientes".

### 11.3. Push notifications

- Permiso se pide DESPUÉS del primer uso exitoso, no al abrir.
- Mensaje contextual: "¿Quieres recibir notificaciones cuando te llegue una nueva boleta o documento pendiente?".
- Si dice no, no se vuelve a preguntar en 30 días.

---

## 12. Estados críticos {#12-estados-críticos}

### 12.1. 404 — Página no encontrada

- Branded (Obsidian + Esmeralda), no default Next.js.
- Número 404 grande en gradient.
- Copy empático: "Esta página no existe o se mudó de dirección".
- 3 CTAs: Volver al inicio · Página anterior · 3 rutas populares.

### 12.2. Error 500 — Algo se rompió

- Card centrada con ícono en red.
- Copy honesto: "Un error inesperado interrumpió la carga. Refresca la página y, si el problema persiste, cuéntanos."
- Error code visible (digest) para soporte.
- 3 CTAs: Reintentar · Volver al inicio · Reportar por email.

### 12.3. Offline (PWA)

- Icon de wifi tachado.
- "Estás sin conexión. Comply360 necesita internet para sincronizar, pero no pierdes nada de lo que hiciste."
- Tip: "Si instalaste la PWA, puedes ver boletas cacheadas en `/mi-portal`".

### 12.4. Maintenance (planeado)

- Banner arriba (amarillo suave): "Mantenimiento programado Sábado 24 Abr 10:00-11:00 AM Lima. El sistema estará en modo lectura."
- Aparece 48h antes.

### 12.5. Rate limited (429)

- Toast no-intrusivo: "Hiciste muchas acciones seguidas. Esperá 30 segundos."
- Nunca bloquea permanente — siempre re-habilita.

### 12.6. Fetch error en listas

- Banner rojo arriba de la tabla con retry button.
- No muestra empty state falso (que induce a pensar que no hay data).

### 12.7. Loading (siempre skeletons)

- Nunca pantalla en blanco.
- Skeleton matchea el shape del contenido final.
- Máximo 2s de skeleton — si supera, mostrar "Tardamos más de lo normal, revisa tu conexión".

---

## 13. Accesibilidad {#13-accesibilidad}

### 13.1. Keyboard navigation

- Tab order lógico en toda página.
- Focus-visible ring emerald en cada elemento focusable.
- Shortcuts globales: Cmd+K (palette), Cmd+I (copilot), Esc (cerrar modal).

### 13.2. Screen reader

- Cada input con `<label>` asociado por `htmlFor`/`id`.
- Icon-only buttons con `aria-label`.
- Errores con `role="alert"`.
- Loading con `role="status"`.
- Modales con `aria-modal` + focus trap.

### 13.3. Color contrast

- Texto normal ≥ 4.5:1 (WCAG AA).
- Texto grande (18px+) ≥ 3:1.
- Nunca información transmitida SOLO por color (siempre + ícono o texto).

### 13.4. Motion

- `prefers-reduced-motion` respected (animations OFF si el usuario lo pidió).

---

## Epílogo

Este documento es aspiracional. Al día de escribirlo (2026-04-22), el producto
cubre ~70% de lo descrito aquí. El 30% restante es:

- Diseño visual más pulido en algunas pantallas (consistency)
- "Mi Vida Laboral" como producto standalone (Capa 2)
- Acciones sugeridas contextuales del copilot (parcialmente implementado)
- Analytics funnel en `/admin/analytics` (existen las queries, falta UI)
- Empty states y loading skeletons completos (en progreso)
- Onboarding tour guiado (no existe)
- Drip email campaign (código existe, falta cronear)
- Culqi end-to-end testado en prod
- Algunos toast-verdad en lugar de stubs silenciosos (en progreso)

**La regla**: cada semana, cada commit, cada decisión de producto debería
acercar el producto real al producto de este documento. Si hay una divergencia
entre lo que construimos y este ideal, la divergencia tiene que estar
justificada en un trade-off conciente, no en desidia.

---

**Documento creado**: 2026-04-22
**Autor**: Equipo COMPLY360
**Versión**: 1.0
**Próximo review**: trimestral, o cuando cambie significativamente la tesis
