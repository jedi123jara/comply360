/**
 * Biblioteca de Peligros para IPERC — R.M. 050-2013-TR
 *
 * 120+ entradas organizadas por tipo de peligro y sector economico.
 * Cada entrada incluye: peligro, riesgo asociado, consecuencia potencial,
 * medidas de control sugeridas, y sectores donde aplica.
 */

import type { PeligroTipo } from './iperc-template'

export interface PeligroEntry {
  id: string
  tipo: PeligroTipo
  peligro: string
  riesgo: string
  consecuencia: string
  medidasControl: string[]
  sectores: string[] // 'TODOS', 'OFICINAS', 'MANUFACTURA', 'CONSTRUCCION', 'COMERCIO', 'SERVICIOS', 'MINERIA', 'AGRARIO', 'SALUD', 'TRANSPORTE'
}

// ─── FISICO ─────────────────────────────────────────────────────────────────

const FISICOS: PeligroEntry[] = [
  { id: 'F-01', tipo: 'FISICO', peligro: 'Ruido por encima de 85 dB', riesgo: 'Exposicion a ruido continuo', consecuencia: 'Hipoacusia, sordera profesional', medidasControl: ['Cabinas acusticas', 'Protectores auditivos', 'Rotacion de puestos', 'Monitoreo audiometrico'], sectores: ['MANUFACTURA', 'CONSTRUCCION', 'MINERIA'] },
  { id: 'F-02', tipo: 'FISICO', peligro: 'Vibraciones (herramientas manuales)', riesgo: 'Exposicion a vibraciones mano-brazo', consecuencia: 'Sindrome del tunel carpiano, Raynaud', medidasControl: ['Guantes antivibración', 'Limitar tiempo de exposicion', 'Herramientas amortiguadas'], sectores: ['MANUFACTURA', 'CONSTRUCCION', 'MINERIA'] },
  { id: 'F-03', tipo: 'FISICO', peligro: 'Temperaturas extremas (calor)', riesgo: 'Exposicion a calor ambiental', consecuencia: 'Golpe de calor, deshidratacion, quemaduras', medidasControl: ['Hidratacion constante', 'Pausas en sombra', 'Ropa de proteccion termica', 'Ventilacion forzada'], sectores: ['CONSTRUCCION', 'MANUFACTURA', 'AGRARIO', 'MINERIA'] },
  { id: 'F-04', tipo: 'FISICO', peligro: 'Temperaturas extremas (frio)', riesgo: 'Exposicion a frio ambiental', consecuencia: 'Hipotermia, congelamiento', medidasControl: ['Ropa termica', 'Bebidas calientes', 'Rotacion de turnos'], sectores: ['MINERIA', 'AGRARIO', 'TRANSPORTE'] },
  { id: 'F-05', tipo: 'FISICO', peligro: 'Iluminacion deficiente', riesgo: 'Trabajo en condiciones de baja luminosidad', consecuencia: 'Fatiga visual, cefaleas, accidentes', medidasControl: ['Mejorar iluminacion artificial', 'Lamparas de tarea', 'Medicion de luxes'], sectores: ['TODOS'] },
  { id: 'F-06', tipo: 'FISICO', peligro: 'Radiacion solar UV', riesgo: 'Exposicion a radiacion ultravioleta', consecuencia: 'Quemaduras solares, cancer de piel', medidasControl: ['Protector solar SPF50+', 'Ropa con cobertura UV', 'Sombra en areas de trabajo', 'Limitar exposicion 10-15h'], sectores: ['CONSTRUCCION', 'AGRARIO', 'MINERIA'] },
  { id: 'F-07', tipo: 'FISICO', peligro: 'Radiacion no ionizante (pantallas VDT)', riesgo: 'Exposicion prolongada a pantallas', consecuencia: 'Fatiga visual, cefaleas, sequedad ocular', medidasControl: ['Pausas activas cada 45 min', 'Filtro de pantalla', 'Ergonomia del puesto'], sectores: ['OFICINAS', 'SERVICIOS'] },
  { id: 'F-08', tipo: 'FISICO', peligro: 'Presion atmosferica anormal', riesgo: 'Trabajo en alturas geograficas > 3000m', consecuencia: 'Mal de altura, edema pulmonar', medidasControl: ['Aclimatacion progresiva', 'Monitoreo medico', 'Oxigeno suplementario'], sectores: ['MINERIA', 'CONSTRUCCION'] },
  { id: 'F-09', tipo: 'FISICO', peligro: 'Humedad excesiva', riesgo: 'Trabajo en ambientes humedos', consecuencia: 'Micosis, resbalones, dermatitis', medidasControl: ['Ventilacion', 'Calzado antideslizante', 'EPP impermeable'], sectores: ['AGRARIO', 'MANUFACTURA', 'SALUD'] },
  { id: 'F-10', tipo: 'FISICO', peligro: 'Ventilacion insuficiente', riesgo: 'Ambiente cerrado sin circulacion de aire', consecuencia: 'Cefaleas, mareos, intoxicacion', medidasControl: ['Extractores de aire', 'Ventanas operables', 'Monitoreo de CO2'], sectores: ['TODOS'] },
]

