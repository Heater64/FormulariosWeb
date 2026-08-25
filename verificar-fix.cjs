/* Verificación: el menú ⋮ ya no se corta por el contenido de la tabla */
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const E2E_USER = process.env.FB_E2E_USER;
const E2E_PASSWORD = process.env.FB_E2E_PASSWORD;
if (!E2E_USER || !E2E_PASSWORD) {
  console.error('Configura FB_E2E_USER y FB_E2E_PASSWORD para ejecutar esta verificación.');
  process.exit(2);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errores = [];
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', e => errores.push('PAGEERROR: ' + e.message));

  await page.addInitScript(() => {
    const limpiarOverlays = () => document.querySelectorAll('.login-setup').forEach(o => o.remove());
    limpiarOverlays();
    new MutationObserver(limpiarOverlays).observe(document, { childList: true, subtree: true });
  });

  const esperar = ms => page.waitForTimeout(ms);

  await page.goto(BASE + '/#!/login', { waitUntil: 'domcontentloaded' });
  await esperar(700);
  await page.fill('#loginUser', E2E_USER);
  await page.fill('#loginPass', E2E_PASSWORD);
  await page.click('#loginBtn');
  try { await page.waitForSelector('#loginForm', { state: 'detached', timeout: 9000 }); } catch (e) {}
  await esperar(1800);

  await page.goto(BASE + '/#!/calificaciones', { waitUntil: 'domcontentloaded' });
  try { await page.waitForSelector('[data-menu-toggle]', { timeout: 15000 }); } catch (e) { console.log('No hay menús'); }
  await esperar(1000);

  const nMenus = await page.locator('[data-menu-toggle]').count();
  console.log('Botones ⋮:', nMenus);
  let ok = true;

  for (let i = 0; i < Math.min(nMenus, 3); i++) {
    const toggle = page.locator('[data-menu-toggle]').nth(i);
    await toggle.click();
    await esperar(500);

    const estado = await page.evaluate(() => {
      const menu = document.querySelector('.calif-menu--abierto');
      if (!menu) return { abierto: false };
      const r = menu.getBoundingClientRect();
      const items = Array.from(menu.querySelectorAll('.calif-menu-item'));
      const itemsClickables = items.map(it => {
        const ir = it.getBoundingClientRect();
        const cx = Math.round(ir.left + ir.width / 2);
        const cy = Math.round(ir.top + ir.height / 2);
        const top = document.elementFromPoint(cx, cy);
        return { texto: (it.textContent || '').trim().slice(0, 20), ok: !!(top && (it === top || it.contains(top))) };
      });
      return {
        abierto: true,
        enBody: menu.parentNode === document.body,
        enGrid: !!(menu.id && menu.id.startsWith('menu-eval-grid-')),
        zIndex: getComputedStyle(menu).zIndex,
        rect: [Math.round(r.top), Math.round(r.bottom), Math.round(r.left), Math.round(r.right)],
        viewport: [window.innerHeight, window.innerWidth],
        itemsClickables
      };
    });
    console.log(`\nMenú ${i}:`, JSON.stringify(estado, null, 1));
    // El menú de exportar (fuera del grid) se queda en su sitio por diseño.
    // Solo los menús ⋮ del grid se mueven a <body> (para no ser recortados).
    if (!estado.abierto) ok = false;
    if (estado.enGrid && (!estado.enBody || estado.zIndex !== '1000')) ok = false;
    if (estado.itemsClickables && estado.itemsClickables.some(x => !x.ok)) ok = false;

    await page.screenshot({ path: `verificar-menu-${i}.png` });

    // Cerrar (clic fuera)
    await page.evaluate(() => { const m = document.querySelector('.calif-menu--abierto'); if (m) m.classList.remove('calif-menu--abierto'); });
    await esperar(300);
  }

  // Reabrir y cerrar de forma real (clic en el botón) para comprobar que vuelve a su sitio
  await page.locator('[data-menu-toggle]').first().click();
  await esperar(400);
  const abierto = await page.evaluate(() => {
    const m = document.querySelector('.calif-menu--abierto');
    return m ? { enBody: m.parentNode === document.body } : null;
  });
  console.log('\nReabierto en body:', abierto);
  await page.locator('[data-menu-toggle]').first().click(); // clic de nuevo → debe cerrarse
  await esperar(400);
  const cerrado = await page.evaluate(() => {
    const m = document.querySelector('.calif-menu--abierto');
    const cualquiera = document.querySelector('.calif-menu');
    return { abierto: !!m, enTabla: !!(cualquiera && cualquiera.closest('.calif-grid')) };
  });
  console.log('Tras 2º clic → cerrado:', cerrado);

  console.log('\n=== CONSOLE ERRORS ===');
  console.log(errores.length ? errores.join('\n') : '(ninguno)');
  console.log('\nRESULTADO:', ok ? 'OK ✅' : 'FALLO ❌');
  await browser.close();
})();
