const fs = require('fs');
const path = require('path');

const modalPath = path.join(__dirname, '../src/app/dashboard/contratos/nuevo/_components/ai-modal.tsx');
let content = fs.readFileSync(modalPath, 'utf8');

// 1. Rename AiModal to AiStep
content = content.replace(/export function AiModal/g, 'export function AiStep');

// 2. Remove "if (!showAiModal) return null;"
content = content.replace(/if \(!showAiModal\) return null;/g, '');

// 3. Replace the outer wrappers
const oldWrapper = '  return (\n    <>\n      {showAiModal && (\n        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-6 overflow-y-auto">\n          <div className="relative w-full max-w-7xl max-h-[95vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">';
          
const newWrapper = '  return (\n    <div className="space-y-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">\n      <div className="relative w-full rounded-2xl bg-white shadow-sm border border-slate-200">';

content = content.replace(oldWrapper, newWrapper);

// 4. Update Header Cancel Button
const oldHeaderCancel = '              <button\n                type="button"\n                onClick={handleResetAi}\n                className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-600"\n                aria-label="Cerrar"\n              >\n                <X className="h-5 w-5" />\n              </button>';

const newHeaderCancel = '              <button\n                type="button"\n                onClick={handleResetAi}\n                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"\n                aria-label="Cancelar y volver"\n              >\n                <X className="h-4 w-4" />\n                Cancelar\n              </button>';
content = content.replace(oldHeaderCancel, newHeaderCancel);

// 5. Remove closing wrappers
const oldEnding = '          </div>\n        </div>\n      )}\n\n    </>\n  )\n}';
const newEnding = '      </div>\n    </div>\n  )\n}';
content = content.replace(oldEnding, newEnding);

fs.writeFileSync(modalPath, content, 'utf8');
console.log('ai-modal.tsx updated to AiStep.');
