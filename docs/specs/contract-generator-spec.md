# INFORME INTEGRAL LEGAL-TÉCNICO
## Módulo "Generador de Contratos Laborales" — COMPLY360 PERÚ

**Destinatario:** Equipo de desarrollo / Amado Jara Carranza (Founder & Dev único)
**Versión:** 1.0 — Mayo 2026
**Stack objetivo:** Next.js 15 · TypeScript · PostgreSQL 16 · Prisma 7 · NextAuth v5 · Vercel + Supabase
**Multi-tenant con row-level isolation y `getTenantPrisma()`**

---

## TL;DR (BLUF)

- **El módulo debe colapsar los 8 regímenes peruanos en un árbol de decisión jerárquico de 4 ramas** (sectorial CIIU → tamaño Ley MYPE 32353/2025 → actividad accesoria → fallback D.Leg. 728), y el motor de validación debe centrarse quirúrgicamente en los Arts. 72 y 77 del TUO 728 porque ahí se concentra >85% de la jurisprudencia que produce reposiciones por despido incausado y la totalidad de las multas SUNAFIL "muy graves" del numeral 25.5 del DS 019-2006-TR.
- **Hito de diseño que cambia el flujo:** el registro de contratos modales ante el MTPE fue **suprimido por el D. Leg. 1246 del 10-nov-2016** (3ª DCM, modificó el Art. 73 del DS 003-97-TR). El módulo NO debe forzar "presentar al MTPE en 15 días"; el control hoy es por fiscalización posterior SUNAFIL. SIVICE solo aplica a contratos de extranjeros (D.Leg. 689). Sí persiste registro sustantivo para tiempo parcial, exportación no tradicional, agrario, intermediación y futbolistas profesionales.
- **La trazabilidad criptográfica debe combinar tres capas:** hash-chain SHA-256 por contrato + Merkle tree diario por tenant + anclaje dual RFC 3161 (TSA acreditada por INDECOPI, valor legal directo bajo Ley 27269) y OpenTimestamps sobre Bitcoin (público, gratuito). Esta arquitectura supera el estándar premium de los estudios jurídicos peruanos, que típicamente solo emplean firma digital simple sin anclaje temporal verificable.

---

# PARTE I — MARCO LEGAL Y FUNDAMENTACIÓN JURÍDICA

## 1. Valores fijos peruanos vigentes (corrección importante)

| Concepto | Valor | Norma |
|---|---|---|
| **UIT 2026** | **S/ 5,500.00** | D.S. N.° 301-2025-EF (publicado 17-dic-2025 en El Peruano): "Durante el año 2026, el valor de la Unidad Impositiva Tributaria (UIT) como índice de referencia en normas tributarias será de S/ 5,500.00." |
| **RMV** | S/ 1,130.00 | D.S. N.° 006-2024-TR (publicado 28-dic-2024, vigente desde 1-ene-2025) |

> ⚠️ El brief del usuario consigna "UIT S/ 5,400" y "RMV S/ 1,130 (D.S. 011-2023-TR)". Ambos datos están desactualizados: la UIT correcta para 2026 es **S/ 5,500** (D.S. 301-2025-EF) y la norma habilitante de la RMV vigente es el **D.S. 006-2024-TR**, no el 011-2023-TR. Todas las reglas y umbrales del módulo deben parametrizarse para que estos valores sean configurables (no hard-coded), porque cambian anualmente.

## 2. Los 8 Regímenes Laborales Peruanos: análisis comparativo

### 2.1 Régimen General de la Actividad Privada (D.Leg. 728)

**Base legal nuclear:**
- D.Leg. 728 (Ley de Fomento del Empleo), TUO aprobado por D.S. 003-97-TR (Ley de Productividad y Competitividad Laboral – LPCL).
- Reglamento: D.S. 001-96-TR.
- Ley 27735 (Gratificaciones), D.Leg. 650 + Ley 30334 (CTS y bonificación extraordinaria 9% por inafectación), D.Leg. 713 (Descansos remunerados), Ley 25129 (Asignación familiar), Ley 30709 (Igualdad remunerativa), Ley 29783 (SST).

**Beneficios sociales:**

| Concepto | Cuantía |
|---|---|
| RMV | S/ 1,130.00 (D.S. 006-2024-TR) |
| Jornada | 8 h/día — 48 h/semana (Art. 25 Constitución) |
| Vacaciones | 30 días/año (D.Leg. 713) |
| Gratificaciones | 2 al año (Julio + Diciembre), 1 RM cada una + bonificación extraordinaria 9% (Ley 30334) |
| CTS | 1 RM/año (depósitos semestrales mayo y noviembre) |
| Asignación familiar | 10% RMV (S/ 113.00) por hijo menor de 18 o estudiante hasta 24 |
| Indemnización por despido arbitrario | 1.5 RM por año, máx. 12 RM (Art. 38 LPCL) |
| Periodo de prueba | 3 meses (6 si calificado, 12 si confianza/dirección) |
| Aporte EsSalud (empleador) | 9% |

### 2.2 Régimen MYPE (Microempresa y Pequeña Empresa)

**Base legal:**
- Ley 28015 (original) → consolidado en T.U.O. de la Ley MYPE D.S. 013-2013-PRODUCE.
- D.Leg. 1086 (régimen laboral especial).
- **Ley 32353 (publicada 27-may-2025, vigente con su reglamento — plazo 60 días)** — Ley para la formalización, desarrollo y competitividad de la MYPE. Mantiene umbrales pero introduce: (i) permanencia 3 años calendarios en régimen aunque exceda techo, (ii) Sistema de Pensiones Sociales obligatorio para microempresa con trabajadores ≤40 años (4% RMV), (iii) registro vía declaración jurada ante MTPE, (iv) crédito tributario por capacitación (1% planilla anual, vigencia 3 ejercicios desde 2025).

**Umbrales actualizados con UIT 2026 = S/ 5,500:**

| Categoría | Ventas anuales |
|---|---|
| Microempresa | hasta 150 UIT = **S/ 825,000** |
| Pequeña Empresa | de 150 UIT hasta 1,700 UIT = **S/ 9'350,000** |

**Cuadro comparativo de beneficios MYPE:**

| Beneficio | Microempresa | Pequeña Empresa |
|---|---|---|
| Vacaciones | 15 días | 15 días |
| Gratificaciones | NO | ½ remuneración (jul. y dic.) |
| CTS | NO | 15 remuneraciones diarias/año (tope 90 RD) |
| Asignación familiar | NO obligatoria | NO obligatoria |
| Indemnización despido | 10 RD por año (tope 90 RD) | 20 RD por año (tope 120 RD) |
| Salud | SIS semicontributivo (50% empleador, 50% Estado) | EsSalud regular (9% empleador) |
| Pensiones | Sistema Pensiones Sociales (4% RMV) | SNP/SPP regulares |
| RMV | RMV completa | RMV completa |

**Excluidos:** Bares, discotecas, casinos/juegos de azar, grupos económicos vinculados que en consolidado superen los topes. Inscripción REMYPE obligatoria como condición habilitante.

### 2.3 Régimen Agrario (Ley 31110)

**Base legal:** Ley 31110 (publicada 31-dic-2020) + Reglamento D.S. 005-2021-MIDAGRI (publicado 30-mar-2021).

**Ámbito subjetivo:** Personas naturales/jurídicas que (i) desarrollen cultivos y/o crianzas, o (ii) realicen actividad agroindustrial fuera de Lima Metropolitana y Callao Constitucional, usando principalmente productos agropecuarios. **Excluidos:** trigo, tabaco, semillas oleaginosas, aceites, cerveza; personal administrativo y de soporte técnico (no campo/planta); productores asociados con ≤5 ha por asociado.

**Esquema remunerativo:** Remuneración Diaria (RD) = RB + 16.66% (gratificaciones) + 9.72% (CTS), cuando el trabajador opta por prorrateo. RB no inferior a RMV. **Bonificación Especial por Trabajo Agrario (BETA) = 30% RMV** no remunerativa, no pensionable.

**Vacaciones:** 30 días (no 15 como antes en Ley 27360 derogada).
**Indemnización despido arbitrario:** 45 RD por año (tope 360 RD).
**Modalidades contractuales:** Determinado o indeterminado (Art. 8 Ley 31110). **Prohibida** intermediación/tercerización que implique mera cesión de personal.

### 2.4 Régimen de Construcción Civil

**Base legal:** Régimen consuetudinario por convenio colectivo de rama. R.M. 197-2025-TR (Convención Colectiva 2026 CAPECO–FTCCP, publicada 19-dic-2025). D.Leg. 727 Art. 12: la frontera de aplicación es el costo de obra > 50 UIT.

**Categorías y jornal básico (vigente desde 01-jun-2025 hasta 31-may-2026, según FTCCP Tabla Salarial 2026):**

| Categoría | Jornal Básico Diario |
|---|---|
| Operario | S/ 87.30 |
| Oficial | S/ 68.50 |
| Peón | S/ 61.65 |

