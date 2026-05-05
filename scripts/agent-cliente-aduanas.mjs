/**
 * AGENTE CLIENTE - INVERSIONES ADUANERAS S.A.C.
 *
 * Simula un cliente real (responsable de RRHH de una agencia aduanera con 5 anios
 * de historia) usando comply360.pe en produccion.
 *
 * NO inyecta nada directo a la DB. Usa los mismos endpoints HTTP que llama la UI:
 *   POST /api/workers
 *   POST /api/contracts
 *   POST /api/workers/[id]/documents (multipart)
 *   POST /api/org-documents
 *   POST /api/diagnostics
 *   PATCH /api/onboarding
 *
 * Auth: usa el flujo "Sign-in Token" de Clerk (Backend API genera ticket -> FAPI
 * canjea -> JWT). NO usa password. Es la forma oficial de Clerk para impersonar
 * a un usuario para automation/testing.
 *
 * Uso:
 *   node scripts/agent-cliente-aduanas.mjs
 */

import { existsSync } from 'node:fs'
import { config as loadEnv } from 'dotenv'

if (existsSync('.env.production.local')) {
  loadEnv({ path: '.env.production.local', override: true })
} else {
  loadEnv()
}

const SK = process.env.CLERK_SECRET_KEY
const FAPI = 'https://clerk.comply360.pe'
const APP = 'https://comply360.pe'
const TARGET_USER_ID = process.env.TARGET_USER_ID ?? 'user_3CuhLBHiCBA96C2Xec10BKWmw3a'
const TARGET_EMAIL = 'inveraduaneras@gmail.com'

if (!SK) {
  console.error('Falta CLERK_SECRET_KEY en .env.production.local')
  process.exit(1)
}

// ============================================================================
// AUTH: obtener JWT sin password (sign-in token + ticket)
// ============================================================================

async function getJwt() {
  const r1 = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: TARGET_USER_ID, expires_in_seconds: 3600 }),
  })
  if (!r1.ok) throw new Error(`sign_in_tokens fallo: ${r1.status} ${await r1.text()}`)
  const t1 = await r1.json()

  const cookies = new Map()
  const ingest = (sc) => {
    if (!sc) return
    for (const raw of sc.split(/,(?=\s*[A-Za-z0-9_]+=)/)) {
      const [pair] = raw.split(';')
      const eq = pair.indexOf('=')
      if (eq < 1) continue
      cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
    }
  }
  const cookieHeader = () =>
    [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')

  const r2 = await fetch(`${FAPI}/v1/client/sign_ins?__clerk_api_version=2025-04-10`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: APP },
    body: new URLSearchParams({ strategy: 'ticket', ticket: t1.token }).toString(),
  })
  ingest(r2.headers.get('set-cookie'))
  if (!r2.ok) throw new Error(`sign_ins fallo: ${r2.status} ${await r2.text()}`)
  const t2 = await r2.json()
  const sid = t2.response.created_session_id

  const r3 = await fetch(
    `${FAPI}/v1/client/sessions/${sid}/tokens?__clerk_api_version=2025-04-10`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: APP,
        Cookie: cookieHeader(),
      },
      body: '',
    },
  )
  if (!r3.ok) throw new Error(`tokens fallo: ${r3.status} ${await r3.text()}`)
  const t3 = await r3.json()
  return { jwt: t3.jwt, sessionId: sid, expiresInMs: 50 * 1000 }
}

// JWT cache con auto-renovacion (Clerk JWTs viven ~60s; renovamos cada 50)
let _jwtCache = { jwt: null, expiresAt: 0 }
async function withFreshJwt() {
  if (Date.now() < _jwtCache.expiresAt && _jwtCache.jwt) return _jwtCache.jwt
  const { jwt, expiresInMs } = await getJwt()
  _jwtCache = { jwt, expiresAt: Date.now() + expiresInMs }
  return jwt
}

async function api(method, path, body, isMultipart = false) {
  const jwt = await withFreshJwt()
  const headers = { Authorization: `Bearer ${jwt}` }
  if (!isMultipart) headers['Content-Type'] = 'application/json'
  const init = { method, headers }
  if (body !== undefined) init.body = isMultipart ? body : JSON.stringify(body)
  const r = await fetch(`${APP}${path}`, init)
  const text = await r.text()
  let json
  try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }
  if (!r.ok) {
    const err = new Error(`${method} ${path} -> ${r.status}: ${text.slice(0, 200)}`)
    err.status = r.status
    err.body = json
    throw err
  }
  return json
}

