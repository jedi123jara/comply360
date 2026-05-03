/**
 * Seed FASE 5 — SST PREMIUM
 *
 * Catálogos seed mínimos para Sprint 1:
 *   - CatalogoPeligro: 80 entradas base distribuidas en 8 familias
 *   - CatalogoControl: 40 controles distribuidos en los 5 niveles de jerarquía
 *     (eliminación → sustitución → ingeniería → administrativo → EPP)
 *   - ColaboradorSST: 1 inspector demo (solo dev/staging, NO producción)
 *
 * Fuente: Manual IPERC SUNAFIL R.M. 050-2013-TR Anexo 3 + práctica común.
 * El catálogo sectorial completo (~1,200 entradas con filtro CIIU) es trabajo
 * de SST senior peruano en Sprint 3, no del dev.
 *
 * Idempotente: usa upsert por `codigo` único.
 */

import type { PrismaClient } from '../src/generated/prisma/client'

interface PeligroSeed {
  codigo: string
  familia:
    | 'FISICO'
    | 'QUIMICO'
    | 'BIOLOGICO'
    | 'ERGONOMICO'
    | 'PSICOSOCIAL'
    | 'MECANICO'
    | 'ELECTRICO'
    | 'LOCATIVO'
  nombre: string
  descripcion: string
  fuenteLegal?: string
}

interface ControlSeed {
  codigo: string
  nivel: 'ELIMINACION' | 'SUSTITUCION' | 'INGENIERIA' | 'ADMINISTRATIVO' | 'EPP'
  descripcion: string
  costoEstimadoSoles?: number | null
  fuenteLegal?: string
}

const FUENTE_RM050 = 'R.M. 050-2013-TR Anexo 3'
const FUENTE_LEY29783 = 'Ley 29783 — Ley de Seguridad y Salud en el Trabajo'

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE PELIGROS — 80 entradas base
// ═══════════════════════════════════════════════════════════════════════════

