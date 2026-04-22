# 🌙 Deploy Comply360 — Estado al pausar (21 abril 2026, 01:00)

## ✅ LO QUE YA ESTÁ HECHO (100% completado)

### Infraestructura
- [x] Código en GitHub: `github.com/jedi123jara/comply360`
- [x] Deploy Vercel (primer build exitoso)
- [x] Vercel Domains configurados:
  - `comply360.pe` → Production (canónico)
  - `www.comply360.pe` → 308 redirect a comply360.pe
  - `comply360-ochre.vercel.app` → fallback
- [x] DNS en Punto.pe (12 registros):
  - SOA + A + CNAME www (Vercel)
  - 5 CNAMEs para Clerk (clerk, accounts, clkmail, clk._domainkey, clk2._domainkey)
  - 4 records para Resend (MX send, TXT SPF, TXT DKIM, TXT DMARC)

### Servicios
- [x] Clerk Production instance creada (dominio `comply360.pe` pendiente verificación DNS)
- [x] Supabase proyecto `comply360` creado (region us-east-1, tier NANO)
- [x] Supabase password reseteada a: `N5B4SDONkrL8zw58`
- [x] **Supabase schema aplicado** — 45 tablas + índices + foreign keys ejecutados via SQL Editor
- [x] Resend domain `comply360.pe` agregado (pending DNS verification)
- [x] Secrets generados: `CRON_SECRET` + `JWT_SECRET` (en `.env.production.local`)

### Archivos importantes en disco
- `C:\Users\User\Desktop\comply360\legaliapro-platform\.env.production.local` — secrets (gitignored)
- `C:\Users\User\Desktop\comply360\legaliapro-platform\supabase-reset-and-setup.sql` — SQL ya ejecutado
- `C:\Users\User\Desktop\comply360\legaliapro-platform\supabase-setup.sql` — versión sin reset
- `C:\Users\User\Desktop\comply360\legaliapro-platform\VERCEL_ENV_VARS.md` — guía de env vars
- `C:\Users\User\Desktop\comply360\legaliapro-platform\DEPLOY.md` — checklist completo
- `C:\Users\User\Desktop\comply360\legaliapro-platform\RUNBOOK.md` — runbook demo

---

## ⏳ LO QUE FALTA PARA MAÑANA (30-45 min de trabajo)

### 🔑 PASO 1 — Conseguir 4 API Keys (10 min)

Abrí las 4 pestañas y copiá las keys:

#### A. Supabase service_role key
URL: `https://supabase.com/dashboard/project/spouhohutvofqzrcqmkl/settings/api`
- Scroll → `service_role` → click ojo 👁️ → Copy (empieza con `eyJhbGciOi...`)

#### B. OpenAI API key
URL: `https://platform.openai.com/api-keys`
- **+ Create new secret key** → Name: `comply360-prod` → All permissions → Copy (empieza con `sk-proj-...`)

#### C. Resend API key
URL: `https://resend.com/api-keys`
- **+ Create API Key** → Name: `comply360-prod` → Full Access → Copy (empieza con `re_...`)

#### D. Clerk Live Keys (si DNS propagó)
URL: `https://dashboard.clerk.com`
- Verificá arriba dice 🟢 **Production** (no Development)
- Sidebar → **API Keys**
- Copiá:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_live_...`
  - `CLERK_SECRET_KEY` = `sk_live_...` (click ojo para revelar)

**Importante:** si Clerk muestra "Domain not verified", DNS aún no propagó. Esperá 1-2 horas más y retestear. El resto podemos cargar sin las Clerk live keys — las agregamos cuando estén disponibles.

#### E. Confirmar DNS de Resend
URL: `https://resend.com/domains`
- Click en `comply360.pe` → debería mostrar 4 DNS records todos ✅ `verified` (mañana ya propagó)
- Si quedan ⚠️, click **"Verify DNS"** para forzar chequeo

---

### 📝 PASO 2 — Cargar env vars en Vercel (10 min)

Con las 4 keys obtenidas, volvés acá y me las pasás:

```
service_role: eyJ...
OpenAI: sk-proj-...
Resend: re_...
Clerk PK: pk_live_...
Clerk SK: sk_live_...
```

Yo te genero el **comando exacto** con todas las env vars pre-formateadas para pegar en Vercel.

Alternativa manual: ir a Vercel → tu proyecto → Settings → Environment Variables y pegar cada una (usar `VERCEL_ENV_VARS.md` como guía).