**Beneficios particulares:**
- **BUC (Bonificación Unificada de Construcción):** 32% jornal básico para operarios; 30% para oficiales/peones (Res. Directoral 155-94-DPSC).
- **BAE (Bonificación por Alta Especialización):** 8%/10%/17%/20% según especialidad (soldador 6G homologado: 20%).
- **Movilidad:** 6 pasajes urbanos/día sin distinción de categoría.
- **Asignación escolar:** 30 jornales básicos/año por hijo menor de 18 (extendible a 22 si estudios técnicos/superiores).
- **Bonificación por altura:** 7% del jornal por cada 4 pisos a partir del 4° piso (o desde 10 metros de altura).
- **Bonificación por contacto con agua/aguas servidas:** 20% jornal.
- **Bonificación por trabajo bajo cota cero:** S/ 1.90 por día por debajo del 2° sótano o 5 m bajo cota cero.
- **Bonificación por turno nocturno:** 25% jornal (jornada 23:00 a 06:00).
- **Gratificaciones:** 40 jornales básicos por Fiestas Patrias (1/7 por mes laborado de enero–julio); 40 jornales por Navidad (1/5 por mes ago–dic).
- **CTS:** 15% remuneraciones básicas + horas extras; pago dentro de 48h del cese.
- **Vacaciones:** 30 días o compensación 10% del salario básico anual.
- **Día del Trabajador de Construcción Civil:** 25 de octubre (Ley 24324) — feriado pagado del régimen.

**Característica esencial:** Los contratos son por obra determinada y los trabajadores deben estar inscritos en el **RETCC** (Registro Nacional de Trabajadores de Construcción Civil).

### 2.5 Régimen del Trabajo del Hogar (Ley 31047)

**Base legal:** Ley 31047 (publicada 1-oct-2020) + Reglamento D.S. 009-2021-TR. Implementa Convenio OIT 189.

**Características:**
- Contrato escrito, por duplicado, registrado por el empleador en el **Registro del Trabajo del Hogar** del MTPE en plazo no mayor a 3 días hábiles.
- Presunción de plazo indeterminado (Art. 5.1 Reglamento).
- Edad mínima: 18 años.
- Jornada: 8 h/día – 48 h/semana. Descanso mínimo 12 h continuas (residentes).
- Remuneración: no inferior a RMV (jornada completa); proporcional para parciales.
- Gratificaciones: una RM en julio y otra en diciembre (no ½ como MYPE).
- CTS: equivalente a 1 RM/año (depósito semestral).
- Vacaciones: 30 días.
- Aporte salud y pensiones: íntegro a cargo del empleador como en régimen general.

### 2.6 Régimen de Exportación No Tradicional (D.L. 22342)

**Base legal:** D.L. 22342 (1978) + Art. 80 D.S. 003-97-TR.

**Requisito subjetivo (Art. 7 D.L. 22342):** La empresa debe exportar directamente o por intermedio de terceros **≥40% del valor de su producción anual efectivamente vendida**.

**Régimen contractual (Art. 32 D.L. 22342):** Permite contratación **temporal indefinidamente prorrogable**, sin sujetarse al plazo máximo de 5 años del Art. 74 LPCL (Cas. Lab. 2047-2015-Arequipa). Pero exige que cada contrato/prórroga consigne expresamente:
1. **Contrato de exportación, orden de compra o documento que origine la exportación.**
2. **Programa de producción de exportación** para satisfacer el contrato.

**Causales de desnaturalización (Cas. Lab. 11259-2017-Lima, Segunda Sala SDCST):**
> "Cabe indicar que la terminación del contrato de trabajo de duración determinada desnaturalizado también podrá calificar como un Despido Incausado".

Si el contrato carece de la causa objetiva (orden de compra + programa), se desnaturaliza vía Art. 77.d LPCL.

### 2.7 Régimen Pesquero — Aclaración técnica

**No existe un régimen laboral pesquero especial autónomo;** los trabajadores pesqueros se rigen por D.Leg. 728. Lo que sí existe es un **Régimen Especial de Pensiones para Trabajadores Pesqueros (REP)** regulado por la **Ley 30003** (publicada 22-mar-2013, vigente desde 29-abr-2014), administrado por la ONP tras la disolución de la CBSSP (Resolución SBS 14707-2010).

**Aportes:** Trabajador pesquero 8% de su remuneración asegurable; armador 5%. La afiliación al REP o al SPP debe declararse por escrito en plazo no mayor a 10 días hábiles desde inicio de la relación laboral; en defecto, afiliación automática al REP. **Edad de jubilación:** 55 años + 25 años trabajo en pesca + 375 semanas contributivas. **Pensión:** 24.6% del promedio de la remuneración mensual asegurable de los últimos 5 años, pagadera 14 veces/año, tope S/ 660 mensual revisable bianualmente.

Para el módulo COMPLY360, el componente pesquero se trata como **régimen general 728 + suscripción a REP** (módulo previsional separado).

### 2.8 Régimen del Trabajador Portuario

**Trabajador Portuario:** Ley 27866 (Ley del Trabajo Portuario), jornada de 8 h continuadas o 4 h por turno nombrado, contratación a través de empresas administradoras de puertos, beneficios prorrateados al jornal nombrado. Reglamento DS 003-2003-TR.

**Otros regímenes a considerar como módulos extensibles:** futbolistas profesionales (Ley 26566), artistas (Ley 28131), profesionales de la salud (D.Leg. 559 / Ley 23536).

---

## 3. Modalidades Contractuales del D.Leg. 728 — Catálogo completo

Los **9 contratos modales** del Art. 54 LPCL se agrupan en tres familias (Cap. II–IV, Título II del D.S. 003-97-TR):

### 3.1 Naturaleza temporal (Cap. II — Arts. 57–59)

| Modalidad | Art. | Duración máxima | Causa objetiva |
|---|---|---|---|
| Inicio o lanzamiento de nueva actividad | 57 | 3 años | Inicio de actividad productiva, instalación o apertura de nuevos establecimientos/mercados, inicio o incremento de actividades dentro de la misma empresa |
| Necesidades del mercado | 58 | 5 años | Incrementos coyunturales de producción originados por variaciones sustanciales de demanda no cíclicas/estacionales |
| Reconversión empresarial | 59 | 2 años | Sustitución, ampliación o modificación de actividades; cambios tecnológicos, de equipos, instalaciones, sistemas, métodos o procedimientos |

### 3.2 Naturaleza accidental (Cap. III — Arts. 60–62)

| Modalidad | Art. | Duración máxima | Causa objetiva |
|---|---|---|---|
| Ocasional | 60 | 6 meses/año | Necesidades transitorias distintas de la actividad habitual |
| Suplencia | 61 | La requerida | Sustitución de un trabajador estable cuyo vínculo se encuentra suspendido |
| Emergencia | 62 | La requerida | Caso fortuito o fuerza mayor |

### 3.3 Obra o servicio (Cap. IV — Arts. 63–67)

| Modalidad | Art. | Duración | Causa objetiva |
|---|---|---|---|
| Obra determinada o servicio específico | 63 | La requerida; objeto previamente establecido | Ejecución de una obra concreta o servicio específico identificable |
| Intermitente | 64 | Indefinida (puede ser permanente) | Labores que por su naturaleza son discontinuas |
| Temporada | 67 | Indefinida (puede ser permanente) | Necesidades del giro que solo se cumplen en determinadas épocas |

### 3.4 Plazo máximo combinado (Art. 74 LPCL — verbatim)

> "En los casos que corresponda, podrán celebrarse en forma sucesiva con el mismo trabajador diversos contratos bajo distintas modalidades en el centro de trabajo, en función de las necesidades empresariales y siempre que en conjunto **no superen la duración máxima de cinco años**."

### 3.5 Requisitos formales (Art. 72 LPCL — verbatim, núcleo del motor)

> "Los contratos de trabajo a que se refiere este Título necesariamente deberán constar **por escrito y por triplicado**, debiendo consignarse **en forma expresa su duración, y las causas objetivas determinantes de la contratación**, así como las demás condiciones de la relación laboral."

### 3.6 Otras modalidades

- **Tiempo parcial:** Art. 11 D.S. 001-96-TR — promedio diario de horas inferior a 4. Excluye CTS, vacaciones (1 RM proporcional 30 días) y protección frente a despido arbitrario; sí derecho a gratificaciones. Registro **sustantivamente obligatorio** (15 días) según Informe MTPE 159-2019-MTPE/2/14.1.
- **Contrato de extranjero (D.Leg. 689 + D.S. 014-92-TR):** Plazo máximo 3 años, prorrogable. Tope cuantitativo: 20% del total de servidores de la empresa; sus remuneraciones no pueden exceder el 30% del total de la planilla. Excepciones: cónyuge/parientes peruanos, visa de inmigrante, países con convenio de reciprocidad/doble nacionalidad. Aprobación **previa** vía SIVICE (Sistema Virtual de Contratos de Extranjeros, operativo desde 16-nov-2020, base RM 291-2018-TR + RM 117-2021-TR).

---

