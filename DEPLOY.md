# Comply360 — Deploy a Production Checklist

> Tickeá cada paso a medida que avanzás. Orden estricto — no te saltes pasos.

**Objetivo:** servir `https://comply360.pe` con 3 empresas demo + Founder Console + Daily Digest funcionando.

**Tiempo total:** ~60-90 min (sin contar propagación DNS).

---

## STEP 0 — Cuentas necesarias

- [ ] GitHub account
- [ ] Vercel account (linked a GitHub)
- [ ] Supabase account
- [ ] Clerk account (ya tenés dev, falta switch a prod)
- [ ] Resend account
- [ ] Punto.pe (ya ✅)
- [ ] OpenAI API key (plan paid para producción)

---

## STEP 1 — Subir código a GitHub

- [ ] Repo privado creado en github.com/new (nombre: `comply360`)
- [ ] `git remote add origin https://github.com/USER/comply360.git`
- [ ] `git add -A && git commit -m "feat: ready for production"`
- [ ] `git push -u origin main`
- [ ] Verificar en GitHub que están todos los archivos

**Verificación:**
```bash
git check-ignore .env  # debe responder `.env` (está ignorado ✅)
```

---

## STEP 2 — Vercel: import repo

- [ ] vercel.com/new → Import `comply360`
- [ ] Framework: Next.js (autodetectado)
- [ ] Deploy (va a fallar, es esperable)

---

## STEP 3 — Vercel: agregar dominio

- [ ] Settings → Domains → Add `comply360.pe`
- [ ] Add `www.comply360.pe` → redirect a `comply360.pe`
- [ ] Copiar los 2 registros DNS que muestra Vercel

---

## STEP 4 — DNS en Punto.pe (hacé esto AHORA para que propague)

- [ ] Login punto.pe → comply360.pe → Gestión DNS
- [ ] Borrar A/CNAME existentes en `@` y `www`
- [ ] Agregar: `A @ 76.76.21.21` TTL 3600
- [ ] Agregar: `CNAME www cname.vercel-dns.com` TTL 3600
- [ ] Save

**Verificación (volvé en 15-30 min):**
```bash
nslookup comply360.pe
# Debe devolver 76.76.21.21
```

---

## STEP 5 — Supabase (base de datos)

- [ ] app.supabase.com → New project `comply360-prod`
- [ ] Region: South America (São Paulo)
- [ ] Generate password → guardada en password manager
- [ ] Plan Free (upgradeás después)
- [ ] Settings → Database → copiar 2 connection strings:
  - [ ] Transaction mode (port 6543) → para `DATABASE_URL`
  - [ ] Direct connection (port 5432) → para `DIRECT_URL`
- [ ] Storage → New bucket `worker-documents` → Private
- [ ] Settings → API → copiar `service_role` key

---

## STEP 6 — Clerk producción

- [ ] Dashboard → switch a Production
- [ ] Domain: `comply360.pe`
- [ ] Copiar 5 CNAMEs para DNS
- [ ] Agregar esos 5 CNAMEs en Punto.pe
- [ ] Esperar ~10 min a que Clerk los valide
- [ ] API Keys → copiar `pk_live_...` y `sk_live_...`

---

## STEP 7 — Resend (emails)

- [ ] resend.com/domains → Add `comply360.pe`
- [ ] Agregar 3 registros (MX + 2 TXT) en Punto.pe
- [ ] Esperar ~10 min a que Resend marque verified
- [ ] API Keys → Create → copiar `re_live_...`

---

## STEP 8 — Generar secrets

```bash
# CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT_SECRET (otro random, diferente al anterior)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] `CRON_SECRET` generado y guardado
- [ ] `JWT_SECRET` generado y guardado

---

## STEP 9 — Vercel: env vars

Settings → Environment Variables → agregar TODAS en **Production + Preview**:

### Clerk PROD
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`
- [ ] `CLERK_SECRET_KEY=sk_live_...`
- [ ] `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- [ ] `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- [ ] `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`
- [ ] `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/onboarding`

### Supabase
- [ ] `DATABASE_URL=postgresql://...pooler.supabase.com:6543/...`
- [ ] `DIRECT_URL=postgresql://...supabase.com:5432/...`
- [ ] `SUPABASE_URL=https://xxx.supabase.co`
- [ ] `SUPABASE_SERVICE_KEY=eyJ...`

### App
- [ ] `NEXT_PUBLIC_APP_URL=https://comply360.pe`

### Secrets propios
- [ ] `CRON_SECRET=` (del STEP 8)
- [ ] `JWT_SECRET=` (del STEP 8)

### Email
- [ ] `RESEND_API_KEY=re_live_...`

### Founder Console (TUYO, privado)
- [ ] `FOUNDER_EMAIL=a.jaracarranza@gmail.com`
- [ ] `SLACK_FOUNDER_WEBHOOK_URL=` (opcional — crear en api.slack.com/messaging/webhooks)

