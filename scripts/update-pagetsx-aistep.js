const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/app/dashboard/contratos/nuevo/page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Update Step type
content = content.replace(
  "type Step = 'select' | 'form' | 'preview' | 'review'",
  "type Step = 'select' | 'ai-generate' | 'form' | 'preview' | 'review'"
);

// 2. Remove showAiModal state completely
content = content.replace(/  const \[showAiModal, setShowAiModal\] = useState\(false\)\n/, '');

// 3. Update handleSelectTemplate
const oldHandleSelect = '  const handleSelectTemplate = (template: typeof TEMPLATE_OPTIONS[0]) => {\\n    if (template.isAi) {\\n      setShowAiModal(true)\\n      return\\n    }';
const newHandleSelect = '  const handleSelectTemplate = (template: typeof TEMPLATE_OPTIONS[0]) => {\\n    if (template.isAi) {\\n      setStep(\\'ai-generate\\')\\n      setSelectedTemplate(null)\\n      return\\n    }';
content = content.replace('  const handleSelectTemplate = (template: typeof TEMPLATE_OPTIONS[0]) => {\n    if (template.isAi) {\n      setShowAiModal(true)\n      return\n    }', '  const handleSelectTemplate = (template: typeof TEMPLATE_OPTIONS[0]) => {\n    if (template.isAi) {\n      setStep(\'ai-generate\')\n      setSelectedTemplate(null)\n      return\n    }');

// 4. Update handleResetAi
const oldResetAi = '  const handleResetAi = () => {\n    setShowAiModal(false)\n    setAiDescription(\'\')\n    setAiContract(null)\n    setAiError(null)\n    setAiSavedId(null)\n    setModalidad(\'\')\n    setCargo(\'\')\n    setRemuneracion(\'\')\n    setHorario(\'\')\n  }';
const newResetAi = '  const handleResetAi = () => {\n    setStep(\'select\')\n    setAiDescription(\'\')\n    setAiContract(null)\n    setAiError(null)\n    setAiSavedId(null)\n    setModalidad(\'\')\n    setCargo(\'\')\n    setRemuneracion(\'\')\n    setHorario(\'\')\n  }';
content = content.replace(oldResetAi, newResetAi);

// 5. Replace the massive 600 line block!
const lines = content.split('\n');
const startMarker = '{/* AI Generation Modal */}';
const endMarker = '{/* STEP: Form */}';

const startIndex = lines.findIndex(l => l.includes(startMarker));
const endIndex = lines.findIndex(l => l.includes(endMarker));

if (startIndex !== -1 && endIndex !== -1) {
  const replacementJSX = \`      {/* AI Generation Step */}
      {step === 'ai-generate' && (
        <AiStep 
          showAiModal={true}
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
        />
      )}
\`;
  lines.splice(startIndex, endIndex - startIndex, replacementJSX);
  
  // add import
  const importsIndex = lines.findIndex(l => l.includes('import { ContractPreview }'));
  if (importsIndex !== -1) {
    lines.splice(importsIndex + 1, 0, "import { AiStep } from './_components/ai-modal'");
  } else {
    lines.splice(0, 0, "import { AiStep } from './_components/ai-modal'");
  }

  fs.writeFileSync(pagePath, lines.join('\\n'), 'utf8');
  console.log('page.tsx perfectly updated!');
} else {
  console.error('Markers not found!');
  process.exit(1);
}
