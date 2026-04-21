# Vercel Environment Variables — Guía de configuración

> **Para qué es este archivo:** lista completa de env vars para pegar en Vercel.
> Los valores reales **NO están acá** — están en tu `.env.production.local`
> (gitignored, privado). Este archivo es la plantilla pública commiteable.
>
> **Cómo usarlo:** abrí `.env.production.local` en paralelo y pegás los valores
> de allá. Los secrets generados (`CRON_SECRET`, `JWT_SECRET`) ya están creados
> y esperando en ese archivo.
>
> **Dónde pegarlos:** Vercel → tu proyecto → Settings → Environment Variables.
>
> ⚠️ Marcá TODAS como **Production, Preview, Development** (las 3) salvo que
> se indique otra cosa.

---

## ✅ YA GENERADOS (leer de `.env.production.local`)

```
CRON_SECRET=<pegá el valor de .env.production.local>
JWT_SECRET=<pegá el valor de .env.production.local>
```

> 🔒 Estos fueron auto-generados con 256 bits de entropía.
> Si querés rotar: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 📝 APP BASE URL

```
NEXT_PUBLIC_APP_URL=https://comply360.pe
```

---

## 👤 FOUNDER CONSOLE (tu email privado)

```
FOUNDER_EMAIL=a.jaracarranza@gmail.com
SLACK_FOUNDER_WEBHOOK_URL=
```

> `SLACK_FOUNDER_WEBHOOK_URL` lo dejás vacío por ahora. Lo agregás después
> cuando crees el webhook en api.slack.com/messaging/webhooks.

---

## 🔐 CLERK (dominio verificado en prod)

Los sacás de Clerk Dashboard → tu app → switch a Production → API Keys:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_XXXXX
CLERK_SECRET_KEY=sk_live_XXXXX
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/onboarding
```

> ⚠️ `pk_live_` y `sk_live_` son **diferentes** a los `pk_test_` que usás en dev.
> En prod, NO uses las claves test — Clerk va a rechazar requests desde comply360.pe.

---

## 🗄️ SUPABASE (Postgres + Storage)

Settings → Database → Connection string:

```
DATABASE_URL=postgresql://postgres:PASSWORD@db.XXXXX.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:PASSWORD@db.XXXXX.supabase.co:5432/postgres
SUPABASE_URL=https://XXXXX.supabase.co
SUPABASE_SERVICE_KEY=eyJ...XXXXX
```

> `DATABASE_URL` usa port **6543** (pooler, para runtime). `DIRECT_URL` usa
> port **5432** (direct, solo para migrations). Prisma los usa distinto.

---

## 📧 RESEND (emails)

resend.com → API Keys → Create → Full Access:

```
RESEND_API_KEY=re_live_XXXXX
```

> Verificar primero que el dominio `comply360.pe` está validado en Resend
> (Resend Dashboard → Domains → ver ✅ verde).

---

## 🤖 OPENAI (IA — contratos, copilot, auto-verify)

platform.openai.com → API keys → Create:

```
OPENAI_API_KEY=sk-proj-XXXXX
```

> Si querés limitar gasto: crear la key con un **usage limit** mensual
> (ej: $50/mes para arrancar).

---

## 💳 CULQI (pagos)

Para el demo usá las TEST keys. Después de verificación KYC de Culqi cambiás a LIVE:

```
CULQI_PUBLIC_KEY=pk_test_XXXXX
CULQI_SECRET_KEY=sk_test_XXXXX
CULQI_WEBHOOK_SECRET=
```

---

## 🇵🇪 APIS.NET.PE (RUC + DNI auto-fetch)

apis.net.pe/panel → token gratuito:

```
APIS_NET_PE_TOKEN=apis-token-XXXXX
```

> Sin esto, el onboarding hace fetch fallback simulado. Con esto, al escribir
> RUC autocompleta razón social, dirección, etc. Demo-friendly.

---

## 🔔 WEB PUSH VAPID (push notifications)

Generar keys nuevas con:

```bash
npx web-push generate-vapid-keys --json
```

Copiar el output:

```
VAPID_PUBLIC_KEY=BXXXXX
VAPID_PRIVATE_KEY=XXXXX
VAPID_SUBJECT=mailto:alertas@comply360.pe
```

> Opcional para el demo. Sin esto, las push notifications web no funcionan,
> pero email sí.

---

## 📊 SENTRY (error tracking, opcional)

sentry.io → Project → Settings → Client Keys:

```
NEXT_PUBLIC_SENTRY_DSN=https://XXXXX@o0.ingest.sentry.io/XXXXX
SENTRY_AUTH_TOKEN=sntrys_XXXXX
```

> **Opcional.** Dejá vacío si no vas a usar. Podés activar después.

---

## 📈 PLAUSIBLE (analytics, opcional)

plausible.io → añadir dominio → copia el data-domain:

```
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=comply360.pe
```

> **Opcional.** Sin esto, los eventos de funnel se loggean a consola en dev
> y se silencian en prod. No rompe nada.

---

## 📱 WHATSAPP (opcional — CTA en landing)

```
NEXT_PUBLIC_WHATSAPP_NUMBER=51987654321
```

> Opcional. Si no lo seteás, el botón WhatsApp del landing queda oculto.

---

# 🏁 Checklist rápido de env vars críticas

Antes de hacer el primer redeploy, estas SÍ O SÍ deben estar en Vercel:

- [ ] `NEXT_PUBLIC_APP_URL=https://comply360.pe`
- [ ] `DATABASE_URL` + `DIRECT_URL` (Supabase)
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` (prod keys)
- [ ] `CRON_SECRET` (ya generado, en `.env.production.local`)
- [ ] `JWT_SECRET` (ya generado, en `.env.production.local`)
- [ ] `RESEND_API_KEY` (para emails)
- [ ] `OPENAI_API_KEY` (para IA features)
- [ ] `FOUNDER_EMAIL=a.jaracarranza@gmail.com`

El resto puede venir después sin bloquear el demo.

---

# 🧪 Cómo verificar que quedó bien

Después del redeploy con todas las env vars seteadas:

```bash
# 1. Health
curl https://comply360.pe/api/health
# Esperás: {"ok":true}

# 2. Manifest PWA
curl https://comply360.pe/manifest.webmanifest
# Esperás: JSON con "Comply360 — Compliance laboral peruano"

# 3. Founder digest (vas a recibir email)
# Reemplazá TU_CRON_SECRET con el valor de .env.production.local
curl -H "Authorization: Bearer TU_CRON_SECRET" \
  https://comply360.pe/api/cron/founder-digest
# Esperás: {"ok":true, "emailSent":true, ...}
```
