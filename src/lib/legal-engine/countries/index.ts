// =============================================================================
// COMPLY360 - Multi-Country Legal Constants Framework
// Framework de constantes legales multi-pais para expansion LATAM
// =============================================================================

export interface CountryConfig {
  code: string;            // ISO 3166-1 alpha-2
  name: string;
  currency: { code: string; symbol: string; decimals: number };
  taxId: { name: string; format: string; regex: RegExp };
  minimumWage: number;
  taxUnit: { name: string; value: number };
  socialSecurity: {
    employer: number;      // percentage
    employee: number;      // percentage
    healthInsurance: number;
  };
  pensionSystem: {
    types: string[];
    defaultRate: number;
  };
  laborRegimes: string[];
  holidays: { date: string; name: string }[];
  workWeekHours: number;
  overtimeRates: { first: number; second: number };
  severanceFormula: string;
  gratificationMonths: number[];
  vacationDays: number;
  probationPeriod: number; // in months
  legalReferences: { code: string; name: string }[];
}

// =============================================================================
// PERU - Configuracion completa 2026
// =============================================================================
export const PERU_CONFIG: CountryConfig = {
  code: 'PE',
  name: 'Peru',
  currency: { code: 'PEN', symbol: 'S/', decimals: 2 },
  taxId: {
    name: 'RUC',
    format: '20XXXXXXXXX (juridica) / 10XXXXXXXXX (natural)',
    regex: /^(10|15|17|20)\d{9}$/,
  },
  minimumWage: 1130,
  taxUnit: { name: 'UIT', value: 5500 },
  socialSecurity: {
    employer: 9.0,         // EsSalud
    employee: 0,
    healthInsurance: 9.0,  // EsSalud a cargo del empleador
  },
  pensionSystem: {
    types: ['AFP', 'ONP'],
    defaultRate: 13.0,     // ONP 13%, AFP ~12.8-13.5% segun administradora
  },
  laborRegimes: [
    'General',
    'Microempresa',
    'Pequena Empresa',
    'Agrario',
    'Construccion Civil',
    'Minero',
    'Hogar',
    'Exportacion No Tradicional',
    'CAS (Contrato Administrativo de Servicios)',
  ],
  holidays: [
    { date: '01-01', name: 'Ano Nuevo' },
    { date: '04-17', name: 'Jueves Santo' },
    { date: '04-18', name: 'Viernes Santo' },
    { date: '05-01', name: 'Dia del Trabajo' },
    { date: '06-07', name: 'Batalla de Arica' },
    { date: '06-29', name: 'San Pedro y San Pablo' },
    { date: '07-23', name: 'Dia de la Fuerza Aerea' },
    { date: '07-28', name: 'Fiestas Patrias' },
    { date: '07-29', name: 'Fiestas Patrias' },
    { date: '08-06', name: 'Batalla de Junin' },
    { date: '08-30', name: 'Santa Rosa de Lima' },
    { date: '10-08', name: 'Combate de Angamos' },
    { date: '11-01', name: 'Dia de Todos los Santos' },
    { date: '12-08', name: 'Inmaculada Concepcion' },
    { date: '12-09', name: 'Batalla de Ayacucho' },
    { date: '12-25', name: 'Navidad' },
  ],
  workWeekHours: 48,
  overtimeRates: { first: 1.25, second: 1.35 },  // primeras 2h: 25%, restantes: 35%
  severanceFormula: 'CTS: 1 remuneracion mensual por cada ano de servicio (deposito semestral mayo/noviembre). Indemnizacion por despido arbitrario: 1.5 remuneraciones por ano, tope 12 remuneraciones.',
  gratificationMonths: [7, 12],  // Julio y Diciembre
  vacationDays: 30,
  probationPeriod: 3,
  legalReferences: [
    { code: 'DL-728', name: 'Ley de Productividad y Competitividad Laboral' },
    { code: 'DS-003-97-TR', name: 'TUO del DL 728' },
    { code: 'DL-892', name: 'Participacion en las Utilidades' },
    { code: 'Ley-29351', name: 'Ley que reduce costos laborales - Gratificaciones' },
    { code: 'DS-001-97-TR', name: 'Ley de CTS' },
    { code: 'DL-713', name: 'Descansos remunerados' },
    { code: 'Ley-30709', name: 'Ley que prohibe la discriminacion remunerativa' },
    { code: 'Ley-28806', name: 'Ley General de Inspeccion del Trabajo' },
    { code: 'Ley-29783', name: 'Ley de Seguridad y Salud en el Trabajo' },
  ],
};