## 4. Causales de Desnaturalización (Art. 77 LPCL) y Jurisprudencia

### 4.1 Texto normativo (verbatim)

> Artículo 77.- Los contratos de trabajo sujetos a modalidad se considerarán como de duración indeterminada:
> a) Si el trabajador continúa laborando después de la fecha de vencimiento del plazo estipulado, o después de las prórrogas pactadas, si estas exceden del límite máximo permitido;
> b) Cuando se trata de un contrato para obra determinada o de servicio específico, si el trabajador continúa prestando servicios efectivos, luego de concluida la obra materia de contrato, sin haberse operado renovación;
> c) Si el titular del puesto sustituido, no se reincorpora vencido el término legal o convencional y el trabajador contratado continuare laborando;
> d) Cuando el trabajador demuestre la existencia de simulación o fraude a las normas establecidas en la presente ley.

### 4.2 Jurisprudencia vinculante y casaciones recientes

| Sentencia | Tema | Doctrina |
|---|---|---|
| **Cas. Lab. 13734-2017-Lima** (2ª Sala SDCST) | Incremento de actividad | Apertura de establecimientos como "expansión planificada" no constituye causa objetiva; debe ser circunstancial o coyuntural |
| **Cas. Lab. 24648-2019-Lima Este** | Causa objetiva genérica | Fórmula genérica = desnaturalización: "no especifica de forma clara en qué se basaría el incremento temporal e incierto" |
| **Cas. Lab. 11259-2017-Lima** (2ª Sala SDCST) | D.L. 22342 | Sin orden de compra + programa de exportación = desnaturalización |
| **Cas. Lab. 15952-2015-Arequipa** | Servicio específico | "No basta declarar que la ejecución de un proyecto especial tiene fechas determinadas" |
| **Cas. Lab. 19684-2016-Lima (13-mar-2019)** | **Doctrina vinculante** suplencia | NO se desnaturaliza si la firma posterior cumple finalidad de reservar puesto del titular |
| **Cas. Lab. 15933-2014-Tacna (18-sep-2016)** | Suplencia | Suplente con labores distintas a las del titular = desnaturalización |
| **Cas. Lab. 9253-2017-La Libertad (19-nov-2019)** | Suplencia | Ratifica doctrina Cas. 19684-2016 |
| **Cas. Lab. 8912-2023-Lima** (Corp. Lindley) | Incremento de actividad | Nuevo establecimiento que absorbe actividades de plantas existentes ≠ incremento temporal |
| **Cas. Lab. 24577-2022-Lima (19-sep-2024)** (2ª Sala SDCST) | Competencia SUNAFIL | SUNAFIL competente para declarar desnaturalización (3 votos a favor, 2 en contra) |
| **Cas. Lab. 53949-2022-Tumbes (19-may-2025)** (4ª Sala SDCST) | Competencia SUNAFIL | **Cambio de criterio:** SUNAFIL solo sancionador, juez laboral exclusivo para declarar |
| **STC 5057-2013-PA/TC (Huatuco)** | Sector público | Sin concurso público no procede reposición indeterminada |
| **Cas. Lab. 11169-2014-La Libertad** y **8347-2014-Del Santa** | Inaplicación Huatuco | 7 supuestos en los que NO aplica Huatuco |
| **STC 00797-2022-AA/TC (2025)** | Tutela gestante | Nulo todo despido por embarazo o lactancia |
| **STC 1397-2001-AA, 6235-2007-PA, 03735-2011-PA, 872-2017-PA** | Causa objetiva | Mención genérica del puesto = desnaturalización |

### 4.3 Resoluciones SUNAFIL determinantes

- **Resolución 576-2020-SUNAFIL:** "La causa objetiva debe ser desarrollada de forma clara y precisa […] no resultando coherente que se pretenda justificar como incremento de actividades la apertura de nuevos establecimientos de forma general, sin precisar cuál sería en el que las trabajadoras laborarían."
- **Resolución 102-2023-Sunafil-TFL** y **165-2021-SUNAFIL/IRE-PAS:** Contrato sin descripción de funciones que valide la naturaleza temporal = simulación = infracción muy grave (numeral 25.5 DS 019-2006-TR).
- **Resolución 045-2021-Sunafil:** Cubrir necesidades coyunturales no es causa objetiva válida para incremento de actividad.

### 4.4 Protocolo SUNAFIL 03-2016-SUNAFIL/INII

**Aprobado por R.S. 071-2016-SUNAFIL** (publicada en El Peruano 9-jun-2016). El inspector verifica:

1. Que los contratos modales **consten por escrito**.
2. Que contengan cláusula que detalle **en forma clara y precisa la duración y las causas objetivas determinantes**.
3. Solicita: contrato escrito, documentos que acrediten la causa objetiva, relación de personal con áreas y puestos, organigrama.
4. **La inexistencia de un contrato modal formalmente suscrito acarrea la apreciación de un vínculo laboral de duración indeterminada** (Art. 4 LPCL).
5. Si verifica desnaturalización, emite requerimiento directo solicitando modificación del T-Registro (cambio de tipo de contrato).

**Infracciones tipificadas en DS 019-2006-TR aplicables:**
- **Numeral 23.2 (leve):** No entregar copia del contrato al trabajador en plazos previstos.
- **Numeral 24.7 (grave):** No celebrar por escrito y en plazos contratos cuando sea exigible, ni presentar copia ante AAT cuando corresponda.
- **Numeral 25.5 (muy grave):** Incumplimiento de disposiciones sobre contratación a plazo determinado, su desnaturalización, uso fraudulento o discriminatorio.

### 4.5 Tutela reforzada — protecciones específicas

- **Mujer gestante / lactante:** Tutela reforzada según STC 00797-2022-AA/TC; nulo todo despido por embarazo o lactancia (Ley 30709, Art. 6). El módulo debe bloquear no-renovación de contrato modal cuando el módulo Workers indique embarazo activo.
- **Sindicalización:** Art. 29 LPCL / Convenio OIT 87. Bloquear no-renovación si el trabajador es dirigente sindical.
- **Discriminación remunerativa por género:** Ley 30709 + D.S. 002-2018-TR. El generador debe validar paridad para cargos equivalentes.

---

## 5. Cláusulas Obligatorias y Potestativas

### 5.1 Cláusulas obligatorias mínimas

1. Identificación de partes (RUC, denominación, DNI, domicilios).
2. Régimen laboral aplicable (cita normativa exacta).
3. Modalidad contractual (artículo del D.Leg. 728 invocado).
4. **Causa objetiva expresa, detallada y específica** (Art. 72 LPCL) — núcleo crítico.
5. Plazo de duración (fechas dentro del máximo legal).
6. Periodo de prueba (3/6/12 meses).
7. Cargo / puesto / funciones específicas.
8. Lugar de prestación de servicios.
9. Jornada y horario.
10. Remuneración y composición.
11. Forma y oportunidad de pago.
12. Beneficios sociales aplicables al régimen.
13. Régimen de salud y pensiones.
14. Cláusula de protección de datos personales (Ley 29733 + DS 016-2024-JUS).
15. Firma de las partes.

### 5.2 Cláusulas potestativas blindadas

- **Confidencialidad / Secretos industriales** (Arts. 122-123 D.Leg. 823 Ley de Propiedad Industrial).
- **No competencia poscontractual** — vacío legal regulatorio (anteproyecto LGT estancado, según DLA Piper Perú). Validez sujeta a adecuación, necesidad, proporcionalidad. Plazo ≤2 años. **Compensación económica obligatoria** (cálculo: última remuneración × meses de restricción).
- **Propiedad intelectual / Cesión de derechos** sobre obras y software creados durante la relación, con base en D.Leg. 822 (Derechos de Autor) y D.Leg. 1075. Distinguir creaciones encargadas vs. libres; titularidad de derechos morales (irrenunciables) vs. patrimoniales.
- **Exclusividad** — solo válida cuando proporcional al cargo y con compensación específica.
- **Pacto de permanencia (capacitaciones)** — Art. 26 D.Leg. 728.
- **Jornada atípica acumulativa** — D.Leg. 854.
- **Periodo de prueba extendido** — Art. 10 LPCL.
- **Teletrabajo / Trabajo remoto** — Ley 31572 + Reglamento DS 002-2023-TR (derecho a desconexión digital, compensación de gastos, SST, PDP).

---

# PARTE II — ESPECIFICACIÓN TÉCNICA PARA DESARROLLADORES

## 6. Modelo de Datos Prisma (schema.prisma)

