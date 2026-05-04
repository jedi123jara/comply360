# Brief — Consultor de privacidad / Ley 29733

> Documento para mandar al consultor por email + adjuntar como Scope of Work.
>
> **Producto a auditar**: COMPLY360 Perú — Módulo SST Premium con sub-schema médico cifrado
> **Empresa**: COMPLY360 PERÚ S.A.C.
> **Founder**: Amado Jara Carranza
> **Contacto**: a.jaracarranza@gmail.com

---

## Email plantilla — primer contacto

> **Asunto**: Auditoría de privacidad y protección de datos — plataforma SaaS COMPLY360
>
> Estimado(a) [Nombre],
>
> Soy Amado Jara Carranza, founder de COMPLY360 Perú, una plataforma SaaS de compliance laboral. Estamos por lanzar al mercado nuestro módulo SST Premium, que maneja datos personales sensibles (información de salud ocupacional de trabajadores) y necesitamos una **auditoría de privacidad externa** antes de exponerlo a clientes reales.
>
> El módulo está construido con arquitectura privacy-by-design:
>
> - **Cifrado AES-256 vía pgcrypto** en columnas con datos médicos (restricciones EMO, consentimientos, solicitudes ARCO).
> - **Solo persistimos "Aptitud"** (APTO/RESTRINGIDO/NO_APTO/OBSERVADO). El diagnóstico médico nunca toca nuestra base de datos.
> - **Rechazo automático** en API de payloads con campos como `diagnóstico`, `cie10`, `historia_clinica`, `tratamiento`.
> - **Audit log inmutable** de cada acceso a datos cifrados.
> - **Workflow ARCO** completo con SLA 20 días hábiles automatizado.
>
> Necesitamos que un especialista en Ley 29733 + D.S. 016-2024-JUS audite el código y los procesos, y nos firme un informe que podamos mostrar a clientes enterprise como prueba de cumplimiento.
>
> Presupuesto referencial: S/ 5,000-10,000 por auditoría puntual.
>
> ¿Podemos coordinar una llamada inicial de 30 min? Disponible [FECHA] o [FECHA].
>
> Saludos,
> Amado Jara Carranza

---

## Scope of Work — Auditoría privacy

### A) Revisión técnica del cifrado

Archivos: `src/lib/sst/medical-vault.ts`, `prisma/schema.prisma`, migration que habilita pgcrypto.

El consultor revisa:

1. **Algoritmo de cifrado**: pgp_sym_encrypt usa AES-256 internamente. ¿Es adecuado para datos médicos según buenas prácticas de la industria + criterio de "razonablemente seguro" del Art. 39 Ley 29733?
2. **Gestión de claves**: la clave maestra `MEDICAL_VAULT_KEY` se guarda en variable de entorno (Vercel) + gestor de contraseñas + papel sellado. ¿Es suficiente o se necesita HSM (Hardware Security Module)?
3. **Rotación de claves**: ¿el procedimiento actual de NO rotar (porque rotar requiere re-cifrar todo) es aceptable bajo Ley 29733? ¿Qué frecuencia de rotación se recomienda?
4. **Backup de la clave**: el plan de respaldo (Vercel + Bitwarden + sobre sellado en banco) ¿cumple con el deber de no perder los datos cifrados?

**Entregable**: opinión técnica firmada de 2-3 páginas.

---

### B) Revisión del workflow ARCO

Archivos: `src/app/api/sst/derechos-arco/`, UI `src/app/dashboard/sst/arco/page.tsx`.

El consultor revisa:

1. **SLA de 20 días hábiles** (Art. 41 Ley 29733): el cálculo en `addBusinessDays` salta sábados y domingos. ¿Debe descontar feriados nacionales también? Si sí, el cálculo actual es deficiente.
2. **5 derechos ARCO + portabilidad**: ¿el sistema cubre los 5 derechos correctamente?
   - **A**cceso: ¿el endpoint permite que el solicitante reciba un volcado de sus datos?
   - **R**ectificación: ¿hay flujo para corregir datos?
   - **C**ancelación: ¿hay flujo para borrar datos del solicitante (con excepciones de retención legal)?
   - **O**posición: ¿hay flujo para limitar el tratamiento?
   - **P**ortabilidad: ¿hay flujo para entregar datos en formato estructurado?
