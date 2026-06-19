# 🔐 Rotación de secretos — acción requerida (2026-06-18)

> Generado por la auditoría de seguridad. **Ningún valor de secreto se incluye aquí
> a propósito.** Este doc lista QUÉ rotar, DÓNDE y los comandos para purgar el
> historial de git. Hazlo en cuanto puedas: son credenciales de producción.

## Contexto

`DEPLOY-STATUS.md` (versionado en git) contenía en texto plano:
- el `CRON_SECRET` real de producción (único guard de **todos** los `/api/cron/*`), y
- un password de Supabase.

Ya redacté esos valores en el archivo (HEAD limpio), **pero siguen en el historial**
(commits `445a55d`, `f7f8dd4`) y el remoto es `github.com/jedi123jara/comply360`.
Redactar el archivo NO invalida el secreto: hay que **rotarlo** y **purgar el historial**.

Adicional: `VERCEL_ENV_IMPORT.txt` (gitignored, nunca estuvo en git) tiene en disco el
set completo de claves de prod (Supabase service_role JWT, Clerk `sk_live`, OpenAI,
Resend, `JWT_SECRET`). No hay fuga pública, pero trátalas como comprometidas si el
archivo se compartió/sincronizó fuera de tu equipo.

---

## 1) Rotar credenciales

| Secreto | Dónde rotar | Dónde actualizar después | Prioridad |
|---|---|---|---|
| `CRON_SECRET` | Generar uno nuevo (`openssl rand -hex 32`) | Vercel → Project → Settings → Environment Variables (Production) | 🔴 ALTA — estaba en git |
| Password Supabase DB | Supabase → Project → Settings → Database → Reset database password | `DATABASE_URL` y `DIRECT_URL` en Vercel | 🔴 ALTA — estaba en git |
| Supabase `service_role` key | Supabase → Settings → API → "Reset service_role" (o rotate JWT secret) | `SUPABASE_SERVICE_KEY` en Vercel | 🟠 si `VERCEL_ENV_IMPORT.txt` salió de tu máquina |
| Clerk `sk_live_…` | Clerk Dashboard → API Keys → rotate Secret Key | `CLERK_SECRET_KEY` en Vercel | 🟠 idem |
| `OPENAI_API_KEY` | platform.openai.com → API keys → revoke + create | Vercel | 🟠 idem |
| `RESEND_API_KEY` | resend.com → API Keys → revoke + create | Vercel | 🟠 idem |
| `JWT_SECRET` | Generar uno nuevo (`openssl rand -hex 32`) | Vercel (invalida sesiones/firmas que dependan de él) | 🟠 idem |

> Tras rotar, Vercel redeploya solo al guardar env vars. Verifica los crons con el
> nuevo `CRON_SECRET` (un cron con el viejo debe devolver 401).

## 2) Purgar el historial de git

Con el repo limpio en working tree (ya redacté `DEPLOY-STATUS.md`), elimina los valores
del historial. **Coordina con cualquier colaborador antes** (reescribe historia → todos
deben re-clonar).

Opción A — `git filter-repo` (recomendado):

```bash
# instalar: pip install git-filter-repo
cd "C:/Users/User/Desktop/comply360/legaliapro-platform"
# reemplaza los literales filtrados por ***REMOVED*** en TODO el historial
printf '%s\n' \
  'd66e0187801da1c5a7a369de2476ea2c245c625cd8aeacd543e6ef864c5945cf==>***REMOVED***' \
  'N5B4SDONkrL8zw58==>***REMOVED***' > /tmp/secrets-to-purge.txt
git filter-repo --replace-text /tmp/secrets-to-purge.txt
rm /tmp/secrets-to-purge.txt
git push --force --all
git push --force --tags
```

Opción B — BFG:

```bash
# echo cada secreto en un archivo replacements.txt (uno por línea, sufijo ==>***REMOVED***)
java -jar bfg.jar --replace-text replacements.txt
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

> Importante: la purga del historial **no** sustituye la rotación. GitHub mantiene
> copias en caché de commits referenciados por PRs/forks; rota igual.

## 3) Endurecer para que no se repita

- [x] `DEPLOY-STATUS.md` redactado (HEAD).
- [ ] Considerar mover `DEPLOY-STATUS.md` a `.gitignore` si seguirá teniendo datos operativos.
- [ ] `VERCEL_ENV_IMPORT.txt`: borrar del disco tras cargar; usar `vercel env pull` efímero.
- [ ] Mantener `MEDICAL_VAULT_KEY` de prod SOLO en el secret manager (ya hay guard en `medical-vault.ts`).
- [ ] El repo ya tiene `scripts/security/secret-scan.mjs` — correrlo en pre-commit/CI.

## 4) Auditar accesos

- Revisar logs de Supabase (conexiones DB inusuales) y de Vercel (invocaciones a
  `/api/cron/*` que no vengan del scheduler) por el período en que el secreto estuvo expuesto.