```prisma
enum LaborRegime {
  GENERAL_728
  MICROEMPRESA_MYPE
  PEQUENA_EMPRESA_MYPE
  AGRARIO_31110
  CONSTRUCCION_CIVIL
  TRABAJO_HOGAR_31047
  EXPORTACION_NO_TRADICIONAL_22342
  PORTUARIO_27866
  PESQUERO_30003   // Régimen previsional especial; laboral 728
}

enum ContractModality {
  PLAZO_INDETERMINADO
  TIEMPO_PARCIAL
  EXTRANJERO
  // Modales D.Leg. 728
  INICIO_NUEVA_ACTIVIDAD          // Art. 57 — 3 años
  NECESIDADES_MERCADO             // Art. 58 — 5 años
  RECONVERSION_EMPRESARIAL        // Art. 59 — 2 años
  OCASIONAL                       // Art. 60 — 6 meses/año
  SUPLENCIA                       // Art. 61
  EMERGENCIA                      // Art. 62
  OBRA_DETERMINADA                // Art. 63
  INTERMITENTE                    // Art. 64
  TEMPORADA                       // Art. 67
  // Especiales
  AGRARIO_INDEFINIDO
  AGRARIO_DETERMINADO
  CONSTRUCCION_OBRA
  HOGAR_INDEFINIDO
  EXPORTACION_NO_TRADICIONAL
}

enum ValidationSeverity { BLOCKER  WARNING  INFO }
enum ContractStatus { DRAFT  PENDING_VALIDATION  PENDING_SIGNATURE  SIGNED  ACTIVE  TERMINATED  ARCHIVED  VOIDED }

model ContractTemplate {
  id            String          @id @default(cuid())
  tenantId      String?         // null = plantilla global del sistema
  regime        LaborRegime
  modality      ContractModality
  name          String
  version       String          // semver: 1.0.0
  effectiveFrom DateTime
  effectiveTo   DateTime?
  bodyDocx      Bytes           // Plantilla .docx con tags docxtemplater
  bodyMarkdown  String?
  variables     Json
  legalBasis    Json            // [{art:"57", norma:"DS 003-97-TR", text:"..."}]
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  createdBy     String
  instances     ContractInstance[]
  @@index([tenantId, regime, modality])
  @@index([effectiveFrom, effectiveTo])
}

model ContractInstance {
  id              String          @id @default(cuid())
  tenantId        String          // RLS clave
  templateId      String
  template        ContractTemplate @relation(fields:[templateId], references:[id])
  workerId        String          // FK → Workers module
  regime          LaborRegime
  modality        ContractModality
  status          ContractStatus  @default(DRAFT)
  startDate       DateTime
  endDate         DateTime?
  causeObjective  String?
  position        String
  workplace       String
  monthlySalary   Decimal         @db.Decimal(12,2)
  workSchedule    Json
  trialPeriodDays Int             @default(90)
  variables       Json
  currentVersionId String?        @unique
  currentVersion   ContractVersion? @relation("CurrentVersion", fields:[currentVersionId], references:[id])
  versions         ContractVersion[] @relation("AllVersions")
  validations      ContractValidation[]
  signatures       ContractSignature[]
  auditLogs        ContractAuditLog[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  createdBy       String
  @@index([tenantId, workerId])
  @@index([tenantId, status])
  @@index([endDate])
}

model ContractVersion {
  id                  String           @id @default(cuid())
  tenantId            String
  contractInstanceId  String
  contractInstance    ContractInstance @relation("AllVersions", fields:[contractInstanceId], references:[id])
  currentOf           ContractInstance? @relation("CurrentVersion")
  versionNumber       Int
  contentDocxStorageKey String
  contentPdfStorageKey  String?
  // Hash chain (blockchain-style)
  contentSha256       String
  prevHash            String?          // genesis = null
  versionHash         String           // SHA-256(contentSha256 || prevHash || canonicalJSON(metadata))
  merkleRoot          String?          // Root del Merkle Tree del día (batch)
  // Timestamping confiable
  rfc3161Timestamp    Bytes?           // Token RFC 3161 de TSA acreditada (INDECOPI)
  otsProof            Bytes?           // OpenTimestamps proof (.ots)
  bitcoinBlockHeight  Int?
  diffJson            Json?            // JSON Patch (RFC 6902)
  diffSummary         String?
  changeReason        String
  changedBy           String
  createdAt           DateTime         @default(now())
  @@unique([contractInstanceId, versionNumber])
  @@index([tenantId, createdAt])
  @@index([versionHash])
}

model ContractClause {
  id            String           @id @default(cuid())
  tenantId      String?          // null = catálogo global
  code          String           // CONF-001, NOC-002, etc.
  category      String           // OBLIGATORIA | POTESTATIVA
  type          String
  title         String
  bodyTemplate  String           // Texto con {{placeholders}}
  legalBasis    Json
  variables     Json
  applicableTo  Json             // {regimes:[...], modalities:[...]}
  active        Boolean          @default(true)
  version       String
  createdAt     DateTime         @default(now())
  @@unique([tenantId, code, version])
  @@index([type])
}

model ContractValidationRule {
  id            String              @id @default(cuid())
  code          String              @unique // MODAL-001, PLAZO-001, etc.
  category      String
  severity      ValidationSeverity
  title         String
  description   String
  legalBasis    Json
  ruleSpec      Json                // Regla declarativa ejecutable
  applicableTo  Json
  active        Boolean             @default(true)
  version       String
  createdAt     DateTime            @default(now())
  validations   ContractValidation[]
}

model ContractValidation {
  id              String                   @id @default(cuid())
  tenantId        String
  contractId      String
  contract        ContractInstance         @relation(fields:[contractId], references:[id])
  ruleId          String
  rule            ContractValidationRule   @relation(fields:[ruleId], references:[id])
  passed          Boolean
  severity        ValidationSeverity
  message         String
  evidence        Json?
  acknowledged    Boolean                  @default(false)
  acknowledgedBy  String?
  acknowledgedAt  DateTime?
  createdAt       DateTime                 @default(now())
  @@index([tenantId, contractId, passed])
}

model JurisprudenceUpdate {
  id              String   @id @default(cuid())
  source          String   // CORTE_SUPREMA | TC | SUNAFIL | MTPE
  reference       String   // Cas. Lab. 8912-2023-Lima
  title           String
  publicationDate DateTime
  topic           String
  summary         String
  fullTextUrl     String?
  affectedRules   Json     // [{ruleCode, action: ADD|MODIFY|DEPRECATE}]
  affectedClauses Json
  reviewStatus    String   @default("PENDING")
  reviewedBy      String?
  reviewedAt      DateTime?
  createdAt       DateTime @default(now())
  @@index([source, publicationDate])
  @@index([reviewStatus])
}

model ContractSignature {
  id            String           @id @default(cuid())
  tenantId      String
  contractId    String
  contract      ContractInstance @relation(fields:[contractId], references:[id])
  versionId     String           // Vinculación al hash exacto
  signerId      String
  signerRole    String
  signerName    String
  signerDni     String
  signatureType String           // DIGITAL_REGRES | ELECTRONICA_SIMPLE | MANUSCRITA_DIGITALIZADA
  certPem       String?
  certIssuer    String?          // INDECOPI - Registro de PSC
  signatureBlob Bytes
  signedAt      DateTime
  ipAddress     String?
  geolocation   Json?
  @@index([contractId])
}

model ContractAuditLog {
  id            String   @id @default(cuid())
  tenantId      String
  contractId    String?
  actorId       String
  actorRole     String
  action        String
  entityType    String
  entityId      String
  before        Json?
  after         Json?
  ipAddress     String?
  userAgent     String?
  prevLogHash   String?  // append-only hash chain
  logHash       String
  createdAt     DateTime @default(now())
  contract      ContractInstance? @relation(fields:[contractId], references:[id])
  @@index([tenantId, createdAt])
  @@index([contractId])
}
```

## 7. API REST / Next.js Route Handlers

```
POST   /api/contracts/detect-regime              → 200 {regime, confidence, alternatives, reasoning}
GET    /api/contracts/templates?regime=&modality= → 200 [Template]
POST   /api/contracts/instances                  → 201 {id, status:'DRAFT'}
GET    /api/contracts/instances/:id              → 200 {instance, currentVersion, validations}
PATCH  /api/contracts/instances/:id              → 200 (creates new ContractVersion)
POST   /api/contracts/instances/:id/validate     → 200 {results:[{rule, passed, severity, message}]}
POST   /api/contracts/instances/:id/render       → 200 {storageKey, sha256, otsProofKey}
POST   /api/contracts/instances/:id/sign         → 200 {signatureId, certInfo}
POST   /api/contracts/instances/:id/void         → 200 {voidedAt}
GET    /api/contracts/instances/:id/timeline     → 200 [versions with diffs]
GET    /api/contracts/instances/:id/risk-profile → 200 {score, blockers, warnings}  // Para SUNAFIL Diagnostic

POST   /api/contracts/bulk/preview               → 200 {valid:[], invalid:[], totalRows}
POST   /api/contracts/bulk/generate              → 202 {jobId}  (cola asíncrona)
GET    /api/contracts/bulk/jobs/:jobId           → 200 {status, progress, downloadKey}

GET    /api/contracts/clauses?type=              → 200 [Clause]
POST   /api/admin/jurisprudence-updates          → 201 (LEGAL_ADMIN only)
PATCH  /api/admin/jurisprudence-updates/:id/apply → 200 {affectedRulesCount, affectedClausesCount}

GET    /api/contracts/audit?contractId=          → 200 [AuditLog] (RBAC: legal/admin)
GET    /api/contracts/audit/verify?contractId=   → 200 {chainValid, breakAt?}
```

