// COMPLY360 Connector — Content Script
// Runs automatically on *.sunat.gob.pe pages
// Shows a small floating badge when SUNAT data is detected

(function() {
  'use strict';

  // Don't run on non-relevant pages
  if (!window.location.href.includes('sunat.gob.pe')) return;

  // Wait for page to fully load
  setTimeout(() => {
    // Check if there's extractable data (tables with DNIs)
    const tables = document.querySelectorAll('table');
    let hasDni = false;
    let workerCount = 0;

    for (const table of tables) {
      const cells = table.querySelectorAll('td');
      for (const cell of cells) {
        const text = (cell.textContent || '').trim();
        if (/^\d{8}$/.test(text)) {
          hasDni = true;
          workerCount++;
        }
      }
    }

    // Also check page text for company info
    const bodyText = document.body.innerText || '';
    const hasCompanyInfo = /RUC[:\s]*\d{11}/.test(bodyText) || bodyText.includes('Bienvenido');

    if (!hasDni && !hasCompanyInfo) return;

    // Create floating badge
    const badge = document.createElement('div');
    badge.id = 'comply360-badge';
    badge.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        background: linear-gradient(135deg, #1e3a6e, #2563eb);
        color: white;
        padding: 12px 16px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
        max-width: 320px;
      " id="comply360-badge-inner">
        <div style="
          width: 28px;
          height: 28px;
          background: rgba(255,255,255,0.2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          flex-shrink: 0;
        ">L</div>
        <div>
          <div style="font-weight: 700; font-size: 12px;">COMPLY360 detectó datos</div>
          <div style="font-size: 11px; opacity: 0.8;">
            ${workerCount > 0 ? `${workerCount} trabajadores encontrados.` : 'Datos de empresa detectados.'}
            Haz clic en la extension para importar.
          </div>
        </div>
        <button id="comply360-close" style="
          position: absolute;
          top: 4px;
          right: 4px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 14px;
          opacity: 0.6;
          padding: 2px 6px;
        ">&times;</button>
      </div>
    `;

    document.body.appendChild(badge);

    // Hover effect
    const inner = document.getElementById('comply360-badge-inner');
    if (inner) {
      inner.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.02)'; });
      inner.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
    }

    // Close button
    const closeBtn = document.getElementById('comply360-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        badge.remove();
      });
    }

    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (badge.parentNode) {
        badge.style.transition = 'opacity 0.5s';
        badge.style.opacity = '0';
        setTimeout(() => badge.remove(), 500);
      }
    }, 15000);

  }, 2000); // Wait 2s for SUNAT page to fully render
})();
