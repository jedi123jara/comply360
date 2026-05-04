# Brief — Consultor SST senior peruano

> Documento para mandar al consultor por email + adjuntar como Scope of Work al contrato.
>
> **Producto a revisar**: COMPLY360 Perú — Módulo SST Premium (SaaS de compliance laboral)
> **Empresa**: COMPLY360 PERÚ S.A.C.
> **Founder**: Amado Jara Carranza
> **Contacto**: a.jaracarranza@gmail.com

---

## Email plantilla — primer contacto

> **Asunto**: Búsqueda de consultor SST senior para validación de plataforma SaaS — COMPLY360
>
> Estimado(a) [Nombre],
>
> Me presento: soy Amado Jara Carranza, founder de COMPLY360 Perú, una plataforma SaaS de compliance laboral en lanzamiento. Estamos por sacar al mercado nuestro módulo de Seguridad y Salud en el Trabajo (SST Premium) y necesito un consultor SST senior peruano que valide el contenido legal y técnico de la plataforma antes de exponerlo a clientes reales.
>
> El módulo cubre: matriz IPERC oficial R.M. 050-2013-TR, sub-schema médico cifrado bajo Ley 29733, tracking de notificación SAT D.S. 006-2022-TR, comité paritario R.M. 245-2021-TR, Field Audit con visitas presenciales, y scoring SUNAFIL con cuadro de infracciones D.S. 019-2006-TR.
>
> Lo construimos sobre Next.js + PostgreSQL con asistencia de IA (DeepSeek V4 1M) para sugerir peligros, pero el cálculo de los índices P×S y los textos legales son determinísticos por código. Necesito que un experto valide que:
>
> 1. Las citas a normas peruanas son correctas y vigentes.
> 2. La matriz P×S sigue al pie la R.M. 050-2013-TR.
> 3. El catálogo seed de 80 peligros está bien clasificado por familia.
> 4. La estructura del Plan Anual SST cumple Art. 38 Ley 29783.
> 5. Los plazos legales (SAT 24h/720h/120h, Comité 2 años, EMO anual) están bien implementados.
>
> El alcance completo está en el documento adjunto.
>
> Presupuesto referencial: S/ 8,000-15,000 por revisión inicial (1-2 semanas) + S/ 3,000-5,000/mes para mantenimiento normativo continuo (revisar cambios de normativa, validar nuevas features).
>
> ¿Le interesaría tener una llamada de 30 min para conversarlo? Puedo este [FECHA] o [FECHA].
>
> Saludos,
> Amado Jara Carranza
> COMPLY360 PERÚ S.A.C.

---

## Scope of Work — Revisión inicial SST Premium

### A) Validación normativa

El consultor revisa que las citas y plazos en el código y la documentación coincidan con la normativa vigente. Entrega un informe firmado con el listado de validaciones.

| Norma | Dónde se cita | Lo que el consultor valida |
|---|---|---|
| **Ley 29783** (Ley SST) | `iperc-llm.ts`, `comite-rules.ts`, varios endpoints | Citas a Arts. 22-23, 29-32, 35.a/b, 37, 38, 58 son correctas |
| **D.S. 005-2012-TR** (Reglamento Ley SST) | `comite-rules.ts` | Aplicación correcta del reglamento |
| **R.M. 050-2013-TR** (Manual IPERC) | `iperc-matrix.ts`, `iperc-llm.ts`, PDFs | Tabla P×S oficial Tablas 9, 11, 12; clasificación Trivial→Intolerable correcta |
| **R.M. 245-2021-TR** (Reglamento Comité SST) | `comite-rules.ts`, UI elecciones | Composición paritaria mínima por tamaño + mandato 2 años |
| **D.S. 006-2022-TR** (mod. Reglamento Ley SST) | `sat-deadline.ts`, PDF SAT | Plazos 24h mortal/IP, último día hábil mes siguiente no mortal, 5 días hábiles enf. ocupacional |
| **R.M. 144-2022-TR** (Manual SAT) | PDF accidente | Estructura de los Formularios N° 1-4 |
| **D.S. 019-2006-TR** (Cuadro infracciones) | `scoring.ts` | Tabla de multas por tipicidad + tamaño aplicada con UIT 2026 (S/ 5,500) |
| **D.S. 014-2013-TR** (Auditoría SGSST) | Documentación general | Frecuencia de auditoría externa |
| **R.M. 312-2011-MINSA** + **R.M. 571-2014-MINSA** (EMO) | `schemas.ts`, calendar-engine | 4 tipos EMO + frecuencia anual |
| **D.S. 011-2019-TR** (Construcción) | `seed-sst.ts` | Peligros sectoriales correctos para construcción |
| **D.S. 024-2016-EM** (Minería) | `seed-sst.ts` | Mineros con peligros adecuados |
| **Ley 30102** (UV solar) | `schemas.ts` | Flag `requiereExposicionUVSolar` aplicado correctamente |