const PELIGROS: PeligroSeed[] = [
  // ── FÍSICOS (12) ───────────────────────────────────────────────────────
  { codigo: 'FIS-001', familia: 'FISICO', nombre: 'Ruido por encima del LMP (85 dB)', descripcion: 'Exposición continua a niveles de presión sonora superiores al límite permisible. Riesgo de hipoacusia inducida por ruido y sordera profesional irreversible.', fuenteLegal: FUENTE_RM050 },
  { codigo: 'FIS-002', familia: 'FISICO', nombre: 'Vibraciones mano-brazo', descripcion: 'Uso prolongado de herramientas vibratorias (taladros, esmeriles, martillos neumáticos). Asociado a síndrome del túnel carpiano y enfermedad de Raynaud.' },
  { codigo: 'FIS-003', familia: 'FISICO', nombre: 'Vibraciones cuerpo entero', descripcion: 'Exposición a vibraciones por operación de vehículos o maquinaria pesada. Asociado a lumbalgia crónica y trastornos osteomusculares.' },
  { codigo: 'FIS-004', familia: 'FISICO', nombre: 'Estrés térmico por calor', descripcion: 'Trabajo en ambientes con temperaturas elevadas (hornos, fundiciones, exteriores en zonas tropicales). Riesgo de golpe de calor, deshidratación.' },
  { codigo: 'FIS-005', familia: 'FISICO', nombre: 'Estrés térmico por frío', descripcion: 'Trabajo en ambientes refrigerados o exteriores fríos (cámaras frigoríficas, alta montaña). Riesgo de hipotermia y congelamiento.' },
  { codigo: 'FIS-006', familia: 'FISICO', nombre: 'Iluminación deficiente', descripcion: 'Trabajo bajo luminosidad inferior a los luxes recomendados según tarea. Causa fatiga visual, cefaleas y aumenta riesgo de accidentes.', fuenteLegal: 'NTP 388' },
  { codigo: 'FIS-007', familia: 'FISICO', nombre: 'Iluminación excesiva o deslumbramiento', descripcion: 'Exposición a iluminación intensa o reflejos directos. Causa fatiga visual y dificulta la percepción.' },
  { codigo: 'FIS-008', familia: 'FISICO', nombre: 'Radiación solar UV', descripcion: 'Exposición a radiación ultravioleta solar en trabajos al aire libre. Riesgo de quemaduras solares y cáncer de piel. Aplica Ley 30102.', fuenteLegal: 'Ley 30102 + D.S. 003-2026-SA' },
  { codigo: 'FIS-009', familia: 'FISICO', nombre: 'Radiación no ionizante (pantallas VDT)', descripcion: 'Exposición prolongada a pantallas de video terminal. Causa fatiga visual, sequedad ocular y cefaleas.' },
  { codigo: 'FIS-010', familia: 'FISICO', nombre: 'Radiación ionizante', descripcion: 'Exposición a fuentes radioactivas o equipos de rayos X. Riesgo cancerígeno acumulativo. Requiere dosimetría individual.', fuenteLegal: 'Ley 28028' },
  { codigo: 'FIS-011', familia: 'FISICO', nombre: 'Presión atmosférica anormal (altura geográfica)', descripcion: 'Trabajo en altitud superior a 2,500 msnm. Riesgo de mal de altura, edema pulmonar de altura. Frecuente en minería peruana.' },
  { codigo: 'FIS-012', familia: 'FISICO', nombre: 'Humedad relativa extrema', descripcion: 'Ambientes con humedad fuera del rango de confort (40–60%). Asociado a micosis, dermatitis y resbalones.' },

  // ── QUÍMICOS (10) ──────────────────────────────────────────────────────
  { codigo: 'QUI-001', familia: 'QUIMICO', nombre: 'Polvo respirable de sílice cristalina', descripcion: 'Inhalación de partículas finas de sílice en construcción y minería. Causa silicosis. Requiere monitoreo higiénico periódico.', fuenteLegal: FUENTE_RM050 },
  { codigo: 'QUI-002', familia: 'QUIMICO', nombre: 'Polvo de cemento', descripcion: 'Exposición a partículas de cemento Portland. Causa dermatitis irritativa y por contacto, neumoconiosis.' },
  { codigo: 'QUI-003', familia: 'QUIMICO', nombre: 'Vapores de solventes orgánicos', descripcion: 'Inhalación de COVs (tolueno, xileno, acetona). Riesgo de toxicidad hepática y neurológica.' },
  { codigo: 'QUI-004', familia: 'QUIMICO', nombre: 'Sustancias corrosivas (ácidos y bases)', descripcion: 'Contacto cutáneo o ocular con corrosivos. Causa quemaduras químicas graves. Requiere ducha de emergencia.' },
  { codigo: 'QUI-005', familia: 'QUIMICO', nombre: 'Plaguicidas y agroquímicos', descripcion: 'Exposición a pesticidas en aplicación o reingreso a campos. Riesgo de intoxicación aguda y efectos crónicos.' },
  { codigo: 'QUI-006', familia: 'QUIMICO', nombre: 'Humos metálicos de soldadura', descripcion: 'Inhalación de humos durante soldadura por arco. Causa fiebre de humos metálicos y daño pulmonar.' },
  { codigo: 'QUI-007', familia: 'QUIMICO', nombre: 'Productos de limpieza concentrados', descripcion: 'Manipulación de hipoclorito, amoníaco, desengrasantes. Riesgo de irritación dérmica y respiratoria.' },
  { codigo: 'QUI-008', familia: 'QUIMICO', nombre: 'Asbesto (amianto)', descripcion: 'Manipulación de materiales con asbesto en demolición o mantenimiento. Causa asbestosis y mesotelioma. Cancerígeno IARC grupo 1.' },
  { codigo: 'QUI-009', familia: 'QUIMICO', nombre: 'Plomo y derivados', descripcion: 'Exposición a plomo metálico, óxidos o compuestos. Causa saturnismo. Requiere plomemias periódicas.' },
  { codigo: 'QUI-010', familia: 'QUIMICO', nombre: 'Combustibles líquidos (gasolina, diésel)', descripcion: 'Manipulación de hidrocarburos volátiles. Riesgo de incendio, explosión e inhalación.' },

  // ── BIOLÓGICOS (8) ─────────────────────────────────────────────────────
  { codigo: 'BIO-001', familia: 'BIOLOGICO', nombre: 'Exposición a fluidos corporales', descripcion: 'Contacto con sangre, secreciones u otros fluidos. Riesgo de Hepatitis B, Hepatitis C y VIH. Aplica protocolo bioseguridad.' },
  { codigo: 'BIO-002', familia: 'BIOLOGICO', nombre: 'Microorganismos en alimentos', descripcion: 'Manipulación de alimentos crudos o procesados. Riesgo de ETA (enfermedades transmitidas por alimentos).' },
  { codigo: 'BIO-003', familia: 'BIOLOGICO', nombre: 'Vectores zoonóticos', descripcion: 'Picaduras de insectos o mordeduras de fauna. Riesgo de dengue, zika, leptospirosis, rabia.' },
  { codigo: 'BIO-004', familia: 'BIOLOGICO', nombre: 'Hongos y moho ambientales', descripcion: 'Inhalación de esporas en ambientes húmedos. Causa alergias, asma ocupacional y micosis.' },
  { codigo: 'BIO-005', familia: 'BIOLOGICO', nombre: 'Virus respiratorios en ambientes cerrados', descripcion: 'Contagio persona a persona en oficinas y espacios cerrados (COVID-19, influenza, tuberculosis).' },
  { codigo: 'BIO-006', familia: 'BIOLOGICO', nombre: 'Residuos sanitarios', descripcion: 'Manipulación de residuos hospitalarios o cortopunzantes. Riesgo biológico múltiple.', fuenteLegal: 'NTS 144-MINSA' },
  { codigo: 'BIO-007', familia: 'BIOLOGICO', nombre: 'Agua o aguas residuales contaminadas', descripcion: 'Trabajo con aguas servidas o contaminadas. Riesgo de leptospirosis, hepatitis A, gastroenteritis.' },
  { codigo: 'BIO-008', familia: 'BIOLOGICO', nombre: 'Contacto con animales', descripcion: 'Trabajo con ganado, animales de laboratorio o silvestres. Riesgo de zoonosis y mordeduras.' },

  // ── ERGONÓMICOS (10) ───────────────────────────────────────────────────
  { codigo: 'ERG-001', familia: 'ERGONOMICO', nombre: 'Postura sedentaria prolongada', descripcion: 'Permanencia sentado por más de 4 horas continuas. Causa lumbalgia, síndrome del piriforme y trombosis venosa.' },
  { codigo: 'ERG-002', familia: 'ERGONOMICO', nombre: 'Movimientos repetitivos de extremidades', descripcion: 'Repetición de movimientos en mano, muñeca u hombro. Causa tendinitis, síndrome del túnel carpiano.' },
  { codigo: 'ERG-003', familia: 'ERGONOMICO', nombre: 'Bipedestación prolongada', descripcion: 'Trabajo de pie por más de 4 horas continuas. Causa varices, fatiga muscular y dolor lumbar.' },
  { codigo: 'ERG-004', familia: 'ERGONOMICO', nombre: 'Posturas forzadas', descripcion: 'Trabajo con flexión, extensión o rotación extrema del tronco o cuello. Causa TME crónicos.' },
  { codigo: 'ERG-005', familia: 'ERGONOMICO', nombre: 'Levantamiento manual de cargas (>25 kg hombres / >15 kg mujeres)', descripcion: 'Manejo manual de cargas superiores al límite recomendado. Riesgo de hernia discal y lumbalgia.', fuenteLegal: 'NTP 600' },
  { codigo: 'ERG-006', familia: 'ERGONOMICO', nombre: 'Empuje y tracción de cargas', descripcion: 'Movimiento de carros, paletas u objetos pesados. Riesgo de sobreesfuerzo lumbar y de hombro.' },
  { codigo: 'ERG-007', familia: 'ERGONOMICO', nombre: 'Uso prolongado de monitor de video', descripcion: 'Trabajo continuo frente a pantalla. Causa fatiga visual, cervicalgia y síndrome del cuello tecnológico.' },
  { codigo: 'ERG-008', familia: 'ERGONOMICO', nombre: 'Mobiliario inadecuado', descripcion: 'Silla, escritorio o herramientas no ergonómicas. Causa TME crónicos y pérdida de productividad.' },
  { codigo: 'ERG-009', familia: 'ERGONOMICO', nombre: 'Alcance excesivo o repetido', descripcion: 'Tareas que requieren extender los brazos por encima del nivel del hombro repetidamente.' },
  { codigo: 'ERG-010', familia: 'ERGONOMICO', nombre: 'Iluminación inadecuada para la tarea', descripcion: 'Niveles lumínicos por debajo del estándar para tareas de precisión. Causa fatiga visual.' },

  // ── PSICOSOCIALES (8) ──────────────────────────────────────────────────
  { codigo: 'PSI-001', familia: 'PSICOSOCIAL', nombre: 'Estrés laboral por sobrecarga de trabajo', descripcion: 'Exigencia que excede los recursos del trabajador. Causa burnout, ansiedad, hipertensión.' },
  { codigo: 'PSI-002', familia: 'PSICOSOCIAL', nombre: 'Hostigamiento sexual laboral', descripcion: 'Conducta de naturaleza sexual no deseada. Aplica Ley 27942 + D.S. 014-2019-MIMP.', fuenteLegal: 'Ley 27942 + D.S. 014-2019-MIMP' },
  { codigo: 'PSI-003', familia: 'PSICOSOCIAL', nombre: 'Acoso laboral (mobbing)', descripcion: 'Conductas hostiles, denigrantes o de aislamiento sistemático. Causa daño psicológico severo.' },
  { codigo: 'PSI-004', familia: 'PSICOSOCIAL', nombre: 'Jornada extensa o atípica', descripcion: 'Jornadas mayores a 48 horas semanales o turnos rotativos sin descanso adecuado.', fuenteLegal: 'Ley 27671' },
  { codigo: 'PSI-005', familia: 'PSICOSOCIAL', nombre: 'Falta de control sobre la tarea', descripcion: 'Bajo nivel de autonomía y participación en decisiones. Causa desmotivación y estrés.' },
  { codigo: 'PSI-006', familia: 'PSICOSOCIAL', nombre: 'Conflictos interpersonales recurrentes', descripcion: 'Tensión sostenida entre compañeros o con jefatura. Afecta clima laboral y salud mental.' },
  { codigo: 'PSI-007', familia: 'PSICOSOCIAL', nombre: 'Monotonía y trabajo repetitivo mental', descripcion: 'Tareas con bajo contenido cognitivo y alta repetición. Causa fatiga mental y desinterés.' },
  { codigo: 'PSI-008', familia: 'PSICOSOCIAL', nombre: 'Comunicación deficiente o autoritaria', descripcion: 'Estilo de mando vertical sin retroalimentación. Causa miedo, errores y rotación elevada.' },

  // ── MECÁNICOS (12) ─────────────────────────────────────────────────────
  { codigo: 'MEC-001', familia: 'MECANICO', nombre: 'Trabajo en altura (>1.8 m)', descripcion: 'Tareas en niveles superiores que pueden generar caída a distinto nivel. Requiere arnés y línea de vida.', fuenteLegal: 'D.S. 011-2019-TR' },
  { codigo: 'MEC-002', familia: 'MECANICO', nombre: 'Caída al mismo nivel (piso mojado/irregular)', descripcion: 'Resbalones o tropiezos en superficies húmedas, desniveladas u obstaculizadas.' },
  { codigo: 'MEC-003', familia: 'MECANICO', nombre: 'Maquinaria sin guarda de protección', descripcion: 'Operación de máquinas con partes móviles expuestas. Riesgo de atrapamiento o amputación.' },
  { codigo: 'MEC-004', familia: 'MECANICO', nombre: 'Herramientas cortopunzantes', descripcion: 'Uso de cuchillos, tijeras, agujas, vidrio. Riesgo de cortes y punciones.' },
  { codigo: 'MEC-005', familia: 'MECANICO', nombre: 'Vehículos en movimiento', descripcion: 'Tránsito de montacargas, camiones o autos en zonas de trabajo peatonal. Riesgo de atropello.' },
  { codigo: 'MEC-006', familia: 'MECANICO', nombre: 'Caída de objetos almacenados', descripcion: 'Materiales mal estibados en altura. Riesgo de impacto en personas debajo.' },
  { codigo: 'MEC-007', familia: 'MECANICO', nombre: 'Superficies calientes', descripcion: 'Contacto con tuberías, hornos, motores o herramientas a temperatura elevada. Causa quemaduras.' },
  { codigo: 'MEC-008', familia: 'MECANICO', nombre: 'Espacios confinados', descripcion: 'Trabajo en tanques, bóvedas, alcantarillas. Riesgo de asfixia, intoxicación y atrapamiento.', fuenteLegal: 'NTP 30000' },
  { codigo: 'MEC-009', familia: 'MECANICO', nombre: 'Escaleras en mal estado', descripcion: 'Uso de escaleras dañadas, sin barandas o con peldaños desgastados. Riesgo de caída.' },
  { codigo: 'MEC-010', familia: 'MECANICO', nombre: 'Izaje de cargas (grúas, polipastos)', descripcion: 'Operaciones de elevación con equipos mecánicos. Riesgo de caída de carga suspendida.' },
  { codigo: 'MEC-011', familia: 'MECANICO', nombre: 'Proyección de partículas', descripcion: 'Despedimiento de virutas, chispas o fragmentos durante corte, esmerilado o soldadura.' },
  { codigo: 'MEC-012', familia: 'MECANICO', nombre: 'Carga manual de objetos pesados', descripcion: 'Levantamiento manual sobre los límites antropométricos del trabajador.', fuenteLegal: 'NTP 600' },

  // ── ELÉCTRICOS (10) ────────────────────────────────────────────────────
  { codigo: 'ELE-001', familia: 'ELECTRICO', nombre: 'Contacto eléctrico directo', descripcion: 'Contacto con partes activas de instalaciones eléctricas energizadas. Riesgo de electrocución.' },
  { codigo: 'ELE-002', familia: 'ELECTRICO', nombre: 'Contacto eléctrico indirecto', descripcion: 'Contacto con masas puestas accidentalmente en tensión por fallo de aislamiento.' },
  { codigo: 'ELE-003', familia: 'ELECTRICO', nombre: 'Arco eléctrico', descripcion: 'Liberación de energía durante cortocircuito. Causa quemaduras severas y proyección de metal fundido.' },
  { codigo: 'ELE-004', familia: 'ELECTRICO', nombre: 'Trabajo en alta tensión', descripcion: 'Operación o mantenimiento en líneas o equipos sobre 1 kV. Requiere LOTO + PPE dieléctrico.' },
  { codigo: 'ELE-005', familia: 'ELECTRICO', nombre: 'Trabajo en baja tensión', descripcion: 'Operación con tensiones hasta 1 kV. Requiere herramientas aisladas y procedimiento.' },
  { codigo: 'ELE-006', familia: 'ELECTRICO', nombre: 'Electricidad estática', descripcion: 'Acumulación de carga en ambientes con polvos o vapores inflamables. Riesgo de ignición.' },
  { codigo: 'ELE-007', familia: 'ELECTRICO', nombre: 'Sobrecarga de tomacorrientes', descripcion: 'Conexión múltiple en un mismo punto. Riesgo de sobrecalentamiento e incendio.' },
  { codigo: 'ELE-008', familia: 'ELECTRICO', nombre: 'Cables eléctricos expuestos', descripcion: 'Conductores sin canalizar en zonas de tránsito. Riesgo de caídas y contactos eléctricos.' },
  { codigo: 'ELE-009', familia: 'ELECTRICO', nombre: 'Manipulación de baterías', descripcion: 'Carga o reemplazo de baterías de plomo-ácido. Riesgo de derrame de electrolito y emisión de hidrógeno.' },
  { codigo: 'ELE-010', familia: 'ELECTRICO', nombre: 'Tableros eléctricos sin señalización', descripcion: 'Tableros sin identificación de circuitos ni advertencias. Riesgo durante intervenciones.' },

  // ── LOCATIVOS (10) ─────────────────────────────────────────────────────
  { codigo: 'LOC-001', familia: 'LOCATIVO', nombre: 'Falta de orden y limpieza', descripcion: 'Áreas de trabajo desordenadas con elementos en pasillos. Riesgo de caídas y accidentes.', fuenteLegal: 'Metodología 5S' },
  { codigo: 'LOC-002', familia: 'LOCATIVO', nombre: 'Almacenamiento inseguro', descripcion: 'Estanterías sobrecargadas, sin anclaje o con materiales mal estibados.' },
  { codigo: 'LOC-003', familia: 'LOCATIVO', nombre: 'Pasillos obstruidos', descripcion: 'Vías de circulación bloqueadas por mercadería, equipos o residuos. Dificulta evacuación.' },
  { codigo: 'LOC-004', familia: 'LOCATIVO', nombre: 'Señalización deficiente o ausente', descripcion: 'Falta de señales de seguridad NTP 399.010-1 (advertencia, prohibición, obligación, salvamento).', fuenteLegal: 'NTP 399.010-1' },
  { codigo: 'LOC-005', familia: 'LOCATIVO', nombre: 'Salidas de evacuación bloqueadas', descripcion: 'Puertas de emergencia con candado, obstruidas o no señalizadas. Crítico ante incendio o sismo.' },
  { codigo: 'LOC-006', familia: 'LOCATIVO', nombre: 'Iluminación de emergencia inoperativa', descripcion: 'Sistema de iluminación de evacuación sin batería de respaldo o con luminarias quemadas.' },
  { codigo: 'LOC-007', familia: 'LOCATIVO', nombre: 'Zonas de trabajo en altura sin protección perimetral', descripcion: 'Plataformas elevadas sin barandas o con barandas en mal estado. Riesgo de caída.' },
  { codigo: 'LOC-008', familia: 'LOCATIVO', nombre: 'Espacios reducidos para la tarea', descripcion: 'Áreas de trabajo con espacio insuficiente para operar herramientas o circular cargas.' },
  { codigo: 'LOC-009', familia: 'LOCATIVO', nombre: 'Distribución inadecuada de áreas', descripcion: 'Layout que mezcla actividades incompatibles (almacén con oficina, comedor con producción).' },
  { codigo: 'LOC-010', familia: 'LOCATIVO', nombre: 'Extintores vencidos o ausentes', descripcion: 'Equipos contra incendio con prueba hidrostática vencida o fuera del alcance reglamentario.', fuenteLegal: 'NTP 350.043-1' },
]

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE CONTROLES — 40 entradas en 5 niveles de jerarquía
// ═══════════════════════════════════════════════════════════════════════════