### OpenAI
- [ ] `OPENAI_API_KEY=sk-proj-...`

### Culqi (pagos)
- [ ] `CULQI_PUBLIC_KEY=pk_test_...` (cambiar a live cuando Culqi verifique)
- [ ] `CULQI_SECRET_KEY=sk_test_...`

### Opcionales
- [ ] `APIS_NET_PE_TOKEN=` (para auto-fetch de RUC/DNI)
- [ ] `NEXT_PUBLIC_SENTRY_DSN=` (para error tracking)
- [ ] `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=` (para analytics)

---

## STEP 10 — Migrations + seed

```bash
cd "C:\Users\User\Desktop\comply360\legaliapro-platform"

# Exportar DATABASE_URL de prod (PowerShell)
$env:DATABASE_URL = "postgresql://postgres:PASS@db.xxx.supabase.co:5432/postgres"
$env:DIRECT_URL = $env:DATABASE_URL

# Migrations
npx prisma migrate deploy
```

- [ ] Migration `All migrations have been successfully applied`

```bash
# Seed de las 3 empresas demo (emails configurables)
$env:DEMO_EMAIL_1 = "bodega@demo.comply360.pe"  # o tus emails reales
$env:DEMO_EMAIL_2 = "obra@demo.comply360.pe"
$env:DEMO_EMAIL_3 = "legal@demo.comply360.pe"

npm run seed:demo
```

- [ ] Seed OK: "Seeded 3 orgs, 50 workers, 6 docs, 3 templates"

---

## STEP 11 — Redeploy

```bash
git commit --allow-empty -m "redeploy with prod env vars"
git push
```

- [ ] Vercel build verde ✅
- [ ] DNS ya propagó (`nslookup comply360.pe` devuelve `76.76.21.21`)

---

## STEP 12 — Smoke tests

### Terminal
- [ ] `curl -I https://comply360.pe` → 200
- [ ] `curl https://comply360.pe/manifest.webmanifest` → JSON con "Comply360"
- [ ] `curl https://comply360.pe/api/health` → `{"ok":true}`

### Browser
- [ ] `comply360.pe` → landing con emerald + brand Comply360
- [ ] `comply360.pe/sign-up` → form Clerk con dominio `accounts.comply360.pe`
- [ ] Crear cuenta con email real → recibís email de verificación desde `@comply360.pe`
- [ ] Completar onboarding → aterrizás en `/dashboard`

---

## STEP 13 — Darte acceso SUPER_ADMIN

En Supabase → SQL Editor:

```sql
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'a.jaracarranza@gmail.com';
SELECT email, role FROM users WHERE role = 'SUPER_ADMIN';
```

- [ ] Query ran: 1 row updated
- [ ] Ir a `comply360.pe/admin` → ver Founder Console con métricas

---

## STEP 14 — Test Founder Digest

```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" https://comply360.pe/api/cron/founder-digest
```

- [ ] Response: `{"ok":true, "emailSent":true, ...}`
- [ ] Email recibido en `FOUNDER_EMAIL` (chequear spam)
- [ ] (opcional) Ping Slack recibido

---

## STEP 15 — Test del QR de asistencia

1. [ ] Login como admin de una empresa demo (ej. `bodega@demo.comply360.pe`)
2. [ ] Ir a `/dashboard/asistencia`
3. [ ] Ver QR card funcionando (con countdown)
4. [ ] Escanear con celular → debería abrir `/mi-portal/asistencia?t=TOKEN`
5. [ ] Sign in como worker → worker marca asistencia ✅

---

## 🚨 Troubleshooting común

### "DNS no resuelve después de 30 min"
```bash
# Chequeá el estado
dig comply360.pe
# O usa https://dnschecker.org/ para ver propagación global
```

### "Clerk: CNAME not verified"
Esperá. Puede tardar hasta 1 hora. Si ya pasaron 2h y no valida, doble-chequeá que los CNAMEs en Punto.pe no tengan typos (muy común: espacios al principio o final).

### "Build de Vercel falla con 'prisma generate' error"
En Vercel → Settings → Build → Build Command:
```
prisma generate && next build
```

### "Email no llega"
1. Chequear spam
2. Resend dashboard → Emails → ver status
3. Si status es `bounced` → DNS DKIM no propagó todavía

### "Founder Console da 403"
Tu usuario no tiene `role = SUPER_ADMIN`. Corré el SQL del STEP 13.

---

## Post-launch (primera semana)

- [ ] Configurar Culqi LIVE (después de verificación KYC)
- [ ] Activar Sentry con DSN prod
- [ ] Activar Plausible
- [ ] Crear canal Slack #comply360-founder-metrics + webhook
- [ ] Primer backup manual de Supabase
- [ ] Setear alerta de uptime (UptimeRobot gratis)

---

**Generado el deploy:** _________________
**Primera empresa real onboardeada:** _________________
**Primer pago recibido:** _________________ 🎉