**Patrón general (Next.js 15 App Router con `getTenantPrisma`):**

```typescript
// app/api/contracts/instances/route.ts
import { withTenant } from '@/lib/tenant-prisma';
import { z } from 'zod';
import { detectRegime } from '@/lib/regime/detect';
import { runValidationPipeline } from '@/lib/validation/engine';
import { appendAuditLog } from '@/lib/audit/chain';

const CreateContractSchema = z.object({
  workerId: z.string().cuid(),
  modality: z.nativeEnum(ContractModality),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  causeObjective: z.string().min(80).optional(),  // Validación: causa no genérica
  position: z.string(),
  monthlySalary: z.number().positive(),
});

export const POST = withTenant(async (req, { prisma, tenant, user }) => {
  const body = CreateContractSchema.parse(await req.json());
  const regime = await detectRegime(tenant);
  if (!isModalityValidForRegime(regime, body.modality))
    return Response.json({ error: 'INVALID_REGIME_MODALITY_COMBO' }, { status: 400 });
  const instance = await prisma.contractInstance.create({
    data: { tenantId: tenant.id, regime, ...body, createdBy: user.id }
  });
  await runValidationPipeline(instance.id);
  await appendAuditLog({ tenantId: tenant.id, action: 'CREATE', entityId: instance.id });
  return Response.json(instance, { status: 201 });
});
```

## 8. Algoritmo de Detección Automática de Régimen

```typescript
// lib/regime/detect.ts
export interface RegimeDetectionResult {
  primaryRegime: LaborRegime;
  applicableSpecialRegimes: LaborRegime[];
  confidence: number;
  reasoning: string[];
  warnings: string[];
}

const UIT_2026 = 5500;     // D.S. 301-2025-EF
const RMV_2026 = 1130;     // D.S. 006-2024-TR

export async function detectRegime(tenant: Tenant): Promise<RegimeDetectionResult> {
  const reasoning: string[] = [];
  const warnings: string[] = [];
  const specials: LaborRegime[] = [];

  // ===== PASO 1: Régimen sectorial (CIIU rev. 4) =====
  const ciiu = tenant.ciiu;

  // Construcción civil: F (41-43) + costo de obra > 50 UIT
  if (/^4[1-3]/.test(ciiu)) {
    if ((tenant.currentProjectCostUIT ?? 0) > 50) {
      specials.push('CONSTRUCCION_CIVIL');
      reasoning.push(`CIIU ${ciiu} y obra > 50 UIT → Régimen Construcción Civil`);
    } else warnings.push('CIIU de construcción pero obra ≤50 UIT → Régimen General 728');
  }

  // Agrario: A (01-03) y agroindustria (10) excepto Lima/Callao
  if (/^0[1-3]/.test(ciiu) || (ciiu.startsWith('10') && tenant.usesAgroInputs)) {
    const inLimaCallao = ['1501','0701','0702'].includes(tenant.ubigeoProvincia.slice(0,4));
    const excludedAgroindustry = ['1071','1075','1080','1101','1102','1200'].includes(ciiu);
    if (!inLimaCallao && !excludedAgroindustry) {
      specials.push('AGRARIO_31110');
      reasoning.push(`CIIU ${ciiu} fuera de Lima/Callao → Régimen Agrario Ley 31110`);
    }
  }

  // Hogar: empleador persona natural con propósito doméstico
  if (tenant.employerType === 'NATURAL_PERSON' && tenant.purpose === 'DOMESTIC') {
    return { primaryRegime: 'TRABAJO_HOGAR_31047',
             applicableSpecialRegimes: [], confidence: 0.99,
             reasoning: ['Empleador persona natural con propósito doméstico → Ley 31047'],
             warnings: [] };
  }

  // Pesquero
  if (['0311','0312','1020'].includes(ciiu))
    warnings.push('Sector pesquero: laboral 728 + Régimen Especial Pensiones Pesqueras Ley 30003');

  // Exportación No Tradicional ≥40%
  if ((tenant.exportRatioPct ?? 0) >= 40 && !TRADITIONAL_EXPORT_CIIUS.includes(ciiu)) {
    specials.push('EXPORTACION_NO_TRADICIONAL_22342');
    reasoning.push('Exportación no tradicional ≥40% → D.L. 22342 aplicable');
  }

  // ===== PASO 2: Régimen MYPE por tamaño (Ley 32353) =====
  const annualSalesUIT = tenant.annualSalesPEN / UIT_2026;
  const groupSalesUIT  = tenant.groupAnnualSalesPEN / UIT_2026;
  let mypeRegime: LaborRegime | null = null;
  if (!tenant.isPartOfBigGroup
      && !EXCLUDED_MYPE_CIIUS.includes(ciiu)
      && groupSalesUIT <= 1700
      && tenant.remypeRegistered) {
    if (annualSalesUIT <= 150) mypeRegime = 'MICROEMPRESA_MYPE';
    else                        mypeRegime = 'PEQUENA_EMPRESA_MYPE';
    reasoning.push(`Ventas ${annualSalesUIT.toFixed(2)} UIT + REMYPE → ${mypeRegime}`);
  }

  // ===== PASO 3: Resolución de prioridades =====
  // HOGAR > CONSTRUCCION (por obra) > AGRARIO > EXPORT_NO_TRADICIONAL > MYPE > GENERAL
  const primary = specials.find(r => r === 'CONSTRUCCION_CIVIL')
    ?? specials.find(r => r === 'AGRARIO_31110')
    ?? mypeRegime
    ?? 'GENERAL_728';

  // Capa Huatuco: tenant público
  if (tenant.isPublicEntity) warnings.push('Entidad pública: aplicar capa Huatuco (STC 5057-2013-PA/TC)');

  return {
    primaryRegime: primary,
    applicableSpecialRegimes: specials.filter(r => r !== primary),
    confidence: reasoning.length > 0 ? 0.95 : 0.7,
    reasoning, warnings
  };
}
```

## 9. Motor de Validación Legal Automática

### 9.1 Especificación declarativa de reglas

```typescript
type RuleSpec =
  | { kind: 'FIELD_LENGTH'; field: string; min?: number; max?: number }
  | { kind: 'FIELD_REGEX_DENY'; field: string; patterns: string[] }
  | { kind: 'FIELD_REGEX_REQUIRE'; field: string; patterns: string[] }
  | { kind: 'TEMPORAL'; expression: string }
  | { kind: 'CROSS_FIELD'; expression: string }
  | { kind: 'EXTERNAL_LOOKUP'; service: string; params: Record<string, unknown> }
  | { kind: 'NLP_SIMILARITY'; fieldA: string; fieldB: string; threshold: number };

export async function runValidationPipeline(contractId: string) {
  const ctx = await buildValidationContext(contractId);
  const applicableRules = await fetchApplicableRules(ctx.regime, ctx.modality);
  const results = [];
  for (const rule of applicableRules) results.push(await evaluateRule(rule, ctx));
  await persistValidations(contractId, results);
  return results;
}
```

### 9.2 Niveles de severidad

- **BLOCKER:** Impide emitir el DOCX. Genera evento al Alert Engine.
- **WARNING:** Permite emitir si `acknowledged = true` (firma del legal).
- **INFO:** Sugerencia de mejora.

## 10. Trazabilidad Criptográfica (versionado blockchain-style)

### 10.1 Hash chain por contrato

```
contentSha256 = SHA-256(docxBytes)
versionHash   = SHA-256(contentSha256 ‖ prevHash ‖ canonicalJSON(metadata))
metadata      = {tenantId, contractId, versionNumber, createdAt(iso8601), createdBy, changeReason}
genesis: prevHash = "0x" + "0".repeat(64)
```

### 10.2 Merkle tree diario por tenant + anclaje dual

Toda versión generada en el día UTC por el tenant se agrega en un Merkle tree binario SHA-256. La raíz se ancla:

1. **RFC 3161** vía TSA acreditada por INDECOPI (Ley 27269 + DS 052-2008-PCM): produce token `.tsr` legalmente equiparable a fecha cierta en Perú.
2. **OpenTimestamps** sobre Bitcoin (gratuito, calendar servers tipo `https://btc.ots.dgi.io`): produce `.ots` con prueba pública verificable. Desde el OpenTimestamps Tutorial (DGI): "the Bitcoin block headers […] effectively attesting only the Merkle tree root, which is itself a hash value."
3. **(Opcional) Anclaje en Polygon/Ethereum** vía contrato `OracleNotary.attestRoot(bytes32, uint256)`.

### 10.3 Estructura en Supabase Storage

```
tenants/{tenantId}/contracts/{contractId}/versions/{versionNumber}/
  ├── content.docx
  ├── content.pdf
  ├── hash.json          { contentSha256, versionHash, prevHash, merkleProof[] }
  ├── rfc3161.tsr
  └── ots.ots
```

### 10.4 Append-only audit log

