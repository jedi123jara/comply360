const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/app/dashboard/contratos/nuevo/page.tsx');
const modalPath = path.join(__dirname, '../src/app/dashboard/contratos/nuevo/_components/ai-modal.tsx');

let pageContent = fs.readFileSync(pagePath, 'utf8');
const lines = pageContent.split('\n');

const startMarker = '{/* AI Generation Modal */}';
const endMarker = '{/* STEP: Form */}';

const startIndex = lines.findIndex(l => l.includes(startMarker));
const endIndex = lines.findIndex(l => l.includes(endMarker));

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found');
  process.exit(1);
}

// 1401 to 1971 in zero-indexed is roughly from startIndex to endIndex - 1
const modalJSX = lines.slice(startIndex + 1, endIndex).join('\n');

const modalComponent = `import {
  Wand2, X, Loader2, Check, AlertTriangle, CheckCircle2, ScrollText, FileText, Download
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { WorkerPicker, type WorkerSummary } from '@/components/contracts/worker-picker'
import { CostSummaryPill } from '@/components/contracts/cost-summary-pill'
import { LiveValidationPanel } from '@/components/contracts/live-validation-panel'

export interface AIContractClause {
  numero: number
  titulo: string
  contenido: string
  obligatoria: boolean
  baseLegal?: string
}

export interface AIGeneratedContract {
  generadoPor: 'ai' | 'simulated'
  modelo: string
  generadoAt: string
  tipoDetectado: string
  tituloContrato: string
  resumen: string
  preambulo?: string
  clausulas: AIContractClause[]
  textoCompleto: string
  htmlCompleto: string
  advertenciasLegales: string[]
  baseLegalPrincipal: string
  anexos?: string[]
}

export interface AiModalProps {
  showAiModal: boolean
  aiContract: AIGeneratedContract | null
  aiLoading: boolean
  aiDescription: string
  empRuc: string
  empRucStatus: 'idle' | 'ok' | 'error'
  empRucLoading: boolean
  empRazonSocial: string
  empRepresentante: string
  empDireccion: string
  trabajadorMode: 'picker' | 'manual'
  orgId: string | null
  selectedWorker: WorkerSummary | null
  trabDni: string
  trabDniStatus: 'idle' | 'ok' | 'error'
  trabDniLoading: boolean
  trabNombre: string
  modalidad: string
  periodoPrueba: string
  fechaInicio: string
  fechaFin: string
  causaObjetiva: string
  cargo: string
  jornada: string
  horario: string
  remuneracion: string
  formaPago: string
  beneficios: string
  costoEmpleador: any
  liveValidation: any
  aiError: string | null
  aiSaving: boolean
  aiSavedId: string | null

  handleResetAi: () => void
  setAiDescription: (val: string) => void
  handleRucChange: (val: string) => void
  setEmpRazonSocial: (val: string) => void
  setEmpRepresentante: (val: string) => void
  setEmpDireccion: (val: string) => void
  setTrabajadorMode: (mode: 'picker' | 'manual') => void
  handleSelectWorker: (worker: WorkerSummary) => void
  handleClearWorker: () => void
  handleDniChange: (val: string) => void
  setTrabNombre: (val: string) => void
  setModalidad: (val: string) => void
  setPeriodoPrueba: (val: string) => void
  setFechaInicio: (val: string) => void
  setFechaFin: (val: string) => void
  setCausaObjetiva: (val: string) => void
  setCargo: (val: string) => void
  setJornada: (val: string) => void
  setHorario: (val: string) => void
  setRemuneracion: (val: string) => void
  setFormaPago: (val: string) => void
  setBeneficios: (val: string) => void
  handleGenerateAi: () => void
  setAiContract: (val: AIGeneratedContract | null) => void
  setAiError: (val: string | null) => void
  setAiSavedId: (val: string | null) => void
  handleDownloadAiContract: () => void
}

export function AiModal(props: AiModalProps) {
  const router = useRouter()
  
  // Destructure for easy drop-in compatibility with the extracted JSX
  const {
    showAiModal, aiContract, aiLoading, aiDescription, empRuc, empRucStatus, empRucLoading, 
    empRazonSocial, empRepresentante, empDireccion, trabajadorMode, orgId, selectedWorker,
    trabDni, trabDniStatus, trabDniLoading, trabNombre, modalidad, periodoPrueba, fechaInicio,
    fechaFin, causaObjetiva, cargo, jornada, horario, remuneracion, formaPago, beneficios,
    costoEmpleador, liveValidation, aiError, aiSaving, aiSavedId,
    handleResetAi, setAiDescription, handleRucChange, setEmpRazonSocial, setEmpRepresentante,
    setEmpDireccion, setTrabajadorMode, handleSelectWorker, handleClearWorker, handleDniChange,
    setTrabNombre, setModalidad, setPeriodoPrueba, setFechaInicio, setFechaFin, setCausaObjetiva,
    setCargo, setJornada, setHorario, setRemuneracion, setFormaPago, setBeneficios,
    handleGenerateAi, setAiContract, setAiError, setAiSavedId, handleDownloadAiContract
  } = props;

  if (!showAiModal) return null;

  return (
    <>
${modalJSX}
    </>
  )
}
`;

