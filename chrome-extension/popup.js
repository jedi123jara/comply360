// COMPLY360 Connector — Popup Script

const statusEl = document.getElementById('status');
const extractBtn = document.getElementById('extractBtn');
const openSunatBtn = document.getElementById('openSunat');
const resultBox = document.getElementById('resultBox');
const serverUrlInput = document.getElementById('serverUrl');

// Load saved server URL
chrome.storage.local.get(['serverUrl'], (result) => {
  if (result.serverUrl) serverUrlInput.value = result.serverUrl;
});

serverUrlInput.addEventListener('change', () => {
  chrome.storage.local.set({ serverUrl: serverUrlInput.value.trim() });
});

openSunatBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm' });
});

// Helper: wait ms
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Helper: navigate tab and wait for load
async function navigateAndWait(tabId, url, ms = 4000) {
  await chrome.tabs.update(tabId, { url });
  await sleep(ms);
}

// ── Main extract button ──
extractBtn.addEventListener('click', async () => {
  extractBtn.disabled = true;
  extractBtn.innerHTML = '&#9696; Extrayendo todo...';
  statusEl.className = 'status info';
  statusEl.innerHTML = 'Paso 1/3: Leyendo pagina actual...';
  resultBox.style.display = 'none';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || !tab.url.includes('sunat.gob.pe')) {
      throw new Error('No estas en una pagina de SUNAT. Abre el portal SOL primero.');
    }

    // Execute extraction in ALL frames (SUNAT uses iframes heavily)
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: extractSunatData,
    });

    // Merge results from all frames
    const data = { companyInfo: null, workers: [], pageUrl: tab.url, pageTitle: '' };
    for (const frame of results) {
      const r = frame?.result;
      if (!r) continue;
      if (r.companyInfo && r.companyInfo.razonSocial && !data.companyInfo) {
        data.companyInfo = r.companyInfo;
      }
      if (r.workers && r.workers.length > 0) {
        data.workers.push(...r.workers);
      }
      if (r.pageTitle) data.pageTitle = r.pageTitle;
    }
    // Deduplicate workers by DNI
    const seenDni = new Set();
    data.workers = data.workers.filter(w => {
      if (seenDni.has(w.dni)) return false;
      seenDni.add(w.dni);
      return true;
    });

    // ── Step 2: Try to navigate to Ficha RUC for more company data ──
    if (!data.companyInfo || !data.companyInfo.estado) {
      try {
        statusEl.innerHTML = 'Paso 2/3: Navegando a Ficha RUC...';
        await navigateAndWait(tab.id, 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias', 3000);
        const fichaResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: extractSunatData,
        });
        for (const frame of fichaResults) {
          const r = frame?.result;
          if (r?.companyInfo?.estado) {
            data.companyInfo = { ...data.companyInfo, ...r.companyInfo };
            break;
          }
        }
      } catch { /* Ficha RUC optional */ }
    }

    // ── Step 3: Navigate back to T-REGISTRO if no workers found ──
    if (data.workers.length === 0) {
      try {
        statusEl.innerHTML = 'Paso 3/3: Buscando trabajadores en T-REGISTRO...';
        await navigateAndWait(tab.id, 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm', 3000);
        const trResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: extractSunatData,
        });
        for (const frame of trResults) {
          const r = frame?.result;
          if (r?.workers?.length > 0) data.workers.push(...r.workers);
        }
        // Deduplicate
        const seen2 = new Set();
        data.workers = data.workers.filter(w => { if (seen2.has(w.dni)) return false; seen2.add(w.dni); return true; });
      } catch { /* T-REGISTRO optional */ }
    }

    if (!data.companyInfo && data.workers.length === 0) {
      throw new Error('No se encontraron datos. Asegurate de estar logueado en SUNAT SOL.');
    }

    // ── Show extracted data immediately (before sending) ──
    statusEl.className = 'status success';
    statusEl.innerHTML = 'Datos extraidos de SUNAT exitosamente.';

    let resultHtml = '<div class="result">';
    if (data.companyInfo) {
      const c = data.companyInfo;
      resultHtml += `
        <div class="result-row"><span class="result-label">RUC:</span><span class="result-value">${c.ruc || '—'}</span></div>
        <div class="result-row"><span class="result-label">Razon Social:</span><span class="result-value">${c.razonSocial || '—'}</span></div>
        <div class="result-row"><span class="result-label">Estado:</span><span class="result-value ${c.estado === 'ACTIVO' ? 'green' : 'red'}">${c.estado || '—'}</span></div>
        <div class="result-row"><span class="result-label">Condicion:</span><span class="result-value">${c.condicion || '—'}</span></div>
        <div class="result-row"><span class="result-label">Direccion:</span><span class="result-value">${c.direccion || '—'}</span></div>
        <div class="result-row"><span class="result-label">Representante:</span><span class="result-value">${c.representanteLegal || '—'}</span></div>
      `;
    }
    if (data.workers && data.workers.length > 0) {
      resultHtml += `
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #21262d;">
          <div class="result-row"><span class="result-label">Trabajadores:</span><span class="result-value green">${data.workers.length}</span></div>
        </div>
      `;
      // Show first 5 workers
      const preview = data.workers.slice(0, 5);
      for (const w of preview) {
        resultHtml += `<div class="result-row"><span class="result-label">${w.dni}</span><span class="result-value">${w.nombres} ${w.apellidos}</span></div>`;
      }
      if (data.workers.length > 5) {
        resultHtml += `<div class="result-row"><span class="result-label">...</span><span class="result-value">y ${data.workers.length - 5} mas</span></div>`;
      }
    }
    resultHtml += '</div>';
    resultBox.innerHTML = resultHtml;
    resultBox.style.display = 'block';

    // ── Now try to send to COMPLY360 ──
    const serverUrl = serverUrlInput.value.trim() || 'http://localhost:3000';

    try {
      const response = await fetch(`${serverUrl}/api/integrations/sunat-sol/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'chrome_extension',
          url: tab.url,
          data: data,
          extractedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        statusEl.innerHTML = 'Datos extraidos y sincronizados con COMPLY360.';

        if (result.sync) {
          resultBox.innerHTML += `
            <div class="result" style="margin-top:8px;">
              <div style="font-size:11px;font-weight:700;color:#8b949e;margin-bottom:4px;">CRUCE CON TU BASE DE DATOS:</div>
              <div class="result-row"><span class="result-label">Coinciden:</span><span class="result-value green">${result.sync.matched}</span></div>
              <div class="result-row"><span class="result-label">No en SUNAT:</span><span class="result-value red">${result.sync.notInSunat}</span></div>
              <div class="result-row"><span class="result-label">Nuevos en SUNAT:</span><span class="result-value yellow">${result.sync.newFromSunat}</span></div>
              ${result.sync.autoRegistered > 0 ? `<div class="result-row" style="margin-top:4px;padding-top:4px;border-top:1px solid #21262d;"><span class="result-label">Auto-registrados:</span><span class="result-value green">${result.sync.autoRegistered} trabajadores creados en COMPLY360</span></div>` : ''}
            </div>
          `;
        }
      } else {
        statusEl.innerHTML += '<br><small style="opacity:0.7">Nota: No se pudo enviar a COMPLY360. Los datos se muestran arriba.</small>';
      }
    } catch (fetchErr) {
      // Server not reachable — still show data
      statusEl.className = 'status warning';
      statusEl.innerHTML = 'Datos extraidos. No se pudo conectar a COMPLY360 (' + serverUrl + '). Verifica que el servidor este corriendo.';
    }

  } catch (err) {
    statusEl.className = 'status error';
    statusEl.innerHTML = err.message || 'Error desconocido';
  } finally {
    extractBtn.disabled = false;
    extractBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Extraer Datos de SUNAT';
  }
});

// ── This function runs IN the SUNAT page context ──
function extractSunatData() {
  const result = {
    companyInfo: null,
    workers: [],
    pageUrl: window.location.href,
    pageTitle: document.title,
  };

  const bodyText = document.body.innerText || '';

  // ── Extract company info ──
  const rucMatch = bodyText.match(/(\d{11})/);
  const welcomeMatch = bodyText.match(/Bienvenido,?\s*([A-Z][^\n]{3,60})/);
  const razonMatch = bodyText.match(/(?:Nombre o Raz[oó]n Social|Raz[oó]n Social)[:\s]*([^\n]+)/i);
  const estadoMatch = bodyText.match(/Estado[:\s]*(ACTIVO|BAJA[A-Z\s]*|SUSPENSION[A-Z\s]*)/i);
  const condicionMatch = bodyText.match(/Condici[oó]n[:\s]*(HABIDO|NO HABIDO|NO HALLADO)/i);
  const direccionMatch = bodyText.match(/(?:Domicilio Fiscal|Direcci[oó]n)[:\s]*([^\n]+)/i);
  const actividadMatch = bodyText.match(/Actividad[:\s]*Econ[oó]mica[:\s]*([^\n]+)/i);
  const representanteMatch = bodyText.match(/Representante[s]?\s*Legal[es]*[:\s]*([^\n]+)/i);

  const companyName = razonMatch?.[1]?.trim() || welcomeMatch?.[1]?.trim() || '';

  if (rucMatch || companyName) {
    result.companyInfo = {
      ruc: rucMatch?.[1] || '',
      razonSocial: companyName,
      estado: estadoMatch?.[1]?.trim() || '',
      condicion: condicionMatch?.[1]?.trim() || '',
      direccion: direccionMatch?.[1]?.trim() || '',
      actividadEconomica: actividadMatch?.[1]?.trim() || '',
      representanteLegal: representanteMatch?.[1]?.trim() || '',
    };
  }

  // ── Extract workers from tables ──
  // SUNAT formats DNI as "L.E / DNI - 48488732" not just "48488732"
  function extractDni(text) {
    // Try exact 8 digits
    if (/^\d{8}$/.test(text)) return text;
    // Try "DNI - 12345678" or "DNI-12345678" or "L.E / DNI - 12345678"
    const m = text.match(/(\d{8})/);
    return m ? m[1] : null;
  }

  const tables = document.querySelectorAll('table');
  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 2) continue;
      const cellTexts = cells.map(c => (c.textContent || '').trim());

      // Find the cell containing a DNI (8 digits, possibly with prefix)
      let dni = null;
      let dniCellIdx = -1;
      for (let i = 0; i < cellTexts.length; i++) {
        const d = extractDni(cellTexts[i]);
        if (d) { dni = d; dniCellIdx = i; break; }
      }
      if (!dni) continue;

      // Get name from remaining cells (longest text that's not the DNI cell)
      const otherTexts = cellTexts
        .filter((t, i) => i !== dniCellIdx && t.length > 2)
        .filter(t => !extractDni(t));

      // Find the name (usually the longest text field)
      const nameParts = otherTexts
        .filter(t => /[A-Za-z]{2,}/.test(t) && !/^(TRA|EMP|PEN|DER|L\.E)/.test(t))
        .sort((a, b) => b.length - a.length);

      const fullName = nameParts[0] || '';
      const nameSplit = fullName.split(/\s+/);
      const apellidos = nameSplit.slice(0, 2).join(' ');
      const nombres = nameSplit.slice(2).join(' ');

      result.workers.push({
        dni: dni,
        apellidos: apellidos,
        nombres: nombres,
        fullName: fullName,
        fechaIngreso: cellTexts.find(t => /\d{2}\/\d{2}\/\d{4}/.test(t)) || null,
        situacion: cellTexts.find(t => /ACTIVO|BAJA|VIGENTE|CESADO/i.test(t)) || 'ACTIVO',
        regimenLaboral: cellTexts.find(t => /GENERAL|MYPE|AGRARIO|CONSTRUCC/i.test(t)) || null,
      });
    }
  }

  // Check iframes (SUNAT uses them heavily)
  try {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) continue;

        // Extract text from iframe for company info
        const iText = doc.body?.innerText || '';
        if (!result.companyInfo && iText.length > 50) {
          const iRuc = iText.match(/(\d{11})/);
          const iName = iText.match(/Bienvenido,?\s*([A-Z][^\n]{3,60})/);
          if (iRuc || iName) {
            result.companyInfo = {
              ruc: iRuc?.[1] || '',
              razonSocial: iName?.[1]?.trim() || '',
              estado: '', condicion: '', direccion: '',
              actividadEconomica: '', representanteLegal: '',
            };
          }
        }

        // Extract workers from iframe tables
        const iTables = doc.querySelectorAll('table');
        for (const table of iTables) {
          const rows = table.querySelectorAll('tr');
          for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('td'));
            const cellTexts = cells.map(c => (c.textContent || '').trim());
            const dniCell = cellTexts.find(t => /^\d{8}$/.test(t));
            if (!dniCell) continue;
            const nameFields = cellTexts.filter(t => t.length > 2 && !/^\d+$/.test(t) && t !== dniCell);
            result.workers.push({
              dni: dniCell, apellidos: nameFields[0] || '', nombres: nameFields[1] || '',
              fechaIngreso: cellTexts.find(t => /\d{2}\/\d{2}\/\d{4}/.test(t)) || null,
              situacion: 'ACTIVO', regimenLaboral: null,
            });
          }
        }
      } catch (e) { /* cross-origin iframe */ }
    }
  } catch (e) { /* ignore */ }

  // Deduplicate
  const seen = new Set();
  result.workers = result.workers.filter(w => {
    if (seen.has(w.dni)) return false;
    seen.add(w.dni);
    return true;
  });

  return result;
}