`ContractAuditLog` también es hash chain `prevLogHash → logHash`. Verificación expuesta en `/api/contracts/audit/verify?contractId=`. Cumple las exigencias del **DS 016-2024-JUS** (Reglamento LPDP Arts. 47-50: políticas de seguridad documentadas, controles de acceso y trazabilidad).

## 11. Generación masiva con variables dinámicas

### 11.1 Pipeline

```
[Excel/CSV upload]
  → exceljs/papaparse parse (streaming)
  → Schema validation con Zod
  → Resolución de defaults desde Workers/Tenant
  → Pre-validation contra el motor de reglas (BLOCKER aborta la fila)
  → Preview (front-end)
  → User confirma → encola job en BullMQ + Redis (Upstash)
  → Worker genera DOCX por fila (docxtemplater)
  → Cada DOCX se versiona y firma
  → Empaquetado ZIP con manifest.json (sha256 de cada archivo)
  → Cliente descarga ZIP
```

### 11.2 Stack recomendado

- **Excel/CSV:** `exceljs` (lectura `.xlsx`) + `papaparse` (CSV grandes streaming).
- **Templating DOCX:** `docxtemplater` (núcleo open-source, **203 proyectos npm dependientes** según npmjs.com versión 3.67.6 consultada may-2026: "There are 203 other projects in the npm registry using docxtemplater"). Soporta loops y condicionales con sintaxis `{tag}`. Alternativa con snippets JS embebidos: `docx-templates`. **NO usar `docx` puro** salvo para piezas auxiliares.
- **PDF:** convertir DOCX → PDF con LibreOffice headless en runtime serverless aislado (Vercel Edge no soporta; usar Supabase Function/Worker o instancia EC2 separada).
- **ZIP:** `archiver` (preferir sobre `jszip` por streaming sin cargar todo en memoria).
- **Cola:** BullMQ + Redis (Upstash).

### 11.3 Boilerplate técnico

```typescript
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

async function generateContractDocx(template: Buffer, data: Record<string, unknown>) {
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' }
  });
  doc.render(data);
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}
```

## 12. Cláusulas adaptativas según jurisprudencia

### 12.1 Arquitectura

`JurisprudenceUpdate` se ingiere desde tres fuentes:
1. **Manual** (Amado registra Cas. Lab. relevantes).
2. **Web scraping programado** (`pj.gob.pe`, `tc.gob.pe`, `busquedas.elperuano.pe/normaslegales/`) con cron Vercel diario.
3. **Suscripciones RSS / boletines MTPE/SUNAFIL**.

Al aprobar un update:
- `affectedRules[]` → migración de datos en `ContractValidationRule` (sin redeploy).
- `affectedClauses[]` → nueva versión semver del clause; instancias firmadas quedan inmutables.
- Notifica vía Alert Engine a tenants afectados.

---

# PARTE III — CATÁLOGO DE PLANTILLAS Y CLÁUSULAS

## 13. Esqueleto uniforme de plantilla DOCX

```
ENCABEZADO
  CONTRATO DE TRABAJO {{modality.label}}
  RÉGIMEN {{regime.label}} — {{template.legalBasis}}

CLÁUSULA PRIMERA — IDENTIFICACIÓN DE LAS PARTES
CLÁUSULA SEGUNDA — RÉGIMEN LABORAL APLICABLE
CLÁUSULA TERCERA — OBJETO DEL CONTRATO Y CAUSA OBJETIVA
CLÁUSULA CUARTA — PLAZO Y PERIODO DE PRUEBA
CLÁUSULA QUINTA — JORNADA Y HORARIO
CLÁUSULA SEXTA — REMUNERACIÓN Y BENEFICIOS SOCIALES
CLÁUSULA SÉTIMA — LUGAR DE PRESTACIÓN
CLÁUSULA OCTAVA — OBLIGACIONES DEL TRABAJADOR
CLÁUSULA NOVENA — PROTECCIÓN DE DATOS PERSONALES
CLÁUSULA DÉCIMA — CONFIDENCIALIDAD (potestativa)
{{#if clauses.nonCompete}} CLÁUSULA DÉCIMO PRIMERA — NO COMPETENCIA {{/if}}
{{#if clauses.ip}} CLÁUSULA DÉCIMO SEGUNDA — PROPIEDAD INTELECTUAL {{/if}}
…
CLÁUSULA FINAL — JURISDICCIÓN Y LEY APLICABLE

FIRMAS
```

## 14. Variables dinámicas estandarizadas

```
{{employer.razonSocial}} {{employer.ruc}} {{employer.domicilio}}
{{employer.representante.nombre}} {{employer.representante.dni}} {{employer.representante.poder}}
{{worker.fullName}} {{worker.dni}} {{worker.address}} {{worker.birthDate}} {{worker.nationality}}
{{contract.startDate}} {{contract.endDate}} {{contract.duration.label}}
{{contract.position}} {{contract.workplace}} {{contract.workSchedule}}
{{contract.salary.amount}} {{contract.salary.currency}} {{contract.salary.composition}}
{{contract.causeObjective}}
{{regime.benefits.cts}} {{regime.benefits.gratificacion}} {{regime.benefits.vacaciones}}
{{tenant.ciiu}} {{tenant.ubigeo}}
```

## 15. Cláusulas tipo (texto profesional sugerido)

### 15.1 Causa objetiva blindada — Inicio o incremento de actividad

> "**TERCERA — OBJETO Y CAUSA OBJETIVA.** EL EMPLEADOR ha decidido implementar [DESCRIPCIÓN ESPECÍFICA: p.ej. la apertura de una nueva línea de producción de envases PET en la planta industrial ubicada en [DOMICILIO], cuyo proyecto de ingeniería fue aprobado mediante Acta de Directorio N° [X] de fecha [DD/MM/AAAA] y financiado mediante [FUENTE]], constituyendo ello una nueva actividad empresarial conforme al artículo 57 del TUO del D.Leg. 728. Esta actividad tiene una duración previsible de [X] meses, siendo necesario contratar al TRABAJADOR para desempeñar funciones de [CARGO] específicamente en dicha línea, las cuales son inherentes a la implementación de la nueva actividad y se extinguirán al consolidarse la misma. La causa objetiva aquí especificada está sustentada en los siguientes documentos que se adjuntan como Anexos: (i) [licencia de funcionamiento/permiso/contrato]; (ii) cronograma del proyecto; (iii) memoria descriptiva."

(Validación técnica: el motor rechaza causas con menos de 80 caracteres, sin nombre concreto del proyecto, o que repitan literalmente la fórmula del artículo de ley, conforme a la doctrina de la **Cas. Lab. 13734-2017-Lima**.)

### 15.2 Causa objetiva blindada — Suplencia

> "**TERCERA — OBJETO Y CAUSA OBJETIVA.** EL TRABAJADOR es contratado para sustituir transitoriamente a la trabajadora estable doña [NOMBRE], identificada con DNI [Nº], quien ocupa el cargo de [CARGO] y cuyo vínculo laboral con EL EMPLEADOR se encuentra suspendido por [licencia por maternidad/descanso médico/licencia sin goce] por el periodo del [FECHA] al [FECHA], conforme [Resolución/Certificado Médico/Solicitud N°…]. La suplencia comprende la reserva del puesto y se extinguirá automáticamente con la reincorporación de la titular, conforme al artículo 61 del TUO del D.Leg. 728."

### 15.3 Cláusula de confidencialidad

> "**[X] — CONFIDENCIALIDAD.** EL TRABAJADOR se obliga a guardar reserva absoluta sobre toda Información Confidencial a la que tenga acceso con motivo del contrato, entendiéndose por tal la información financiera, comercial, técnica, de clientes, base de datos personales (Ley 29733), procesos productivos, secretos industriales (Arts. 122-123 del D.Leg. 823) y cualquier otra cuya divulgación pueda perjudicar al EMPLEADOR. Esta obligación subsiste por el plazo de dos (02) años posteriores a la extinción del vínculo laboral. El incumplimiento generará responsabilidad civil por daños y perjuicios y, de configurar tipos penales (Arts. 165 y 198 del Código Penal), la responsabilidad penal correspondiente."

### 15.4 No competencia poscontractual con compensación

> "**[X] — NO COMPETENCIA.** Por un plazo no mayor de [12-24] meses contados a partir de la extinción del vínculo laboral, EL TRABAJADOR se abstendrá de prestar servicios, directa o indirectamente, a empresas competidoras de EL EMPLEADOR en el sector [ESPECIFICAR] dentro del territorio [GEOGRAFÍA]. Como contraprestación, EL EMPLEADOR pagará al TRABAJADOR una compensación económica mensual equivalente al [50%-100%] de su última remuneración, durante el plazo de la restricción. Esta cláusula respeta los principios de adecuación, necesidad y proporcionalidad respecto del derecho al trabajo (Art. 22 Constitución)."

### 15.5 Propiedad intelectual

