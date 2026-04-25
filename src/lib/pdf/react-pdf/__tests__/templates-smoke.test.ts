/**
 * Smoke tests para los 5 templates @react-pdf/renderer del Sprint 3.
 *
 * Solo validan que el componente se construye sin throw (i.e. el TSX y los
 * tipos están bien). El renderizado a PDF real corre en integration tests
 * separados con `pdf` de @react-pdf — acá basta la estructura.
 */

import { LegajoIndividualPDF } from '../legajo-individual'
import { DiagnosticoResultadoPDF } from '../diagnostico-resultado'
import { SimulacroActaPDF } from '../simulacro-acta'
import { PayrollMonthlyPDF } from '../payroll-monthly'
import { DenunciasAnualPDF } from '../denuncias-anual'

describe('react-pdf templates — smoke', () => {
  test('LegajoIndividualPDF se construye sin error', () => {
    const elem = LegajoIndividualPDF({
      data: {
        org: { name: 'ACME', razonSocial: 'ACME S.A.C.', ruc: '20123456789', sector: 'Servicios', sizeRange: '11-50' },
        worker: {
          fullName: 'Juan Pérez',
          dni: '12345678',
          position: 'Asistente',
          department: 'RRHH',
          regimenLaboral: 'GENERAL',
          fechaIngreso: new Date('2024-01-15'),
        },
        legajoScore: 85,
        totalDocs: 18,
        docsCompletos: 15,
        docsVencidos: 1,
        docsFaltantes: 2,
        documentos: [
          {
            category: 'INGRESO',
            documento: 'Contrato de trabajo',
            estado: 'COMPLETO',
            fechaSubida: '2024-01-15',
            fechaVencimiento: null,
            baseLegal: 'D.Leg. 728',
          },
        ],
      },
    })
    expect(elem).toBeDefined()
    expect(elem.type).toBeDefined()
  })

  test('DiagnosticoResultadoPDF se construye sin error', () => {
    const elem = DiagnosticoResultadoPDF({
      data: {
        org: { name: 'ACME', razonSocial: 'ACME', ruc: null, sector: null, sizeRange: null },
        tipo: 'FULL',
        scoreGlobal: 72,
        multaRiesgoTotal: 28000,
        fechaCompletado: new Date(),
        scorePorArea: [
          { area: 'Contratos', score: 80, weight: 25, pendientes: 1, multa: 5000 },
        ],
        topRiesgos: [
          {
            titulo: 'Sin reglamento interno',
            base: 'D.S. 039-91-TR',
            multa: 18000,
            accion: 'Generar y publicar RIT',
            plazo: '30d',
          },
        ],
        preguntasRespondidas: 135,
      },
    })
    expect(elem).toBeDefined()
  })

  test('SimulacroActaPDF se construye sin error', () => {
    const elem = SimulacroActaPDF({
      data: {
        org: { name: 'ACME', razonSocial: 'ACME', ruc: null, sector: null, sizeRange: null },
        fechaSimulacro: new Date(),
        inspectorVirtual: 'COMPLY360 — Inspector Virtual',
        duracionMin: 25,
        plazoSubsanacion: 10,
        hallazgos: [
          {
            nro: 1,
            tipo: 'GRAVE',
            descripcion: 'No exhibe planilla electrónica',
            baseLegal: 'D.S. 018-2007-TR',
            documentoSolicitado: 'PLAME',
            encontrado: false,
            observacion: '',
          },
        ],
        recomendaciones: ['Subsanar antes de 10 días'],
      },
    })
    expect(elem).toBeDefined()
  })

  test('PayrollMonthlyPDF se construye sin error', () => {
    const elem = PayrollMonthlyPDF({
      data: {
        org: { name: 'ACME', razonSocial: 'ACME', ruc: null, sector: null, sizeRange: null },
        periodo: 'Abril 2026',
        totalTrabajadores: 12,
        totalDevengado: 36000,
        totalDescuentos: 4500,
        totalAportesEmpleador: 3200,
        totalNetoPagado: 31500,
        trabajadores: [
          {
            nombre: 'Juan Pérez',
            dni: '12345678',
            cargo: 'Analista',
            regimen: 'GENERAL',
            sueldoBruto: 3000,
            descuentos: 350,
            aportes: 270,
            netoPagar: 2650,
          },
        ],
        desgloseRegimen: [
          { regimen: 'GENERAL', trabajadores: 10, totalBruto: 30000, totalNeto: 26500 },
        ],
      },
    })
    expect(elem).toBeDefined()
  })

  test('DenunciasAnualPDF se construye sin error', () => {
    const elem = DenunciasAnualPDF({
      data: {
        org: { name: 'ACME', razonSocial: 'ACME', ruc: null, sector: null, sizeRange: null },
        anio: 2026,
        totalDenuncias: 4,
        porTipo: [{ tipo: 'HOSTIGAMIENTO_SEXUAL', count: 1 }, { tipo: 'ACOSO_LABORAL', count: 3 }],
        porEstado: [{ estado: 'RESOLVED', count: 3 }, { estado: 'UNDER_REVIEW', count: 1 }],
        tiempoMedioResolucionDias: 22,
        porcentajeAnonimas: 75,
        medidasProteccionAplicadas: 2,
        cumplimientoPlazoLegal: 100,
        lineaBaseLegal: 'Ley 27942 — D.S. 014-2019-MIMP',
      },
    })
    expect(elem).toBeDefined()
  })
})
