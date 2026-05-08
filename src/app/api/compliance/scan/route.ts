import { NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import { scanOrgRisks } from '@/lib/compliance/risk-scanner'

/**
 * GET /api/compliance/scan
 * Ejecuta el escáner completo de riesgos SUNAFIL para la organización.
 * Retorna todos los riesgos detectados con multas estimadas y plan de acción.
 */
export const GET = withPlanGate('diagnostico', async (_req, ctx) => {
  try {
    const report = await scanOrgRisks(ctx.orgId)

    return NextResponse.json({
      ok: true,
      report: {
        orgId: report.orgId,
        scanDate: report.scanDate.toISOString(),
        tipoEmpresa: report.tipoEmpresa,
        totalTrabajadores: report.totalTrabajadores,
        totalMultaSoles: report.totalMultaSoles,
        totalMultaUit: report.totalMultaUit,
        totalMultaConSubsanacionSoles: report.totalMultaConSubsanacionSoles,
        ahorroTotalSoles: report.ahorroTotalSoles,
        resumen: {
          muyGraves: report.resumen.muyGraves,
          graves: report.resumen.graves,
          leves: report.resumen.leves,
          totalRiesgos: report.riesgos.length,
          areasMasRiesgosas: report.resumen.areasMasRiesgosas,
          riesgosCriticosCount: report.resumen.riesgosCriticos.length,
        },
        riesgos: report.riesgos.map(r => ({
          codigo: r.infraccion.codigo,
          categoria: r.infraccion.categoria,
          severidad: r.infraccion.severidad,
          titulo: r.infraccion.titulo,
          descripcion: r.infraccion.descripcion,
          baseLegal: r.infraccion.baseLegal,
          trabajadoresAfectados: r.trabajadoresAfectados,
          multaEstimadaSoles: r.multaEstimadaSoles,
          multaEstimadaUit: r.multaEstimadaUit,
          multaConSubsanacionSoles: r.multaConSubsanacionSoles,
          ahorroSubsanacion: r.ahorroSubsanacion,
          accionInmediata: r.accionInmediata,
          urgencia: r.urgencia,
          prioridadFiscalizacion: r.infraccion.prioridadFiscalizacion,
        })),
      },
    })
  } catch (error) {
    console.error('[COMPLIANCE SCAN] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Error al ejecutar el escaneo de compliance' },
      { status: 500 }
    )
  }
})

