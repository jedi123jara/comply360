# COMPLY360 — Visión Estratégica

> **De un SaaS vertical en Perú a la infraestructura de compliance laboral de Latinoamérica.**
>
> Este documento no es un deck. No vende nada. Es la memoria operativa de por qué
> existe COMPLY360, qué estamos construyendo realmente, y en qué orden lo vamos
> a atacar. Lo leés vos a las 2 AM cuando dudás. Lo lee un inversionista en
> 15 minutos. Lo lee un ingeniero nuevo en su primer día.
>
> La prueba de un buen documento estratégico es que, **seis meses después, las
> decisiones que tomaste lo validan o lo contradicen con claridad — nunca te
> dejan en el medio.**
>
> Pareja con:
> - [CLAUDE.md](./CLAUDE.md) — plan maestro técnico (qué se construye)
> - [ARCHITECTURE.md](./ARCHITECTURE.md) — guía de ingeniería (cómo se construye)

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [El secreto — lo que nadie más ve](#2-el-secreto)
3. [Por qué ahora](#3-por-qué-ahora)
4. [Los tres activos estratégicos](#4-los-tres-activos-estratégicos)
5. [Tesis central: infraestructura, no software](#5-tesis-central)
6. [Capa 1 — El SaaS operativo (ejecutar YA)](#6-capa-1--el-saas-operativo)
7. [Capa 2 — Identidad Laboral Portable](#7-capa-2--identidad-laboral-portable)
8. [Capa 3 — Inteligencia Regulatoria](#8-capa-3--inteligencia-regulatoria)
9. [El Flywheel con dependencias explícitas](#9-el-flywheel)
10. [Go-to-market: el canal consultor como palanca principal](#10-go-to-market)
11. [Expansión LATAM — en qué orden y con qué señal](#11-expansión-latam)
12. [Roadmap con criterios de éxito Y de abandono](#12-roadmap)
13. [Modelo financiero con sensibilidad](#13-modelo-financiero)
14. [Los primeros 90 días — plan táctico](#14-los-primeros-90-días)
15. [Métricas: la pirámide de leading a lagging](#15-métricas)
16. [Riesgos: análisis pre-mortem](#16-riesgos)
17. [Gobierno, equipo y capital](#17-gobierno-equipo-capital)
18. [Lo que NO haremos](#18-lo-que-no-haremos)
19. [Decision framework — cuándo pivotar](#19-decision-framework)
20. [Competencia real y futura](#20-competencia)
21. [La cultura que queremos](#21-cultura)
22. [Última palabra](#22-última-palabra)

---

## 1. Resumen ejecutivo

**Qué somos hoy**: un SaaS de compliance laboral peruano en producción (`comply360.pe`).
60K líneas de código, 518 tests, 75+ normas peruanas indexadas, 14 agentes de IA
especializados, 106 páginas de dashboard. Motor legal determinista que cubre los
12 regímenes laborales peruanos vigentes.

**Qué seremos en 36 meses**: la capa de confianza laboral de Latinoamérica. La
infraestructura invisible que usan empresas para compliance, trabajadores para
portabilidad de identidad, fintech/aseguradoras para scoring, y gobiernos para
enforcement data-driven.

**Por qué somos nosotros**: no hay competidor directo en Perú. Los internacionales
(Buk, Runa, Factorial) no tienen el legal engine ni la data. Cada trimestre que
ejecutamos con disciplina, ampliamos la ventaja.

**El número que importa**: **100 empresas peruanas pagando antes de Dec 31 2026**.
Todo lo demás — Capa 2, Capa 3, LATAM, data products — se desbloquea o se bloquea
a partir de ahí.

**Qué necesitamos**: 6–9 meses de foco obsesivo en distribución (no producto),
aproximadamente USD 100–250K de pre-seed en Q3 2026, y la disciplina de decir NO
a 90% de las distracciones que van a aparecer.

**La forma más rápida de matar este plan**: construir más features en vez de
salir a vender. **La segunda forma más rápida**: expandir a Colombia antes de
validar Perú.

---

## 2. El secreto

> Toda startup que importa empieza con una verdad no-consenso.
>
> — Peter Thiel

### La creencia predominante

> "El compliance laboral es un nicho aburrido donde ganás poco. Vende payroll
> (Buk) o gestión de talento (Rippling) — ahí está la plata."

### Nuestro contrarian bet

> **El compliance laboral NO es un nicho. Es el único punto donde el Estado,
> el trabajador, el empleador y la fintech se encuentran con información
> auditable. El que controla ese punto controla un data asset que nadie más
> puede replicar sin 5 años de expertise legal profundo.**

### Tres observaciones que casi nadie conecta

1. **El empleador paga pero el trabajador es el generador de datos**.
   En payroll clásico, el cliente es el empleador. El trabajador es un recurso.
   Pero las firmas biométricas, los documentos verificados con IA, el historial
   laboral completo — eso lo **genera el trabajador**. Si lo tratamos como usuario
   de primera categoría (no como item en una nómina), desbloqueamos un
   efecto de red B2C2B que ningún competidor B2B puro puede replicar.

2. **La multa SUNAFIL es el único gatillo que supera la inercia del Excel**.
   Ningún contador peruano se va a mover de su Excel por "features nuevas". Se
   mueve cuando una multa de S/ 28K le cae a un cliente. Nuestro producto
   **NO compite con Excel** — compite con el trauma post-inspección. Eso cambia
   todo el pitch, el pricing, y el GTM.

3. **La regulación LATAM es bizantina pero estructuralmente idéntica**.
   Perú tiene 12 regímenes. Colombia tiene 13 tipos de contrato + prima + cesantías.
   México tiene PTU + reparto. Son "iguales pero distintas". Un motor de reglas
   genérico con plugins por país es **estructuralmente correcto**. Ningún
   competidor horizontal (Buk, Rippling, Deel) tiene esta arquitectura — todos
   hardcodearon su país de origen.

### La consecuencia

Si las tres observaciones son ciertas, **la categoría "compliance laboral LATAM"
es una plataforma de USD 2–4B esperando a que alguien la construya**. Y el que
llegue primero con los tres activos (motor legal + red de workers + data) gana
la década siguiente.

---

## 3. Por qué ahora

Una estrategia brillante ejecutada en el momento equivocado es indistinguible
de una estrategia mediocre. Estas son las fuerzas que hacen que **ahora** sea
el momento (y no en 2020 ni en 2030).

### 3.1 Ventanas regulatorias abiertas

- **Ley 32353 (Perú, 2024)** — nuevo régimen MYPE con beneficios distintos al D.Leg. 728. Cada PYME tiene que decidir activamente su régimen: oportunidad de diagnóstico.
- **Ley 31572 (Teletrabajo)** — desconexión digital obligatoria, compensación de gastos. Nueva área de auditoría SUNAFIL donde nadie está preparado.
- **Ley 31110 (Agrario)** — RIA (Remuneración Integral Agraria) compleja con CTS y gratificaciones incluidas. Empresas agroexportadoras peruanas no tienen software que lo calcule bien.
- **Resolución 0312/2019 (Colombia)** — SG-SST con 60 estándares mínimos. Multas multiplicándose desde 2023. Mercado dispuesto a pagar.
- **NOM-035 (México)** — riesgo psicosocial obligatorio desde 2020. Compliance ad-hoc, ninguna plataforma lo integra.

### 3.2 Aceleradores tecnológicos

- **LLMs competentes para texto legal** (GPT-4o, Claude Sonnet): por primera vez, una IA puede leer un contrato laboral peruano y encontrar cláusulas abusivas con precisión comparable a un abogado junior. Esto no era verdad en 2022.
- **WebAuthn universal (iOS 16+, Android 9+, todos los Chrome modernos)**: firma biométrica sin hardware adicional, sin reader USB, sin RENIEC. 90%+ de trabajadores peruanos tienen un smartphone con Touch ID o huella nativa.
- **Vercel / Supabase / Clerk stack**: deploy de plataforma enterprise en 2 semanas, no 6 meses. Ventaja de velocidad frente a competidores que arrastran legacy.
- **PWA instalable**: portal del trabajador sin pasar por App Store review. Distribución vía link directo. Esto en 2020 era feature-poor; en 2026 es app-quality.

### 3.3 Presión económica sobre empresas

- UIT 2026 = S/ 5,500 (vs S/ 4,600 en 2022). Las multas subieron 20% en 4 años en términos nominales.
- SUNAFIL incrementó inspecciones 35% en 2024 vs 2023 (fuente: memoria institucional SUNAFIL 2024).
- Post-pandemia, empresas peruanas cortaron gastos de asesoría legal externa. Un SaaS que reemplaza al abogado laboralista de retención mensual es compra obvia.

### 3.4 Fatiga del Excel

La generación que hoy maneja RRHH en PYMEs peruanas tiene 40–55 años y manejó
carrera entera con Excel + Word. La generación nueva (contadores 25–35 años)
**espera software moderno**. En 3–5 años, la mayoría de decisiones de RRHH
las toma la generación nueva. Estamos llegando justo en la transición.

### 3.5 La ventana se cierra en 24–36 meses

Factorial (España, valuación USD 1B+) ya está en México desde 2023. Runa recibió
Serie B USD 60M en 2024 con expansión LATAM. Deel entró al mercado peruano para
contratistas. **Nadie hizo todavía el vertical de compliance laboral profundo**,
pero si Factorial decide priorizar LATAM en 2027, tienen capital para chocarnos
de frente.

**Nuestra ventana**: llegar a 1,000 empresas en Perú + 500 en Colombia antes de
Dec 2027. Con eso, el data moat y la red de workers verificados ya son
defendibles.

---

## 4. Los tres activos estratégicos

Lo que hace que COMPLY360 no sea "otro SaaS" son tres activos específicos que
ya construimos y que son difíciles de replicar.

### Activo 1 — Motor legal determinista (ya construido)

**Qué es**

13 calculadoras que cubren los 12 regímenes laborales peruanos (GENERAL, MYPE_MICRO,
MYPE_PEQUENA, AGRARIO, CONSTRUCCION_CIVIL, MINERO, PESQUERO, TEXTIL_EXPORTACION,
DOMESTICO, CAS, MODALIDAD_FORMATIVA, TELETRABAJO), con **518 tests automatizados**
que cubren casos reales (medio tiempo, asignación familiar, SCTR, períodos truncos,
doble CTS, reincidencia de multas, gratificación proporcional).

Cada cálculo:
- Es determinista (misma entrada = misma salida, siempre)
- Cita base legal (D.Leg. 728, Ley 27735, D.S. 001-97-TR, etc.)
- Muestra fórmula paso a paso
- Está versionado (si la ley cambia, sabemos qué versión aplicó a qué cliente)

**Por qué es moat**

- No se replica en un hackathon. Requiere 6–12 meses de trabajo de un dev senior en colaboración con un abogado laboralista que entienda jurisprudencia del TFL.
- Los tests no se replican. Cada test cubre un edge case específico (¿cómo calcula CTS un agrario que ingresó el 12 de diciembre y cesó el 3 de mayo?). Sin esos tests, cualquier error mina la confianza — y compliance es un producto donde la confianza es todo.
- La actualización anual es sistemática (UIT, RMV, tasas AFP cambian cada enero) — tenemos el proceso operativo; un competidor que entre en Q2 llega tarde al año fiscal.

**Qué lo hace frágil**

- Un bug público en una calculadora destruye reputación instantáneamente. Mitigación: tests + peer review + disclaimer + seguro E&O (ver §16).
- El engine es peruano. Colombia / México / Chile requieren **rebuild completo del motor legal** (aunque la arquitectura es reusable — ver §11).

### Activo 2 — Red de workers verificados (ya construido, sin tracción)

**Qué es**

El portal `/mi-portal` es una PWA mobile-first donde el trabajador:
- Firma contratos con biometría nativa del dispositivo (Touch ID / huella / Face ID vía WebAuthn)
- Sube documentos que auto-verifica GPT-4o vision (DNI, CV, examen médico, afiliación AFP)
- Recibe boletas, políticas SST, notificaciones push
- Tiene audit trail criptográfico de cada firma: IP + userAgent + credentialId + timestamp

**Por qué es moat — cuando escala**

Cada worker que firma en COMPLY360 es un **usuario con identidad biométrica
verificada**. La combinación es única en LATAM:
- DNI cross-check contra RENIEC (cuando se habilite integración, hoy manual)
- Firma biométrica del dispositivo personal (no replicable sin el dispositivo)
- Documentos verificados por IA con cross-match contra datos reales del legajo
- Historial verificable de empleos (contratos firmados, boletas aceptadas, fechas)

Esto crea efecto de red de dos lados:
- Empresa A necesita que sus 50 workers estén en la plataforma para firmar
- Esos 50 workers acumulan historial laboral
- Cuando uno de ellos cambia a Empresa B, lleva su legajo → Empresa B se convierte

**La realidad honesta hoy**

Tenemos **cero workers** en producción (el seed tiene 100 workers mock sin PWA instalada). La red de workers es una **tesis, no un activo realizado**. Este es el gap más importante del plan: sin tracción en workers, Capa 2 no existe.

**Criterio de éxito**: 1,000 workers con PWA instalada y al menos 1 firma biométrica para Q3 2027. Si no llegamos, Capa 2 se reevalúa.

### Activo 3 — Data de compliance única (acumulándose pasivamente)

**Qué es**

Cada diagnóstico (135 preguntas, 10 áreas), cada compliance score, cada alerta
resuelta o ignorada, cada simulacro SUNAFIL, cada gap detectado — son datapoints
que nadie más tiene. Empezamos a acumular con el primer cliente real pagando.

**El camino a producto de datos**

| Escala | Qué habilita |
|---|---|
| 100 empresas | Benchmarks anónimos por régimen — **lo suficientemente interesante para PR** |
| 1,000 empresas | Índice sectorial mensual (como Moody's para compliance) |
| 5,000 empresas | Modelos predictivos de multa (input para aseguradoras) |
| 10,000+ empresas | Data privilegiada que atrae partnerships gubernamentales |

**Por qué es moat**

Efecto de red de datos clásico: más usuarios → mejores benchmarks → más valor
para cada usuario → más retención y referidos → más usuarios. Imposible de
replicar sin la base instalada.

**Precondición**: tenés que tener la base instalada. Por eso **Capa 3 es upside,
no core plan. Core plan es Capa 1 + señales de Capa 2.**

---

## 5. Tesis central

### La frase

> COMPLY360 no es un producto de compliance. Es **el sistema operativo del
> compliance laboral de Latinoamérica** — la capa invisible donde empresa,
> trabajador, abogado, contador, aseguradora, banco y gobierno coinciden con
> información auditable.

### El diagrama

```
                +------------------------------------+
                |       COMPLY360 PLATFORM           |
                |                                    |
                |  [C1] SaaS de compliance            |
                |       (motor legal + IA +           |
                |        diagnóstico + alertas)       |
                |                                    |
                |  [C2] Identidad laboral portable    |
                |       (workers verificados,         |
                |        firma biométrica,            |
                |        historial auditable)         |
                |                                    |
                |  [C3] Inteligencia regulatoria      |
                |       (benchmarks, scoring,         |
                |        due diligence, API)          |
                |                                    |
                +--+-----------+-----------+---------+
                   |           |           |
          Empresas        Workers       Terceros
          (pagan          (usan          (pagan por
           subscripción)   gratis)        data/API)
```

### El orden obligatorio

Las capas tienen dependencias duras:

- **Capa 1 → Capa 2**: sin empresas pagando, no hay workers en el portal. Sin workers en el portal, Capa 2 no tiene nada que distribuir.
- **Capa 2 → Capa 3**: la data de compliance sin data de workers verificados vale 3x menos para fintech/aseguradoras (no pueden verificar empleador).
- **Capa 1 → Capa 3**: si una multa pública contradice un score alto, la credibilidad de la data se destruye.

**Conclusión operativa**: la disciplina no es construir las 3 capas en paralelo
(diletantismo fatal). La disciplina es **llevar Capa 1 a su límite antes de
abrir Capa 2, y Capa 2 a señales de adopción antes de monetizar Capa 3**.

---

## 6. Capa 1 — El SaaS operativo

> **Estado**: en producción. 747 archivos, 199 endpoints, 106 páginas de dashboard,
> 14 agentes de IA. 5 empresas demo con 100 workers seedeados. Cero empresas
> pagando.
>
> **Prioridad**: monetizar en Q2–Q4 2026.

### 6.1 Problema de pitch actual y su remplazo

**Pitch viejo** (genérico, no genera urgencia):

> "COMPLY360 gestiona el compliance laboral de tu empresa."

**Problema**: "gestionar compliance" es como "organizar archivos". Nadie pierde
el sueño por eso. El dolor no está cuantificado ni inmediato.

**Pitch nuevo** (específico, cuantificado, urgente):

> "SUNAFIL puede multarte entre **S/ 247 y S/ 288,915** por una sola infracción
> laboral. COMPLY360 es tu **escudo anti-SUNAFIL**: diagnóstico de 135 preguntas,
> plan de acción priorizado, y **garantía de reembolso** si te multan mientras
> mantenés score 80+. Desde **S/ 49/mes**. Menos que una consulta legal."

### 6.2 La garantía anti-multa — rigor legal

Esta es la bala de plata del GTM, pero mal ejecutada es pasivo legal. Aquí va
cómo la hacemos defendible.

#### Términos precisos (borrador, requiere revisión abogado laboralista)

```
GARANTÍA COMPLY360 ANTI-MULTA v1.0

ALCANCE
Reembolso de hasta 12 mensualidades de suscripción si SUNAFIL impone una
multa en materia laboral ESPECÍFICAMENTE cubierta por nuestro módulo de
diagnóstico, DURANTE el periodo en que el cliente cumple TODOS los
requisitos de activación.

REQUISITOS DE ACTIVACIÓN (el cliente DEBE cumplir los 5)
 1. Suscripción EMPRESA o PRO activa y al corriente por ≥6 meses continuos
 2. Compliance score global ≥80 en los últimos 90 días (verificable en
    snapshots históricos)
 3. Cero alertas CRITICAL sin resolver por >15 días calendario
 4. Diagnóstico FULL completado en los últimos 6 meses
 5. Plan de acción ejecutado al ≥70% según trazabilidad en plataforma

COBERTURA POR ÁREA DE DIAGNÓSTICO
Se cubre únicamente multa cuyo hecho infractor CALZA con una de las 10 áreas
diagnosticadas:
 - Contratos y modalidades
 - Remuneraciones (CTS, gratificación, vacaciones, pagos)
 - Seguridad y Salud en el Trabajo (Ley 29783)
 - Jornada y horas extras
 - Documentos obligatorios del legajo
 - Hostigamiento sexual laboral (Ley 27942)
 - Igualdad salarial (Ley 30709)
 - Tercerización e intermediación
 - Régimen MYPE / beneficios sectoriales
 - Relaciones colectivas

EXCLUSIONES (lista exhaustiva, no ejemplificativa)
 a. Hechos infractores ocurridos ANTES del inicio de la suscripción
 b. Infracciones en áreas NO cubiertas: tributaria, migratoria, ambiental,
    comercial, penal, aduanera
 c. Multas donde el cliente NO ejecutó la acción recomendada por plan de
    acción en el plazo sugerido (evidencia: AuditLog + task status)
 d. Información materialmente falsa ingresada a la plataforma por el cliente
 e. Multas derivadas de fiscalización laboral de otro régimen (p.ej. SUNAT
    por retenciones no efectuadas, aunque relacionen lo laboral)
 f. Multas del régimen cerrado (actas de cierre emitidas por consentimiento
    expreso de la empresa)
 g. Infracciones de convenio colectivo específico no mapeado en diagnóstico

PROCEDIMIENTO DE RECLAMO
 1. Cliente notifica a COMPLY360 dentro de 5 días hábiles de recibir el Acta
    de Requerimiento (NO el Acta de Infracción — el momento correcto es al
    inicio del procedimiento)
 2. COMPLY360 verifica:
     - Snapshots de compliance score del periodo
     - Auditlog de cumplimiento del plan de acción
     - Fecha del hecho infractor vs fecha de inicio de suscripción
     - Área del hecho infractor vs áreas cubiertas
 3. Si procede: reembolso en 30 días hábiles vía transferencia
 4. Si no procede: informe escrito con justificación + derecho de apelación
    a comité externo (2 abogados + 1 contador, pagados por COMPLY360)

LÍMITE ANUAL POR CLIENTE
Máximo S/ 4,788 (12 meses plan PRO) por evento. Un cliente solo puede
activar la garantía una vez al año.

LÍMITE AGREGADO DE COMPLY360 (disclosure de riesgo interno)
Provisión del 15% del MRR como reserva de garantía. Si reservamos > 15%,
congelamos el programa y renegociamos términos.

JURISDICCIÓN Y LEY APLICABLE
Ley peruana. Jurisdicción: distrito judicial de Lima. Arbitraje privado
como primer recurso.

VIGENCIA
La garantía está sujeta a modificación con 60 días de aviso. El cliente
existente mantiene los términos vigentes al momento de activar garantía.
```

#### Por qué esta versión es defendible (y la del VISION anterior no era)

- **Fecha de notificación correcta**: 5 días hábiles desde el Acta de Requerimiento, no desde el Acta de Infracción. El primer momento es cuando aún podés subsanar; el segundo es tarde.
- **Exclusiones exhaustivas**: cerramos el ataque de "la multa es tributaria pero tiene componente laboral".
- **Evidencia objetiva**: el plan de acción genera AuditLog. Si el cliente no ejecutó, tenemos prueba digital.
- **Límite agregado**: la provisión del 15% del MRR es visible al equipo. Si crece, ajustamos precio o endurecemos requisitos.
- **Apelación a comité externo**: da legitimidad ante reclamos de mala fe.

#### Seguro E&O como backstop

Contratar seguro de responsabilidad profesional (Errors & Omissions) en Rimac
o La Positiva por cobertura de S/ 500K. Costo estimado: S/ 5–10K/año. Esto
cubre el caso catastrófico de que la garantía sea activada masivamente.

### 6.3 Segmentación de planes

Los nombres y precios están en `src/lib/constants.ts` como fuente canónica.
Aquí está la lógica estratégica detrás de cada tier.

| Plan | Precio/mes | Target | Rol estratégico |
|------|-----------|--------|----------------|
| **GRATIS** | S/ 0 | Cualquiera | Lead magnet — 13 calculadoras + diagnóstico express + captura email |
| **STARTER** | S/ 129 | MYPE 1–20 workers | Primer sí — precio por debajo del costo de una consulta legal |
| **EMPRESA** | S/ 299 | Pequeña empresa 21–100 | Plan pivote — donde la garantía anti-multa tiene sentido financiero |
| **PRO** | S/ 649 | Mediana 101–300 | Plan margen — IA, auto-verify, API, SST completo, SLA |
| **CONSULTOR** | S/ 99–119/org | Contadores / abogados | Canal escalable — ver §10 |
| **ENTERPRISE** | Cotización | 300+ o grupos empresariales | On-premise option, integraciones, CSM dedicado |

**Lógica de pricing**:
- GRATIS es funnel, no negocio
- STARTER debe conseguir volumen (500+ empresas target) aunque ARPU bajo
- EMPRESA es el plan donde las métricas cierran (ARPU S/ 299, LTV proyectado S/ 7–10K)
- PRO captura valor asimétrico — los clientes PRO son 3x más rentables que los EMPRESA
- CONSULTOR es la palanca de escala (ver §10)
- ENTERPRISE es oportunista — no diseñar para ellos, pero aceptarlos cuando lleguen con talonario

### 6.4 Canales de adquisición, en orden de prioridad validada

| # | Canal | CAC estimado | Volumen techo | Prioridad Q2-Q4 2026 |
|---|-------|-------------|---------------|----------------------|
| 1 | **Consultores/contadores** | S/ 20–40/empresa vía consultor | Alto (25 emp/consultor promedio) | **#1 foco absoluto** |
| 2 | **SEO + calculadoras gratis** | S/ 0–15/lead | Medio-alto | #2 — ya desplegado |
| 3 | **Diagnóstico gratis** (lead magnet existente en `/diagnostico-gratis`) | S/ 10–30/lead | Medio | #3 — optimizar conversión |
| 4 | **Referidos empresa-a-empresa** | S/ 100–200 (crédito ofrecido) | Bajo-medio | #4 — arrancar post 20 clientes |
| 5 | **Eventos presenciales** (Colegio de Contadores, CCL, CONFIEP) | S/ 100–200/lead | Bajo | #5 — 1 evento/trimestre |
| 6 | **Partnerships verticales** (Cámara agro, Capeco, SNI) | S/ 200–500/lead | Medio (largo plazo) | #6 — post traction |
| 7 | **Workers como canal** (ver Capa 2) | S/ 0 | Alto (futuro) | #7 — 2027 |

**Por qué consultor es #1**: la unit economics cambia la ecuación. Ver §10.

---

## 7. Capa 2 — Identidad Laboral Portable

> **Estado**: infraestructura construida (`mi-portal`, WebAuthn, auto-verify IA,
> cascada de onboarding). **Workers reales en producción: cero**.
>
> **Gate para iniciar monetización**: 1,000 workers verificados con PWA activa +
> ≥1 firma biométrica. **Timeline objetivo**: Q3 2027.

### 7.1 El problema real que resolvemos

Un trabajador peruano promedio cambia de empleo cada 2–3 años. Cada cambio genera fricción cuantificable:

| Documento necesario | Método actual | Tiempo | Costo oculto |
|---------------------|--------------|--------|--------------|
| Certificado de trabajo | Pedir al ex-empleador | 5–30 días | Alta — riesgo de no respuesta |
| Constancia de haberes | Carta firmada | 5–30 días | Alta |
| CTS acumulada histórica | Llamar a BCP/BBVA/Interbank | 1–3 días | Media |
| Records de capacitaciones SST | **No existe registro portable** | Irreversible | Máxima — pierde todo |
| Legajo completo (DNI, CV, examen médico, AFP) | Re-subir desde cero | 1–2 semanas | Alta |
| Verificación de antecedentes | Llamada telefónica al ex-empleador | 3–15 días | Alta |

**Costo para la empresa contratante**: 2–4 semanas de onboarding administrativo
por cada trabajador. Empresa que contrata 50/año pierde ~100 semanas-persona
en papeleo.

**Costo para el trabajador**: frustración, delay en primer sueldo, posible
pérdida de oferta por lentitud.

### 7.2 "Mi Vida Laboral" — el producto

Un perfil portable, verificado, controlado por el trabajador.

```
+=================================================================+
|  MI VIDA LABORAL                                                 |
|  Juan Carlos Pérez Quispe                                        |
|  DNI: 45678912  (Nivel verificación: 3/4)                        |
|  comply360.pe/vida-laboral/jcpq-45678912                         |
|                                                                  |
|  +----- EXPERIENCIA VERIFICADA -------------------------------+ |
|  | ABC Constructora S.A.C. · RUC 20123456789                  | |
|  | Cargo: Ingeniero de campo · Régimen: Construcción civil    | |
|  | Ingreso 15/03/2022 · Cese 28/02/2025                       | |
|  | Sueldo final S/ 4,500 · Motivo: Renuncia voluntaria        | |
|  | Contrato firmado biométricamente: SÍ                       | |
|  | Boletas firmadas: 35/35 · Legajo score: 92/100             | |
|  | Compliance score del empleador: 87/100                     | |
|  |                                                             | |
|  | XYZ Minera E.I.R.L. · RUC 20987654321                       | |
|  | Cargo: Supervisor SST · Régimen: Minero                    | |
|  | Ingreso 01/04/2025 · Vigente                               | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +----- CAPACITACIONES CERTIFICADAS --------------------------+ |
|  | SST General (4h) · Aprobado 92% · 15/04/2025               | |
|  | Hostigamiento sexual (2h) · Aprobado 88% · 16/04/2025      | |
|  | IPERC (6h) · Aprobado 95% · 20/04/2025                     | |
|  | 3 certificados con QR verificable                          | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +----- DOCUMENTOS VERIFICADOS -------------------------------+ |
|  | DNI (foto)            IA verificado · 97% · Vigente        | |
|  | CV actualizado 2025   IA verificado · 91%                   | |
|  | Examen médico         IA verificado · 89% · Vence 2026     | |
|  | Afiliación AFP        IA verificado · 94% · Prima AFP      | |
|  | Antecedentes policiales · Manual · Vigente                  | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +----- BENEFICIOS ACUMULADOS --------------------------------+ |
|  | CTS depositada: S/ 12,450 (BCP, último depósito 15/11/2025)| |
|  | Vacaciones pendientes: 18 días                              | |
|  | Próxima gratificación: S/ 6,200 + S/ 558 bono (Jul 2026)   | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  [Compartir perfil]  [Descargar PDF]  [Generar link temporal]    |
+=================================================================+
```

### 7.3 Principios no negociables

1. **El trabajador es dueño de sus datos**. La empresa genera los eventos (contratos, boletas, capacitaciones), pero el worker decide con quién compartir. Cumple Ley 29733 peruana y mapea a LGPD brasileña, Ley 1581 colombiana, LFPDPPP mexicana.

2. **Verificación multicapa, declarada explícitamente**:
   - **Nivel 1**: Auto-reportado por el worker (el worker dice que trabajó ahí)
   - **Nivel 2**: Registrado en plataforma (contrato firmado en COMPLY360, boletas aceptadas)
   - **Nivel 3**: Verificación IA (documentos validados con GPT-4o vision + cross-match)
   - **Nivel 4**: Cross-check gubernamental (RUC contra SUNAT, DNI contra RENIEC, cuando se habilite API oficial)

   Nunca inventamos confianza. Siempre mostramos el nivel real.

3. **Portable de verdad**: export PDF con QR verificable + link temporal (72h, revocable). Sin lock-in.

4. **Retroactivo parcial**: si el worker trabajó en una empresa COMPLY360, está pre-verificado. Si no, puede subir docs que IA verifica (confianza menor pero procesable).

5. **Zero-knowledge por default**: nadie ve tu perfil sin tu consentimiento explícito. Ni siquiera tu empleador actual puede ver tu historial anterior salvo que lo compartas.

### 7.4 Monetización de Capa 2

> **El trabajador NUNCA paga.** Es el generador del efecto de red. Cobrarle
> destruiría la adopción y el moat.

| Pagador | Producto | Precio típico | Volumen anual Perú |
|---------|---------|--------------|-----------------|
| Empresa contratante | Verificación de antecedentes + legajo pre-importado al contratar | S/ 10–25/verificación | ~200K contrataciones formales/año |
| Fintech / Bancos | API de historial laboral verificado (con consentimiento) para scoring crediticio | S/ 2–5/consulta | Millones de consultas/año (mercado crédito de consumo) |
| AFP | Verificación empleador activo + sueldo real para fiscalizar aportes | S/ 1–3/verificación | Alta (500K+ afiliados activos rotando) |
| Trabajador (opcional) | Certificado "Vida Laboral" oficial con QR — reemplaza constancia de haberes | S/ 20–50/certificado | ~500K/año |
| Aseguradoras | Verificación de empleo para seguros de desgravamen, vida, SOAT laboral | S/ 3–8/consulta | Media |

#### Proyección conservadora

```
2027: 50K workers activos en plataforma
  - Verificaciones B2B    :  5,000 × S/ 15 = S/   75,000
  - Certificados Worker   :  2,000 × S/ 30 = S/   60,000
  - API fintech (piloto)  :                = S/    5,000
  TOTAL 2027              :              ~= S/  140,000  (USD 36K)

2029: 300K workers activos
  - Verificaciones B2B    : 50,000 × S/ 15 = S/  750,000
  - Certificados Worker   : 30,000 × S/ 30 = S/  900,000
  - API fintech           : 200K consultas × S/ 3 = S/ 600,000
  TOTAL 2029              :              ~= S/ 2,250,000 (USD 580K)
```

### 7.5 El efecto de red: workers como canal

La idea más poderosa de Capa 2:

```
Worker en Empresa A (usa COMPLY360)
         |
         | cambia de trabajo
         v
Worker entra a Empresa B (no usa COMPLY360 todavía)
         |
         | "En mi trabajo anterior firmaba con huella y mi legajo
         |  se actualizaba solo. Aquí me piden todo en papel? En
         |  serio?"
         v
Empresa B investiga COMPLY360
         |
         | descubre que el worker YA trae legajo verificado,
         | lo puede importar en 5 minutos vs 2 semanas
         v
Empresa B se suscribe
```

**CAC vía worker: S/ 0**. Es el canal más poderoso del plan — pero requiere
**masa crítica** de workers (estimado: 10K+ workers con PWA instalada).

### 7.6 El riesgo dominante de Capa 2

**Los workers no tienen incentivo individual fuerte para usar el portal** si la
empresa no lo exige. Y la empresa solo lo exige si paga Comply360. Es un
bootstrap clásico.

**Mitigaciones posibles, ordenadas por costo**:
1. Que la empresa **obligue** al uso del portal (firmar contrato/boleta = único canal digital)
2. Agregar valor puro-worker: calculadora de CTS personal, simulador de liquidación por cese, alertas de vacaciones propias
3. Gamificación del portal (streak, certificados de capacitación, completitud del legajo)
4. Partnership con bancos: "tu perfil COMPLY360 acelera tu crédito personal en 24h" (bajo riesgo, alto valor percibido)

**Criterio de abandono**: si al Q3 2027 tenemos <1,000 workers activos con
PWA instalada, Capa 2 se re-evalúa o se mantiene solo como feature interno de
Capa 1 (no producto independiente).

---

## 8. Capa 3 — Inteligencia Regulatoria

> **Estado**: data se acumula pasivamente con cada cliente de Capa 1. **Productos
> monetizables no existen aún**.
>
> **Gate**: ≥500 empresas activas + ≥10K diagnósticos completados. **Timeline
> más temprano**: Q3 2027.

### 8.1 El data moat — por qué es defendible

Con 500+ empresas y 10K+ diagnósticos, tendremos una base de datos **única
en Latinoamérica**:

| Data point | Granularidad | Unicidad |
|------------|-------------|----------|
| Compliance score por empresa | Mensual, por área (10 dimensiones) | **Solo nosotros** |
| Gaps más comunes por sector | Por régimen, tamaño, región | Solo nosotros |
| Tiempo de resolución de alertas | Por tipo, severidad, tamaño empresa | Solo nosotros |
| Correlación score vs multa real | Cuando acumulemos multas post-uso | **Único en Perú** |
| Estacionalidad de compliance | Mes a mes, por obligación | Solo nosotros |
| Preguntas más falladas del diagnóstico | Por área, régimen, sector | Solo nosotros |
| Adopción real de SST | Políticas, IPERC, capacitaciones, EPP | **Lo que SUNAFIL quisiera tener** |

### 8.2 Cuatro productos de datos, en orden de dificultad

#### Producto 1 — Reporte Sectorial (B2B media, bajo riesgo)

Reporte trimestral/mensual con benchmarks anonimizados por sector.

**Ejemplo real**:
```
COMPLY360 — Reporte Sectorial Q1 2027: Construcción Civil
Empresas analizadas: 87 (muestra anónima, >20 workers c/u)

Score promedio: 62/100 (vs 68 promedio nacional)

Top 5 gaps detectados:
 1. IPERC desactualizado (73% de empresas)
 2. Capacitaciones SST vencidas (68%)
 3. Contratos de obra sin cláusula de término (54%)
 4. Examen médico ocupacional vencido (49%)
 5. Comité SST sin actas recientes (41%)

Riesgo de multa estimado promedio por empresa: S/ 142,000
Multa más probable: Muy grave en SST (52.53 UIT = S/ 288,915)

Recomendación sectorial: priorizar actualización IPERC
(impacto en 4 de los 5 gaps)
```

**Compradores**:
- Estudios de abogados laborales: S/ 500–2,000/mes
- Gremios (CAPECO, SNI, CONFIEP, SNMPE): S/ 1,000–5,000/trimestre
- Consultoras de RRHH (Korn Ferry, Mercer, PwC Perú): S/ 500–1,500/mes

**Revenue piloto Q3 2027**: 5–10 suscripciones × S/ 1,500 = S/ 7.5–15K/mes.

#### Producto 2 — API de Compliance Score (B2B alto valor)

Endpoint REST que devuelve el score y risk profile de una empresa **con
consentimiento explícito**, consumible por terceros.

**Casos de uso reales**:
- Banco evaluando préstamo empresarial: "empresa con score 85 estable → menor tasa" (scoring de crédito alternativo)
- Aseguradora cotizando seguro de responsabilidad laboral: score real vs declaración jurada
- Cliente corporativo verificando proveedor: "este proveedor te cumple SUNAFIL antes de firmar MSA"

**Pricing**: S/ 5–50/consulta según volumen y profundidad.

#### Producto 3 — Due Diligence Laboral Instantánea (B2B enterprise)

Reporte ejecutivo para M&A, inversiones, o ingreso a cadenas de suministro.

**Contenido**:
- Compliance score histórico 12 meses
- Gaps activos con severidad + plan de regularización
- Historial de alertas críticas
- Litigios laborales estimados por patterns
- Costo estimado de regularización
- Benchmarking vs sector

**Compradores**: fondos de PE (LarrainVial, Credicorp Capital), corporativos
haciendo adquisiciones, cadenas mineras verificando proveedores.

**Pricing**: S/ 5,000–20,000 por reporte.

**Volumen potencial Perú**: 50–100 reportes/año al pico.

#### Producto 4 — Compliance Insurance (la idea más grande, también la más especulativa)

Hoy las aseguradoras peruanas (Rimac, Pacífico, La Positiva, Mapfre) venden
seguros de responsabilidad laboral basándose en declaración jurada del cliente
+ data sectorial genérica. **No tienen data REAL del nivel de compliance**.

COMPLY360 tendría esa data. Esto habilita pricing diferenciado:

```
Empresa con score 90+     →  Prima baja  (S/   200–   500/mes)
Empresa con score 60–89  →  Prima media (S/   500– 1,500/mes)
Empresa con score <60    →  Prima alta  (S/ 1,500– 5,000/mes)  o declinada
```

**Modelo de revenue**: revenue share con aseguradora. COMPLY360 provee
underwriting data; aseguradora pone licencia y capital.

**Reality check sobre el revenue share**:
- El 20–25% que proyecta el plan viejo es optimista. La realidad peruana es 10–15%.
- Partnerships con aseguradoras tardan **18–36 meses** en cerrarse.
- Requieren validación actuarial (al menos 2 años de data histórica).

**Proyección realista**: primer piloto Q4 2028 con **UNA** aseguradora, 50–100
empresas. Revenue significativo no antes de 2029.

### 8.3 Pitch al Estado (SUNAFIL / MTPE) — upside asimétrico

**La oportunidad**

SUNAFIL tiene ~800 inspectores para ~280,000 empresas con trabajadores formales.
1 inspector por cada 350 empresas. No dan abasto — y lo saben.

Si COMPLY360 se convierte en herramienta oficial de autoevaluación preventiva:
- SUNAFIL prioriza inspecciones a empresas de bajo score (enforcement data-driven)
- Empresas de score alto reciben "sello oficial de compliance" que reduce frecuencia de inspección
- MTPE tiene data agregada del estado de compliance nacional (hoy no tiene)

**El pitch**

> "Ministro, hoy SUNAFIL inspecciona a ciegas. Con 800 inspectores para
> 280K empresas, la probabilidad de detectar infracciones es del 0.3% anual.
> Si las empresas se autoevalúan con nuestra plataforma, usted puede enfocar
> sus inspectores en el 20% de peor score — multiplicando por 5 la
> efectividad de su presupuesto, sin gastar un sol más."

**Modelos de ingreso posibles**

| Modelo | Probabilidad | Revenue potencial | Timeline |
|--------|-------------|-------------------|----------|
| Contrato directo MTPE/SUNAFIL | Baja (licitación pública lenta) | S/ 2–5M/año | 18–36 meses |
| Mandato regulatorio (autoevaluación obligatoria vía plataforma aprobada) | Muy baja pero asimétrica | Transformacional | 24–48 meses |
| Partnership público-privado (gratis para MYPE, premium para medianas) | Media | S/ 500K–1M/año | 12–24 meses |

**Disciplina obligatoria**: el pitch al gobierno es un **juego largo, NO core
plan**. Upside puro. Si pasa, transformacional. Si no pasa, no cambia nada.
Nunca depender de él.

---

## 9. El Flywheel

### 9.1 El diagrama con dependencias duras

```
     +----- (1) Más empresas usan COMPLY360 -----+
     |       (requiere: ≥100 empresas pagando)    |
     |                                             v
     |                        (2) Más workers en mi-portal
(6) Gobierno                   (requiere: empresas obligan uso)
lo reconoce                            |
como estándar                          v
     ^                   (3) Workers cambian de empresa
     |                      y PIDEN COMPLY360
     |                      (requiere: >10K workers críticos)
     |                              |
(5) Mejores datos                   v
= mejor producto     (4) Más data = mejores benchmarks
     ^               = mejor IA = mejor producto
     |                        |
     +-- Consultores lo adoptan como estándar --+
           (requiere: 20+ consultores activos)
```

### 9.2 Defensibilidad por componente

| Componente | Defensibilidad | Tiempo para replicar (competidor serio) |
|-----------|----------------|----------------------------------------|
| Motor legal 518 tests | Alta (IP + expertise legal) | 6–12 meses |
| Base workers verificados | Muy alta (efecto red) | 2–3 años |
| Data compliance anonimizada | Extrema (data moat) | 3–5 años |
| Canal consultores | Alta (relaciones + economics) | 12–18 meses |
| Integración gobierno (si ocurre) | Máxima (regulatory moat) | Indefinido |

**Un competidor que entre hoy con USD 5M necesita 3–5 años para alcanzarnos
si ejecutamos bien**. En 3–5 años ya estamos en Colombia y México.

### 9.3 Qué destruye el flywheel

Honesto sobre las formas de fallar:

1. **Error público en cálculo legal** → reputación destruida → retención colapsa → canal consultor abandona
2. **Breach de datos de workers** → acción de clase + multa INDECOPI + pérdida de confianza generalizada
3. **Competidor bien financiado** que bundlea compliance dentro de payroll gratis
4. **Supabase / Vercel major outage** de varias horas en un día crítico (CTS mayo, grati julio)
5. **Founder burnout** antes de pre-seed

Mitigaciones específicas a cada uno en §16.

---

## 10. Go-to-market

### 10.1 Por qué el canal consultor es la palanca principal

El CAC vía consultor es drásticamente inferior porque **un consultor = N empresas
con un solo esfuerzo comercial**.

Unit economics (realistic, no el inflado del plan anterior):

```
1 consultor promedio Lima      = 20–30 empresas bajo gestión
Revenue por consultor (25 emp) = 25 × S/ 99 = S/ 2,475/mes
CAC consultor (blend)          = ~S/ 800 (evento + demo + 2 calls + setup)
Churn consultor anual          = 15% (conservador, SaaS B2B2B)
LTV consultor (80 meses)       = S/ 198,000

Pero hay soporte incremental:
Costo soporte por empresa      = S/ 25/mes (ticket promedio 0.5/mes × S/ 50)
Costo soporte por consultor    = 25 × S/ 25 = S/ 625/mes
Gross margin por consultor     = S/ 2,475 - S/ 625 - S/ 125 (infra) = S/ 1,725/mes
LTV consultor (ajustado)       = S/ 1,725 × 80 = S/ 138,000

LTV:CAC real                   = 138K / 800 = 172:1

Pero en escenario pesimista (churn 25%, support 2x):
LTV:CAC pesimista              = 60K / 800 = 75:1
```

Incluso en el escenario pesimista, **75:1 es económicamente brillante**.

**Corrección del plan anterior**: dijo 113:1 sin modelar costo de soporte. El
modelo real es 172:1 base o 75:1 pesimista, dependiendo de cuánto soporte genere
cada empresa. Ambos son extraordinarios.

### 10.2 El modelo "Consultor Partner"

```
+------------------------+       vende compliance      +------------------------+
|  COMPLY360             |       digital a sus          |  CONSULTOR             |
|                        |       clientes                |  (contador/abogado)    |
|  Plan CONSULTOR:       |<------------------------------>|                        |
|   · Cuenta gratis      |                               |  Cobra S/ 200–500/mes |
|     para consultor     |       gestiona N empresas     |  extra a cada cliente  |
|   · Cobra por          |       desde 1 dashboard        |  por "compliance       |
|     empresa gestionada |                                |   digital"             |
|   · Dashboard multi-   |       +-----+-----+-----+      |                        |
|     empresa            |       |Emp A|Emp B|Emp C|     |  Margen neto:          |
|   · Marca blanca       |       | 85  | 72  | 91  |     |  S/ 100–400/empresa    |
|     (logo propio)      |       +-----+-----+-----+      |                        |
+------------------------+       scores agregados        +------------------------+
```

### 10.3 Propuesta de valor para el consultor, priorizada

1. **Más revenue sin más trabajo**. Cobra S/ 200–500/mes extra por cliente. COMPLY360 cuesta S/ 99/empresa. Margen S/ 100–400.
2. **Reemplaza su Excel de vencimientos**. Hoy lleva en una hoja los CTS/grati/vacaciones de 25 empresas. Nosotros lo automatizamos.
3. **Dashboard de 25 empresas en una sola pantalla**. Prioriza su tiempo.
4. **Diferenciación competitiva** en su zona. "El único contador con compliance digital y garantía anti-multa."
5. **Branding opcional**. En planes premium, el consultor puede tener su propio subdominio con su logo — el cliente no ve COMPLY360.

### 10.4 Estructura de pricing para consultores

| Tier | Precio por empresa/mes | Descuento vs directo | Perks |
|------|------------------------|---------------------|-------|
| 1–10 empresas | S/ 119 | 20% | Dashboard multi-empresa |
| 11–30 empresas | S/ 99 | 34% | + Subdominio marca blanca |
| 31+ empresas | S/ 79 | 47% | + Account Manager + SLA 24h |

Workers del consultor ilimitados en todos los tiers.

### 10.5 Playbook de adquisición de consultores (los próximos 90 días)

**Mes 1: Sourcing + primer contacto**
- Identificar 100 contadores en Lima/Arequipa/Trujillo que manejen ≥15 empresas
- Fuentes: Colegio de Contadores Lima (12K miembros), grupos de WhatsApp/Facebook de planilleros, LinkedIn Sales Navigator
- Email/LinkedIn outreach personalizado → meta: 30 respuestas
- Demo 1-on-1 de 30 min → meta: 15 interesados serios

**Mes 2: Onboarding piloto**
- 10 consultores en programa "Founding Partner":
  - **Gratis 3 meses** para el consultor
  - **Gratis 2 meses** para sus primeras 5 empresas
  - Setup guiado white-glove (3h con el founder)
  - Migración gratuita desde su Excel
- Objetivo: 10 consultores activos, ~50 empresas facturables post-trial

**Mes 3: Testimonios + expansión**
- Caso de estudio publicado con métricas reales (score subió de X a Y, alertas evitadas)
- Webinar "Compliance digital para contadores" → 100 asistentes, meta: 20 leads consultor
- Programa de referidos: 1 mes gratis por cada consultor referido que active
- Objetivo al día 90: **20 consultores activos, 100 empresas facturables**

### 10.6 Señales vs ruido — qué medir en los primeros 90 días

**Leading indicators (señales tempranas)**:
- # de demos completadas por semana (ritmo)
- # de consultores en trial activo
- Tiempo desde demo → trial activo (<5 días = bueno)
- Tiempo desde trial activo → primera empresa gestionada (<10 días = bueno)

**Lagging indicators (resultado final)**:
- # empresas pagando al día 90 (target: 20+)
- ARPU por empresa (target: S/ 99 mínimo promedio)
- Churn consultor trimestral (target: <10%)

---

## 11. Expansión LATAM

### 11.1 Por qué LATAM, por qué en este orden

LATAM comparte un patrón estructural:
1. Legislación laboral **extremadamente compleja** (herencia del derecho continental)
2. Organismos de inspección **activos y con multas altas**
3. PYMEs que gestionan compliance **con Excel y papel**
4. **Zero** plataformas de compliance laboral dominantes
5. **Alta penetración de smartphones** en trabajadores (≥88% urbano)

### 11.2 Arquitectura multi-país (ya diseñada)

```
legaliapro-platform/
  src/
    lib/
      legal-engine/
        peru/            # peru-labor.ts + calculadoras Perú (hoy)
        colombia/         # colombia-labor.ts + calculadoras CO (Q2 2027)
        mexico/           # mexico-labor.ts + calculadoras MX (Q4 2027)
        chile/            # chile-labor.ts + calculadoras CL (2028)
        types.ts          # Types compartidos (input/output genérico)
        registry.ts       # Registro dinámico por país
      compliance/
        peru/             # 135 preguntas diagnóstico Perú
        colombia/          # Preguntas Colombia
        scorer.ts         # Engine genérico parametrizable
      ai/
        rag/
          peru/           # Corpus legal Perú (75+ normas indexadas)
          colombia/       # Corpus legal Colombia
```

Principio: **código genérico compartido (UI, auth, billing, alertas). Reglas
legales por país. Feature flag `COUNTRY` determina qué módulo cargar.**

**Esfuerzo estimado por nuevo país**: 3 meses con 1 dev senior + 1 abogado
laboralista local (200h de consulting). **NO 12 meses como un rebuild desde
cero**.

### 11.3 Ranking por país — honestidad brutal

#### Colombia (#1 — Q1–Q3 2027)

- **Por qué primero**: mercado 3x Perú (300K+ empresas formales), dolor similar, español idéntico, cultura empresarial cercana, contador como decision-maker
- **Regulación clave**: CST, Ley 100/1993, Decreto 1072/2015 (SG-SST), Resolución 0312/2019
- **Calculadoras a desarrollar**: prima de servicios, cesantías + intereses, vacaciones, indemnización Art. 64 CST, horas extras + recargos, aportes seguridad social, auxilio transporte, dotación
- **TAM**: 300K empresas × USD 50/mes promedio = **USD 180M/año**
- **Timeline**: iniciar Q1 2027 / beta Q2 / launch Q3 2027
- **Kill criterion**: si al Q1 2027 todavía no tenemos 300 empresas pagando en Perú, **posponer Colombia** hasta tener base sólida

#### México (#2 — Q3 2027 – Q1 2028)

- **Por qué segundo**: mercado más grande LATAM hispano (500K+ empresas formales), reforma outsourcing 2021 creó dolor enorme, STPS/IMSS muy activos, NOM-035 obliga nuevos diagnósticos
- **Complejidad adicional**: estados con regulación local, sindicatos fuertes, PTU obligatoria
- **TAM**: 500K empresas × USD 60/mes = **USD 360M/año**
- **Timeline**: Q3 2027 – Q1 2028
- **Riesgo específico**: IMSS digital ecosystem es más sofisticado — competidores locales (Runa, Nominapp MX) están despiertos

#### Chile (#3 — 2028 H1)

- **Por qué tercero**: Dirección del Trabajo activísima, reforma 2024 (40h) creó gaps, mercado sofisticado con willingness-to-pay alta, menor complejidad que CO/MX
- **TAM**: 200K empresas × USD 45/mes = **USD 108M/año**

#### Ecuador (#4 — 2028 H2 o 2029)

- Régimen artesanal complejo, competencia casi nula
- **Riesgo**: mercado pequeño (100K empresas), inestabilidad política
- **TAM**: USD 42M/año

#### Argentina (#5 — Alto riesgo/alto reward, 2029+)

- Complejidad extrema (400+ convenios colectivos por industria), dolor altísimo
- **Riesgo**: inestabilidad macroeconómica, cepo cambiario, impuestos impredecibles
- **TAM si la economía coopera**: USD 192M/año
- **Recomendación**: entrar solo si tenemos un equipo local con track record

### 11.4 Decisión clave: servicio multi-país centralizado vs entidad local

**Opción A — Todo desde Lima**: 1 entidad peruana factura a clientes LATAM vía
Stripe/Mercado Pago. Barato de operar, pero:
- Clientes corporativos LATAM prefieren factura local
- Gobiernos locales no reconocen provider extranjero para pitch oficial
- Costos de transferencia FX y 12.5% retención

**Opción B — Entidad local por país**: LLC/SpA/SAS por país cuando llegamos
a 50+ clientes. Más caro, pero desbloquea segmentos enterprise + gobierno.

**Recomendación operativa**: arrancar Opción A en cada mercado. Migrar a
Opción B cuando el MRR de ese país supere USD 20K/mes.

---

## 12. Roadmap

Este roadmap es **operacional**, no aspiracional. Cada fase tiene criterio
de éxito y **criterio de abandono** explícito.

### Fase A — Product-Market Fit (Q2–Q4 2026)

**Objetivo**: 100 empresas peruanas pagando. No 1,000. **Cien**.

| Q | Acción principal | Meta | Kill criterion |
|---|------------------|------|----------------|
| Q2 2026 | Activar Culqi prod. 10 primeros clientes con white-glove. | 10 pagando, MRR S/ 1.5K | Si al 30/Jun no hay 3 pagando → investigar ICP |
| Q3 2026 | Programa piloto consultores (10). SEO + diagnóstico gratis como funnel. | 50 pagando, MRR S/ 7.5K | Si <20 al 30/Sep → pivotar GTM |
| Q4 2026 | Garantía anti-multa live. Primer caso de estudio. Referidos activo. | 100 pagando, MRR S/ 15K | Si <60 al 31/Dec → no avanzar Fase B |

**North Star Fase A**: empresas con diagnóstico completado (no solo suscriptas).

**Supuestos críticos a validar**:
- ICP es contador o dueño-operador? (A/B test en Q2)
- Pricing correcto? (S/ 129 STARTER — probar S/ 99 en Q3 si retención baja)
- Canal consultor realmente escala? (validar con 10 consultores Q3)

### Fase B — Crecimiento acelerado Perú (Q1–Q4 2027)

**Objetivo**: 1,000 empresas + lanzar "Mi Vida Laboral" beta.

| Q | Acción principal | Meta | Kill criterion |
|---|------------------|------|----------------|
| Q1 2027 | Escalar canal consultores (20 → 50). pgvector indexado. "Mi Vida Laboral" beta cerrada. Colombia dev start. | 300 empresas, 3K workers | Si <200 al 31/Mar → detener Colombia |
| Q2 2027 | Primer reporte sectorial gratis (PR/SEO). Partnership exploratoria fintech. | 500 empresas, 8K workers | Si workers PWA activa <500 → Capa 2 re-evalúa |
| Q3 2027 | "Mi Vida Laboral" pública. API v2 con verificaciones. Colombia beta cerrada. | 750 empresas, 20K workers | Si Colombia <20 empresas al 30/Sep → pausa |
| Q4 2027 | Pitch aseguradoras. Primer producto de data pago. Colombia launch. | 1,000 empresas, 40K workers | Si MRR total <S/ 100K → recalibrar |

**North Star Fase B**: workers con perfil laboral activo + PWA instalada.

### Fase C — Plataforma LATAM (2028–2029)

**Objetivo**: 5,000+ empresas en 3+ países. Revenue diversificado (SaaS + data + API).

| Año | Acción principal | Meta |
|------|------------------|------|
| 2028 H1 | México launch. Insurance product piloto. API como producto independiente. | 3,000 empresas, 150K workers |
| 2028 H2 | Chile launch. Serie A raise USD 5–10M. Equipo 15–20. | 5,000 empresas, 300K workers |
| 2029 | Ecuador + Argentina selectivo. Gobierno partnerships Perú/Colombia. | 10,000 empresas, 500K workers |

---

## 13. Modelo financiero

### 13.1 Unit economics — Empresa plan como referencia

```
Precio mensual                 : S/  299
Costo marginal por cliente     :
  - Infra (Vercel + Supabase)  : S/   6
  - OpenAI (chat + autoverify) : S/   8
  - Email (Resend)             : S/   1
  - Cron + observability       : S/   2
  Subtotal infra               : S/  17
Costo soporte por cliente      : S/  25  (0.5 tickets × S/ 50/h)
Total costo variable           : S/  42
Gross margin                   : 86%
CAC blend (ver §10)            : S/ 150
Payback                        : 0.6 meses
Churn mensual (estimado)       : 4%
LTV                            : S/ 299 / 0.04 = S/ 7,475
LTV:CAC                        : 50:1
```

### 13.2 Proyección escenario BASE (realista)

| Métrica | 2026 H2 | 2027 | 2028 | 2029 |
|---------|---------|------|------|------|
| Empresas Perú | 100 | 1,000 | 2,500 | 4,000 |
| Empresas LATAM | — | 200 | 1,500 | 4,000 |
| **Total empresas** | **100** | **1,200** | **4,000** | **8,000** |
| ARPU mensual (blend) | S/ 130 | S/ 140 | S/ 150 | S/ 160 |
| **MRR SaaS (S/)** | **13K** | **168K** | **600K** | **1.28M** |
| Workers portal | 1K | 40K | 200K | 500K |
| Revenue Capa 2 (MRR) | — | 10K | 80K | 190K |
| Revenue Capa 3 (MRR) | — | 5K | 40K | 150K |
| **MRR total** | **13K** | **183K** | **720K** | **1.62M** |
| **ARR total** | **156K** | **2.2M** | **8.6M** | **19.4M** |
| **ARR en USD** | **~40K** | **~565K** | **~2.2M** | **~5.0M** |

### 13.3 Proyección escenario PESIMISTA (si Capa 2 no funciona)

| Métrica | 2026 H2 | 2027 | 2028 | 2029 |
|---------|---------|------|------|------|
| Total empresas | 80 | 700 | 2,000 | 4,500 |
| ARPU blend | S/ 120 | S/ 130 | S/ 140 | S/ 150 |
| MRR SaaS | 9.6K | 91K | 280K | 675K |
| Revenue Capa 2/3 | 0 | 0 | 10K | 50K |
| **MRR total** | **9.6K** | **91K** | **290K** | **725K** |
| **ARR en USD** | **~30K** | **~280K** | **~890K** | **~2.2M** |

**Interpretación**: incluso si Capa 2 falla completamente, llegamos a USD 2.2M ARR en 2029 solo con SaaS. Saludable pero no transformacional.

### 13.4 Proyección escenario OPTIMISTA (todo funciona + gobierno pega)

| Métrica | 2026 H2 | 2027 | 2028 | 2029 |
|---------|---------|------|------|------|
| Total empresas | 150 | 2,000 | 8,000 | 20,000 |
| MRR total | 20K | 350K | 1.5M | 4M |
| **ARR en USD** | **~62K** | **~1.1M** | **~4.6M** | **~12.3M** |

### 13.5 Sensibilidad — lo que mueve la aguja

| Variable | Base | Cambio | Impacto en ARR 2029 |
|----------|------|--------|---------------------|
| Churn mensual | 4% | 2% | +35% ARR |
| Churn mensual | 4% | 6% | −25% ARR |
| ARPU blend | S/ 160 | S/ 200 | +25% ARR |
| CAC | S/ 150 | S/ 300 | Menos empresas (50% en los canales pagos) |
| Workers PWA | 500K | 100K | Capa 2 revenue 80% menor |
| Colombia launch | Q3 2027 | Q1 2028 | ~−15% ARR LATAM |

**Los 2 drivers más importantes**: churn y workers PWA. Cuidar estos dos como
la pupila del ojo.

### 13.6 Burn rate realista

El plan anterior subestimaba costos operativos. Esta es la realidad.

| Fase | Equipo | Burn mensual | Fuente fondos |
|------|--------|-------------|---------------|
| Hoy (founder único) | 1 persona | S/ 8–12K (infra + legal + marketing mínimo + herramientas) | Bootstrapped |
| Post pre-seed (Q3 2026) | 3 personas | S/ 35–50K | Pre-seed USD 100–250K = runway 12–15 meses |
| Post seed (Q2 2027) | 6–8 personas | S/ 80–120K | Seed USD 500K–1.5M = runway 18–24 meses |
| Post Serie A (Q2 2028) | 15–20 personas | S/ 200–300K | Serie A USD 5–15M = runway 24–30 meses |

**Costos no obvios del burn actual (founder único)**:
- Infra: S/ 100–500/mes (se dispara con volumen de copilot IA)
- Legal (abogado laboralista en retención): S/ 1,500–3,000/mes
- Marketing (eventos, ads Google, LinkedIn Premium): S/ 2,000–5,000/mes
- Herramientas (Linear, Notion, Slack, Zoom, GitHub Team, Sentry Team, 1Password): S/ 400/mes
- Seguros (E&O): S/ 500/mes amortizado
- Contabilidad + tributario: S/ 800/mes
- **Total**: S/ 8–12K/mes muy fácilmente

### 13.7 Fundraising — cuándo y cómo

| Ronda | Timing | Monto | Dilución | Uso | Métricas para levantarla |
|-------|--------|-------|----------|-----|---------------------------|
| **Pre-seed** | Q3 2026 | USD 100–250K | 10–15% | Salarios 1 dev + 1 sales, 12 meses runway | 50+ empresas pagando, MRR USD 2K+, canal consultor validado con 5+ activos |
| **Seed** | Q2 2027 | USD 500K–1.5M | 15–20% | Equipo 5–8, Colombia, marketing | 500+ empresas, MRR USD 15K+, unit economics validados, 20+ consultores |
| **Serie A** | Q2 2028 | USD 5–15M | 15–25% | LATAM (3 países), equipo 15–20, data products | 3,000+ empresas, MRR USD 100K+, multi-país operativo |

**Fondos LATAM primeros en el radar** (ordenados por fit con vertical):
- **Kaszek Ventures** — escala LATAM, SaaS vertical B2B2B → fit alto
- **ALLVP** — México-based, thesis de compliance/legal tech → fit alto
- **Magma Partners** — Chile/LATAM, early stage → fit muy alto para pre-seed/seed
- **Monashees** — Brasil pero escala LATAM → fit medio
- **Mountain Nazca** — México, pre-seed/seed — fit medio
- **Angel Ventures** — México, regional → fit alto
- **Platanus Ventures** — Chile, early stage → fit alto para pre-seed

**Regla no negociable**: no levantar capital antes de tener señal de product-market fit en Perú. Levantar solo cuando los números **justifican** la dilución.

---

## 14. Los primeros 90 días — plan táctico

Esta sección es el **manual de piloto** que el documento estratégico debe tener.
Sin esto, la visión es un deck bonito.

### Semana 1–2: Listas + infraestructura comercial

- [ ] Crear base de datos de 100 prospectos consultores en Google Sheet:
  - Fuentes: Colegio Contadores Lima (directorio público), LinkedIn Sales Navigator, grupos Facebook "Planilleros Perú", referidos
  - Campos: nombre, empresa, email, LinkedIn, # empresas estimadas, warm intro sí/no
- [ ] Crear base de datos de 50 prospectos empresas directas:
  - Fuentes: LinkedIn de gerentes RRHH en empresas 50–200 workers, directorios gremiales (CAPECO, SNI)
  - Priorizar sectores con mayor dolor: construcción, agroexportadora, retail, minería
- [ ] Setear Notion/Hubspot CRM básico (gratis)
- [ ] Grabar 3 videos de demo (5 min cada uno):
  1. Demo para contador: multi-empresa + dashboard + tiempo ahorrado
  2. Demo para RRHH empresa: legajo IA + diagnóstico + alertas
  3. Demo para dueño PYME: garantía anti-multa + simulacro SUNAFIL
- [ ] Deck de ventas 10 slides:
  1. Portada (logo + tagline)
  2. El dolor (multa SUNAFIL cuantificada)
  3. Cómo se maneja hoy (Excel + rezar)
  4. Qué es COMPLY360 (3 pilares visuales)
  5. Demo screenshots (cockpit, legajo, diagnóstico)
  6. Casos de uso por sector
  7. Garantía anti-multa
  8. Pricing + ROI (1 alerta evitada = 6 meses pagado)
  9. Social proof (testimonios placeholder al principio)
  10. Next steps (trial + CTA)

### Semana 3–4: Outreach inicial

- [ ] 50 emails de cold outreach a consultores, personalizados:
  - Asunto: "Consultas X cómo reducir 10h/mes de planilla en tus 25 empresas?"
  - Cuerpo: 3 párrafos max + link al demo video + calendly de 15 min
  - **Meta**: 15 respuestas, 10 demos agendadas
- [ ] 30 mensajes LinkedIn a RRHH de empresas medianas:
  - Conexión + mensaje corto "Vi que maneja RRHH en [empresa], construí algo que podría serle útil"
  - **Meta**: 10 respuestas, 5 demos agendadas
- [ ] Publicar 2 artículos SEO:
  - "Cómo evitar una multa SUNAFIL en 2026: checklist completo"
  - "Régimen MYPE en Perú: ¿te conviene o no? Calculadora incluida"
- [ ] Postear 3 videos cortos en LinkedIn (founder-led content):
  - "3 errores que vi en todas las planillas que auditamos"
  - "Esto le costó S/ 28K a una empresa: contrato modal sin renovar"
  - "Cómo calcular CTS correctamente en 60 segundos"

### Semana 5–8: Cierre de los primeros clientes

- [ ] **Semana 5**: completar 10 demos con consultores + 5 con empresas
- [ ] **Semana 6**: cerrar primeros 3 consultores "Founding Partners":
  - 3 meses gratis + 2 meses gratis para primeras 5 empresas
  - Setup white-glove: founder personalmente hace el onboarding (3h cada uno)
- [ ] **Semana 7**: primer consultor onboarding sus 5 empresas
  - Migración de datos desde Excel
  - Capacitación 2h al equipo del consultor
- [ ] **Semana 8**: cerrar 2 empresas directas como "Early Adopters":
  - 50% descuento primeros 6 meses
  - Sesión white-glove 2h
  - Compromiso de testimonio público si quedan satisfechas a los 60 días

### Semana 9–12: Repetir + optimizar

- [ ] Métricas del funnel en revisión semanal:
  - Demos agendadas / emails enviados (target: >20%)
  - Demos → trial (target: >40%)
  - Trial → pagando (target: >50%)
- [ ] Recolectar objeciones más comunes, actualizar deck/script
- [ ] Identificar "cuñas" de copy que convierten mejor
- [ ] **Día 90**: target = **3–5 consultores activos, 20–30 empresas facturables**

### KPIs del plan de 90 días

| KPI | Target mínimo | Target stretch |
|------|---------------|----------------|
| Consultores contactados | 100 | 150 |
| Demos completadas | 30 | 50 |
| Consultores "Founding Partner" activos | 3 | 5 |
| Empresas facturables | 20 | 35 |
| MRR | S/ 2,000 | S/ 5,000 |
| Retention consultores a 90 días | 80% | 100% |
| NPS primeros clientes | 50+ | 70+ |

### Qué haríamos diferente si el plan falla

Señal de alarma: **<5 empresas facturables al día 60**.

Acciones:
1. Entrevistar 10 prospectos que dijeron no → por qué no
2. Validar ICP — ¿el contador es realmente el decision-maker?
3. Probar pricing alternativo (S/ 79 primer año vs S/ 129)
4. Cambiar canal primario (SEO vs consultor vs eventos)

### Qué haríamos si el plan funciona mejor de lo esperado

Señal positiva: **>30 empresas pagando al día 60**.

Acciones:
1. Acelerar hire sales (contratar 1 SDR part-time)
2. Levantar pre-seed antes (mejor momentum = mejor valuación)
3. Considerar empezar diseño de calculadoras Colombia (solo si Perú está estable)

---

## 15. Métricas — la pirámide

### 15.1 La pirámide de métricas

```
              ARR / MRR / LTV
                    |
         ─────────────────────────  (Lagging: valor económico creado)
                    |
          Empresas pagando · Churn
                    |
         ─────────────────────────  (Output: qué sale del embudo)
                    |
   Demos agendadas · Trials · NPS · Tickets
                    |
         ─────────────────────────  (Proxy: salud del producto + GTM)
                    |
       Emails enviados · Demos semanales
          Time-to-demo · Activation rate
                    |
         ─────────────────────────  (Leading: qué hacemos cada semana)
```

**La regla**: si solo mirás MRR, descubrís el problema tarde. Si solo mirás
emails enviados, te autopercibes productivo sin importar resultado. Necesitás
los tres niveles.

### 15.2 Dashboard semanal (revisión cada lunes 8am)

**Nivel Leading — qué hice la semana pasada**
- # emails de outreach enviados
- # demos agendadas
- # demos completadas
- # contenido publicado (articles + LinkedIn posts)

**Nivel Proxy — qué está pasando con quienes ya me conocen**
- # trials activos
- Tiempo promedio demo → trial
- Tiempo promedio trial → pagando
- NPS de quienes ya usan
- # tickets de soporte abiertos

**Nivel Output — cuántos clientes tengo**
- # empresas pagando
- # empresas nuevas esta semana
- # empresas que churnearon esta semana
- Net new revenue (nuevos - churn)

**Nivel Lagging — cuánto vale el negocio**
- MRR total
- ARR
- LTV:CAC
- Runway en meses

### 15.3 Métricas de calidad del producto

Además del revenue:
- **Time-to-first-value** (desde signup hasta score calculado) — target <24h
- **Activation rate** (% cohorte 7d que completó onboarding) — target >60%
- **Retention por cohort** (% cohorte que sigue pagando a M+1, M+3, M+6)
- **Ticket/cliente/mes** — target <0.5
- **Response time soporte p95** — target <4h hábiles
- **Uptime mensual** — target 99.5%+

### 15.4 North Star por fase

| Fase | North Star |
|------|-----------|
| Fase A (Q2-Q4 2026) | **# empresas con diagnóstico completado** (no solo suscripción — engagement real) |
| Fase B (2027) | **# workers con perfil laboral activo y PWA instalada** (el moat de Capa 2) |
| Fase C (2028+) | **# de consultas de terceros a API COMPLY360** (el moat de Capa 3) |

---

## 16. Riesgos — análisis pre-mortem

**Ejercicio mental**: imaginar que es Dec 2028, COMPLY360 fracasó, el equipo
se disolvió. ¿Cuál fue la causa de muerte?

### 16.1 Riesgos que matan el negocio (probabilidad × impacto)

| # | Riesgo | Probabilidad | Impacto | Mitigación específica |
|---|--------|-------------|---------|----------------------|
| 1 | Founder burnout antes de pre-seed | **Alta** | Crítico | Delegar sales a consultor partner en Q3 2026. Límite duro: no trabajar >50h/semana por >4 semanas sin pausa. |
| 2 | Error público en cálculo legal | Media | Crítico | Peer review de calculadoras por abogado laboralista. Seguro E&O S/ 500K cobertura. Disclaimer en UI. Proceso de update anual pre-enero. |
| 3 | Breach de datos workers | Baja | Crítico | RLS Postgres, encryption at rest, audit logs, pentest semestral (post-seed), SOC2 (post Serie A). |
| 4 | Competidor bien financiado bundlea compliance | Media | Alto | Velocidad + canal consultores (relaciones >>> features) + data moat. |
| 5 | Recesión reduce gasto PYME en software | Media | Medio | Posicionar como **ahorro vs multa**, no como gasto. Compliance no es opcional. |
| 6 | Actualización legal invalida calculadoras | Segura (anual) | Medio | Proceso operativo de update enero. Tests de regresión. Abogado en retención. |
| 7 | OpenAI degrada calidad / sube precio 10x | Media | Medio | Multi-proveedor ya implementado (Ollama, Deepseek, Groq fallback). |
| 8 | Workers no adoptan portal (Capa 2 falla) | Media | Alto (para Capa 2, no Capa 1) | Capa 1 funciona standalone. Capa 2 se re-evalúa si <1K workers PWA al Q3 2027. |
| 9 | Canal consultor no escala | Media | Medio | Plan B con SEO + referidos. Probar 10 consultores primero antes de escalar. |
| 10 | Cambio gobierno anti-empresa | Baja | Medio | Si enforcement sube → compliance importa MÁS. Win-win paradójico. |
| 11 | Supabase / Vercel outage en día crítico (15 mayo, 15 nov) | Baja | Alto | Migración plan a multi-cloud post-seed. Mientras: Vercel SLA + Supabase Pro. Status page honesto. |
| 12 | Regulación de IA Perú bloquea uso de copilot | Baja | Medio | Modo fallback determinista (BM25 sin LLM) para funcionalidad crítica. |
| 13 | Expansión Colombia subestima complejidad | Media | Alto | Regla no negociable: abogado laboralista local contratado ANTES de escribir código. |
| 14 | Gobierno es lento (pitch tarda 2+ años) | Alta | Bajo | No depender. Upside puro. |
| 15 | Garantía anti-multa abusada | Media | Medio | Letra chica seria (ver §6.2) + comité externo de apelación + límite agregado 15% MRR. |

### 16.2 Plan de respuesta a crisis

Si pasa #2 (error público) o #3 (breach), el playbook es:

**Primeras 4 horas**:
1. Confirmar internamente la gravedad
2. Notificar al abogado laboralista + equipo legal
3. Publicar comunicado inicial honesto en comply360.pe/status
4. Emails a TODOS los clientes afectados (no esperar a que pregunten)

**Primer día**:
1. Fix técnico en producción
2. Análisis forense del alcance (cuántos clientes, qué datos)
3. Plan de remediación específico por cliente
4. Comunicación pública con detalles + aprendizajes

**Primer mes**:
1. Post-mortem público (honestidad sobre causa raíz)
2. Proceso preventivo documentado
3. Compensación a clientes afectados (si aplica)
4. Auditoría externa si el incidente fue grave

---

## 17. Gobierno, equipo y capital

### 17.1 Founder y equidad fundacional

*Esta sección se completa por parte del founder. Placeholder para investor deck.*

- Founder(s): [NOMBRE], [NOMBRE]
- Equity split fundacional: [%]
- Vesting: 4 años, cliff 1 año
- Cap table pre pre-seed: 100% founders + 10–15% option pool reservado

### 17.2 Co-founder técnico / líder de ingeniería

**Realidad hoy**: founder único es técnico y comercial. **Riesgo alto**.

**Recomendación**: buscar co-founder técnico o Head of Engineering en Q3 2026
(post pre-seed) con equity 5–15% según timing.

Perfil ideal:
- 5+ años construyendo productos SaaS B2B
- Experiencia LATAM preferida
- Track record con Next.js / TypeScript / Postgres
- Seniority para llevar equipo de 3–5 devs en 2027

### 17.3 Advisors estratégicos (deseados pre-seed)

| Tipo de advisor | Ofrecemos | Qué aporta |
|-----------------|-----------|------------|
| Contador senior peruano | 0.25–0.50% equity | Credibilidad en canal consultor, intros |
| Abogado laboralista top-tier | 0.25–0.50% equity | Peer review legal, representación en incidentes |
| Ex-SUNAFIL / ex-MTPE | 0.25–0.50% equity | Pitch al gobierno, credibilidad regulatoria |
| Founder SaaS LATAM exitoso (Buk, Runa, Nowports) | 0.5–1% equity | Fundraise, GTM, hiring |

Max 4 advisors totales. Total pool: 2%.

### 17.4 Equipo proyectado

| Fase | Rol | Cuándo | Prioridad |
|------|-----|--------|-----------|
| Hoy | Founder | — | — |
| Post pre-seed Q3 2026 | SDR / Growth | Mes 1 | Crítico (el founder es el bottleneck) |
| Post pre-seed Q3 2026 | Dev senior FE/BE | Mes 2 | Alto |
| Post seed Q2 2027 | Head of Sales | Mes 1 | Crítico |
| Post seed Q2 2027 | Customer Success (1–2) | Mes 2 | Alto |
| Post seed Q2 2027 | Abogado laboralista in-house (0.5 FTE) | Mes 3 | Alto |
| Post seed Q2 2027 | Dev Colombia | Mes 3 | Alto |
| Post Serie A Q2 2028 | CTO (si no hay co-founder técnico) | Mes 1 | Crítico |
| Post Serie A | Head of Data | Mes 3 | Alto |
| Post Serie A | Legal counsel regional | Mes 4 | Medio |

### 17.5 Cap table proyectado

```
Hoy:
  Founder(s)            100%

Post pre-seed (Q3 2026):
  Founder(s)            80%
  Investors             15%
  Option pool           5%

Post seed (Q2 2027):
  Founder(s)            62%
  Pre-seed investors    12%
  Seed investors        18%
  Option pool           8%

Post Serie A (Q2 2028):
  Founder(s)            48%
  Pre-seed              8%
  Seed                  12%
  Serie A               20%
  Option pool           12%
```

### 17.6 Gobierno corporativo

- Consejo: 3 asientos pre-seed (2 founder, 1 investor), 5 post-seed (2 founder, 2 investor, 1 independiente), 7 post-Serie A
- Decisiones reservadas a consejo: hire/fire C-level, M&A, cambio de plan estratégico mayor, deuda >USD 500K, opciones >0.5% por persona
- Decisiones reservadas a founder: equipo operativo, contratos <USD 50K, pricing tactical, roadmap trimestral

---

## 18. Lo que NO haremos

Tan importante como la visión es la disciplina de decir NO.

### Antes de 100 empresas pagando en Perú

1. **NO expandir a Colombia.** Perú es el mercado de validación. Sin tracción aquí, multiplicar mercados multiplica fracasos.
2. **NO construir más features grandes.** 747 archivos y 199 endpoints son suficientes. Vender lo que hay.
3. **NO contratar developers antes que vendedores.** El bottleneck es distribución, no producto.
4. **NO buscar Serie A sin pre-seed primero.** La validación con clientes reales es lo que hace que la valuación suba 10x.
5. **NO construir reportes PDF ejecutivos perfectos.** Lo que importa es que el score sea correcto y la garantía honrable.
6. **NO entrar a enterprise sin product-market fit en PYME.** Enterprises piden SOC2, SLAs 99.9%, on-premise — distracción mortal.

### Nunca

1. **NO competir en precio.** S/ 129 es 20x más barato que S/ 247 de multa mínima. La batalla es en valor, no costo.
2. **NO depender del gobierno.** Pitch a SUNAFIL es juego largo. Si pasa, upside. Si no, producto vende solo.
3. **NO crecer más rápido que la capacidad de soportar.** Un cliente PYME insatisfecho conta a 10. Satisfecho refiere a 3. Asimetría brutal.
4. **NO subestimar al contador.** Es el decision maker. Tratarlo como socio, nunca como usuario comoditizado.
5. **NO mentir sobre capacidades.** Si la IA no sabe, decirlo. Si la calculadora tiene un supuesto, mostrarlo. La confianza es el único activo no-replicable.
6. **NO compartir datos de workers sin consentimiento.** Esto destruiría Capa 2 y traería multas INDECOPI. Zero-knowledge por default, siempre.

---

## 19. Decision framework — cuándo pivotar

Las startups mueren por aferrarse a planes obsoletos. Esta sección define
**cuándo reconsiderar la estrategia**.

### 19.1 Señales duras de que el plan funciona

- Q2 2026: 5+ empresas pagando sin descuento excepcional → validación precio
- Q3 2026: 10+ consultores en trial → validación canal principal
- Q3 2026: 3+ empresas refiriendo a otras → validación producto
- Q4 2026: ≥60 empresas pagando + retention ≥80% → validación escalable
- Q1 2027: NPS ≥50 + churn mensual <4% → listos para levantar seed

### 19.2 Señales duras de que el plan requiere ajuste

| Señal | Interpretación | Acción |
|-------|---------------|--------|
| Q2 2026: <3 empresas pagando al 30/Jun | ICP no definido o pitch débil | Pausar todo, entrevistar 10 clientes/prospects → rediseñar pitch |
| Q3 2026: <15 empresas pagando al 30/Sep | Canal consultor no escala como previsto | Probar canal alternativo (SEO + self-serve) en paralelo 30 días |
| Q4 2026: <50 empresas al 31/Dec | Product-market fit dudoso | Pivotar vertical (¿solo construcción? ¿solo agro?) o mercado (empezar Colombia?) |
| Churn >8%/mes sostenido | Retención rota | Pausar adquisición, foco full en customer success |
| CAC >S/ 500 sostenido | Canal caro | Cambiar mix de canales; reducir paid si aplicable |

### 19.3 El kill criterion explícito

**Si al 31 de diciembre 2026 tenemos <40 empresas pagando, detenemos la inversión
agresiva y re-evaluamos:**

Opción A — Mercado correcto, pitch incorrecto:
- 3 meses intensivos de customer development
- Re-pitch + re-pricing

Opción B — Mercado incorrecto:
- Evaluar Colombia directo (si encontramos advisor laboralista colombiano)
- Evaluar contadores argentinos (mayor dolor, más tolerancia al SaaS)

Opción C — Producto correcto, founder no está hecho para sales:
- Contratar VP Sales con equity agresivo (3–5%)
- Founder vuelve a producto

Opción D — Ninguna funciona:
- Vender el producto (motor legal es activo valioso para Runa/Buk/Gusto)
- Pivotar a vender el motor legal como API (Stripe-for-compliance)

**La disciplina no es evitar pivotar. Es pivotar cuando los datos lo piden,
no antes ni después.**

---

## 20. Competencia

### 20.1 Hoy (Perú, Q2 2026)

| Competidor | Qué hace | Fortaleza | Debilidad vs nosotros |
|-----------|----------|-----------|-----------------------|
| **Ninguno directo** | — | — | — |
| **Buk** | HRIS con módulo payroll básico | Bien financiado, marca, equipo LATAM | Sin compliance engine, sin diagnóstico, sin simulacro, sin SST profundo |
| **Ofisis / Exactus** | ERP legacy con módulo planilla | Base instalada grande (post 2000) | On-premise, sin IA, sin portal worker, sin API moderna |
| **Estudios de abogados** | Asesoría laboral reactiva | Credibilidad alta en enterprise | S/ 200–500/h, reactivo, no escalable |
| **Contador + Excel** | Control manual | Costo bajo / sin costo marginal | Error humano, sin alertas, sin diagnóstico |

### 20.2 Competencia entrante (24–36 meses)

El vacío competitivo no durará. Quién puede entrar:

| Actor | Probabilidad entrada 2027 | Amenaza | Defensa |
|-------|---------------------------|---------|---------|
| **Factorial** (España, USD 1B) | Media — ya en México | Capital + equipo | Data moat + canal consultor + marca local |
| **Runa** (México, USD 60M Serie B) | Alta — ya en LATAM expansión | Conocimiento mercado + recursos | Vertical profundo vs su horizontal |
| **Deel** (USD 12B valuación) | Baja — foco freelance/EOR | Capital | No va a competir en PYME local |
| **Nominapp** (Colombia) | Media — ya en Colombia/México | Local LATAM | Sin compliance profundo, sin IA laboral |
| **Un nuevo entrante** | Alta (2–3 podrían aparecer) | Velocidad + capital | Tiempo como ventaja |

### 20.3 Posicionamiento estratégico — el gráfico de 2×2

```
                    PROFUNDIDAD COMPLIANCE (qué tan profundo cubre la regulación laboral)
                         ^
                         |
                    COMPLY360  *
                         |
                         |
                         |        Factorial   *
                         |
                         |
                    +----+----+----+---->  AMPLITUD HRIS
                         |  (payroll, talent, benefits, hiring, etc.)
                         |
                    Buk *  Deel *  Rippling *
                         |
                    Nominapp *
                         |
                 (POCA PROFUNDIDAD / MUCHA AMPLITUD)
```

**COMPLY360 NO compite con Buk/Deel/Rippling.** Los complementa. Una empresa
puede tener Buk para RRHH generalista Y COMPLY360 para compliance. No es
either-or.

**Futuro**: la API de COMPLY360 puede integrarse dentro de Buk como módulo de
compliance (modelo Stripe-inside-Shopify). Buk cobra la integración, nosotros
cobramos el engine. Esto es **revenue en vez de competencia**.

### 20.4 Cómo ganamos

No ganamos por tener más features. Ganamos por:

1. **Velocidad de ejecución**: deploy, iterar, responder a clientes en horas, no semanas
2. **Profundidad vertical**: 518 tests en 12 regímenes peruanos vs 0 en competencia
3. **Canal consultor**: relaciones humanas que un producto self-serve no replica
4. **Garantía anti-multa**: diferenciador inigualable
5. **Obsession con el dolor SUNAFIL**: no somos "otro software de RRHH". Somos el escudo.

---

## 21. Cultura

La cultura no se escribe en una página; se demuestra en decisiones. Pero estas
son las creencias que queremos que el equipo comparta.

### 21.1 Cinco creencias operativas

1. **La confianza es el único activo no-replicable.** Todo lo demás (features, código, UI) se copia. Que un cliente confíe en nosotros con su nómina y su legajo no se copia. Cada decisión preserva o erosiona confianza.

2. **Velocidad + disciplina, no velocidad o disciplina.** Shippear rápido sin romper cosas críticas. Cada commit pasa tests. Cada feature se pregunta "¿esto sirve al cliente o a nuestro ego?".

3. **El trabajador es usuario de primera.** Aunque no pague. Si el portal tiene fricción, si la firma falla, si su legajo se pierde — estamos mal. Punto.

4. **Honestidad radical, también incómoda.** Si un cálculo dio mal, decirlo. Si una feature no está lista, no prometerla. Si un cliente no es fit, rechazarlo. La verdad es el marketing de largo plazo.

5. **Latinoamérica merece herramientas de clase mundial.** No "versión lite del producto gringo". No "porque en LATAM no pagan tanto". Construir como si fuéramos YC × clase A — porque las PYMEs peruanas merecen lo mismo que una startup de SF.

### 21.2 Cómo reclutamos

Buscamos:
- **Builders** — gente que quiere shipping, no reuniones
- **Humildes y fuertes** — opinión propia fuerte, pero mutable ante evidencia
- **LATAM-first mindset** — no buscan la salida a USA; creen que la plataforma puede construirse desde acá
- **Customer-obsessed** — curiosos sobre clientes reales, no abstractos

Rechazamos:
- "Product managers" que no han construido nada
- "Growth hackers" que no conocen el producto
- Remotos dispersos que nunca se sentaron con un cliente
- Seniors que requieren jerarquía para funcionar

### 21.3 Cómo tomamos decisiones

- **Reversibles** → quien esté más cerca del problema decide, comunica
- **Irreversibles** → founder + al menos 1 input adicional antes de comprometerse
- **Estratégicas** → documentadas en escritura, revisadas a 30 días

El comité más peligroso de una startup es el que decide features. Las decisiones
de producto las toma el founder escuchando clientes, no una votación interna.

---

## 22. Última palabra

La competencia de COMPLY360 no es otro software.

Es el Excel del contador, la carpeta Manila del legajo, y la esperanza de que
SUNAFIL no toque la puerta.

Contra eso, ya ganamos técnicamente. Los 518 tests pasan. Los 45 modelos Prisma
existen. El portal del trabajador está en producción. Las 13 calculadoras
funcionan en los 12 regímenes. El Founder Console ya impersona, invita admins,
gestiona empresas.

Ahora hay que pasar el único test que importa: **el del mercado**.

El primer cliente que pague. El segundo que refiera. El tercero que diga "no
puedo vivir sin esto".

Todo lo demás — las tres capas, las proyecciones de ARR, los fondos LATAM, la
expansión a México — depende de esos tres clientes.

Los primeros tres son la fundación. Si ellos nos validan, construimos
Latinoamérica encima. Si no, volvemos al tablero de dibujo con evidencia real.

**Este documento no será medido por lo bien que está escrito, sino por lo bien
que describe la realidad en Diciembre de 2026.**

Si para esa fecha la primera línea del §1 dice "300 empresas pagando, MRR
USD 15K+, canal consultor validado" — este documento fue útil.

Si la primera línea del §1 sigue diciendo "100 empresas" y estamos reescribiendo
la estrategia — este documento fue cumplido y ahora hay que hacer el siguiente.

Ambas son victorias.

La derrota es no tener evidencia ni de un lado ni del otro, porque nos quedamos
construyendo features en vez de salir a vender.

Ahora, a vender.

---

**Documento creado**: 2026-04-21
**Documento reescrito**: 2026-04-22 (versión 2.0, ejecutable)
**Autor original**: Equipo COMPLY360
**Versión**: 2.0
**Próximo review**: al alcanzar 50 empresas pagando en Perú
**Responsable de actualizar**: founder (no delegar — es memoria institucional)