**Total de env vars a cargar:**
```
NEXT_PUBLIC_APP_URL=https://comply360.pe
DATABASE_URL=postgresql://postgres.spouhohutvofqzrcqmkl:N5B4SDONkrL8zw58@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.spouhohutvofqzrcqmkl:N5B4SDONkrL8zw58@aws-1-us-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://spouhohutvofqzrcqmkl.supabase.co
SUPABASE_SERVICE_KEY=[tu service_role]
CRON_SECRET=d66e0187801da1c5a7a369de2476ea2c245c625cd8aeacd543e6ef864c5945cf
JWT_SECRET=6655348a250dc196ed15ecaf279409a75fd423a0ab016937fced1b97db5be800
FOUNDER_EMAIL=a.jaracarranza@gmail.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[pk_live_...]
CLERK_SECRET_KEY=[sk_live_...]
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/onboarding
RESEND_API_KEY=[re_...]
OPENAI_API_KEY=[sk-proj-...]
```

---

### 🚀 PASO 3 — Redeploy Vercel + Seed empresas (10 min)

1. Vercel auto-redeploy cuando agregues env vars
2. Si pooler de Supabase ya funciona desde tu red (mañana debería):
   ```bash
   cd "C:\Users\User\Desktop\comply360\legaliapro-platform"
   npm run seed:demo
   ```
3. Si no: te paso un SQL de seed para pegar en Supabase SQL Editor

---

### 👑 PASO 4 — Hacerte SUPER_ADMIN (1 min)

Después de crear tu cuenta en `comply360.pe/sign-up`:

En Supabase → SQL Editor → pegás y Run:
```sql
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'a.jaracarranza@gmail.com';
SELECT email, role FROM users WHERE role = 'SUPER_ADMIN';
```

---

### 🧪 PASO 5 — Smoke tests (5 min)

```bash
# 1. Health
curl https://comply360.pe/api/health
# Esperás: {"ok":true}

# 2. Founder digest (vas a recibir email)
curl -H "Authorization: Bearer d66e0187801da1c5a7a369de2476ea2c245c625cd8aeacd543e6ef864c5945cf" https://comply360.pe/api/cron/founder-digest
# Esperás: {"ok":true, "emailSent":true}
```

---

## 🌅 Checklist mañana temprano (retomá acá)

En orden estricto:

1. [ ] Verificar DNS propagado:
   ```bash
   nslookup comply360.pe
   # Debería responder 76.76.21.21
   ```

2. [ ] Conseguir las 4 keys (Supabase service_role + OpenAI + Resend + Clerk)

3. [ ] Pegarlas en chat de Claude

4. [ ] Dejá que Claude actualice `.env.production.local` y te dé el comando de Vercel

5. [ ] Cargar env vars en Vercel

6. [ ] Seed demo empresas

7. [ ] Hacerte SUPER_ADMIN

8. [ ] Smoke tests

9. [ ] ✅ SaaS online + demo listo

---

## 💡 Notas importantes

### Supabase pooler
El pooler estuvo dando circuit breaker durante la sesión. **Mañana debería estar normal** después de que propague todo. Si sigue bloqueado, seed se puede hacer via SQL Editor (te preparo el SQL si hace falta).

### Clerk keys
Pueden que aún NO estén disponibles mañana si DNS tarda >24h. No es bloqueante — cargás las env vars sin Clerk por ahora y retesteas en la tarde.

### Backup de info crítica

**Supabase connection string:**
```
postgresql://postgres.spouhohutvofqzrcqmkl:N5B4SDONkrL8zw58@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

**Project URL:**
```
https://spouhohutvofqzrcqmkl.supabase.co
```

**GitHub repo:**
```
https://github.com/jedi123jara/comply360
```

**Vercel project:**
```
https://vercel.com/amado-jaras-projects/comply360
```

**Punto.pe dominio:**
```
comply360.pe — 12 DNS records configurados
```

---

## 🌙 Dormí tranquilo

Lo único que no retroceder pase la noche:
- **DNS propaga en background** (se vuelve más verde, no más rojo)
- **Clerk/Resend verifican solos** cuando DNS terminan de propagar
- **GitHub + Vercel + Supabase** están estables

Nada se va a "romper" porque ya todo está sembrado. Mañana es solo cosechar.

**Buen descanso. Mañana 30-45 min de trabajo y tenés demo live.** 🚀
