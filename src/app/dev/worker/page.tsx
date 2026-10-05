'use client'

import { WorkerProfile } from '@/components/workers/profile'
import type { LegajoDoc, WorkerSummary } from '@/components/workers/profile'
import { PreviewNotice } from '../_preview/preview-notice'

/**
 * /dev/worker — perfil del trabajador (cabecera + pestañas) dentro del shell
 * real del dashboard, con datos de ejemplo.
 *
 * Las pestañas y tarjetas que piden datos a `/api/workers/*` reciben un 503
 * de la API simulada (no hay base), así que muestran su estado vacío o de error.
 */

const MOCK_WORKER: WorkerSummary = {
  id: 'trabajador-ejemplo',
  firstName: 'Juan',
  lastName: 'García López',
  dni: '45612378',
  email: 'juan.garcia@ejemplo.pe',
  phone: '+51 987 654 321',
  position: 'Analista de Operaciones',
  department: 'Operaciones',
  regimenLaboral: 'MYPE Pequeña empresa',
  tipoContrato: 'Plazo fijo',
  fechaIngreso: '2023-03-15',
  status: 'ACTIVE',
  legajoScore: 72,
  sueldoBruto: 2800,
}

const MOCK_DOCS: LegajoDoc[] = [
  { id: 'd1', category: 'INGRESO', title: 'Contrato de trabajo firmado', required: true, status: 'VERIFIED' },
  { id: 'd2', category: 'INGRESO', title: 'DNI vigente', required: true, status: 'VERIFIED' },
  { id: 'd3', category: 'INGRESO', title: 'Certificado de antecedentes policiales', required: true, status: 'MISSING' },
  { id: 'd4', category: 'INGRESO', title: 'CV firmado', required: false, status: 'UPLOADED' },
  { id: 'd5', category: 'VIGENTE', title: 'Última boleta de pago', required: true, status: 'VERIFIED' },
  { id: 'd6', category: 'VIGENTE', title: 'Capacitación anual obligatoria', required: true, status: 'PENDING' },
  {
    id: 'd7',
    category: 'SST',
    title: 'Examen médico ocupacional',
    required: true,
    status: 'EXPIRED',
    expiresAt: '2025-12-01',
  },
  { id: 'd8', category: 'SST', title: 'IPERC individual', required: true, status: 'MISSING' },
  { id: 'd9', category: 'SST', title: 'Entrega de EPP', required: true, status: 'VERIFIED' },
  { id: 'd10', category: 'PREVISIONAL', title: 'Afiliación AFP', required: true, status: 'VERIFIED' },
  { id: 'd11', category: 'PREVISIONAL', title: 'SCTR vigente', required: true, status: 'UPLOADED' },
  { id: 'd12', category: 'PREVISIONAL', title: 'EsSalud Vida', required: false, status: 'MISSING' },
]

export default function DevWorkerPage() {
  return (
    <>
      <PreviewNotice title="Perfil del trabajador">
        Cabecera y pestañas reales del perfil con un trabajador ficticio. Información, Legajo y Beneficios usan
        datos de ejemplo; las pestañas que consultan la base (contratos, remuneraciones, vacaciones, historial)
        muestran su estado vacío o de error porque aquí no hay base de datos.
      </PreviewNotice>
      <WorkerProfile worker={MOCK_WORKER} legajoDocs={MOCK_DOCS} />
    </>
  )
}