---

### B) Validación del catálogo seed

El consultor revisa el archivo `prisma/seed-sst.ts` (80 peligros + 40 controles) y firma que:

1. **Cada peligro está bien clasificado** en su familia (FISICO/QUIMICO/BIOLOGICO/ERGONOMICO/PSICOSOCIAL/MECANICO/ELECTRICO/LOCATIVO).
2. **La descripción es técnicamente correcta** y no contiene errores conceptuales.
3. **La fuente legal citada es la vigente** (no hay normas derogadas).
4. **Los controles están bien clasificados** en la jerarquía oficial (Eliminación → Sustitución → Ingeniería → Administrativo → EPP).
5. **Identifica peligros relevantes que faltan** y propone hasta 20 adicionales prioritarios para sectores peruanos clave (construcción, minería, manufactura, salud, comercio).

**Entregable**: Excel anotado con cada uno de los 80 peligros + observaciones, y un addendum con los 20 nuevos propuestos.

---

### C) Validación del motor IPERC determinístico

Archivo: `src/lib/sst/iperc-matrix.ts` + sus 38 tests.

El consultor revisa:

1. La función `calcularNivelRiesgo()` calcula IP = A+B+C+D y NR = IP×S.
2. La clasificación coincide con Tabla 11 R.M. 050-2013-TR:
   - 4 → Trivial
   - 5-8 → Tolerable
   - 9-16 → Moderado
   - 17-24 → Importante
   - 25-36 → Intolerable
3. Los textos de "acción recomendada" son las **citas literales** de Tabla 11.
4. El SLA interno COMPLY360 (60 días Moderado, 15 días Importante, 0 días Intolerable) es razonable y defensible.

**Entregable**: informe de 1-2 páginas firmado confirmando que el motor es **auditable y defendible en juicio**.

---

### D) Validación del LLM redactor IPERC

Archivo: `src/lib/sst/iperc-llm.ts` + el prompt al LLM.

El consultor revisa:

1. El prompt al LLM (DeepSeek V4 1M) **no le pide al modelo que invente normas legales**. Solo le pide redactar texto narrativo y elegir peligros del catálogo.
2. La whitelist de peligros (`peligroCodigo` debe existir en el catálogo) es robusta — el modelo no puede inventar peligros.
3. Los índices propuestos por el LLM se **clampean a 1-3** y se recalculan server-side con el motor determinístico.

**Entregable**: confirmación firmada de que el sistema es **auditable** y que el LLM no decide nada legalmente vinculante.

---

### E) Validación del catálogo médico (Ley 29733)

Archivos: `src/lib/sst/schemas.ts` (lista `FORBIDDEN_MEDICAL_FIELDS`), `medical-vault.ts`.

El consultor revisa con un asesor en privacidad si lo prefiere:

1. La lista de campos prohibidos cubre lo que la Ley 29733 considera "datos sensibles" en el contexto laboral.
2. La aptitud (APTO/APTO_CON_RESTRICCIONES/NO_APTO/OBSERVADO) es información que **legítimamente puede manejar el empleador**.
3. Las restricciones laborales sin diagnóstico tampoco violan la ley.