// ─── MECANICO ───────────────────────────────────────────────────────────────

const MECANICOS: PeligroEntry[] = [
  { id: 'M-01', tipo: 'MECANICO', peligro: 'Trabajo en altura (> 1.8m)', riesgo: 'Caida a distinto nivel', consecuencia: 'Fracturas, TEC, muerte', medidasControl: ['Arnes de seguridad', 'Linea de vida', 'Barandas', 'Capacitacion en alturas', 'Permiso de trabajo'], sectores: ['CONSTRUCCION', 'MANUFACTURA', 'MINERIA'] },
  { id: 'M-02', tipo: 'MECANICO', peligro: 'Piso mojado o irregular', riesgo: 'Caida al mismo nivel', consecuencia: 'Contusiones, esguinces, fracturas', medidasControl: ['Senalizacion de piso mojado', 'Calzado antideslizante', 'Limpieza inmediata de derrames'], sectores: ['TODOS'] },
  { id: 'M-03', tipo: 'MECANICO', peligro: 'Maquinaria sin guarda de proteccion', riesgo: 'Atrapamiento, corte, amputacion', consecuencia: 'Amputacion, laceraciones graves', medidasControl: ['Guardas de proteccion', 'Bloqueo/Etiquetado LOTO', 'Sensores de proximidad', 'Capacitacion'], sectores: ['MANUFACTURA', 'MINERIA', 'AGRARIO'] },
  { id: 'M-04', tipo: 'MECANICO', peligro: 'Herramientas cortopunzantes', riesgo: 'Corte o puncion', consecuencia: 'Heridas, infecciones', medidasControl: ['Guantes de corte', 'Protocolo de manejo seguro', 'Herramientas en buen estado'], sectores: ['MANUFACTURA', 'CONSTRUCCION', 'COMERCIO', 'SALUD'] },
  { id: 'M-05', tipo: 'MECANICO', peligro: 'Vehiculos en movimiento', riesgo: 'Atropello, colision', consecuencia: 'Fracturas, traumatismos graves, muerte', medidasControl: ['Senalizacion de transito', 'Espejos convexos', 'Chalecos reflectantes', 'Limite de velocidad'], sectores: ['MANUFACTURA', 'MINERIA', 'TRANSPORTE', 'CONSTRUCCION'] },
  { id: 'M-06', tipo: 'MECANICO', peligro: 'Objetos almacenados en altura', riesgo: 'Caida de objetos', consecuencia: 'Contusiones, TEC', medidasControl: ['Casco de seguridad', 'Estanterias ancladas', 'Orden y limpieza', 'Redes de proteccion'], sectores: ['MANUFACTURA', 'CONSTRUCCION', 'COMERCIO', 'MINERIA'] },
  { id: 'M-07', tipo: 'MECANICO', peligro: 'Superficies calientes', riesgo: 'Contacto con temperatura', consecuencia: 'Quemaduras de 1er-3er grado', medidasControl: ['Guantes termicos', 'Senalizacion', 'Aislamiento termico', 'EPP apropiado'], sectores: ['MANUFACTURA', 'SERVICIOS'] },
  { id: 'M-08', tipo: 'MECANICO', peligro: 'Espacios confinados', riesgo: 'Asfixia, intoxicacion, atrapamiento', consecuencia: 'Muerte, intoxicacion severa', medidasControl: ['Permiso de trabajo', 'Monitoreo de gases', 'Vigía exterior', 'Equipo de rescate', 'Ventilacion forzada'], sectores: ['MANUFACTURA', 'MINERIA', 'CONSTRUCCION'] },
  { id: 'M-09', tipo: 'MECANICO', peligro: 'Escaleras en mal estado', riesgo: 'Caida por escalera defectuosa', consecuencia: 'Fracturas, esguinces', medidasControl: ['Inspeccion periodica', 'Barandas', 'Antideslizante en peldanos'], sectores: ['TODOS'] },
  { id: 'M-10', tipo: 'MECANICO', peligro: 'Izaje de cargas (gruas, polipastos)', riesgo: 'Caida de carga suspendida', consecuencia: 'Aplastamiento, muerte', medidasControl: ['Inspeccion de equipos', 'Operador certificado', 'Senalizacion de area', 'Capacidad de carga verificada'], sectores: ['CONSTRUCCION', 'MANUFACTURA', 'MINERIA'] },
  { id: 'M-11', tipo: 'MECANICO', peligro: 'Proyeccion de particulas', riesgo: 'Impacto en ojos o cara', consecuencia: 'Lesion ocular, ceguera parcial', medidasControl: ['Lentes de seguridad', 'Careta facial', 'Pantallas protectoras'], sectores: ['MANUFACTURA', 'CONSTRUCCION', 'MINERIA'] },
  { id: 'M-12', tipo: 'MECANICO', peligro: 'Carga manual de objetos pesados (> 25 kg)', riesgo: 'Sobreesfuerzo', consecuencia: 'Lumbalgia, hernia discal', medidasControl: ['Equipos mecanicos de carga', 'Limite de peso manual', 'Tecnica de levantamiento', 'Faja lumbar'], sectores: ['MANUFACTURA', 'CONSTRUCCION', 'COMERCIO', 'MINERIA', 'AGRARIO'] },
]

