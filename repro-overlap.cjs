/* Prueba: vista Exámenes (3 pestañas) + calificaciones a varios anchos */
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const E2E_USER = process.env.FB_E2E_USER;
const E2E_PASSWORD = process.env.FB_E2E_PASSWORD;
if (!E2E_USER || !E2E_PASSWORD) { console.error('Configura FB_E2E_USER y FB_E2E_PASSWORD para ejecutar esta reproducción.'); process.exit(2); }

async function probar(viewport) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport, isMobile: viewport.width <= 480, hasTouch: viewport.width <= 480 });
  const esperar = ms => page.waitForTimeout(ms);

  await page.addInitScript(() => {
    const limpiarOverlays = () => document.querySelectorAll('.login-setup').forEach(o => o.remove());
    limpiarOverlays();
    new MutationObserver(limpiarOverlays).observe(document, { childList: true, subtree: true });
  });

  await page.goto(BASE + '/#!/login', { waitUntil: 'domcontentloaded' });
  await esperar(700);
  await page.fill('#loginUser', E2E_USER);
  await page.fill('#loginPass', E2E_PASSWORD);
  await page.click('#loginBtn');
  try { await page.waitForSelector('#loginForm', { state: 'detached', timeout: 9000 }); } catch (e) {}
  await esperar(1800);

  const medir = async (etiqueta) => {
    const info = await page.evaluate(() => {
      const vis = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 4 && r.height > 4 && r.bottom > -30 && r.top < window.innerHeight + 30;
      };
      const els = Array.from(document.querySelectorAll('.examen-card, .calif-bloque, .tarjeta-capitulo')).filter(vis);
      const pares = [];
      for (let i = 0; i < els.length; i++) {
        const a = els[i], ra = a.getBoundingClientRect();
        for (let j = i + 1; j < els.length; j++) {
          const b = els[j], rb = b.getBoundingClientRect();
          if (a.contains(b) || b.contains(a)) continue;
          const interY = ra.top < rb.bottom - 2 && rb.top < ra.bottom - 2;
          const interX = ra.left < rb.right - 2 && rb.left < ra.right - 2;
          if (interY && interX) {
            pares.push([(a.className||a.tagName).toString().slice(0,40), (b.className||b.tagName).toString().slice(0,40),
              Math.round(ra.top), Math.round(ra.bottom), Math.round(rb.top), Math.round(rb.bottom)]);
          }
        }
      }
      return { pares: pares.slice(0, 10), nCards: els.length };
    });
    console.log(`[${viewport.width}x${viewport.height}] ${etiqueta}: tarjetas=${info.nCards} solapamientos=${info.pares.length}`);
    info.pares.forEach(p => console.log('     ', JSON.stringify(p)));
    return info.pares.length;
  };

  // --- Vista Exámenes: 3 pestañas ---
  await page.goto(BASE + '/#!/examenes', { waitUntil: 'domcontentloaded' });
  try { await page.waitForSelector('.examen-tab', { timeout: 15000 }); } catch (e) {}
  await esperar(1200);
  console.log(`\n[${viewport.width}x${viewport.height}] Pestañas exámenes:`, await page.locator('.examen-tab').allInnerTexts());
  let total = 0;
  const nt = await page.locator('.examen-tab').count();
  for (let i = 0; i < nt; i++) {
    const t = (await page.locator('.examen-tab').nth(i).innerText()).slice(0, 25);
    await page.locator('.examen-tab').nth(i).click();
    await esperar(500);
    total += await medir('Exámenes pestaña "' + t + '"');
  }
  await page.evaluate(() => window.scrollTo(0, 400));
  await esperar(300);
  total += await medir('Exámenes scroll y=400');
  await page.evaluate(() => window.scrollTo(0, 0));
  await esperar(300);
  await page.screenshot({ path: `repro-examenes-${viewport.width}.png` });

  // --- Calificaciones ---
  await page.goto(BASE + '/#!/calificaciones', { waitUntil: 'domcontentloaded' });
  try { await page.waitForSelector('.calif-tab', { timeout: 15000 }); } catch (e) {}
  await esperar(1000);
  const nt2 = await page.locator('.calif-tab').count();
  for (let i = 0; i < nt2; i++) {
    const t = (await page.locator('.calif-tab').nth(i).innerText()).slice(0, 25);
    await page.locator('.calif-tab').nth(i).click();
    await esperar(400);
    total += await medir('Calif pestaña "' + t + '"');
  }
  await page.screenshot({ path: `repro-calif-${viewport.width}.png` });
  await browser.close();
  return total;
}

(async () => {
  const anchos = [
    { width: 1280, height: 900 },
    { width: 768, height: 1024 },
    { width: 480, height: 800 },
    { width: 390, height: 844 },
    { width: 360, height: 740 }
  ];
  for (const vp of anchos) {
    try {
      const tot = await probar(vp);
      console.log(`\n===== ${vp.width}x${vp.height}: TOTAL solapamientos = ${tot} =====\n`);
    } catch (e) { console.log(`${vp.width}x${vp.height} ERROR: ${e.message}`); }
  }
})();