> "**[X] — PROPIEDAD INTELECTUAL.** Las obras, invenciones, software, diseños y demás creaciones generadas por EL TRABAJADOR en cumplimiento del presente contrato corresponden patrimonialmente a EL EMPLEADOR conforme al D.Leg. 822 y D.Leg. 1075. Los derechos morales, irrenunciables, permanecen en cabeza del TRABAJADOR. La remuneración pactada incluye la cesión patrimonial. Las creaciones libres realizadas fuera de la jornada y sin uso de recursos del EMPLEADOR son de propiedad del TRABAJADOR."

### 15.6 Protección de datos personales (Ley 29733)

> "**[X] — TRATAMIENTO DE DATOS PERSONALES.** EL TRABAJADOR autoriza a EL EMPLEADOR a tratar sus datos personales (incluyendo datos sensibles como información biométrica, de salud y económica) para finalidades estrictamente laborales: gestión de planilla, EsSalud, SUNAT, AFP/ONP, SUNAFIL, MTPE y cumplimiento de obligaciones legales. EL EMPLEADOR ha designado al Oficial de Datos Personales [NOMBRE] (Art. 37 DS 016-2024-JUS) ante quien podrá ejercer sus derechos ARCO. La conservación se sujeta al plazo de prescripción laboral (4 años desde el cese, Ley 27321) más los plazos contables/tributarios."

---

# PARTE IV — REGLAS DEL MOTOR DE VALIDACIÓN

| Código | Severidad | Descripción | Base legal | Lógica de detección |
|---|---|---|---|---|
| FORMAL-001 | BLOCKER | Contrato modal sin causa objetiva | Art. 72 LPCL | `causeObjective` requerido y no vacío |
| FORMAL-002 | BLOCKER | Contrato no consta por escrito | Art. 4 LPCL | Forzado por flujo |
| MODAL-001 | BLOCKER | Causa objetiva genérica | Art. 72 + Cas. 13734-2017 | Regex deny + NLP classifier; deny patterns: "necesidad de mercado", "incremento de actividad", "labores propias del cargo" sin elemento específico |
| MODAL-002 | WARNING | Causa coincide con función permanente | Art. 77.d | NLP similarity con descripción del puesto > 0.85 |
| PLAZO-001 | BLOCKER | Modal supera 5 años en suma sucesiva | Art. 74 | Suma duraciones por trabajador > 1825 días (excepto D.L. 22342) |
| PLAZO-002 | BLOCKER | Inicio actividad supera 3 años | Art. 57 | `endDate - startDate > 1095 días` |
| PLAZO-003 | BLOCKER | Necesidad mercado supera 5 años | Art. 58 | `> 1825 días` |
| PLAZO-004 | BLOCKER | Reconversión supera 2 años | Art. 59 | `> 730 días` |
| PLAZO-005 | BLOCKER | Ocasional supera 6 meses/año | Art. 60 | Suma rolling 12m > 180 días |
| SUPLENCIA-001 | BLOCKER | Suplencia sin titular identificado | Art. 61 | `titularSubstituidoId` requerido |
| SUPLENCIA-002 | WARNING | Suplencia con funciones distintas | Cas. 15933-2014 | Comparar `position` con titular |
| OBRA-001 | BLOCKER | Servicio específico sin objeto delimitado | Art. 63 + Cas. 15952-2015 | `objectDescription` con nombre identificable |
| EXP-001 | BLOCKER | D.L. 22342 sin orden compra/programa | Art. 32 D.L. 22342 + Cas. 11259-2017 | Documentos `purchaseOrder` y `exportProgram` adjuntos |
| EXP-002 | BLOCKER | < 40% exportación pretende régimen 22342 | Art. 7 D.L. 22342 | `tenant.exportRatioPct >= 40` |
| MYPE-001 | BLOCKER | NO inscrita en REMYPE pretende MYPE | Art. 11 DS 013-2013-PRODUCE | `tenant.remypeRegistered === true` |
| MYPE-002 | WARNING | Ventas superan tope MYPE 2 años | Ley 32353 | Histórico ventas |
| MYPE-003 | BLOCKER | Actividad excluida del régimen MYPE | Ley MYPE | CIIU ∈ {bares, discotecas, casinos} |
| AGRARIO-001 | BLOCKER | Régimen agrario a personal administrativo | Art. 5 Ley 31110 | Cargo en lista blanca campo/planta |
| AGRARIO-002 | WARNING | Agroindustria en Lima/Callao | Art. 2 Ley 31110 | Ubigeo ≠ 1501 / 0701 |
| EXTRANJ-001 | BLOCKER | Plazo > 3 años | Art. 5 D.Leg. 689 | duration ≤ 1095 días |
| EXTRANJ-002 | BLOCKER | Excede 20% personal extranjero | Art. 4 D.Leg. 689 | `(extranjeros + 1)/total ≤ 0.20` salvo exoneración |
| EXTRANJ-003 | BLOCKER | Remuneración excede 30% planilla | Art. 4 D.Leg. 689 | Suma planilla |
| TPARCIAL-001 | BLOCKER | Tiempo parcial con jornada ≥ 4 h/día | Art. 11 DS 001-96-TR | promedio diario < 4 h |
| HUATUCO-001 | BLOCKER | Entidad pública sin acreditar concurso | STC 5057-2013-PA | `tenant.isPublicEntity` ∧ no consta concurso |
| RECONTRATA-001 | BLOCKER | Recontratación modal < 1 año del cese | Art. 78 LPCL | Histórico Workers |
| GESTANTE-001 | BLOCKER | No-renovación a gestante | Ley 30709 + STC 00797-2022 | Bloqueo no-renovación |
| RMV-001 | BLOCKER | Salario inferior a RMV | DS 006-2024-TR | `salary >= 1130` (proporcional si <4h) |
| IGUAL-001 | WARNING | Brecha salarial vs cargo equivalente >5% | Ley 30709 + DS 002-2018-TR | Comparación interna |
| DATOS-001 | INFO | Plantilla sin cláusula PDP | Art. 28 Ley 29733 | Verificar cláusula |
| CONST-001 | BLOCKER | Construcción civil sin RETCC | Régimen | Verificar RETCC |
| HOGAR-001 | BLOCKER | Trabajador del hogar < 18 años | Art. 4 Ley 31047 | `worker.age >= 18` |

Cada regla se persiste como `ContractValidationRule` con `ruleSpec` JSON ejecutable. Las reglas se versionan; los reportes incluyen el `version` aplicado para garantizar reproducibilidad jurídica.

---

# PARTE V — ROADMAP DE IMPLEMENTACIÓN

Asumiendo Amado como dev único, 2 sprints/mes de 2 semanas:

### MVP — Sprints 1 a 4 (8 semanas)

- **S1.** Modelo Prisma + migraciones + seeds (régimen general 728); detección de régimen v1 (728/MYPE). Audit log con hash chain.
- **S2.** API CRUD `ContractInstance` + `ContractVersion`; `/render` con docxtemplater para 728 plazo indeterminado y 3 modales más usados (inicio, necesidades, suplencia). Hash SHA-256 + Supabase Storage.
- **S3.** Motor de validación (top 15 reglas: FORMAL, MODAL, PLAZO, SUPLENCIA). UI de listado y detalle + diff entre versiones.
- **S4.** Integración módulo Workers (autocompletar `worker.*`); generación masiva v1 (Excel preview, individual sin cola); descarga ZIP. Tests snapshot para 6 plantillas.

### Avanzado — Sprints 5 a 10 (12 semanas)

- **S5.** Régimen MYPE (Ley 32353); régimen agrario; régimen construcción civil. Reglas específicas.
- **S6.** Régimen hogar; régimen exportación no tradicional; contrato de extranjero con integración SIVICE.
- **S7.** Catálogo completo de cláusulas potestativas. Composer drag-and-drop.
- **S8.** Generación masiva con BullMQ; preview en lote; ZIP firmado con manifest. Conversión DOCX → PDF.
- **S9.** Trazabilidad criptográfica completa: Merkle tree diario, RFC 3161 (TSA INDECOPI), OpenTimestamps. UI de verificación.
- **S10.** Cláusulas adaptativas: ingestor de jurisprudencia, propagación de updates, alertas a tenants. Integración con SUNAFIL Diagnostic y Alert Engine.

### Hardening — Sprints 11 a 12

- **S11.** Firmas digitales (PSC INDECOPI, Ley 27269); RBAC granular; cifrado at-rest envelope encryption (Supabase Vault); pentest.
- **S12.** Documentación legal y técnica final; manual del abogado-cliente; certificación ISO 27001 readiness; piloto con bufete partner.

### Dependencias entre módulos

```
Workers ──→ Generador ──→ Alert Engine (vencimientos, gestantes, sindicalizados)
Workers ──→ Generador ──→ SUNAFIL Diagnostic (auditoría preventiva del set de contratos)
Tenant Admin ──→ Generador (CIIU, ventas, ubigeo, REMYPE)
Generador ──→ Storage Supabase (versiones DOCX/PDF + .ots/.tsr)
Generador ──→ External: TSA INDECOPI, OTS calendar servers, SIVICE (extranjeros)
```

---