// ============================================================================
// DATA: agencia aduanera (Inversiones Aduaneras S.A.C.)
// ============================================================================

const EMPRESA = {
  name: 'Inversiones Aduaneras',
  razonSocial: 'INVERSIONES ADUANERAS S.A.C.',
  ruc: '20603567890',
  sector: 'Servicios Aduaneros y Logistica',
  address: 'Av. Argentina 4793, Callao',
  city: 'CALLAO',
  province: 'Callao',
  district: 'Callao',
  regimenPrincipal: 'GENERAL',
  regimenTributario: 'RG',
  sizeRange: '11-50',
  phone: '014527890',
  ciiu: '5224',
  ubigeo: '070101',
  repNombre: 'Carlos Eduardo Vasquez Salazar',
  repDni: '08234567',
  repCargo: 'Gerente General',
  contNombre: 'Maria Gabriela Quispe Mendoza',
  contCpc: 'CPC-13245',
  contEmail: 'contabilidad@inveraduaneras.pe',
}

const NOMBRES_H = [
  'Carlos Eduardo', 'Luis Alberto', 'Jose Antonio', 'Miguel Angel', 'Pedro Pablo',
  'Javier Ricardo', 'Diego Armando', 'Jorge Luis', 'Manuel Fernando', 'Roberto Carlos',
  'Oscar Daniel', 'Victor Hugo', 'Raul Alejandro', 'Juan Carlos', 'Renato',
  'Renzo Andre', 'Julio Cesar', 'Marco Antonio', 'Edwin', 'Ruben Dario',
]
const NOMBRES_M = [
  'Maria Elena', 'Carmen Rosa', 'Ana Lucia', 'Patricia Isabel', 'Silvia Maritza',
  'Claudia Paola', 'Monica Beatriz', 'Elena Sofia', 'Susana Milagros', 'Gloria Esther',
  'Sara Beatriz', 'Julia Carolina', 'Laura Cecilia', 'Beatriz Eugenia', 'Teresa Margot',
  'Diana Elizabeth', 'Rosario del Pilar', 'Jessica Karina', 'Vanessa Anais', 'Mariela',
]
const APELLIDOS = [
  'Garcia', 'Lopez', 'Rodriguez', 'Perez', 'Sanchez', 'Ramirez', 'Gonzales',
  'Flores', 'Torres', 'Vargas', 'Rojas', 'Diaz', 'Castillo', 'Mendoza', 'Ramos',
  'Quispe', 'Huaman', 'Chavez', 'Mamani', 'Silva', 'Caceres', 'Alvarez',
  'Guerrero', 'Espinoza', 'Jimenez', 'Cruz', 'Vega', 'Ortiz', 'Medina', 'Salazar',
  'Vasquez', 'Cordova', 'Pacheco', 'Bautista', 'Yarihuaman', 'Carbajal',
]

// Cargos tipicos de una agencia aduanera peruana
const CARGOS_ADUANAS = [
  { nombre: 'Agente de Aduanas', dpto: 'Operaciones Aduaneras', sueldoMin: 6500, sueldoMax: 12000 },
  { nombre: 'Despachador de Aduana', dpto: 'Operaciones Aduaneras', sueldoMin: 4500, sueldoMax: 7500 },
  { nombre: 'Asistente de Despacho Aduanero', dpto: 'Operaciones Aduaneras', sueldoMin: 2200, sueldoMax: 3500 },
  { nombre: 'Especialista en Clasificacion Arancelaria', dpto: 'Operaciones Aduaneras', sueldoMin: 4000, sueldoMax: 6500 },
  { nombre: 'Liquidador Aduanero', dpto: 'Operaciones Aduaneras', sueldoMin: 3500, sueldoMax: 5500 },
  { nombre: 'Coordinador de Comercio Exterior', dpto: 'Comercio Exterior', sueldoMin: 5500, sueldoMax: 9000 },
  { nombre: 'Operador Logistico Senior', dpto: 'Logistica', sueldoMin: 3500, sueldoMax: 5500 },
  { nombre: 'Operario de Almacen', dpto: 'Logistica', sueldoMin: 1500, sueldoMax: 2500 },
  { nombre: 'Documentalista Aduanero', dpto: 'Documentacion', sueldoMin: 2200, sueldoMax: 3500 },
  { nombre: 'Asistente de Documentacion', dpto: 'Documentacion', sueldoMin: 1500, sueldoMax: 2300 },
  { nombre: 'Contador General', dpto: 'Administracion', sueldoMin: 5000, sueldoMax: 8500 },
  { nombre: 'Asistente Contable', dpto: 'Administracion', sueldoMin: 1800, sueldoMax: 3000 },
  { nombre: 'Asistente de RRHH', dpto: 'Administracion', sueldoMin: 2200, sueldoMax: 3500 },
  { nombre: 'Mensajero', dpto: 'Administracion', sueldoMin: 1300, sueldoMax: 1800 },
  { nombre: 'Recepcionista', dpto: 'Administracion', sueldoMin: 1500, sueldoMax: 2200 },
  { nombre: 'Chofer Operativo', dpto: 'Logistica', sueldoMin: 1800, sueldoMax: 2800 },
]