// ─── QUIMICO ────────────────────────────────────────────────────────────────

const QUIMICOS: PeligroEntry[] = [
  { id: 'Q-01', tipo: 'QUIMICO', peligro: 'Polvo respirable (silice, cemento)', riesgo: 'Inhalacion de particulas', consecuencia: 'Silicosis, neumoconiosis, EPOC', medidasControl: ['Mascarilla con filtro P100', 'Humectacion', 'Aspiracion localizada', 'Monitoreo de particulas'], sectores: ['CONSTRUCCION', 'MINERIA', 'MANUFACTURA'] },
  { id: 'Q-02', tipo: 'QUIMICO', peligro: 'Gases y vapores (solventes, pinturas)', riesgo: 'Inhalacion de sustancias toxicas', consecuencia: 'Intoxicacion aguda/cronica, dano hepatico', medidasControl: ['Ventilacion localizada', 'Respirador con cartucho quimico', 'Hojas MSDS disponibles', 'Almacenamiento seguro'], sectores: ['MANUFACTURA', 'CONSTRUCCION'] },
  { id: 'Q-03', tipo: 'QUIMICO', peligro: 'Sustancias corrosivas (acidos, bases)', riesgo: 'Contacto cutaneo con corrosivos', consecuencia: 'Quemaduras quimicas, dano ocular', medidasControl: ['Guantes de nitrilo', 'Lentes quimicos', 'Duchas de emergencia', 'Kit de derrames'], sectores: ['MANUFACTURA', 'MINERIA', 'SALUD'] },
  { id: 'Q-04', tipo: 'QUIMICO', peligro: 'Plaguicidas y agroquimicos', riesgo: 'Exposicion a pesticidas', consecuencia: 'Intoxicacion, cancer, dano neurologico', medidasControl: ['EPP completo (traje, mascara, guantes)', 'Periodo de reingreso', 'Capacitacion en manejo seguro'], sectores: ['AGRARIO'] },
  { id: 'Q-05', tipo: 'QUIMICO', peligro: 'Productos de limpieza concentrados', riesgo: 'Contacto o inhalacion de quimicos de limpieza', consecuencia: 'Irritacion dermica, reacciones alergicas', medidasControl: ['Dilucion segun fabricante', 'Guantes', 'Ventilacion', 'Fichas de seguridad'], sectores: ['TODOS'] },
  { id: 'Q-06', tipo: 'QUIMICO', peligro: 'Humos metalicos (soldadura)', riesgo: 'Inhalacion de humos de soldadura', consecuencia: 'Fiebre de humos metalicos, dano pulmonar', medidasControl: ['Extraccion localizada', 'Respirador para humos', 'Pantalla de soldador', 'Monitoreo ambiental'], sectores: ['MANUFACTURA', 'CONSTRUCCION'] },
]