// =============================================================================
// COLOMBIA - Configuracion completa 2026
// =============================================================================
export const COLOMBIA_CONFIG: CountryConfig = {
  code: 'CO',
  name: 'Colombia',
  currency: { code: 'COP', symbol: '$', decimals: 0 },
  taxId: {
    name: 'NIT',
    format: 'XXXXXXXXX-D (9 digitos + digito de verificacion)',
    regex: /^\d{9}-\d{1}$/,
  },
  minimumWage: 1423500,   // SMMLV 2026 estimado
  taxUnit: { name: 'UVT', value: 49799 },  // UVT 2026 estimado
  socialSecurity: {
    employer: 20.5,        // Salud 8.5% + Pension 12%
    employee: 8.0,         // Salud 4% + Pension 4%
    healthInsurance: 12.5, // Total salud: empleador 8.5% + empleado 4%
  },
  pensionSystem: {
    types: ['Colpensiones (RPM)', 'Fondos Privados (RAIS)'],
    defaultRate: 16.0,     // Total: empleador 12% + empleado 4%
  },
  laborRegimes: [
    'Contrato a Termino Indefinido',
    'Contrato a Termino Fijo',
    'Contrato por Obra o Labor',
    'Contrato de Aprendizaje',
    'Contrato Ocasional o Transitorio',
  ],
  holidays: [
    { date: '01-01', name: 'Ano Nuevo' },
    { date: '01-12', name: 'Dia de los Reyes Magos' },
    { date: '03-23', name: 'Dia de San Jose' },
    { date: '04-17', name: 'Jueves Santo' },
    { date: '04-18', name: 'Viernes Santo' },
    { date: '05-01', name: 'Dia del Trabajo' },
    { date: '06-02', name: 'Ascension del Senor' },
    { date: '06-23', name: 'Corpus Christi' },
    { date: '06-30', name: 'Sagrado Corazon de Jesus' },
    { date: '07-20', name: 'Dia de la Independencia' },
    { date: '08-07', name: 'Batalla de Boyaca' },
    { date: '08-18', name: 'Asuncion de la Virgen' },
    { date: '10-13', name: 'Dia de la Raza' },
    { date: '11-03', name: 'Dia de Todos los Santos' },
    { date: '11-17', name: 'Independencia de Cartagena' },
    { date: '12-08', name: 'Inmaculada Concepcion' },
    { date: '12-25', name: 'Navidad' },
  ],
  workWeekHours: 46,       // Reduccion gradual Ley 2101 de 2021, 46h en 2026
  overtimeRates: { first: 1.25, second: 1.75 },  // Diurna 25%, nocturna 75%
  severanceFormula: 'Cesantias: 1 mes de salario por cada ano trabajado, consignacion anual a fondo. Intereses sobre cesantias: 12% anual. Indemnizacion por despido sin justa causa: 30 dias por primer ano + 20 dias por cada ano adicional (salario < 10 SMMLV).',
  gratificationMonths: [6, 12],  // Prima de servicios: junio y diciembre (15 dias cada una)
  vacationDays: 15,       // 15 dias habiles
  probationPeriod: 2,
  legalReferences: [
    { code: 'CST', name: 'Codigo Sustantivo del Trabajo' },
    { code: 'Ley-100-1993', name: 'Sistema de Seguridad Social Integral' },
    { code: 'Ley-1010-2006', name: 'Ley de Acoso Laboral' },
    { code: 'Ley-1562-2012', name: 'Sistema de Riesgos Laborales' },
    { code: 'Ley-2101-2021', name: 'Reduccion de la Jornada Laboral' },
    { code: 'Ley-2191-2022', name: 'Desconexion Laboral' },
    { code: 'Dec-2616-2013', name: 'Cotizacion por semanas' },
  ],
};