3. **Notificación al solicitante**: ¿el sistema notifica al solicitante el resultado dentro del SLA?
4. **Obligación de identificar al solicitante**: el endpoint actual solo pide DNI + nombre. ¿Es suficiente para validar identidad o se necesita verificación adicional?

**Entregable**: matriz de cumplimiento ARCO con observaciones por cada derecho.

---

### C) Revisión del flujo de consentimiento Ley 29733

Archivos: `src/app/api/sst/consentimientos/route.ts`, schema `consentimientoCreateSchema`.

El consultor revisa:

1. **Carácter expreso del consentimiento**: el sistema requiere `consentimientoLey29733: true` para crear EMO, pero ¿está bien documentado QUÉ está consintiendo el trabajador?
2. **Texto del consentimiento**: el campo `texto` se cifra. ¿La plantilla de texto que recomendamos a los clientes (si existe) cumple con los requisitos del Art. 18 Ley 29733?
3. **Vigencia**: el modelo `ConsentimientoLey29733.vigenciaHasta` permite cualquier fecha. ¿Hay un mínimo recomendado o un máximo legal? La regla "5 años post-cese" (D.S. 016-2024-JUS) ¿se está aplicando bien?
4. **Revocación**: el modelo tiene `revocadoAt`. ¿El UI permite al titular revocar su consentimiento? Si no, hay un gap.

**Entregable**: plantilla de consentimiento legal (texto base) que el consultor firma como cumpliente.

---

### D) Aviso de privacidad

El consultor revisa el aviso de privacidad de COMPLY360 (sitio público, TyC, política de privacidad).

1. **Información obligatoria** (Art. 18 Ley 29733):
   - [ ] Identidad y dirección del titular del banco de datos
   - [ ] Finalidad del tratamiento
   - [ ] Existencia del banco de datos
   - [ ] Carácter facultativo u obligatorio de las respuestas
   - [ ] Transferencia a terceros (si aplica)
   - [ ] Plazo de conservación
   - [ ] Derechos ARCO
   - [ ] Datos de contacto del DPO

Si COMPLY360 no tiene aviso de privacidad publicado o le faltan elementos, el consultor lo redacta.

**Entregable**: aviso de privacidad actualizado en formato Markdown.

---

### E) Banco de datos personales — registro ANPDP

1. **Inscripción del banco**: COMPLY360 ¿tiene inscritos sus bancos de datos ante la ANPDP? Si no, hay que hacer la inscripción.
2. **Bancos a inscribir**:
   - Banco de datos de trabajadores de clientes (COMPLY360 es encargado)
   - Banco de datos de usuarios del SaaS (COMPLY360 es titular)
3. **Procedimiento**: el consultor guía la inscripción si no está hecha.

**Entregable**: comprobante de inscripción ANPDP (o plan para hacerlo en X semanas).

---

### F) Designación del DPO

Ley 29733 + D.S. 016-2024-JUS exigen un Oficial de Datos Personales (DPO) cuando se manejan datos sensibles a escala.

1. **Para COMPLY360**: ¿quién es el DPO? Debería ser un rol designado formalmente (puede ser interno o externo).
2. **Para los clientes**: el sistema permite cada org designar su propio DPO. ¿La UI de configuración expone bien esta designación?

**Entregable**: contrato modelo de DPO + procedimiento para que cada cliente designe el suyo.

---

### G) Plan de respuesta a brechas

Si COMPLY360 sufre una brecha (filtración de la `MEDICAL_VAULT_KEY`, hackeo de Supabase, dev malicioso):

1. **Detección**: ¿qué señales monitoreamos en Sentry / audit logs?
2. **Contención**: ¿cuáles son los pasos para contener la brecha?
3. **Notificación a ANPDP** en 72h (D.S. 016-2024-JUS Art. 75): ¿quién la hace? ¿qué información incluye?
4. **Notificación a titulares**: ¿cómo se hace? ¿plazo legal?
5. **Comunicación pública**: ¿qué se publica en el sitio?

**Entregable**: runbook de respuesta a incidentes de privacidad.

---

### H) Política de retención y eliminación