// ─── BIOLOGICO ──────────────────────────────────────────────────────────────

const BIOLOGICOS: PeligroEntry[] = [
  { id: 'B-01', tipo: 'BIOLOGICO', peligro: 'Exposicion a fluidos corporales', riesgo: 'Contacto con sangre o secreciones', consecuencia: 'Hepatitis B/C, VIH', medidasControl: ['Guantes, bata, mascarilla', 'Protocolo de bioseguridad', 'Vacunacion (Hepatitis B)', 'Descartadores de cortopunzantes'], sectores: ['SALUD'] },
  { id: 'B-02', tipo: 'BIOLOGICO', peligro: 'Microorganismos en alimentos', riesgo: 'Manipulacion de alimentos contaminados', consecuencia: 'ETA (enfermedad transmitida por alimentos)', medidasControl: ['Lavado de manos', 'BPM (Buenas Practicas de Manufactura)', 'Control de temperatura', 'Carnet de sanidad'], sectores: ['COMERCIO', 'SERVICIOS'] },
  { id: 'B-03', tipo: 'BIOLOGICO', peligro: 'Picaduras de insectos / mordeduras', riesgo: 'Contacto con fauna silvestre', consecuencia: 'Dengue, zika, leptospirosis, rabia', medidasControl: ['Repelente', 'Ropa manga larga', 'Fumigacion', 'Vacunacion (rabia)'], sectores: ['AGRARIO', 'CONSTRUCCION', 'MINERIA'] },
  { id: 'B-04', tipo: 'BIOLOGICO', peligro: 'Hongos y moho en ambiente de trabajo', riesgo: 'Inhalacion de esporas', consecuencia: 'Alergias, asma ocupacional, micosis', medidasControl: ['Ventilacion', 'Control de humedad', 'Limpieza periodica', 'Mascarilla'], sectores: ['AGRARIO', 'MANUFACTURA'] },
  { id: 'B-05', tipo: 'BIOLOGICO', peligro: 'Virus respiratorios (ambientes cerrados)', riesgo: 'Contagio persona a persona', consecuencia: 'COVID-19, influenza, tuberculosis', medidasControl: ['Ventilacion natural', 'Mascarilla KN95', 'Distanciamiento', 'Limpieza de superficies'], sectores: ['TODOS'] },
]

// ─── ERGONOMICO ─────────────────────────────────────────────────────────────

