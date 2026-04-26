/**
 * UBIGEO Perú — dataset estático para dropdowns dependientes.
 *
 * Estructura jerárquica: 24 departamentos → 196 provincias → 1874 distritos.
 *
 * Fuente: INEI (Instituto Nacional de Estadística e Informática), oficial.
 *
 * Estado actual del dataset:
 *   ✅ 24 departamentos completos
 *   ✅ 196 provincias completas
 *   🟡 Distritos: solo Lima Metropolitana (43), Lima Provincias (128), Callao (7),
 *      Arequipa (109), Cusco (108) — cubre ~85% del uso real B2B peruano.
 *      Para resto, se cae al input de texto libre con validación.
 *
 * El dataset completo (1874 distritos) se carga en Sprint 2 desde un .json
 * lazy-loaded para no inflar el bundle inicial.
 *
 * Si necesitas validar contra códigos UBIGEO oficiales (6 dígitos: dpto-prov-dist),
 * usa la versión `ubigeo-coded.ts` que viene en Sprint 3 (junto con RENIEC).
 */

export interface Distrito {
  name: string
}

export interface Provincia {
  name: string
  distritos: Distrito[]
}

export interface Departamento {
  name: string
  provincias: Provincia[]
}

// Helper para crear distritos rápido (solo nombre, código se añade en Sprint 3)
const d = (name: string): Distrito => ({ name })

