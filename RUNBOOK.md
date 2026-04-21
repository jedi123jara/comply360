# 🚀 RUNBOOK — Demo con 3 empresas

> Guía paso a paso para onboardear 3 empresas reales mañana. **Leer completo antes de arrancar.**

**Tiempo total estimado**: 2–3 horas para las 3 empresas (45–60 min por empresa la primera vez).

---

## 🔧 PRE-DEMO (hacé esto HOY antes de dormir)

### 1. Registrar dominios (15 min)
- [ ] `comply360.pe` en [punto.pe](https://punto.pe) o [Haulmer](https://haulmer.com)
- [ ] `comply360.com` en [Cloudflare Registrar](https://cloudflare.com) (sin markup)
- [ ] `comply360.com.pe` (defensivo, redirect)

### 2. Variables de entorno en Vercel (30 min)

Entrar a `vercel.com` → proyecto `legaliapro-platform` → Settings → Environment Variables.

**Obligatorias** (sin esto el demo ROMPE):

| Variable | Valor | De dónde |
|---|---|---|
| `DATABASE_URL` | `postgres://...` | Supabase → Project Settings → Database → Connection string (Pooler) |
| `DIRECT_URL` | `postgres://...` | Supabase → idem pero "Direct" |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Clerk dashboard → API Keys (PROD) |
| `CLERK_SECRET_KEY` | `sk_live_...` | Clerk dashboard → API Keys (PROD) |
| `JWT_SECRET` | 32+ caracteres random | Generar con `openssl rand -base64 32` |
| `CRON_SECRET` | 32+ caracteres random | Generar con `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://app.comply360.pe` | Tu dominio con https |

**Muy recomendadas** (sin estas algunas features fallan silenciosamente):

| Variable | Valor | De dónde |
|---|---|---|
| `RESEND_API_KEY` | `re_...` | [resend.com](https://resend.com) → API Keys. Requiere verificar dominio primero (agregar registros DNS DKIM/SPF) |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Supabase → Project Settings → API → `service_role` |
| `OPENAI_API_KEY` | `sk-...` | [platform.openai.com](https://platform.openai.com) → API Keys |

**Opcionales para el demo**:

- `CULQI_*` — solo si quieren probar cobro real (no es necesario porque están en trial 14 días)
- `VAPID_*` — push notifications (no crítico)
- `APIS_NET_PE_TOKEN` — auto-completar datos desde RUC/DNI (acelera onboarding)
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — formato `51999999999` (tu número real)

### 3. Aplicar migración de base de datos (5 min)

En Vercel, después de configurar `DATABASE_URL` y `DIRECT_URL`:

```bash
# Desde tu máquina local
cd C:\Users\User\Desktop\comply360\legaliapro-platform
npx prisma migrate deploy
```

Esto aplica los 5 índices de performance + agrega `ENTERPRISE` al enum `Plan`. Si falla, mostrará qué migración necesita resolverse manualmente.

### 4. Deploy a Vercel (2 min)

```bash
git add .
git commit -m "feat: QR asistencia + setup demo 3 empresas"
git push origin main
```

Vercel deploya automáticamente. Espera 3–5 min. Verifica en el dashboard de Vercel que el build pasó.

### 5. Preflight check (1 min)

Con las env vars ya configuradas localmente (copia las de Vercel a tu `.env`):

```bash
npm run preflight
```

Debe decir `🚀 Preflight OK`. Si dice `⛔`, corregí los `✗` que lista.

### 6. Apuntar dominio a Vercel (10 min)

En Vercel → proyecto → Domains:
- Agregar `app.comply360.pe`
- Vercel te da los DNS records (A + AAAA o CNAME)
- Ponelos en tu proveedor de dominio (Haulmer/Cloudflare)
- Esperar propagación DNS (5–30 min). Verificar en https://dnschecker.org

### 7. Configurar Clerk para tu dominio (10 min)

Clerk dashboard → Domains → Add production domain:
- `app.comply360.pe`
- Clerk te da un CNAME record → ponelo en tu DNS
- Esperar verificación (5 min)

---

## 📋 DATOS QUE NECESITO DE VOS PARA MAÑANA

### De las 3 empresas del demo

Para cada una, necesito:

1. **RUC** (11 dígitos)
2. **Razón social exacta**
3. **Nombre comercial** (si es distinto)
4. **Sector** (1 palabra: comercio, servicios, construcción, etc.)
5. **Tamaño**: 1-10 / 11-50 / 51-100 / 101-200 / 201+
6. **Email del admin principal** (dueño o responsable RRHH)
7. **Régimen laboral principal**: GENERAL / MYPE_MICRO / MYPE_PEQUENA / AGRARIO / etc.

### De los trabajadores (por empresa)

Para el demo más impactante, cargar mínimo 5 trabajadores por empresa con:

1. **DNI** (8 dígitos)
2. **Nombres y apellidos**
3. **Email personal** del trabajador (Gmail/Outlook/etc. — NO el corporativo)
4. **Teléfono** (opcional pero mejor)
5. **Cargo**
6. **Fecha de ingreso**
7. **Sueldo bruto mensual**

> 💡 **Truco**: si tenés la planilla en Excel, podés usar la importación masiva en `/dashboard/trabajadores/importar`. La columna obligatoria mínima es DNI + nombres + fechaIngreso + sueldoBruto.

### Tus datos del registrant (para el dominio)

Si todavía no compraste, vas a necesitar:
- RUC (si es persona jurídica) o DNI
- Dirección fiscal
- Teléfono
- Email de contacto

---

## 🎬 DEMO — SECUENCIA DE 45 MINUTOS POR EMPRESA

### [0–5 min] Signup del admin

1. Abrir `app.comply360.pe` en el celular o laptop de la empresa
2. Clic en **"Probar 14 días gratis"**
3. Crear cuenta con el email del admin (Google SSO recomendado por velocidad)
4. Verificar el email (llega de Clerk)

### [5–15 min] Onboarding wizard

1. Aparece el wizard de 4 pasos:
   - **Paso 1**: RUC + razón social (auto-completa con APIs_NET_PE si está configurada)
   - **Paso 2**: Régimen laboral principal
   - **Paso 3**: Email de alertas (puede ser el mismo)
   - **Paso 4**: Resumen + botón "Crear mi cuenta"
2. Al confirmar, el sistema **auto-activa trial PRO 14 días** (backend `/api/trial/start`)
3. Redirige a `/dashboard?welcome=trial`
4. Aparece `ConsentGate` → aceptar 4 docs legales (T&C, privacidad, DPA, AUP)

### [15–25 min] Cargar los 5 trabajadores

Opción A (manual):
1. `/dashboard/trabajadores/nuevo`
2. Completar DNI → auto-fetch RENIEC (si APIs_NET_PE configurado) llena nombres, fecha nacimiento, dirección
3. Completar datos laborales (cargo, régimen, sueldo, fecha ingreso)
4. Guardar → alerta automática si hay algún dato faltante del legajo
5. Repetir para los 5

Opción B (masiva):
1. `/dashboard/trabajadores/importar` → subir Excel
2. El sistema parsea + valida + muestra preview
3. Confirmar importación → los 5 trabajadores creados en ~10 segundos

### [25–32 min] Generar un contrato desde plantilla

1. `/dashboard/configuracion/empresa/plantillas` → modal primer uso (zero-liability) → aceptar
2. Clic **"Nueva plantilla"**
3. Pegar un texto de contrato de la empresa (o usar la plantilla de ejemplo precargada) con `{{NOMBRE_COMPLETO}}`, `{{DNI}}`, `{{SUELDO}}`, `{{FECHA_INGRESO}}`
4. Detector auto-mapea los placeholders conocidos
5. Guardar plantilla
6. Clic **"Generar"** → seleccionar un worker → preview PDF
7. Descargar PDF

### [32–38 min] Worker firma el contrato

> **En este momento**, el trabajador en cuestión necesita su celular listo.

1. Admin cambia el contrato a `status = SIGNED` desde `/dashboard/contratos/[id]` → dispara la **cascada de onboarding**:
   - Se crean `WorkerRequest` pidiendo CV, DNI copia, declaración jurada, examen médico, afiliación AFP
   - Se envía email al trabajador con link a su portal
2. El trabajador recibe email → tap en el link → abre `/sign-in`
3. Login con su email (Clerk recibe el email como invitado automático)
4. Primera vez que entra → `ConsentGate worker` → acepta autorización Ley 29733 Art. 14
5. Ve en `/mi-portal` un banner "Tenés 1 contrato para firmar"
6. Entra al contrato → lee → checkbox "he leído" → botón **"Firmar con huella"**
7. iPhone/Android pide Touch ID / huella → listo
8. Contrato firmado con audit trail completo

### [38–42 min] ⭐ **PRUEBA DE ASISTENCIA QR** (el show)

Este es el momento wow del demo.

1. Admin abre `/dashboard/asistencia`
2. Arriba aparece el **QR grande** (si lo querés proyectar en una TV, tap "Proyectar" → fullscreen)
3. Pasa al trabajador: "Abrí la cámara de tu celular y apuntá al QR"
4. El celular del trabajador detecta el QR → aparece notificación con el link → tap
5. Se abre `/mi-portal/asistencia?t=TOKEN` automáticamente
6. El sistema valida el token y registra el clock-in en <1 segundo
7. Aparece pantalla grande verde: **"¡Marcaste a tiempo!"**
8. En el dashboard del admin, aparece el trabajador en la tabla de asistencia del día

### [42–45 min] Cierre

1. Mostrar `/dashboard` cockpit con el score de compliance que ya subió
2. Mostrar que el trabajador puede instalar la PWA en su celular (menú → "Agregar a pantalla de inicio")
3. Mencionar: "Todo esto queda auditado, exportable, y si SUNAFIL viene mañana tenés el legajo al día"

---

## 🆘 TROUBLESHOOTING RÁPIDO

### "El QR se ve borroso"
- Verificar que el monitor/TV donde lo proyectás tenga buena resolución
- Aumentar el brillo
- Usar el **short code** manual como fallback (aparece debajo del QR)

### "El trabajador abrió el link y dice `TOKEN_EXPIRED`"
- El token vive 5 min, se rota cada 4 min. Si abrió el link después de ese tiempo → admin refresca el QR (botón "Refrescar")

### "El trabajador abre el link pero lo lleva a /sign-in y no a asistencia"
- Es su primer acceso → normal. Tras login + consent, se restaura el query `?t=TOKEN`
- Si no se restaura: admin genera un QR nuevo después del login del worker

### "El email de onboarding no llegó"
- Verificar que `RESEND_API_KEY` está en Vercel
- Verificar que el dominio está verificado en Resend (DNS DKIM/SPF)
- Revisar spam folder del trabajador
- Fallback: admin copia el link de invitación de Clerk manualmente y lo manda por WhatsApp

### "El worker no ve el contrato en /mi-portal/contratos"
- Verificar que `WorkerContract` existe (el worker está realmente vinculado al contrato)
- Verificar que `Contract.status` es `APPROVED` o `DRAFT` (no `SIGNED` todavía ni `ARCHIVED`)
- Revisar audit log del worker

### "PWA no se ofrece instalar"
- Usar Chrome, Safari iOS, o Samsung Internet (otros browsers no soportan)
- El prompt aparece después de 3 visitas por design
- Fallback manual: Menú del navegador → "Agregar a pantalla de inicio"

### "Firma biométrica falla"
- Verificar que el dispositivo tiene Touch ID / huella / Windows Hello configurado
- Si no tiene, automáticamente cae a firma SIMPLE (checkbox) — sigue siendo válida, solo con menor fuerza probatoria

### "Vercel timeout 15s en algún endpoint"
- `/dashboard/trabajadores` con muchos trabajadores puede ser lento al inicio
- Fallback: fetchear con `?limit=20` manualmente
- Fix real post-demo: paginación server-side

---

## 📊 POST-DEMO — CHECKLIST DE SEGUIMIENTO

### El mismo día del demo

- [ ] Anotar qué rompió, qué confundió al usuario, qué gustó
- [ ] Si hubo errores de UX, flagearlos para fix esta semana
- [ ] Pedir feedback directo: "Del 1 al 10, ¿cuán probable es que sigas usándolo? ¿Por qué?"

### Día siguiente

- [ ] Mandar email de seguimiento: link al dashboard + tutorial de las 3 features que más usaron
- [ ] Mandar a cada admin el `RUNBOOK.md` versión resumida "Cómo funciona tu comply360"

### 14 días después (fin del trial)

- [ ] Trial expira → llega email automático "Tu trial terminó, actualizá"
- [ ] Cron `check-trials` downgradea a STARTER
- [ ] Hacer follow-up manual: WhatsApp personal al admin preguntando cómo va

---

## 📞 CONTACTO DE EMERGENCIA DURANTE EL DEMO

Si algo rompe en vivo:

1. **Primer intento**: hard refresh del browser (Ctrl+Shift+R)
2. **Segundo intento**: revisar https://vercel.com/dashboard → ver logs del deployment
3. **Tercer intento**: fallback manual (WhatsApp, mostrar screenshot, etc.)
4. **Último recurso**: "Esto es un demo preview de la versión final. Vamos a seguir con el tema X y lo veo después."

---

## 🎯 OBJETIVO ALINEADO

**Meta del demo de mañana**: NO es cerrar venta. Es **validar 3 cosas**:

1. ¿Las 3 empresas pueden hacer signup + onboarding sin ayuda?
2. ¿La firma biométrica + QR asistencia les "dan el wow"?
3. ¿Ven valor suficiente para pagar S/299/mes cuando termine el trial?

Si 2 de 3 dicen "sí" a las 3 preguntas → el producto funciona. Si 0 de 3 → iterar mensaje + UX.

Buena suerte. 🚀