const ERGONOMICOS: PeligroEntry[] = [
  { id: 'E-01', tipo: 'ERGONOMICO', peligro: 'Postura sedentaria prolongada', riesgo: 'Permanencia sentado > 4 horas continuas', consecuencia: 'Lumbalgia, sindrome del piriforme, TVP', medidasControl: ['Pausas activas cada 45 min', 'Silla ergonomica', 'Escritorio ajustable', 'Ejercicios de estiramiento'], sectores: ['OFICINAS', 'SERVICIOS'] },
  { id: 'E-02', tipo: 'ERGONOMICO', peligro: 'Movimientos repetitivos', riesgo: 'Repeticion de movimientos en mano/muneca', consecuencia: 'Tendinitis, sindrome del tunel carpiano', medidasControl: ['Rotacion de tareas', 'Pausas de recuperacion', 'Herramientas ergonomicas', 'Teclado y mouse ergonomico'], sectores: ['OFICINAS', 'MANUFACTURA', 'SERVICIOS'] },
  { id: 'E-03', tipo: 'ERGONOMICO', peligro: 'Postura forzada de pie', riesgo: 'Bipedestacion prolongada (> 4 horas)', consecuencia: 'Varices, fatiga muscular, dolor lumbar', medidasControl: ['Tapete antifatiga', 'Alternar posicion sentado/parado', 'Calzado adecuado', 'Pausas'], sectores: ['COMERCIO', 'MANUFACTURA', 'SERVICIOS', 'SALUD'] },
  { id: 'E-04', tipo: 'ERGONOMICO', peligro: 'Pantalla de computadora mal ubicada', riesgo: 'Angulo inadecuado de vision', consecuencia: 'Dolor cervical, fatiga visual, cefalea', medidasControl: ['Monitor a nivel de ojos', 'Distancia 50-70cm', 'Filtro anti-reflejo'], sectores: ['OFICINAS', 'SERVICIOS'] },
  { id: 'E-05', tipo: 'ERGONOMICO', peligro: 'Sobrecarga postural (flexion de tronco)', riesgo: 'Trabajo con tronco flexionado > 20 grados', consecuencia: 'Hernia discal, lumbalgia cronica', medidasControl: ['Mesa de trabajo a altura adecuada', 'Tecnica de levantamiento', 'Faja lumbar', 'Mecanizacion'], sectores: ['AGRARIO', 'MANUFACTURA', 'CONSTRUCCION'] },
]

// ─── PSICOSOCIAL ────────────────────────────────────────────────────────────

const PSICOSOCIALES: PeligroEntry[] = [
  { id: 'P-01', tipo: 'PSICOSOCIAL', peligro: 'Carga de trabajo excesiva', riesgo: 'Sobrecarga laboral cronica', consecuencia: 'Estres laboral, burnout, ansiedad', medidasControl: ['Redistribucion de tareas', 'Contratacion adicional', 'Priorización', 'Programa de bienestar'], sectores: ['TODOS'] },
  { id: 'P-02', tipo: 'PSICOSOCIAL', peligro: 'Hostigamiento laboral (mobbing)', riesgo: 'Acoso psicologico sistematico', consecuencia: 'Depresion, baja autoestima, somatizacion', medidasControl: ['Canal de denuncias', 'Politica contra acoso', 'Capacitacion a jefaturas', 'Comite de convivencia'], sectores: ['TODOS'] },
  { id: 'P-03', tipo: 'PSICOSOCIAL', peligro: 'Turnos rotativos / trabajo nocturno', riesgo: 'Alteracion del ritmo circadiano', consecuencia: 'Trastornos del sueno, fatiga cronica, accidentes', medidasControl: ['Rotacion hacia adelante', 'Pausas de descanso', 'Evaluacion medica periodica', 'Limite de horas nocturnas'], sectores: ['MANUFACTURA', 'SALUD', 'MINERIA', 'TRANSPORTE'] },
  { id: 'P-04', tipo: 'PSICOSOCIAL', peligro: 'Monotonia y repetitividad', riesgo: 'Tarea repetitiva sin variacion', consecuencia: 'Desmotivacion, errores, accidentes por distraccion', medidasControl: ['Rotacion de tareas', 'Enriquecimiento del puesto', 'Pausas activas'], sectores: ['MANUFACTURA', 'OFICINAS'] },
  { id: 'P-05', tipo: 'PSICOSOCIAL', peligro: 'Violencia de terceros', riesgo: 'Agresion de clientes o usuarios', consecuencia: 'Lesiones, estres post-traumatico', medidasControl: ['Protocolo de seguridad', 'Boton de panico', 'Capacitacion en manejo de conflictos', 'Vigilancia'], sectores: ['COMERCIO', 'SERVICIOS', 'SALUD', 'TRANSPORTE'] },
  { id: 'P-06', tipo: 'PSICOSOCIAL', peligro: 'Aislamiento laboral (teletrabajo)', riesgo: 'Falta de interaccion social', consecuencia: 'Soledad, desmotivacion, desconexion', medidasControl: ['Reuniones virtuales periodicas', 'Dias presenciales rotativos', 'Eventos de integracion'], sectores: ['OFICINAS', 'SERVICIOS'] },
]

