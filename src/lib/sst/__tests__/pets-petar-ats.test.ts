/**
 * Tests de los validadores PETS / PETAR / ATS.
 *
 * Solo cubrimos la lógica pura de validación. La generación de PDF se prueba
 * end-to-end con Playwright cuando montemos los smoke tests.
 */

import { describe, it, expect } from 'vitest'
import {
  validatePets,
  validatePetar,
  validateAts,
  type PetsInput,
  type PetarInput,
  type AtsInput,
} from '../pets-petar-ats'

const validPets: PetsInput = {
  titulo: 'Operación de montacargas',
  version: 1,
  objetivo: 'Establecer pasos seguros para operación segura de montacargas eléctricos',
  alcance: 'Aplica a todo el personal del almacén central',
  responsables: ['Jefe de almacén'],
  equipos: ['Montacargas eléctrico'],
  epp: ['Casco', 'Chaleco reflectivo'],
  pasos: [
    { numero: 1, descripcion: 'Verificar carga máxima del montacargas' },
  ],
  emergencias: ['Activar alarma'],
  referenciasLegales: ['Ley 29783 Art. 32'],
}

const validPetar: PetarInput = {
  tipo: 'TRABAJO_EN_ALTURAS',
  descripcion: 'Reparación de tubería en techo del galpón a 4m',
  ubicacion: 'Sede principal · Galpón A',
  fechaInicio: new Date('2026-05-10T08:00:00Z'),
  fechaFin: new Date('2026-05-10T12:00:00Z'),
  ejecutores: [{ nombre: 'Juan Pérez', dni: '12345678' }],
  supervisorNombre: 'Carlos Ramos',
  supervisorDni: '87654321',
  peligros: ['Caída de altura'],
  controles: ['Línea de vida anclada'],
  eppVerificado: ['Arnés certificado ANSI Z359'],
  equiposVerificados: [{ equipo: 'Andamio', ultimaInspeccion: '2026-04-01' }],
  contingencia: 'En caso de caída: detener trabajo, llamar al 116',
}

const validAts: AtsInput = {
  tarea: 'Mantenimiento del compresor',
  ejecutores: [{ nombre: 'Pedro Quispe', dni: '11223344' }],
  supervisor: { nombre: 'María Sánchez', dni: '99887766' },
  ubicacion: 'Sala de máquinas',
  fecha: new Date('2026-05-10'),
  pasos: [
    {
      numero: 1,
      paso: 'Apagar el compresor',
      peligros: ['Energía residual'],
      controles: ['LOTO al tablero'],
    },
  ],
  epp: ['Casco', 'Lentes'],
}

describe('validatePets', () => {
  it('input válido pasa sin errores', () => {
    expect(validatePets(validPets)).toEqual([])
  })

  it('rechaza título corto', () => {
    expect(validatePets({ ...validPets, titulo: 'OK' })).toContain('Título muy corto')
  })

  it('rechaza objetivo corto', () => {
    expect(
      validatePets({ ...validPets, objetivo: 'corto' }),
    ).toContain('Objetivo debe tener al menos 10 caracteres')
  })

  it('rechaza pasos vacíos', () => {
    expect(validatePets({ ...validPets, pasos: [] })).toContain('Agrega al menos un paso')
  })

  it('rechaza EPP vacío', () => {
    expect(validatePets({ ...validPets, epp: [] })).toContain('Define el EPP obligatorio')
  })
})

describe('validatePetar', () => {
  it('input válido pasa sin errores', () => {
    expect(validatePetar(validPetar)).toEqual([])
  })

  it('rechaza descripción corta', () => {
    expect(validatePetar({ ...validPetar, descripcion: 'corta' })).toContain(
      'Descripción muy corta',
    )
  })

  it('rechaza sin ejecutores', () => {
    expect(validatePetar({ ...validPetar, ejecutores: [] })).toContain(
      'Indica al menos un ejecutor',
    )
  })

  it('rechaza sin supervisor', () => {
    expect(validatePetar({ ...validPetar, supervisorNombre: '' })).toContain(
      'Indica el supervisor responsable',
    )
  })

  it('rechaza fechaFin antes que fechaInicio', () => {
    expect(
      validatePetar({
        ...validPetar,
        fechaInicio: new Date('2026-05-10T12:00:00Z'),
        fechaFin: new Date('2026-05-10T08:00:00Z'),
      }),
    ).toContain('La fecha fin debe ser posterior al inicio')
  })

  it('rechaza sin peligros', () => {
    expect(validatePetar({ ...validPetar, peligros: [] })).toContain(
      'Lista los peligros identificados',
    )
  })

  it('rechaza sin controles', () => {
    expect(validatePetar({ ...validPetar, controles: [] })).toContain(
      'Lista los controles aplicados',
    )
  })
})

describe('validateAts', () => {
  it('input válido pasa sin errores', () => {
    expect(validateAts(validAts)).toEqual([])
  })

  it('rechaza tarea corta', () => {
    expect(validateAts({ ...validAts, tarea: 'abc' })).toContain(
      'Describe la tarea con más detalle',
    )
  })

  it('rechaza sin ejecutores', () => {
    expect(validateAts({ ...validAts, ejecutores: [] })).toContain(
      'Lista al menos un ejecutor',
    )
  })

  it('rechaza sin pasos', () => {
    expect(validateAts({ ...validAts, pasos: [] })).toContain('Agrega al menos un paso')
  })
})