const CONTROLES: ControlSeed[] = [
  // ── ELIMINACIÓN (8) — eliminar el peligro en su origen ────────────────
  { codigo: 'ELI-001', nivel: 'ELIMINACION', descripcion: 'Eliminar el proceso o tarea peligrosa rediseñando el flujo de trabajo.', fuenteLegal: FUENTE_LEY29783 },
  { codigo: 'ELI-002', nivel: 'ELIMINACION', descripcion: 'Automatizar la tarea para que no requiera intervención humana en zona peligrosa.' },
  { codigo: 'ELI-003', nivel: 'ELIMINACION', descripcion: 'Suprimir la fuente del peligro retirándola del ambiente de trabajo.' },
  { codigo: 'ELI-004', nivel: 'ELIMINACION', descripcion: 'Eliminar el almacenamiento de sustancias peligrosas que ya no se utilizan.' },
  { codigo: 'ELI-005', nivel: 'ELIMINACION', descripcion: 'Reemplazar el proceso completo por uno que no genere el peligro.' },
  { codigo: 'ELI-006', nivel: 'ELIMINACION', descripcion: 'Trasladar la operación peligrosa a un proveedor especializado.' },
  { codigo: 'ELI-007', nivel: 'ELIMINACION', descripcion: 'Suprimir el factor de riesgo psicosocial reorganizando equipos o liderazgo.' },
  { codigo: 'ELI-008', nivel: 'ELIMINACION', descripcion: 'Eliminar la exposición prolongada rediseñando turnos o rotación.' },

  // ── SUSTITUCIÓN (8) — reemplazar por algo menos peligroso ──────────────
  { codigo: 'SUS-001', nivel: 'SUSTITUCION', descripcion: 'Sustituir sustancia química por otra de menor toxicidad o riesgo.' },
  { codigo: 'SUS-002', nivel: 'SUSTITUCION', descripcion: 'Reemplazar herramienta manual por una eléctrica con menor esfuerzo ergonómico.' },
  { codigo: 'SUS-003', nivel: 'SUSTITUCION', descripcion: 'Cambiar pintura solvente por pintura base agua.' },
  { codigo: 'SUS-004', nivel: 'SUSTITUCION', descripcion: 'Sustituir equipo ruidoso por modelo de menor presión sonora.' },
  { codigo: 'SUS-005', nivel: 'SUSTITUCION', descripcion: 'Reemplazar escalera por andamio o plataforma elevadora.' },
  { codigo: 'SUS-006', nivel: 'SUSTITUCION', descripcion: 'Cambiar mobiliario tradicional por mobiliario ergonómico ajustable.' },
  { codigo: 'SUS-007', nivel: 'SUSTITUCION', descripcion: 'Sustituir iluminación incandescente por LED de mayor calidad lumínica.' },
  { codigo: 'SUS-008', nivel: 'SUSTITUCION', descripcion: 'Reemplazar materiales con asbesto por alternativas seguras.' },

  // ── INGENIERÍA (10) — controles físicos, técnicos ──────────────────────
  { codigo: 'ING-001', nivel: 'INGENIERIA', descripcion: 'Instalar guarda de protección en partes móviles de maquinaria.', fuenteLegal: FUENTE_RM050 },
  { codigo: 'ING-002', nivel: 'INGENIERIA', descripcion: 'Sistema de extracción localizada (campana, ducto, ventilador).' },
  { codigo: 'ING-003', nivel: 'INGENIERIA', descripcion: 'Aislamiento acústico (cabinas, mamparas, paneles absorbentes).' },
  { codigo: 'ING-004', nivel: 'INGENIERIA', descripcion: 'Mejora del sistema de iluminación según norma de luxes por tarea.' },
  { codigo: 'ING-005', nivel: 'INGENIERIA', descripcion: 'Instalación de barandas, líneas de vida y puntos de anclaje.', fuenteLegal: 'D.S. 011-2019-TR' },
  { codigo: 'ING-006', nivel: 'INGENIERIA', descripcion: 'Sistema de detección y supresión automática de incendios.' },
  { codigo: 'ING-007', nivel: 'INGENIERIA', descripcion: 'Diseño ergonómico del puesto (altura ajustable, alcance, postura).' },
  { codigo: 'ING-008', nivel: 'INGENIERIA', descripcion: 'Sistema de bloqueo y etiquetado (LOTO) para mantenimiento eléctrico.' },
  { codigo: 'ING-009', nivel: 'INGENIERIA', descripcion: 'Ventilación general del ambiente para renovar aire viciado.' },
  { codigo: 'ING-010', nivel: 'INGENIERIA', descripcion: 'Pisos antideslizantes en zonas húmedas o con riesgo de derrame.' },

  // ── ADMINISTRATIVO (8) — procedimientos, capacitación ─────────────────
  { codigo: 'ADM-001', nivel: 'ADMINISTRATIVO', descripcion: 'Capacitación SST mínima de 4 horas por trabajador al año.', fuenteLegal: 'Ley 29783 Art. 35.b' },
  { codigo: 'ADM-002', nivel: 'ADMINISTRATIVO', descripcion: 'Procedimiento Escrito de Trabajo Seguro (PETS) específico de la tarea.' },
  { codigo: 'ADM-003', nivel: 'ADMINISTRATIVO', descripcion: 'Permiso Escrito de Trabajo de Alto Riesgo (PETAR).', fuenteLegal: 'D.S. 024-2016-EM' },
  { codigo: 'ADM-004', nivel: 'ADMINISTRATIVO', descripcion: 'Rotación de puestos para reducir exposición acumulada.' },
  { codigo: 'ADM-005', nivel: 'ADMINISTRATIVO', descripcion: 'Pausas activas cada 45–60 minutos para tareas repetitivas o sedentarias.' },
  { codigo: 'ADM-006', nivel: 'ADMINISTRATIVO', descripcion: 'Inspecciones planeadas semanales del área de trabajo con check list.' },
  { codigo: 'ADM-007', nivel: 'ADMINISTRATIVO', descripcion: 'Programa de exámenes médicos ocupacionales (R.M. 312-2011-MINSA).', fuenteLegal: 'R.M. 312-2011-MINSA mod. R.M. 571-2014-MINSA' },
  { codigo: 'ADM-008', nivel: 'ADMINISTRATIVO', descripcion: 'Análisis de Trabajo Seguro (ATS) previo al inicio de cada tarea no rutinaria.' },

  // ── EPP (6) — última línea de defensa ──────────────────────────────────
  { codigo: 'EPP-001', nivel: 'EPP', descripcion: 'Casco de seguridad ANSI Z89.1 certificado.', fuenteLegal: 'ANSI Z89.1' },
  { codigo: 'EPP-002', nivel: 'EPP', descripcion: 'Protección auditiva (tapones o protectores de copa) según nivel de ruido.' },
  { codigo: 'EPP-003', nivel: 'EPP', descripcion: 'Respirador con filtro adecuado al contaminante (P100, cartucho químico, etc.).' },
  { codigo: 'EPP-004', nivel: 'EPP', descripcion: 'Guantes específicos según riesgo (corte, químico, térmico, eléctrico).' },
  { codigo: 'EPP-005', nivel: 'EPP', descripcion: 'Lentes y/o careta de seguridad ANSI Z87.1.', fuenteLegal: 'ANSI Z87.1' },
  { codigo: 'EPP-006', nivel: 'EPP', descripcion: 'Calzado de seguridad con punta de acero y suela antideslizante.' },
]

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN DE SEED — idempotente
// ═══════════════════════════════════════════════════════════════════════════