1. **Datos médicos**: ¿cuánto tiempo se retienen las restricciones EMO? Recomendación: 5 años post-cese del trabajador.
2. **Audit logs**: ¿cuánto tiempo se retienen los logs? Recomendación: 6 años (plazo de prescripción laboral).
3. **Eliminación segura**: cuando vence el plazo, ¿hay job que borra los datos? Hoy no existe — el consultor lo agrega como recomendación.

**Entregable**: política de retención + plan de implementación del job de eliminación.

---

## Entregables del consultor

| # | Entregable | Formato |
|---|---|---|
| 1 | Opinión técnica del cifrado (sección A) | PDF firmado |
| 2 | Matriz de cumplimiento ARCO (sección B) | PDF + XLSX |
| 3 | Plantilla de consentimiento Ley 29733 (sección C) | DOCX firmado |
| 4 | Aviso de privacidad actualizado (sección D) | MD + PDF firmado |
| 5 | Comprobante de inscripción ANPDP o plan (sección E) | PDF |
| 6 | Contrato modelo DPO (sección F) | DOCX |
| 7 | Runbook de respuesta a brechas (sección G) | MD |
| 8 | Política de retención + plan eliminación (sección H) | MD |
| 9 | Informe ejecutivo final con observaciones priorizadas | PDF firmado |

---

## Cronograma

| Semana | Actividad |
|---|---|
| 1 | Onboarding + lectura código + entrevista al equipo |
| 2 | Auditoría técnica (A, B, C) + redacción inicial |
| 3 | Documentos legales (D, E, F) |
| 4 | Runbook brechas + política retención + informe final |

---

## Criterios de aceptación

- 9 entregables firmados y entregados.
- Observaciones críticas resueltas (ej: si el aviso de privacidad falta info obligatoria, redactarlo y publicarlo).
- Constancia de inscripción del banco de datos ante ANPDP.
- DPO designado formalmente.

---

## Confidencialidad

El consultor firma NDA antes de recibir acceso al código.

---

## Dónde encontrar al consultor

### Filtro mínimo

- ✅ Especialista en Ley 29733 + D.S. 016-2024-JUS (no asesor legal genérico).
- ✅ Ha llevado al menos 3 inscripciones de bancos de datos ante ANPDP.
- ✅ Conoce el sector tech / SaaS (no solo bancos / retail).
- ✅ Idealmente, ha sido inspector ANPDP o trabaja en un estudio jurídico con práctica regulatoria.

### Estudios jurídicos con práctica fuerte

- **Hernández & Cía Abogados** — área TMT/datos personales
- **Estudio Echecopar** (Baker McKenzie) — Privacy Practice
- **Rodrigo, Elías & Medrano** — protección de datos
- **CMS Grau** — privacidad y compliance
- **Estudio Olaechea** — protección de datos

### Independientes recomendados

- Ex-funcionarios de la ANPDP que ahora hacen consultoría privada (LinkedIn).
- Profesores universitarios de Derecho Digital (PUCP, UPC, USIL).

---

## Costos esperados

| Item | Rango |
|---|---|
| Auditoría inicial (4 semanas) | S/ 5,000 - 10,000 |
| Mantenimiento mensual (revisar nuevos features) | S/ 1,500 - 3,000 |
| Re-auditoría cuando salga nueva normativa | Por hora, S/ 250-500 |

**Pago**: 50% inicio, 50% contra entrega de los 9 entregables.

---

## Documentos a entregar al consultor (input)

Cuando se firme el contrato, el founder entrega:

1. Acceso de lectura al repo Git (`legaliapro-platform`).
2. Acceso a staging con un usuario admin de prueba.
3. Acceso a la base de datos staging (read-only).
4. Estos documentos del repo:
   - `CLAUDE.md` (overview del producto)
   - `DEPLOY-SST.md` (runbook operacional)
   - `prisma/schema.prisma` (modelos)
   - `src/lib/sst/medical-vault.ts` (helper de cifrado)
   - `src/lib/sst/schemas.ts` (lista de campos prohibidos)
   - `src/app/api/sst/derechos-arco/` (workflow ARCO)
   - `src/app/api/sst/consentimientos/` (workflow consentimiento)

NDA + acceso bajo VPN si corresponde.
