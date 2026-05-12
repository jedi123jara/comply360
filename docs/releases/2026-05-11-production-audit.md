# Comply360 Production Audit Release - 2026-05-11

## Deployment

- Domain: https://comply360.pe
- Vercel deployment: `dpl_Dk8XURdZkjULQZ4Xvatk2nhSTYPg`
- Status: `READY`
- Production build: passed
- Prisma migrations: no pending migrations

## Scope

- Dark mode consistency across dashboard surfaces.
- Marketing homepage, SaaS logo system, favicon and installable app metadata.
- Dashboard route stability and protected route boundaries.
- Attendance kiosk and QR rotation stability.
- Payroll import/export flows for PLAME and T-Registro.
- SST hub summary endpoint and demo company data link.
- Role access hardening for owner, worker portal and admin surfaces.
- Smoke coverage for public pages, protected pages and selected APIs.

## Fixes Included

- Corrected dark minimap and canvas styling in the org chart.
- Removed hydration-sensitive date rendering in the attendance kiosk and QR card.
- Prevented unavailable automation agent links from prefetching 404 routes.
- Fixed employer cost calculator history calls that could trigger server errors.
- Pointed security configuration activity to org-safe audit data.
- Guarded analytics drill-down charts against invalid single-point SVG geometry.
- Hardened `/admin` and `/mi-portal` role boundaries.
- Exposed `/api/attendance/clock-by-code` for public kiosk validation.
- Added `/api/sst/summary` to back the SST dashboard.
- Improved PLAME Excel parsing with tests for monthly sheets versus summary sheets.
- Updated production smoke checks to accept intentional stealth 404 responses on protected unauthenticated routes.

## Verification

- Authenticated production smoke: `6/6` routes clean, `4/4` APIs clean.
- Public production smoke: `24/24` checks passed.
- Dashboard route audit: `131/131` static dashboard routes clean.
- Dynamic route audit: `11/11` dynamic company routes clean.
- PLAME export: `200`, 24 workers, file generated.
- T-Registro export: `200`, 24 workers, file generated.
- PDF export checks: payslip, SST accident SAT, IPERC, committee act and document audit passed.
- Unit test suite: `2023` passed, `19` skipped.
- Lint: no errors; existing warnings remain for follow-up cleanup.

## Guardrails

- No destructive production flows were executed during QA.
- Local browser session state files were removed after verification.
- The demo seed requires an explicit ZIP path and production opt-in before it can write data.