// =============================================================================
// CHILE - Configuracion completa 2026
// =============================================================================
export const CHILE_CONFIG: CountryConfig = {
  code: 'CL',
  name: 'Chile',
  currency: { code: 'CLP', symbol: '$', decimals: 0 },
  taxId: {
    name: 'RUT',
    format: 'XX.XXX.XXX-D',
    regex: /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/,
  },
  minimumWage: 510000,    // Sueldo minimo 2026 estimado
  taxUnit: { name: 'UTM', value: 67790 },  // UTM 2026 estimado
  socialSecurity: {
    employer: 5.64,        // Seguro de cesantia 2.4% + SIS 1.53% + mutual ~0.95% + seguro acc. ~0.76%
    employee: 7.0,         // Salud obligatoria 7%
    healthInsurance: 7.0,  // Fonasa/Isapre 7% cargo trabajador
  },
  pensionSystem: {
    types: ['AFP (Administradoras de Fondos de Pensiones)', 'Fonasa', 'Isapre'],
    defaultRate: 12.3,     // AFP cotizacion obligatoria ~10.58% + comision ~1.72% (promedio)
  },
  laborRegimes: [
    'Contrato Indefinido',
    'Contrato a Plazo Fijo',
    'Contrato por Obra o Faena',
    'Contrato de Aprendizaje',
    'Contrato Part-Time',
    'Teletrabajo',
  ],
  holidays: [
    { date: '01-01', name: 'Ano Nuevo' },
    { date: '04-18', name: 'Viernes Santo' },
    { date: '04-19', name: 'Sabado Santo' },
    { date: '05-01', name: 'Dia del Trabajo' },
    { date: '05-21', name: 'Dia de las Glorias Navales' },
    { date: '06-20', name: 'Dia Nacional de los Pueblos Indigenas' },
    { date: '06-29', name: 'San Pedro y San Pablo' },
    { date: '07-16', name: 'Virgen del Carmen' },
    { date: '08-15', name: 'Asuncion de la Virgen' },
    { date: '09-18', name: 'Fiestas Patrias' },
    { date: '09-19', name: 'Dia de las Glorias del Ejercito' },
    { date: '10-12', name: 'Encuentro de Dos Mundos' },
    { date: '10-31', name: 'Dia de las Iglesias Evangelicas' },
    { date: '11-01', name: 'Dia de Todos los Santos' },
    { date: '12-08', name: 'Inmaculada Concepcion' },
    { date: '12-25', name: 'Navidad' },
  ],
  workWeekHours: 40,       // Reduccion gradual Ley 21.561, 40h meta 2028
  overtimeRates: { first: 1.5, second: 1.5 },  // Recargo unico del 50%
  severanceFormula: 'Indemnizacion por anos de servicio: 30 dias de ultima remuneracion mensual por cada ano de servicio, con tope de 330 dias (11 anos). Indemnizacion sustitutiva del aviso previo: 30 dias de remuneracion.',
  gratificationMonths: [],  // Chile no tiene gratificaciones como Peru; tiene gratificacion legal (art. 47-52 CT) proporcional a utilidades
  vacationDays: 15,        // 15 dias habiles
  probationPeriod: 0,      // Chile no contempla periodo de prueba en el Codigo del Trabajo; se usa plazo fijo
  legalReferences: [
    { code: 'CT', name: 'Codigo del Trabajo (DFL 1, 2002)' },
    { code: 'DL-3500', name: 'Sistema de Pensiones AFP' },
    { code: 'Ley-16744', name: 'Seguro contra Accidentes del Trabajo' },
    { code: 'Ley-21561', name: 'Reduccion Jornada Laboral (40 horas)' },
    { code: 'Ley-21327', name: 'Modernizacion de la Direccion del Trabajo' },
    { code: 'Ley-20348', name: 'Igualdad de Remuneraciones' },
    { code: 'Ley-21015', name: 'Inclusion Laboral de Personas con Discapacidad' },
  ],
};