fs.mkdirSync(path.dirname(modalPath), { recursive: true });
fs.writeFileSync(modalPath, modalComponent, 'utf8');
console.log('AiModal component generated.');

// Replace in page.tsx
const replacementJSX = `      {/* AI Generation Modal */}
      <AiModal 
        showAiModal={showAiModal}
        aiContract={aiContract}
        aiLoading={aiLoading}
        aiDescription={aiDescription}
        empRuc={empRuc}
        empRucStatus={empRucStatus}
        empRucLoading={empRucLoading}
        empRazonSocial={empRazonSocial}
        empRepresentante={empRepresentante}
        empDireccion={empDireccion}
        trabajadorMode={trabajadorMode}
        orgId={orgId}
        selectedWorker={selectedWorker}
        trabDni={trabDni}
        trabDniStatus={trabDniStatus}
        trabDniLoading={trabDniLoading}
        trabNombre={trabNombre}
        modalidad={modalidad}
        periodoPrueba={periodoPrueba}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        causaObjetiva={causaObjetiva}
        cargo={cargo}
        jornada={jornada}
        horario={horario}
        remuneracion={remuneracion}
        formaPago={formaPago}
        beneficios={beneficios}
        costoEmpleador={costoEmpleador}
        liveValidation={liveValidation}
        aiError={aiError}
        aiSaving={aiSaving}
        aiSavedId={aiSavedId}
        handleResetAi={handleResetAi}
        setAiDescription={setAiDescription}
        handleRucChange={handleRucChange}
        setEmpRazonSocial={setEmpRazonSocial}
        setEmpRepresentante={setEmpRepresentante}
        setEmpDireccion={setEmpDireccion}
        setTrabajadorMode={setTrabajadorMode}
        handleSelectWorker={handleSelectWorker}
        handleClearWorker={handleClearWorker}
        handleDniChange={handleDniChange}
        setTrabNombre={setTrabNombre}
        setModalidad={setModalidad}
        setPeriodoPrueba={setPeriodoPrueba}
        setFechaInicio={setFechaInicio}
        setFechaFin={setFechaFin}
        setCausaObjetiva={setCausaObjetiva}
        setCargo={setCargo}
        setJornada={setJornada}
        setHorario={setHorario}
        setRemuneracion={setRemuneracion}
        setFormaPago={setFormaPago}
        setBeneficios={setBeneficios}
        handleGenerateAi={handleGenerateAi}
        setAiContract={setAiContract}
        setAiError={setAiError}
        setAiSavedId={setAiSavedId}
        handleDownloadAiContract={handleDownloadAiContract}
      />`;

lines.splice(startIndex, endIndex - startIndex, replacementJSX);

// Add import at the top
const importsIndex = lines.findIndex(l => l.includes('import { ContractPreview }'));
if (importsIndex !== -1) {
  lines.splice(importsIndex + 1, 0, "import { AiModal } from './_components/ai-modal'");
} else {
  lines.splice(0, 0, "import { AiModal } from './_components/ai-modal'");
}

fs.writeFileSync(pagePath, lines.join('\n'), 'utf8');
console.log('page.tsx updated.');
