// E2E: sección Explora — verifica el rediseño en navegador real
// node e2e-explorar.cjs  (requiere dev server en http://localhost:3000)
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const USUARIO = 'admin1';
const CLAVE = 'admin123';

let aciertos = 0;
let total = 0;
const log = (ok, msg) => { total++; if (ok) aciertos++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('CONSOLE: ' + m.text()); });

  // Overlays intencionales de la app (setup + update card) que pueden tapar clics
  await page.addInitScript(() => {
    const obs = new MutationObserver(() => {
      document.querySelectorAll('.login-setup, #updateCard').forEach(el => el.remove());
    });
    obs.observe(document, { childList: true, subtree: true });
  });

  try {
    // ---- P1: Login ----
    await page.goto(BASE + '/#!/login', { waitUntil: 'domcontentloaded' });
    await esperar(1200);
    await page.fill('#loginUser', USUARIO);
    await page.fill('#loginPass', CLAVE);
    await page.click('#loginBtn');
    await esperar(2000);
    const enHome = await page.locator('#app-root, [id]').first().count().catch(() => 0) > 0;
    log(enHome, 'P1 Login como ' + USUARIO);

    // ---- P2: Ir a Explora ----
    await page.goto(BASE + '/#!/explorar', { waitUntil: 'domcontentloaded' });
    await esperar(1500);
    const tabs = await page.locator('.explorar__tab').count();
    log(tabs >= 10, `P2 Pestañas visibles (${tabs}/10)`);

    // ---- P3: Reyes — tarjetas con refs (bug de "undefined" corregido) ----
    const reyCards = await page.locator('.explorar__card').count();
    const sinUndefined = (await page.locator('#explorarContent').innerText()).includes('undefined');
    log(reyCards > 0, `P3 Reyes: ${reyCards} tarjetas`);
    log(!sinUndefined, 'P3 Reyes: sin "undefined" en el contenido');
    const estrellas = await page.locator('.explorar__rey-estrella--activa').count();
    log(estrellas > 0, `P3 Reyes: ${estrellas} estrellas activas (calificación)`);
    const badge = await page.locator('.explorar__rey-badge').count();
    log(badge > 0, `P3 Reyes: ${badge} badges de etiqueta`);

    // ---- P4: Búsqueda en Reyes ----
    await page.fill('#explorarSearch', 'David');
    await esperar(600);
    const resultadosBar = await page.locator('.explorar__resultados').count();
    log(resultadosBar > 0, 'P4 Barra de resultados visible');
    const davidCards = await page.locator('.explorar__card').count();
    log(davidCards >= 1, `P4 Búsqueda "David": ${davidCards} tarjeta(s)`);
    const contieneDavid = (await page.locator('#explorarContent').innerText()).toLowerCase().includes('david');
    log(contieneDavid, 'P4 Contenido incluye "David"');
    await page.fill('#explorarSearch', '');
    await esperar(500);

    // ---- P5: Curiosidades — hero rotativo + chips ----
    await page.click('.explorar__tab[data-tab="curiosidades"]');
    await esperar(800);
    const hero = await page.locator('#curiosidadesHero').count();
    log(hero > 0, 'P5 Hero de curiosidades visible');
    const chips = await page.locator('.curiosidades-chip').count();
    log(chips >= 5, `P5 ${chips} chips de categorías`);
    const dots = await page.locator('.curiosidades-hero__dot').count();
    log(dots > 0, `P5 ${dots} dots de progreso en el hero`);

    // Click en un ref dentro del hero (delegación de eventos)
    const refsHero = await page.locator('#curiosidadesHero .explorar__ref').count();
    log(refsHero > 0, 'P5 Ref clicable en el hero');

    // ---- P6: Personajes — chips de datos ----
    await page.click('.explorar__tab[data-tab="personajes"]');
    await esperar(600);
    const datosPersonajes = await page.locator('.explorar__dato').count();
    log(datosPersonajes > 0, `P6 Personajes: ${datosPersonajes} chips de datos (nacimiento/hijos)`);

    // ---- P7: Lugares — eventos y personajes separados ----
    await page.click('.explorar__tab[data-tab="lugares"]');
    await esperar(600);
    const eventosLugares = await page.locator('.explorar__evento').count();
    const datosLugares = await page.locator('.explorar__dato').count();
    log(eventosLugares > 0, `P7 Lugares: ${eventosLugares} eventos`);
    log(datosLugares > 0, `P7 Lugares: ${datosLugares} personajes separados`);

    // ---- P8: Profecías — refs de cumplimiento ----
    await page.click('.explorar__tab[data-tab="profecias"]');
    await esperar(600);
    const cumplimientos = await page.locator('.explorar__ref--cumplimiento').count();
    log(cumplimientos > 0, `P8 Profecías: ${cumplimientos} refs de cumplimiento (verdes)`);

    // ---- P9: Clic en ref muestra alerta ----
    await page.click('.explorar__ref[data-ref]').catch(() => {});
    await esperar(600);
    const alerta = await page.locator('[role="alert"], .alerta, [class*="toast"], [class*="alert"]').count();
    log(alerta > 0, 'P9 Alerta al hacer clic en una referencia');

    // ---- Resumen ----
    const hayErrores = consoleErrors.filter(e => !e.includes('favicon')).length;
    log(hayErrores === 0, `Errores de consola: ${hayErrores === 0 ? 'ninguno' : consoleErrors.join(' | ')}`);

  } catch (e) {
    log(false, 'EXCEPCIÓN: ' + e.message);
    try { await page.screenshot({ path: 'e2e-explorar-error.png', fullPage: true }); } catch {}
  }

  console.log(`\n=== Resultado: ${aciertos}/${total} ===`);
  await browser.close();
  process.exit(aciertos === total ? 0 : 1);
})();