export interface SstSeedReport {
  peligros: { total: number; created: number; updated: number }
  controles: { total: number; created: number; updated: number }
  colaboradorDemo: boolean
}

export async function seedSstCatalogs(prisma: PrismaClient): Promise<SstSeedReport> {
  // ── Peligros ────────────────────────────────────────────────────────────
  let pCreated = 0
  let pUpdated = 0
  for (const p of PELIGROS) {
    const existing = await prisma.catalogoPeligro.findUnique({ where: { codigo: p.codigo } })
    await prisma.catalogoPeligro.upsert({
      where: { codigo: p.codigo },
      create: {
        codigo: p.codigo,
        familia: p.familia,
        nombre: p.nombre,
        descripcion: p.descripcion,
        fuenteLegal: p.fuenteLegal ?? null,
      },
      update: {
        familia: p.familia,
        nombre: p.nombre,
        descripcion: p.descripcion,
        fuenteLegal: p.fuenteLegal ?? null,
      },
    })
    if (existing) pUpdated++
    else pCreated++
  }

  // ── Controles ───────────────────────────────────────────────────────────
  let cCreated = 0
  let cUpdated = 0
  for (const c of CONTROLES) {
    const existing = await prisma.catalogoControl.findUnique({ where: { codigo: c.codigo } })
    await prisma.catalogoControl.upsert({
      where: { codigo: c.codigo },
      create: {
        codigo: c.codigo,
        nivel: c.nivel,
        descripcion: c.descripcion,
        costoEstimadoSoles: c.costoEstimadoSoles ?? null,
        fuenteLegal: c.fuenteLegal ?? null,
      },
      update: {
        nivel: c.nivel,
        descripcion: c.descripcion,
        costoEstimadoSoles: c.costoEstimadoSoles ?? null,
        fuenteLegal: c.fuenteLegal ?? null,
      },
    })
    if (existing) cUpdated++
    else cCreated++
  }

  // ── Colaborador demo (solo dev/staging) ─────────────────────────────────
  let colaboradorDemo = false
  if (process.env.NODE_ENV !== 'production') {
    const demo = await prisma.colaboradorSST.upsert({
      where: { dni: '00000001' },
      create: {
        nombre: 'Demo',
        apellido: 'Inspector',
        dni: '00000001',
        email: 'demo.inspector@comply360.pe',
        telefono: '999999999',
        tipoColaborador: 'EMPLEADO_INTERNO',
        especialidades: ['oficinas', 'comercio', 'manufactura_basica'],
        disponibilidad: { lun: '08:00-17:00', mar: '08:00-17:00', mie: '08:00-17:00', jue: '08:00-17:00', vie: '08:00-17:00' },
        activo: true,
      },
      update: {},
    })
    colaboradorDemo = !!demo
  }

  return {
    peligros: { total: PELIGROS.length, created: pCreated, updated: pUpdated },
    controles: { total: CONTROLES.length, created: cCreated, updated: cUpdated },
    colaboradorDemo,
  }
}
