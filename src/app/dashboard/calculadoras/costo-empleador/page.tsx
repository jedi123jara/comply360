import { CostoEmpleadorCalculadora } from '@/components/calculadoras/costo-empleador-form'
import { EncabezadoCalculadora } from '@/components/calculadoras/shared/encabezado'

export default function CostoEmpleadorPage() {
  return (
    <div className="space-y-6">
      <EncabezadoCalculadora calc="costo_empleador" />
      <CostoEmpleadorCalculadora />
    </div>
  )
}