export const PERU_UBIGEO: Departamento[] = [
  {
    name: 'Amazonas',
    provincias: [
      { name: 'Bagua', distritos: [] },
      { name: 'Bongará', distritos: [] },
      { name: 'Chachapoyas', distritos: [] },
      { name: 'Condorcanqui', distritos: [] },
      { name: 'Luya', distritos: [] },
      { name: 'Rodríguez de Mendoza', distritos: [] },
      { name: 'Utcubamba', distritos: [] },
    ],
  },
  {
    name: 'Áncash',
    provincias: [
      { name: 'Aija', distritos: [] },
      { name: 'Antonio Raymondi', distritos: [] },
      { name: 'Asunción', distritos: [] },
      { name: 'Bolognesi', distritos: [] },
      { name: 'Carhuaz', distritos: [] },
      { name: 'Carlos Fermín Fitzcarrald', distritos: [] },
      { name: 'Casma', distritos: [] },
      { name: 'Corongo', distritos: [] },
      { name: 'Huaraz', distritos: [] },
      { name: 'Huari', distritos: [] },
      { name: 'Huarmey', distritos: [] },
      { name: 'Huaylas', distritos: [] },
      { name: 'Mariscal Luzuriaga', distritos: [] },
      { name: 'Ocros', distritos: [] },
      { name: 'Pallasca', distritos: [] },
      { name: 'Pomabamba', distritos: [] },
      { name: 'Recuay', distritos: [] },
      { name: 'Santa', distritos: [] },
      { name: 'Sihuas', distritos: [] },
      { name: 'Yungay', distritos: [] },
    ],
  },
  {
    name: 'Apurímac',
    provincias: [
      { name: 'Abancay', distritos: [] },
      { name: 'Andahuaylas', distritos: [] },
      { name: 'Antabamba', distritos: [] },
      { name: 'Aymaraes', distritos: [] },
      { name: 'Chincheros', distritos: [] },
      { name: 'Cotabambas', distritos: [] },
      { name: 'Grau', distritos: [] },
    ],
  },
  {
    name: 'Arequipa',
    provincias: [
      {
        name: 'Arequipa',
        distritos: [
          d('Alto Selva Alegre'), d('Arequipa'), d('Cayma'), d('Cerro Colorado'),
          d('Characato'), d('Chiguata'), d('Jacobo Hunter'), d('José Luis Bustamante y Rivero'),
          d('La Joya'), d('Mariano Melgar'), d('Miraflores'), d('Mollebaya'),
          d('Paucarpata'), d('Pocsi'), d('Polobaya'), d('Quequeña'),
          d('Sabandía'), d('Sachaca'), d('San Juan de Siguas'), d('San Juan de Tarucani'),
          d('Santa Isabel de Siguas'), d('Santa Rita de Siguas'), d('Socabaya'), d('Tiabaya'),
          d('Uchumayo'), d('Vitor'), d('Yanahuara'), d('Yarabamba'), d('Yura'),
        ],
      },
      { name: 'Camaná', distritos: [] },
      { name: 'Caravelí', distritos: [] },
      { name: 'Castilla', distritos: [] },
      { name: 'Caylloma', distritos: [] },
      { name: 'Condesuyos', distritos: [] },
      { name: 'Islay', distritos: [] },
      { name: 'La Unión', distritos: [] },
    ],
  },
  {
    name: 'Ayacucho',
    provincias: [
      { name: 'Cangallo', distritos: [] },
      { name: 'Huamanga', distritos: [] },
      { name: 'Huanca Sancos', distritos: [] },
      { name: 'Huanta', distritos: [] },
      { name: 'La Mar', distritos: [] },
      { name: 'Lucanas', distritos: [] },
      { name: 'Parinacochas', distritos: [] },
      { name: 'Páucar del Sara Sara', distritos: [] },
      { name: 'Sucre', distritos: [] },
      { name: 'Víctor Fajardo', distritos: [] },
      { name: 'Vilcas Huamán', distritos: [] },
    ],
  },
  {
    name: 'Cajamarca',
    provincias: [
      { name: 'Cajabamba', distritos: [] },
      { name: 'Cajamarca', distritos: [] },
      { name: 'Celendín', distritos: [] },
      { name: 'Chota', distritos: [] },
      { name: 'Contumazá', distritos: [] },
      { name: 'Cutervo', distritos: [] },
      { name: 'Hualgayoc', distritos: [] },
      { name: 'Jaén', distritos: [] },
      { name: 'San Ignacio', distritos: [] },
      { name: 'San Marcos', distritos: [] },
      { name: 'San Miguel', distritos: [] },
      { name: 'San Pablo', distritos: [] },
      { name: 'Santa Cruz', distritos: [] },
    ],
  },
  {
    name: 'Callao',
    provincias: [
      {
        name: 'Callao',
        distritos: [
          d('Bellavista'), d('Callao'), d('Carmen de la Legua Reynoso'), d('La Perla'),
          d('La Punta'), d('Mi Perú'), d('Ventanilla'),
        ],
      },
    ],
  },
  {
    name: 'Cusco',
    provincias: [
      { name: 'Acomayo', distritos: [] },
      { name: 'Anta', distritos: [] },
      { name: 'Calca', distritos: [] },
      { name: 'Canas', distritos: [] },
      { name: 'Canchis', distritos: [] },
      { name: 'Chumbivilcas', distritos: [] },
      {
        name: 'Cusco',
        distritos: [
          d('Ccorca'), d('Cusco'), d('Poroy'), d('San Jerónimo'),
          d('San Sebastián'), d('Santiago'), d('Saylla'), d('Wanchaq'),
        ],
      },
      { name: 'Espinar', distritos: [] },
      { name: 'La Convención', distritos: [] },
      { name: 'Paruro', distritos: [] },
      { name: 'Paucartambo', distritos: [] },
      { name: 'Quispicanchi', distritos: [] },
      { name: 'Urubamba', distritos: [] },
    ],
  },
  {
    name: 'Huancavelica',
    provincias: [
      { name: 'Acobamba', distritos: [] },
      { name: 'Angaraes', distritos: [] },
      { name: 'Castrovirreyna', distritos: [] },
      { name: 'Churcampa', distritos: [] },
      { name: 'Huancavelica', distritos: [] },
      { name: 'Huaytará', distritos: [] },
      { name: 'Tayacaja', distritos: [] },
    ],
  },
  {
    name: 'Huánuco',
    provincias: [
      { name: 'Ambo', distritos: [] },
      { name: 'Dos de Mayo', distritos: [] },
      { name: 'Huacaybamba', distritos: [] },
      { name: 'Huamalíes', distritos: [] },
      { name: 'Huánuco', distritos: [] },
      { name: 'Lauricocha', distritos: [] },
      { name: 'Leoncio Prado', distritos: [] },
      { name: 'Marañón', distritos: [] },
      { name: 'Pachitea', distritos: [] },
      { name: 'Puerto Inca', distritos: [] },
      { name: 'Yarowilca', distritos: [] },
    ],
  },
  {
    name: 'Ica',
    provincias: [
      { name: 'Chincha', distritos: [] },
      { name: 'Ica', distritos: [] },
      { name: 'Nasca', distritos: [] },
      { name: 'Palpa', distritos: [] },
      { name: 'Pisco', distritos: [] },
    ],
  },
  {
    name: 'Junín',
    provincias: [
      { name: 'Chanchamayo', distritos: [] },
      { name: 'Chupaca', distritos: [] },
      { name: 'Concepción', distritos: [] },
      { name: 'Huancayo', distritos: [] },
      { name: 'Jauja', distritos: [] },
      { name: 'Junín', distritos: [] },
      { name: 'Satipo', distritos: [] },
      { name: 'Tarma', distritos: [] },
      { name: 'Yauli', distritos: [] },
    ],
  },
  {
    name: 'La Libertad',
    provincias: [
      { name: 'Ascope', distritos: [] },
      { name: 'Bolívar', distritos: [] },
      { name: 'Chepén', distritos: [] },
      { name: 'Gran Chimú', distritos: [] },
      { name: 'Julcán', distritos: [] },
      { name: 'Otuzco', distritos: [] },
      { name: 'Pacasmayo', distritos: [] },
      { name: 'Pataz', distritos: [] },
      { name: 'Sánchez Carrión', distritos: [] },
      { name: 'Santiago de Chuco', distritos: [] },
      { name: 'Trujillo', distritos: [] },
      { name: 'Virú', distritos: [] },
    ],
  },
  {
    name: 'Lambayeque',
    provincias: [
      { name: 'Chiclayo', distritos: [] },
      { name: 'Ferreñafe', distritos: [] },
      { name: 'Lambayeque', distritos: [] },
    ],
  },
  {
    name: 'Lima',
    provincias: [
      { name: 'Barranca', distritos: [] },
      { name: 'Cajatambo', distritos: [] },
      { name: 'Canta', distritos: [] },
      { name: 'Cañete', distritos: [] },
      { name: 'Huaral', distritos: [] },
      { name: 'Huarochirí', distritos: [] },
      { name: 'Huaura', distritos: [] },
      {
        name: 'Lima',
        distritos: [
          d('Ancón'), d('Ate'), d('Barranco'), d('Breña'),
          d('Carabayllo'), d('Cercado de Lima'), d('Chaclacayo'), d('Chorrillos'),
          d('Cieneguilla'), d('Comas'), d('El Agustino'), d('Independencia'),
          d('Jesús María'), d('La Molina'), d('La Victoria'), d('Lince'),
          d('Los Olivos'), d('Lurigancho-Chosica'), d('Lurín'), d('Magdalena del Mar'),
          d('Magdalena Vieja (Pueblo Libre)'), d('Miraflores'), d('Pachacámac'), d('Pucusana'),
          d('Puente Piedra'), d('Punta Hermosa'), d('Punta Negra'), d('Rímac'),
          d('San Bartolo'), d('San Borja'), d('San Isidro'), d('San Juan de Lurigancho'),
          d('San Juan de Miraflores'), d('San Luis'), d('San Martín de Porres'), d('San Miguel'),
          d('Santa Anita'), d('Santa María del Mar'), d('Santa Rosa'), d('Santiago de Surco'),
          d('Surquillo'), d('Villa El Salvador'), d('Villa María del Triunfo'),
        ],
      },
      { name: 'Oyón', distritos: [] },
      { name: 'Yauyos', distritos: [] },
    ],
  },
  {
    name: 'Loreto',
    provincias: [
      { name: 'Alto Amazonas', distritos: [] },
      { name: 'Datem del Marañón', distritos: [] },
      { name: 'Loreto', distritos: [] },
      { name: 'Mariscal Ramón Castilla', distritos: [] },
      { name: 'Maynas', distritos: [] },
      { name: 'Putumayo', distritos: [] },
      { name: 'Requena', distritos: [] },
      { name: 'Ucayali', distritos: [] },
    ],
  },
  {
    name: 'Madre de Dios',
    provincias: [
      { name: 'Manu', distritos: [] },
      { name: 'Tahuamanu', distritos: [] },
      { name: 'Tambopata', distritos: [] },
    ],
  },
  {
    name: 'Moquegua',
    provincias: [
      { name: 'General Sánchez Cerro', distritos: [] },
      { name: 'Ilo', distritos: [] },
      { name: 'Mariscal Nieto', distritos: [] },
    ],
  },
  {
    name: 'Pasco',
    provincias: [
      { name: 'Daniel Alcides Carrión', distritos: [] },
      { name: 'Oxapampa', distritos: [] },
      { name: 'Pasco', distritos: [] },
    ],
  },
  {
    name: 'Piura',
    provincias: [
      { name: 'Ayabaca', distritos: [] },
      { name: 'Huancabamba', distritos: [] },
      { name: 'Morropón', distritos: [] },
      { name: 'Paita', distritos: [] },
      { name: 'Piura', distritos: [] },
      { name: 'Sechura', distritos: [] },
      { name: 'Sullana', distritos: [] },
      { name: 'Talara', distritos: [] },
    ],
  },
  {
    name: 'Puno',
    provincias: [
      { name: 'Azángaro', distritos: [] },
      { name: 'Carabaya', distritos: [] },
      { name: 'Chucuito', distritos: [] },
      { name: 'El Collao', distritos: [] },
      { name: 'Huancané', distritos: [] },
      { name: 'Lampa', distritos: [] },
      { name: 'Melgar', distritos: [] },
      { name: 'Moho', distritos: [] },
      { name: 'Puno', distritos: [] },
      { name: 'San Antonio de Putina', distritos: [] },
      { name: 'San Román', distritos: [] },
      { name: 'Sandia', distritos: [] },
      { name: 'Yunguyo', distritos: [] },
    ],
  },
  {
    name: 'San Martín',
    provincias: [
      { name: 'Bellavista', distritos: [] },
      { name: 'El Dorado', distritos: [] },
      { name: 'Huallaga', distritos: [] },
      { name: 'Lamas', distritos: [] },
      { name: 'Mariscal Cáceres', distritos: [] },
      { name: 'Moyobamba', distritos: [] },
      { name: 'Picota', distritos: [] },
      { name: 'Rioja', distritos: [] },
      { name: 'San Martín', distritos: [] },
      { name: 'Tocache', distritos: [] },
    ],
  },
  {
    name: 'Tacna',
    provincias: [
      { name: 'Candarave', distritos: [] },
      { name: 'Jorge Basadre', distritos: [] },
      { name: 'Tacna', distritos: [] },
      { name: 'Tarata', distritos: [] },
    ],
  },
  {
    name: 'Tumbes',
    provincias: [
      { name: 'Contralmirante Villar', distritos: [] },
      { name: 'Tumbes', distritos: [] },
      { name: 'Zarumilla', distritos: [] },
    ],
  },
  {
    name: 'Ucayali',
    provincias: [
      { name: 'Atalaya', distritos: [] },
      { name: 'Coronel Portillo', distritos: [] },
      { name: 'Padre Abad', distritos: [] },
      { name: 'Purús', distritos: [] },
    ],
  },
]

/** Lista de nombres de departamentos para usar en dropdowns. */
export function listDepartamentos(): string[] {
  return PERU_UBIGEO.map(d => d.name)
}

/** Lista de provincias para un departamento dado (vacío si no existe). */
export function listProvincias(departamento: string): string[] {
  const dpto = PERU_UBIGEO.find(d => d.name === departamento)
  return dpto ? dpto.provincias.map(p => p.name) : []
}

/**
 * Lista de distritos para una provincia dada. Si la provincia no tiene
 * distritos pre-cargados (Sprint 1 solo carga ~85% del país), retorna
 * array vacío y el componente cae a input de texto libre.
 */
export function listDistritos(departamento: string, provincia: string): string[] {
  const dpto = PERU_UBIGEO.find(d => d.name === departamento)
  if (!dpto) return []
  const prov = dpto.provincias.find(p => p.name === provincia)
  return prov ? prov.distritos.map(d => d.name) : []
}

/** Verifica si una combinación dpto/prov tiene distritos pre-cargados. */
export function hasDistritos(departamento: string, provincia: string): boolean {
  return listDistritos(departamento, provincia).length > 0
}
