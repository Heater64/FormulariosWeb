/* Limpieza E2E: elimina los exámenes de prueba "Examen E2E Verificación"
   creados por e2e-examenes.cjs en la BD real, usando la UI de la app
   (login admin1 + menú ⋮ > Eliminar) para respetar las políticas RLS. */
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const TITULO = 'Examen E2E Verificación';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  // Eliminar overlays intencionales que interceptan clics
  await page.addInitScript(() => {
    const limpiarOverlays = () => {
      document.querySelectorAll('.login-setup, #updateCard').forEach(o => o.remove());
    };
    limpiarOverlays();
    new MutationObserver(limpiarOverlays).observe(document, { childList: true, subtree: true });
  });

  const esperar = ms => page.waitForTimeout(ms);

  try {
    // Login como admin1
    await page.goto(BASE + '/#!/login', { waitUntil: 'domcontentloaded' });
    await esperar(600);
    await page.fill('#loginUser', 'admin1');
    await page.fill('#loginPass', 'admin123');
    await page.click('#loginBtn');
    try { await page.waitForSelector('#loginForm', { state: 'detached', timeout: 8000 }); } catch (e) {}
    await esperar(1200);

    // Ir a exámenes
    await page.goto(BASE + '/#!/examenes', { waitUntil: 'domcontentloaded' });
    await esperar(1200);

    let eliminados = 0;
    for (let i = 0; i < 10; i++) {
      const tarjeta = page.locator('.tarjeta-capitulo[data-examen]', { hasText: TITULO }).first();
      if (await tarjeta.count() === 0) break;
      // Abrir menú ⋮ y pulsar Eliminar
      await tarjeta.locator('.examen-menu-toggle').click();
      await esperar(300);
      await tarjeta.locator('.btn-eliminar-examen').click();
      // Confirmar diálogo
      try {
        await page.waitForSelector('.modal-overlay [data-confirmar]', { timeout: 4000 });
        await page.click('.modal-overlay [data-confirmar]');
      } catch (e) {}
      await esperar(1000);
      eliminados++;
      console.log(`🗑️  Eliminado (${eliminados}): ${TITULO}`);
    }

    console.log(`=== Limpieza: ${eliminados} examen(es) de prueba eliminado(s) ===`);
  } catch (e) {
    console.log('❌ ERROR: ' + e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