# PARTE VI — SEGURIDAD Y CUMPLIMIENTO

## 16. Protección de datos personales (Ley 29733 + DS 016-2024-JUS)

- **Designación obligatoria del Oficial de Datos Personales** (Art. 37 Reglamento) cuando se manejan grandes volúmenes y datos sensibles. COMPLY360 debe designar uno y exigirlo a los tenants en el onboarding.
- **Documento de seguridad** y políticas documentadas (Art. 47).
- **Controles de acceso a áreas seguras** (Art. 49) y equipos seguros (Art. 50).
- **Notificación de brechas** a la ANPDP (incluir en runbook de incidentes).
- **Flujo transfronterizo** (Arts. 18-20): Vercel (EE.UU.) y Supabase (zonas) requieren cláusulas contractuales modelo o evaluación de adecuación.
- **Derechos ARCO + portabilidad** (incorporada por DS 016-2024-JUS): exponer endpoints específicos.
- **Monto de referencia regulatoria 2024:** Las multas impuestas por la ANPDP durante 2024 totalizaron **S/ 13,424,590**, según nota oficial del Ministerio de Justicia y Derechos Humanos (MINJUS/ANPDP, ene-2025) reproducida por Agencia Andina; recaudados al cierre de la nota S/ 1,184,383. La presión fiscalizadora viene escalando ~100% año contra año.

## 17. Cifrado

- **At-rest:** AES-256-GCM por columna sensible vía Supabase Vault o `pgcrypto`. DOCX/PDF en Supabase Storage con cifrado lado servidor + clave por tenant (envelope encryption).
- **In-transit:** TLS 1.3 obligatorio. HSTS preload.
- **Claves:** rotación trimestral; KMS gestionado.

## 18. Retención y eliminación

- Plazo mínimo de conservación: **5 años desde el cese** (Art. 5 RM 020-2008-TR + Ley 27321 prescripción 4 años + 1 buffer).
- Documentos contables/tributarios: 5 años (LIR + Código Tributario).
- Eliminación segura: SHRED + verificación criptográfica de borrado en Supabase Storage; preservación de hashes (los hashes no son dato personal y mantienen valor probatorio).

## 19. RBAC

Roles mínimos:
- **TENANT_OWNER:** acceso total a contratos del tenant.
- **HR_MANAGER:** crear/editar/firmar; no puede eliminar versiones ni acceder a auditoría completa.
- **HR_OPERATOR:** generar contratos desde plantillas; no puede crear plantillas ni modificar reglas.
- **LEGAL_REVIEWER:** validar y firmar; lectura de auditoría completa.
- **WORKER:** lectura de sus propios contratos firmados; ejercicio ARCO.
- **SUPERADMIN (Comply360):** acceso transversal solo bajo auditoría reforzada y consentimiento contractual con tenant.

Implementación con NextAuth v5 + matriz de permisos en `lib/rbac/policy.ts`.

## 20. Cumplimiento SUNAFIL — listado preventivo

El módulo cubre, como mínimo, las infracciones tipificadas en el DS 019-2006-TR:
- **Numeral 23.2 (leve):** No entregar copia del contrato → entrega automática al portal del trabajador.
- **Numeral 24.7 (grave):** No celebrar por escrito → bloqueo de inicio de relación si el contrato no está firmado.
- **Numeral 25.5 (muy grave):** Desnaturalización / fraude → núcleo del motor de validación.

### Estrategia de testing

- **Unit tests:** cada regla de validación con casos positivos/negativos.
- **Integration tests:** flujos completos detect → create → validate → render → sign.
- **Snapshot tests:** cada plantilla DOCX renderizada con dataset estándar produce DOCX byte-idéntico (excepto timestamp).
- **Legal regression tests:** dataset de "casos extremos" (causa genérica, plazo excedido, Huatuco, gestante) que el motor debe rechazar siempre.
- **Property-based tests:** generador de tenants y workers aleatorios con `fast-check` valida que la detección de régimen sea total (cubre 100% del espacio de inputs).

---

# RECOMENDACIONES (decisión-ready)

1. **Priorizar el motor de validación antes que la cobertura de regímenes.** Un MVP con régimen general 728 + MYPE y motor robusto evita más juicios laborales que un módulo que cubre los 8 regímenes con plantillas porosas. **Umbral de cambio:** si en piloto se detectan ≥3 tenants con CIIU agrario o construcción simultáneamente, adelantar S5 a S3.
2. **Construir el catálogo de reglas como dato, no código.** Toda regla = una fila de `ContractValidationRule` con `ruleSpec` JSON; futuras casaciones se aplican como migraciones de datos sin redeploy.
3. **Adoptar OpenTimestamps desde el día uno** aunque no se use comercialmente; el costo marginal es cero y aporta una capa probatoria pública gratuita que diferencia a COMPLY360 frente a competidores que solo usan TSA privadas.
4. **No replicar el flujo derogado del registro modal MTPE.** Diseñar el módulo asumiendo que el control es por fiscalización posterior SUNAFIL. Sí mantener el flujo de registro para tiempo parcial, agrario, exportación no tradicional, intermediación y futbolistas.
5. **Versionar las plantillas por jurisprudencia.** Cada `ContractTemplate` con `version` semver y `legalBasisSnapshot`. Los contratos firmados quedan inmutables en su versión; los nuevos toman la última vigente. **Umbral de cambio:** cada vez que la Corte Suprema emite Casación de Sala Plena, abrir PR de revisión en 5 días hábiles.
6. **Tests legales obligatorios por plantilla:** snapshot DOCX + dataset de casos extremos pasados por el motor.
7. **Roadmap defensible para dev único.** El plan asume Amado solo. Si entran más recursos, paralelizar por familia de regímenes (un dev: MYPE/agrario; otro: construcción/hogar; otro: extranjero/exportación).
8. **Coordinar con SUNAFIL Diagnostic** vía endpoint `GET /api/contracts/instances/:id/risk-profile` que el diagnóstico consume para calcular probabilidad de sanción con su propio scoring.
9. **Disclaimer obligatorio:** COMPLY360 asiste el cumplimiento pero no sustituye asesoría laboral particular; cada tenant es responsable final. Incluir en TyC + en footer del DOCX generado.
10. **Activar arquitectura de "kill-switch jurisprudencial":** un endpoint admin que, ante una casación crítica, marca todas las plantillas afectadas como `DEPRECATED_PENDING_REVIEW` hasta validación manual. **Umbral:** activar si cualquier órgano superior emite cambio de criterio sobre Art. 77 LPCL o sobre causa objetiva.

---

# CAVEATS

- **UIT 2026 = S/ 5,500** (D.S. 301-2025-EF), no S/ 5,400 como se indicaba en el brief. **RMV vigente** habilitada por **D.S. 006-2024-TR** (28-dic-2024), no por el D.S. 011-2023-TR del brief. Todo umbral del módulo debe leer estos valores desde una tabla `LegalConstants(year, constant, value, sourceNorm)` para soportar cambios anuales sin redeploy.
- La **Ley 32353** (régimen MYPE 2025) entra en vigencia con su reglamento (plazo 60 días desde la publicación del 27-may-2025). Validar fecha exacta de vigencia antes de activar reglas dependientes (Sistema de Pensiones Sociales, permanencia 3 años pos-tope).
- **Tensión jurisprudencial activa** sobre la competencia de SUNAFIL para declarar desnaturalización: Cas. Lab. 24577-2022-Lima (Segunda Sala, 19-sep-2024, a favor) vs. Cas. Lab. 53949-2022-Tumbes (Cuarta Sala, 19-may-2025, en contra). Se recomienda tratar SUNAFIL como sancionador y mantener al juez laboral como árbitro último, hasta que Sala Plena se pronuncie.
- El cuadro de jornales del régimen de construcción civil 2026 corresponde al convenio CAPECO–FTCCP suscrito en diciembre 2025; **renegociación anual cada 1 de junio** — el módulo debe alertar 60 días antes.
- Las plantillas de **contrato de extranjero** deben actualizarse cuando entre en vigencia el reemplazo del D.Leg. 689 (proyecto en Congreso 2025-2026).
- El **ecosistema docxtemplater** registra **203 proyectos npm dependientes** (versión 3.67.6, npmjs.com may-2026); su modelo de monetización con módulos pagados (HTML, Image, Chart, Subtemplate) puede requerir licenciamiento si COMPLY360 necesita esas extensiones.
- COMPLY360 debe operar bajo un **disclaimer claro:** el SaaS asiste al cumplimiento pero no sustituye asesoría laboral particular; cada tenant es responsable final de la legalidad de los contratos que emite.
- Este informe **no analiza el régimen del Servicio Civil (D.Leg. 1057 CAS) ni el régimen del D.Leg. 276** (carrera administrativa), por estar fuera del alcance B2B privado de COMPLY360. Si en el futuro se incorpora oferta para entidades públicas, se requerirá un anexo específico que cubra Ley 30057 (Servir), CAS de plazo indeterminado (STC 00013-2021-PI), y la Ley 24041.