---

### F) Recomendaciones estratégicas

El consultor entrega un memo de 3-5 páginas con:

1. Riesgos legales no cubiertos por el módulo actual.
2. Features adicionales que valdría la pena agregar (Ej: cuota 3% de personas con discapacidad — Ley 29973).
3. Sectores donde COMPLY360 SST funcionaría mejor / peor.
4. Cambios normativos esperados para 2026-2027 que pueden impactar al producto.

---

## Entregables del consultor

| # | Entregable | Formato |
|---|---|---|
| 1 | Informe de validación normativa (sección A) | PDF firmado |
| 2 | Excel del catálogo de 80 peligros con observaciones (sección B) | XLSX |
| 3 | Addendum con 20 peligros nuevos prioritarios (sección B) | PDF |
| 4 | Informe motor IPERC (sección C) | PDF firmado |
| 5 | Informe LLM (sección D) | PDF firmado |
| 6 | Memo estratégico (sección F) | PDF |
| 7 | Constancia de servicios | PDF firmado y sellado |

---

## Cronograma propuesto

| Semana | Actividad |
|---|---|
| 1 | Onboarding del consultor + acceso a staging + lectura del código |
| 2 | Validación A + B (normas + catálogo) |
| 3 | Validación C + D + E (motor + LLM + privacidad) |
| 4 | Memo estratégico F + entrega final firmada |

---

## Criterios de aceptación

El trabajo del consultor se acepta cuando:

- Los 7 entregables están firmados y entregados.
- Las observaciones críticas (errores en citas legales o clasificaciones) están resueltas en el código.
- El consultor extiende un acta de revisión con su firma + colegiatura CIP (si es ingeniero) o universidad (si es abogado especializado en SST).

---

## Confidencialidad

El consultor firma un NDA antes de recibir acceso al código y staging. Todo lo que vea es propiedad de COMPLY360 PERÚ S.A.C.

---

## Dónde encontrar al consultor

### LinkedIn — búsqueda
- "Ingeniero SST senior Lima"
- "Especialista SUNAFIL"
- "Consultor seguridad y salud trabajo Perú"
- "Auditor SGSST D.S. 014-2013-TR"

### Colegios profesionales
- **CIP** (Colegio de Ingenieros del Perú) — Capítulo de Ingeniería de Seguridad: tiene directorio de auditores acreditados ante MINTRA.
- **Colegio Médico del Perú — Salud Ocupacional**: para temas EMO específicamente.

### Universidades con maestría en SST
- UNI — Maestría en Seguridad y Salud Ocupacional
- USIL — Maestría en SST
- ESAN — Diplomado SGSST

Consultar a egresados / docentes destacados.

### Recomendaciones cruzadas
- Pedir referencias a abogados laboralistas conocidos (Estudios García-Sayán, Muñiz, Payet & Rey).
- Asociaciones gremiales (CAPECO, SNI, SNMPE) — sus equipos de SST conocen quiénes son los buenos.

### Filtro mínimo del candidato

- ✅ 10+ años de experiencia en SST en Perú.
- ✅ Ha sido inspector SUNAFIL O ha llevado fiscalizaciones del lado del cliente.
- ✅ Ha auditado al menos 5 SGSST formalmente bajo D.S. 014-2013-TR.
- ✅ Conoce sectores: idealmente construcción + manufactura + minería.
- ✅ Está colegiado en CIP (o tiene equivalente verificable).
- ❌ Si solo tiene experiencia en MYPE/oficinas, no alcanza para validar minería/construcción.

---

## Costos esperados

| Item | Rango |
|---|---|
| Revisión inicial (4 semanas) | S/ 8,000 - 15,000 |
| Mantenimiento normativo mensual | S/ 3,000 - 5,000 |
| Re-validación cuando salga nueva normativa | Por hora, S/ 200-400 |

**Importante**: pagar 50% al inicio, 50% contra entrega de los 7 entregables firmados. NO pagar 100% por adelantado.