// =============================================================================
// MEXICO - Configuracion completa 2026
// =============================================================================
export const MEXICO_CONFIG: CountryConfig = {
  code: 'MX',
  name: 'Mexico',
  currency: { code: 'MXN', symbol: '$', decimals: 2 },
  taxId: {
    name: 'RFC',
    format: 'XXXX000000XXX (personas morales) / XXXX000000XXXX (personas fisicas)',
    regex: /^[A-Z&]{3,4}\d{6}[A-Z0-9]{3}$/,
  },
  minimumWage: 7468,       // Salario minimo mensual 2026 estimado (zona general ~248.93/dia x 30)
  taxUnit: { name: 'UMA', value: 3428 },   // UMA mensual 2026 estimado (~114.26/dia x 30)
  socialSecurity: {
    employer: 26.5,        // IMSS patronal total aprox (EyM, IV, RT, Guarderias, Retiro, Cesantia, Infonavit)
    employee: 2.775,       // IMSS trabajador (EyM 0.625% + IV 1.775% + Cesantia 0.375%)
    healthInsurance: 1.05, // Cuota IMSS enfermedad y maternidad (obrera)
  },
  pensionSystem: {
    types: ['IMSS (Regimen Obligatorio)', 'ISSSTE', 'Afore'],
    defaultRate: 15.0,     // Aportacion total retiro+cesantia patron+trabajador (reforma 2020 gradual)
  },
  laborRegimes: [
    'Contrato por Tiempo Indeterminado',
    'Contrato por Tiempo Determinado',
    'Contrato por Obra Determinada',
    'Contrato de Capacitacion Inicial',
    'Periodo de Prueba',
    'Subcontratacion de Servicios Especializados',
    'Teletrabajo',
  ],
  holidays: [
    { date: '01-01', name: 'Ano Nuevo' },
    { date: '02-02', name: 'Dia de la Constitucion' },  // Primer lunes de febrero
    { date: '03-16', name: 'Natalicio de Benito Juarez' },  // Tercer lunes de marzo
    { date: '05-01', name: 'Dia del Trabajo' },
    { date: '09-16', name: 'Dia de la Independencia' },
    { date: '11-16', name: 'Dia de la Revolucion' },  // Tercer lunes de noviembre
    { date: '12-01', name: 'Transmision del Poder Ejecutivo (cada 6 anos)' },
    { date: '12-25', name: 'Navidad' },
  ],
  workWeekHours: 48,       // Jornada diurna 8h/dia, 48h/semana
  overtimeRates: { first: 2.0, second: 3.0 },  // Primeras 9h extras/semana: doble, excedentes: triple
  severanceFormula: 'Indemnizacion constitucional (Art. 123 fracc. XXII): 3 meses de salario integrado. Prima de antiguedad: 12 dias de salario por cada ano de servicio (tope 2 UMA diario). 20 dias por ano de servicio en caso de reinstalacion no aceptada.',
  gratificationMonths: [12],  // Aguinaldo: minimo 15 dias de salario, pagado antes del 20 de diciembre
  vacationDays: 18,        // Reforma 2023: primer ano 12 dias + 2 por ano hasta 20, luego +2 cada 5 anos
  probationPeriod: 1,      // Hasta 30 dias (180 dias para puestos directivos/gerenciales)
  legalReferences: [
    { code: 'LFT', name: 'Ley Federal del Trabajo' },
    { code: 'LSS', name: 'Ley del Seguro Social' },
    { code: 'LISR', name: 'Ley del Impuesto sobre la Renta' },
    { code: 'LINFONAVIT', name: 'Ley del Instituto del Fondo Nacional de la Vivienda' },
    { code: 'LSAR', name: 'Ley de los Sistemas de Ahorro para el Retiro' },
    { code: 'NOM-035', name: 'Factores de Riesgo Psicosocial en el Trabajo' },
    { code: 'NOM-037', name: 'Teletrabajo - Condiciones de SST' },
    { code: 'Reforma-Vacaciones-2023', name: 'Reforma de Vacaciones Dignas' },
  ],
};

// =============================================================================
// Paises soportados con flags de disponibilidad
// =============================================================================
export const SUPPORTED_COUNTRIES: {
  code: string;
  name: string;
  available: boolean;
  config: CountryConfig;
}[] = [
  { code: 'PE', name: 'Peru', available: true, config: PERU_CONFIG },
  { code: 'CO', name: 'Colombia', available: false, config: COLOMBIA_CONFIG },
  { code: 'CL', name: 'Chile', available: false, config: CHILE_CONFIG },
  { code: 'MX', name: 'Mexico', available: false, config: MEXICO_CONFIG },
];

// =============================================================================
// Registry interno para busqueda O(1)
// =============================================================================
const countryRegistry = new Map<string, CountryConfig>(
  SUPPORTED_COUNTRIES.map((c) => [c.code, c.config]),
);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Obtiene la configuracion completa de un pais por su codigo ISO 3166-1 alpha-2.
 * @throws Error si el pais no esta registrado.
 */
export function getCountryConfig(code: string): CountryConfig {
  const upper = code.toUpperCase();
  const config = countryRegistry.get(upper);
  if (!config) {
    const valid = SUPPORTED_COUNTRIES.map((c) => c.code).join(', ');
    throw new Error(
      `Pais con codigo "${upper}" no encontrado. Paises registrados: ${valid}`,
    );
  }
  return config;
}

/**
 * Devuelve la lista de paises registrados con su estado de disponibilidad.
 */
export function getSupportedCountries(): {
  code: string;
  name: string;
  available: boolean;
}[] {
  return SUPPORTED_COUNTRIES.map(({ code, name, available }) => ({
    code,
    name,
    available,
  }));
}

/**
 * Formatea un monto numerico segun la moneda del pais indicado.
 * Ejemplo: formatCurrency(1025, 'PE') => "S/ 1,025.00"
 */
export function formatCurrency(amount: number, countryCode: string): string {
  const config = getCountryConfig(countryCode);
  const { code: currencyCode, symbol, decimals } = config.currency;

  // Locale mapping para formato numerico correcto
  const localeMap: Record<string, string> = {
    PE: 'es-PE',
    CO: 'es-CO',
    CL: 'es-CL',
    MX: 'es-MX',
  };

  const locale = localeMap[config.code] ?? 'es';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    // Fallback manual si Intl no soporta la moneda
    const formatted = amount.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${symbol} ${formatted}`;
  }
}