// PRNG deterministico (seed fija → resultados reproducibles)
function rng(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const r = rng(42420)
const pick = (arr) => arr[Math.floor(r() * arr.length)]

function genDni(i) {
  // DNIs validos: 8 digitos. Empezamos en 41000000 para evitar colisiones con
  // los workers que el usuario ya creo manualmente.
  return String(41000000 + i * 17 + Math.floor(r() * 100)).padStart(8, '0')
}

function fechaIngresoEntreUltimos5Anios(idx, total) {
  // Distribuir uniformemente los ingresos entre 5 anios atras y 30 dias atras.
  const now = Date.now()
  const cinquoAnios = 5 * 365 * 24 * 3600 * 1000
  const t = now - cinquoAnios + (idx / total) * (cinquoAnios - 30 * 24 * 3600 * 1000)
  // Un poco de jitter
  return new Date(t + (r() - 0.5) * 60 * 24 * 3600 * 1000)
}

function generarTrabajadores(total) {
  const out = []
  for (let i = 0; i < total; i++) {
    const gender = r() < 0.55 ? 'H' : 'M'
    const firstName = pick(gender === 'H' ? NOMBRES_H : NOMBRES_M)
    const lastName1 = pick(APELLIDOS)
    const lastName2 = pick(APELLIDOS)
    const cargo = pick(CARGOS_ADUANAS)
    const sueldo = Math.round(
      cargo.sueldoMin + r() * (cargo.sueldoMax - cargo.sueldoMin),
    )
    const fechaIngreso = fechaIngresoEntreUltimos5Anios(i, total)
    const tipoAporte = r() < 0.7 ? 'AFP' : 'ONP'
    out.push({
      dni: genDni(i),
      firstName,
      lastName: `${lastName1} ${lastName2}`,
      email: `${firstName.toLowerCase().split(' ')[0]}.${lastName1.toLowerCase()}@inveraduaneras.pe`,
      phone: `9${Math.floor(r() * 90000000 + 10000000)}`,
      gender: gender === 'H' ? 'Masculino' : 'Femenino',
      nationality: 'peruana',
      address: `Jr. ${pick(['Cusco', 'Arequipa', 'Junin', 'Lima', 'Callao'])} ${Math.floor(r() * 999 + 100)}, ${pick(['Callao', 'San Miguel', 'Bellavista', 'La Punta', 'Lima'])}`,
      birthDate: new Date(
        Date.now() - (22 + r() * 28) * 365 * 24 * 3600 * 1000,
      ).toISOString().slice(0, 10),
      position: cargo.nombre,
      department: cargo.dpto,
      regimenLaboral: 'GENERAL',
      tipoContrato: r() < 0.75 ? 'INDEFINIDO' : 'PLAZO_FIJO',
      fechaIngreso: fechaIngreso.toISOString().slice(0, 10),
      sueldoBruto: sueldo,
      asignacionFamiliar: r() < 0.4,
      jornadaSemanal: 48,
      tiempoCompleto: true,
      tipoAporte,
      afpNombre: tipoAporte === 'AFP' ? pick(['Integra', 'Prima', 'Profuturo', 'Habitat']) : null,
      cuspp: tipoAporte === 'AFP' ? `${Math.floor(r() * 900000000 + 100000000)}` : null,
      essaludVida: r() < 0.3,
      sctr: cargo.dpto === 'Logistica' || r() < 0.15,
    })
  }
  return out
}

// ============================================================================
// UTILS: PDF placeholder minimo (valido)
// ============================================================================

// PDF mas simple posible que cumple el spec (firma de PDF + version + objects)
function makePlaceholderPdf(title, body) {
  const content = `${title}\n${'='.repeat(title.length)}\n\n${body}\n\nDocumento generado para testing automatizado.\nFecha: ${new Date().toISOString().slice(0, 10)}`
  // PDF minimo escrito a mano
  const stream = `BT /F1 12 Tf 50 750 Td (${content.replace(/\(/g, '\\(').replace(/\)/g, '\\)').slice(0, 60)}) Tj ET`
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'
  const obj3 =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n'
  const obj4 = `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  const header = '%PDF-1.4\n%\xc4\xe5\xf2\xe5\xeb\xa7\xf3\xa0\xd0\xc4\xc6\n'
  let body2 = header
  const offsets = []
  for (const o of [obj1, obj2, obj3, obj4, obj5]) {
    offsets.push(body2.length)
    body2 += o
  }
  const xrefOffset = body2.length
  let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`
  body2 += xref
  body2 += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(body2, 'binary')
}

// ============================================================================
// FLUJO PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n[AGENTE-CLIENTE] INVERSIONES ADUANERAS S.A.C.')
  console.log('━'.repeat(70))

  // 0. Sanity check + onboarding
  console.log('\n[1/8] Verificando sesion y org...')
  const me = await api('GET', '/api/me')
  console.log(`  - userId: ${me.userId}`)
  console.log(`  - orgId: ${me.orgId}`)
  console.log(`  - role: ${me.role}`)

  // 1. Onboarding: completar info de empresa
  console.log('\n[2/8] Configurando perfil de empresa (onboarding)...')
  try {
    await api('POST', '/api/onboarding', {
      razonSocial: EMPRESA.razonSocial,
      ruc: EMPRESA.ruc,
      nombreComercial: EMPRESA.name,
      sector: EMPRESA.sector,
      sizeRange: EMPRESA.sizeRange,
      regimenPrincipal: EMPRESA.regimenPrincipal,
      regimenTributario: EMPRESA.regimenTributario,
      address: EMPRESA.address,
      city: EMPRESA.city,
      province: EMPRESA.province,
      district: EMPRESA.district,
      phone: EMPRESA.phone,
      alertEmail: TARGET_EMAIL,
      repNombre: EMPRESA.repNombre,
      repDni: EMPRESA.repDni,
      repCargo: EMPRESA.repCargo,
      contNombre: EMPRESA.contNombre,
      contCpc: EMPRESA.contCpc,
      contEmail: EMPRESA.contEmail,
    })
    console.log(`  - OK: ${EMPRESA.razonSocial} (RUC ${EMPRESA.ruc})`)
  } catch (e) {
    console.log(`  - WARN: onboarding fallo (${e.status}): ${(e.body?.error ?? e.message).slice(0, 150)}`)
  }

  // 2. Crear workers
  console.log('\n[3/8] Creando trabajadores (distribuidos en 5 anios)...')
  const TOTAL_WORKERS = parseInt(process.env.TOTAL_WORKERS ?? '25', 10)
  const trabajadores = generarTrabajadores(TOTAL_WORKERS)
  const created = []
  for (let i = 0; i < trabajadores.length; i++) {
    const w = trabajadores[i]
    process.stdout.write(`  ${String(i + 1).padStart(2, '0')}/${trabajadores.length} ${w.firstName} ${w.lastName.split(' ')[0]} (${w.position.slice(0, 30)}) ... `)
    try {
      const res = await api('POST', '/api/workers', w)
      created.push({ ...res.data, originalSpec: w })
      console.log('OK')
    } catch (e) {
      if (e.status === 409) console.log('YA EXISTE (skip)')
      else console.log(`ERROR (${e.status}): ${(e.body?.error ?? e.message).slice(0, 100)}`)
    }
  }
  console.log(`  - ${created.length} workers creados`)

  // 3. Subir docs del legajo a cada worker (legajo realista: ~60% verified)
  console.log('\n[4/8] Subiendo documentos del legajo (DNI, CV, contrato, SST)...')
  const DOCS_PLAN = [
    { category: 'INGRESO', documentType: 'dni', title: 'Copia de DNI', isRequired: true, prob: 0.95 },
    { category: 'INGRESO', documentType: 'cv', title: 'Curriculum Vitae', isRequired: true, prob: 0.85 },
    { category: 'INGRESO', documentType: 'contrato', title: 'Contrato de Trabajo firmado', isRequired: true, prob: 0.75 },
    { category: 'INGRESO', documentType: 'antecedentes_policiales', title: 'Antecedentes Policiales', isRequired: false, prob: 0.6 },
    { category: 'SST', documentType: 'induccion_sst', title: 'Constancia Induccion SST', isRequired: true, prob: 0.7, expiresInDays: 365 },
    { category: 'SST', documentType: 'examen_medico', title: 'Examen Medico Ocupacional', isRequired: false, prob: 0.55, expiresInDays: 365 },
    { category: 'PREVISIONAL', documentType: 'afp_onp', title: 'Afiliacion AFP/ONP', isRequired: true, prob: 0.8 },
  ]
  let totalDocs = 0
  for (let i = 0; i < created.length; i++) {
    const w = created[i]
    process.stdout.write(`  ${String(i + 1).padStart(2, '0')}/${created.length} ${w.firstName.slice(0, 18).padEnd(18)} `)
    let docs = 0
    for (const d of DOCS_PLAN) {
      if (r() > d.prob) continue
      const fd = new FormData()
      const pdf = makePlaceholderPdf(
        d.title,
        `Trabajador: ${w.firstName} ${w.lastName}\nDNI: ${w.dni}\nEmpresa: ${EMPRESA.razonSocial}`,
      )
      const blob = new Blob([pdf], { type: 'application/pdf' })
      fd.append('file', blob, `${d.documentType}-${w.dni}.pdf`)
      fd.append('category', d.category)
      fd.append('documentType', d.documentType)
      fd.append('title', d.title)
      fd.append('isRequired', String(d.isRequired))
      if (d.expiresInDays) {
        const exp = new Date(Date.now() + d.expiresInDays * 24 * 3600 * 1000)
        fd.append('expiresAt', exp.toISOString())
      }
      try {
        await api('POST', `/api/workers/${w.id}/documents`, fd, true)
        docs++
        totalDocs++
      } catch (e) {
        // Silenciar errores individuales para que no quiebre el flujo
      }
    }
    console.log(`${docs} docs`)
  }
  console.log(`  - ${totalDocs} documentos subidos`)

  // 4. Plantilla de contrato (OrgTemplate)
  console.log('\n[5/8] Creando plantilla de contrato indefinido...')
  const contratoIndef = `CONTRATO DE TRABAJO A PLAZO INDETERMINADO
REGIMEN LABORAL GENERAL (D. Leg. 728)

Conste por el presente documento el contrato de trabajo que celebran:

De una parte, ${EMPRESA.razonSocial}, con RUC ${EMPRESA.ruc}, con domicilio fiscal en ${EMPRESA.address}, debidamente representada por su Gerente General {{REPRESENTANTE_LEGAL}}, identificado con DNI N {{REP_DNI}}, a quien en adelante se le denominara EL EMPLEADOR.

Y de la otra parte, {{NOMBRE_COMPLETO}}, identificado(a) con DNI N {{DNI}}, con domicilio en {{DIRECCION}}, a quien en adelante se le denominara EL TRABAJADOR.

PRIMERA - OBJETO
EL TRABAJADOR prestara sus servicios en el cargo de {{CARGO}}, en el area de {{AREA}}, bajo subordinacion del EMPLEADOR.

SEGUNDA - REMUNERACION
La remuneracion mensual asciende a S/ {{SUELDO}} ({{SUELDO_LETRAS}}), pagaderos el ultimo dia util de cada mes via deposito en cuenta bancaria.

TERCERA - INICIO DE LABORES
Las labores se inician el {{FECHA_INGRESO}}. Periodo de prueba: 3 meses (Art. 10 D. Leg. 728).

CUARTA - JORNADA
Jornada de {{JORNADA}} horas semanales distribuidas de lunes a viernes. Descanso semanal obligatorio.

QUINTA - BENEFICIOS SOCIALES
- CTS: deposito semestral conforme D.S. 001-97-TR
- Gratificaciones: julio y diciembre + bonificacion extraordinaria 9%
- Vacaciones: 30 dias por ano completo de servicios
- EsSalud: aporte obligatorio del empleador
- Asignacion familiar si corresponde

SEXTA - CONFIDENCIALIDAD ADUANERA
EL TRABAJADOR se obliga a guardar absoluta reserva sobre informacion confidencial de clientes, datos comerciales, partidas arancelarias declaradas, valores CIF/FOB y cualquier informacion sensible relativa a operaciones aduaneras.

SETIMA - REGIMEN APLICABLE
EL TRABAJADOR esta sujeto al Reglamento Interno de Trabajo (RIT), las politicas de Seguridad y Salud en el Trabajo (SST), Codigo de Etica y demas disposiciones internas vigentes.

En senial de conformidad, firman las partes en {{CIUDAD}}, a los {{FECHA_HOY_LETRAS}}.`

  try {
    await api('POST', '/api/org-templates', {
      title: 'Contrato Indefinido - Agencia Aduanera (Reg. General)',
      documentType: 'CONTRATO_INDEFINIDO',
      content: contratoIndef,
      mappings: {
        REPRESENTANTE_LEGAL: 'org.repNombre',
        REP_DNI: 'org.repDni',
        NOMBRE_COMPLETO: 'worker.fullName',
        DNI: 'worker.dni',
        DIRECCION: 'worker.address',
        CARGO: 'worker.position',
        AREA: 'worker.department',
        SUELDO: 'worker.sueldoBruto',
        SUELDO_LETRAS: 'worker.sueldoEnLetras',
        FECHA_INGRESO: 'worker.fechaIngreso',
        JORNADA: 'worker.jornadaSemanal',
        CIUDAD: 'meta.ciudad',
        FECHA_HOY_LETRAS: 'meta.todayInWords',
      },
      notes: 'Plantilla base agencia aduanera. Regimen general D.Leg. 728.',
    })
    console.log('  - OK: plantilla guardada en biblioteca')
  } catch (e) {
    console.log(`  - WARN: ${(e.body?.error ?? e.message).slice(0, 150)}`)
  }

  // Plantilla de contrato a plazo fijo (para algunos workers)
  const contratoPlazoFijo = contratoIndef
    .replace('A PLAZO INDETERMINADO', 'A PLAZO FIJO')
    .replace('TERCERA - INICIO DE LABORES\nLas labores se inician el {{FECHA_INGRESO}}. Periodo de prueba: 3 meses (Art. 10 D. Leg. 728).',
            'TERCERA - PLAZO\nEl presente contrato se celebra por el plazo de DOCE (12) MESES contados desde el {{FECHA_INGRESO}} hasta el {{FECHA_FIN}}. Periodo de prueba: 3 meses.')
  try {
    await api('POST', '/api/org-templates', {
      title: 'Contrato Plazo Fijo - Agencia Aduanera (12 meses)',
      documentType: 'CONTRATO_PLAZO_FIJO',
      content: contratoPlazoFijo,
      mappings: {
        REPRESENTANTE_LEGAL: 'org.repNombre',
        NOMBRE_COMPLETO: 'worker.fullName',
        DNI: 'worker.dni',
        CARGO: 'worker.position',
        SUELDO: 'worker.sueldoBruto',
        FECHA_INGRESO: 'worker.fechaIngreso',
      },
      notes: 'Plantilla de plazo fijo para reemplazos y proyectos puntuales.',
    })
    console.log('  - OK: plantilla plazo fijo')
  } catch (e) {
    // ignorar
  }

  // 6. Crear contratos de trabajo (uno por worker, ~70%)
  console.log('\n[6/8] Creando contratos firmados para trabajadores...')
  let contractsOk = 0
  let contractsErr = 0
  for (let i = 0; i < created.length; i++) {
    const w = created[i]
    if (r() > 0.7) continue
    try {
      const sueldoLetras = `${w.originalSpec.sueldoBruto} y 00/100 SOLES`
      const html = contratoIndef
        .replaceAll('{{REPRESENTANTE_LEGAL}}', EMPRESA.repNombre)
        .replaceAll('{{REP_DNI}}', EMPRESA.repDni)
        .replaceAll('{{NOMBRE_COMPLETO}}', `${w.originalSpec.firstName} ${w.originalSpec.lastName}`)
        .replaceAll('{{DNI}}', w.originalSpec.dni)
        .replaceAll('{{DIRECCION}}', w.originalSpec.address)
        .replaceAll('{{CARGO}}', w.originalSpec.position)
        .replaceAll('{{AREA}}', w.originalSpec.department)
        .replaceAll('{{SUELDO}}', String(w.originalSpec.sueldoBruto))
        .replaceAll('{{SUELDO_LETRAS}}', sueldoLetras)
        .replaceAll('{{FECHA_INGRESO}}', new Date(w.originalSpec.fechaIngreso).toLocaleDateString('es-PE'))
        .replaceAll('{{JORNADA}}', '48')
        .replaceAll('{{CIUDAD}}', 'Callao')
        .replaceAll('{{FECHA_HOY_LETRAS}}', new Date(w.originalSpec.fechaIngreso).toLocaleDateString('es-PE'))
      const fechaIngreso = new Date(w.originalSpec.fechaIngreso)
      const isPlazoFijo = w.originalSpec.tipoContrato === 'PLAZO_FIJO'
      const expiresAt = isPlazoFijo
        ? new Date(fechaIngreso.getTime() + 365 * 24 * 3600 * 1000).toISOString()
        : null
      // Tipos validos en Contract: LABORAL_INDEFINIDO, LABORAL_PLAZO_FIJO, etc.
      await api('POST', '/api/contracts', {
        type: isPlazoFijo ? 'LABORAL_PLAZO_FIJO' : 'LABORAL_INDEFINIDO',
        title: `Contrato ${isPlazoFijo ? 'Plazo Fijo' : 'Indefinido'} - ${w.originalSpec.firstName} ${w.originalSpec.lastName.split(' ')[0]}`,
        contentHtml: html,
        sourceKind: 'html-based',
        expiresAt,
        formData: {
          workerId: w.id,
          workerDni: w.originalSpec.dni,
          workerName: `${w.originalSpec.firstName} ${w.originalSpec.lastName}`,
          position: w.originalSpec.position,
          sueldo: w.originalSpec.sueldoBruto,
        },
      })
      contractsOk++
    } catch (e) {
      contractsErr++
      if (contractsErr <= 2) console.log(`    debug contract err: ${(e.body?.error ?? e.message).slice(0, 150)}`)
    }
  }
  console.log(`  - ${contractsOk} contratos creados (${contractsErr} fallaron)`)

  // 7. Diagnostico SUNAFIL FULL: auto-answer + submit
  console.log('\n[7/8] Ejecutando diagnostico SUNAFIL FULL (auto-answer + submit)...')
  try {
    const auto = await api('GET', '/api/diagnostics/auto-answer?type=FULL')
    const answers = auto.answers ?? auto.data?.answers ?? []
    console.log(`  - ${answers.length} respuestas auto-pobladas a partir de tu data`)
    if (answers.length > 0) {
      const diag = await api('POST', '/api/diagnostics', { type: 'FULL', answers })
      console.log(`  - OK: diagnostico guardado, score ${diag.data?.scoreGlobal ?? '?'}/100`)
    } else {
      console.log('  - WARN: auto-answer no devolvio respuestas, saltando')
    }
  } catch (e) {
    console.log(`  - WARN: ${(e.body?.error ?? e.message).slice(0, 200)}`)
  }

  // 8. Stats finales
  console.log('\n[8/8] Verificando stats finales...')
  try {
    const stats = await api('GET', '/api/workers?stats=1')
    console.log(`  - Workers activos: ${stats.totalActivos}`)
    console.log(`  - Total planilla: S/ ${stats.totalPlanilla?.toLocaleString?.('es-PE') ?? stats.totalPlanilla}`)
    console.log(`  - Sueldo promedio: S/ ${stats.avgSueldo}`)
    console.log(`  - Departamentos: ${stats.departments?.join(', ')}`)
    console.log(`  - Score legajo promedio: ${stats.avgLegajoScore}%`)
  } catch (e) {
    console.log(`  - WARN: ${e.message}`)
  }

  console.log('\n━'.repeat(70))
  console.log('LISTO. Datos generados en https://comply360.pe')
  console.log(`  - Empresa: ${EMPRESA.razonSocial}`)
  console.log(`  - Workers nuevos: ${created.length}`)
  console.log(`  - Documentos legajo: ${totalDocs}`)
  console.log(`  - Contratos: ${contractsOk}`)
  console.log(`\nLogueate como ${TARGET_EMAIL} para verlo.\n`)
}

main().catch((err) => {
  console.error('\nFATAL:', err.message)
  if (err.body) console.error('Body:', JSON.stringify(err.body).slice(0, 500))
  process.exit(1)
})