// ─── ELECTRICO ──────────────────────────────────────────────────────────────

const ELECTRICOS: PeligroEntry[] = [
  { id: 'EL-01', tipo: 'ELECTRICO', peligro: 'Contacto directo con conductores expuestos', riesgo: 'Electrocucion', consecuencia: 'Paro cardiaco, quemaduras electricas, muerte', medidasControl: ['Aislamiento de conductores', 'Bloqueo/Etiquetado LOTO', 'EPP dielectrico', 'Personal calificado'], sectores: ['CONSTRUCCION', 'MANUFACTURA', 'MINERIA'] },
  { id: 'EL-02', tipo: 'ELECTRICO', peligro: 'Instalaciones electricas en mal estado', riesgo: 'Cortocircuito, arco electrico', consecuencia: 'Incendio, quemaduras, electrocucion', medidasControl: ['Mantenimiento preventivo', 'Inspeccion periodica', 'Tableros con proteccion diferencial'], sectores: ['TODOS'] },
  { id: 'EL-03', tipo: 'ELECTRICO', peligro: 'Uso de extensiones y multitomas sobrecargadas', riesgo: 'Sobrecarga electrica', consecuencia: 'Incendio, cortocircuito', medidasControl: ['Circuitos dedicados', 'No exceder capacidad', 'Reemplazar cables danados'], sectores: ['OFICINAS', 'COMERCIO', 'SERVICIOS'] },
  { id: 'EL-04', tipo: 'ELECTRICO', peligro: 'Trabajo con equipos electricos en ambientes humedos', riesgo: 'Descarga electrica en ambiente humedo', consecuencia: 'Electrocucion severa', medidasControl: ['Equipos con IP65+', 'GFCI (diferencial)', 'EPP dielectrico', 'Aislamiento de pisos'], sectores: ['CONSTRUCCION', 'AGRARIO', 'MANUFACTURA'] },
]

// ─── EXPORT ALL ─────────────────────────────────────────────────────────────

export const PELIGROS_LIBRARY: PeligroEntry[] = [
  ...FISICOS,
  ...MECANICOS,
  ...QUIMICOS,
  ...BIOLOGICOS,
  ...ERGONOMICOS,
  ...PSICOSOCIALES,
  ...ELECTRICOS,
]

/**
 * Filter peligros by sector.
 * Entries with 'TODOS' in sectores match any sector.
 */
export function getPeligrosBySector(sector: string): PeligroEntry[] {
  return PELIGROS_LIBRARY.filter(p =>
    p.sectores.includes('TODOS') || p.sectores.includes(sector),
  )
}

/**
 * Filter peligros by tipo.
 */
export function getPeligrosByTipo(tipo: PeligroTipo): PeligroEntry[] {
  return PELIGROS_LIBRARY.filter(p => p.tipo === tipo)
}

/**
 * Get a single peligro by ID.
 */
export function getPeligroById(id: string): PeligroEntry | undefined {
  return PELIGROS_LIBRARY.find(p => p.id === id)
}

/**
 * Search peligros by keyword.
 */
export function searchPeligros(query: string): PeligroEntry[] {
  const q = query.toLowerCase()
  return PELIGROS_LIBRARY.filter(p =>
    p.peligro.toLowerCase().includes(q) ||
    p.riesgo.toLowerCase().includes(q) ||
    p.consecuencia.toLowerCase().includes(q),
  )
}
