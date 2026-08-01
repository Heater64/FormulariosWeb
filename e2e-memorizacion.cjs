/* E2E: flujo completo de memorización en FormsBiblicos (http://localhost:3000)
   1. Login admin1/admin123
   2. Crear mazo 'Mazo E2E Prueba'
   3. Crear tarjeta libre (pregunta/respuesta)
   4. Repasar: flashcard → voltear → calificar Fácil
   5. Verificar pantalla de fin de sesión y contadores actualizados
   6. Limpieza: eliminar tarjeta y mazo vía UI */
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const NOMBRE_MAZO = 'Mazo E2E Prueba';

const errores = [];
let exitCode = 0;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', e => errores.push('PAGEERROR: ' + e.message));

  // Eliminar overlays intencionales (login-setup, updateCard) en cuanto aparecen
  await page.addInitScript(() => {
    const limpiarOverlays = () => {
      document.querySelectorAll('.login-setup, #updateCard').forEach(o => o.remove());
    };
    limpiarOverlays();
    new MutationObserver(limpiarOverlays).observe(document, { childList: true, subtree: true });
  });

  const esperar = ms => page.waitForTimeout(ms);
  const log = (ok, paso, detalle = '') => {
    console.log(`${ok ? '✅' : '❌'} ${paso}${detalle ? ' → ' + detalle : ''}`);
    if (!ok) exitCode = 1;
  };

  async function login(usuario, pass) {
    await page.goto(BASE + '/#!/login', { waitUntil: 'domcontentloaded' });
    await esperar(600);
    await page.fill('#loginUser', usuario);
    await page.fill('#loginPass', pass);
    await page.click('#loginBtn');
    try { await page.waitForSelector('#loginForm', { state: 'detached', timeout: 8000 }); } catch (e) {}
    await esperar(1200);
  }

  async function confirmarDialogo() {
    try {
      await page.waitForSelector('.modal-overlay [data-confirmar]', { timeout: 4000 });
      await page.click('.modal-overlay [data-confirmar]');
      await esperar(600);
      return true;
    } catch (e) { return false; }
  }

  try {
    // ============ P1: Login ============
    await login('admin1', 'admin123');
    const loginOk = (await page.locator('#loginForm').count()) === 0;
    log(loginOk, 'P1 Login admin1/admin123', 'URL=' + page.url());

    // ============ P2: Ir a memorización y crear mazo ============
    await page.goto(BASE + '/#!/memorizacion', { waitUntil: 'domcontentloaded' });
    await esperar(1200);
    log((await page.locator('#btnNuevoMazo').count()) > 0, 'P2 Home de memorización con estadísticas', 'URL=' + page.url());

    // Pre-limpieza por si quedó un mazo de una ejecución anterior
    const mazoPrevio = page.locator('.mem-mazo-card', { hasText: NOMBRE_MAZO }).first();
    if (await mazoPrevio.count()) {
      await mazoPrevio.click();
      await esperar(800);
      // Eliminar tarjetas del mazo previo
      while (await page.locator('.mem-btn-del').count() > 0) {
        await page.locator('.mem-btn-del').first().click();
        await confirmarDialogo();
        await esperar(800);
      }
      await page.click('#btnEliminarMazo');
      await confirmarDialogo();
      await esperar(1000);
      console.log('🧹 Pre-limpieza: mazo anterior eliminado');
      await page.goto(BASE + '/#!/memorizacion', { waitUntil: 'domcontentloaded' });
      await esperar(1000);
    }

    await page.click('#btnNuevoMazo');
    await esperar(600);
    await page.fill('#fNombre', NOMBRE_MAZO);
    await page.fill('#fDesc', 'Mazo de verificación E2E');
    await page.click('.mem-color-dot'); // elegir color (primero)
    await page.click('#btnGuardar');
    await esperar(1200);
    const detalleOk = await page.locator('#btnRepasarMazo').count();
    log(detalleOk > 0, 'P2 Mazo creado → detalle', 'URL=' + page.url());

    // ============ P3: Crear tarjeta libre ============
    await page.click('#btnNuevaTarjeta');
    await esperar(600);
    await page.click('.mem-tipo-btn[data-tipo="libre"]');
    await esperar(400);
    await page.fill('#fFrente', '¿Cuál es el primer libro de la Biblia?');
    await page.fill('#fTexto', 'Génesis');
    await page.fill('#fPista', 'Empieza con G...');
    await page.click('#btnGuardar');
    await esperar(1200);
    const tarjetaOk = await page.locator('.mem-versiculo-item').count();
    log(tarjetaOk >= 1, 'P3 Tarjeta libre creada y visible en el mazo', 'items=' + tarjetaOk);

    // ============ P4: Repasar (flashcard) ============
    await page.click('#btnRepasarMazo');
    await esperar(1200);
    const enSesion = await page.locator('.flashcard-container').count();
    log(enSesion > 0, 'P4 Sesión de repaso iniciada (flashcard)', 'URL=' + page.url());
    const frente = await page.locator('.flashcard-referencia').innerText().catch(() => '');
    log(frente.includes('¿Cuál'), 'P4 Frente de la tarjeta visible', frente);

    // Ver pista (no debe voltear)
    const tienePista = await page.locator('#btnPista').count();
    if (tienePista > 0) {
      await page.click('#btnPista');
      await esperar(300);
      const pistaVisible = await page.locator('#pistaBox').isVisible().catch(() => false);
      const sigueSinVoltear = !(await page.locator('.flashcard-container--volteado').count());
      log(pistaVisible && sigueSinVoltear, 'P4 Botón Ver pista: muestra pista sin voltear');
      await page.click('#btnPista');
      await esperar(200);
    }

    // Voltear la tarjeta (click en el contenedor)
    await page.click('.flashcard-container');
    await esperar(500);
    const volteada = (await page.locator('.flashcard-container--volteado').count()) > 0;
    log(volteada, 'P4 Tarjeta volteada (dorso visible)');

    // Calificar Fácil (q=5)
    await page.click('[data-q="5"]');
    await esperar(800);

    // ============ P5: Fin de sesión ============
    const finVisible = await page.locator('#btnVolverMazo').count();
    log(finVisible > 0, 'P5 Pantalla de fin de repaso', (await page.locator('#app-root').innerText().catch(() => '')).slice(0, 60));

    await page.click('#btnVolverMazo');
    await esperar(1200);
    // Tras _recargar, el mazo no debe tener pendientes
    const btnRepasar = await page.locator('#btnRepasarMazo').innerText().catch(() => '');
    log(btnRepasar.includes('0 tarjetas'), 'P5 Contador actualizado tras repaso', btnRepasar.trim());

    // ============ P6: Limpieza (tarjeta + mazo) ============
    const delBtn = page.locator('.mem-btn-del').first();
    if (await delBtn.count()) {
      await delBtn.click();
      await confirmarDialogo();
      await esperar(1000);
    }
    await page.click('#btnEliminarMazo');
    await confirmarDialogo();
    await esperar(1200);
    const homeVuelta = (await page.locator('#btnNuevoMazo').count()) > 0;
    log(homeVuelta, 'P6 Limpieza completada (tarjeta y mazo eliminados)', 'URL=' + page.url());

    console.log('\n=== CONSOLE ERRORS ===');
    console.log(errores.length ? errores.join('\n') : '(ninguno)');
    console.log('=== RESULTADO: ' + (exitCode === 0 ? 'OK ✅' : 'FALLOS DETECTADOS ❌') + ' ===');
  } catch (e) {
    exitCode = 1;
    console.log('❌ ERROR FATAL: ' + e.message);
    try {
      const body = await page.locator('#app-root').innerText().catch(() => '(sin app)');
      console.log('Contenido #app-root: ' + body.slice(0, 400));
    } catch (e2) {}
    console.log('=== CONSOLE ERRORS ===');
    console.log(errores.length ? errores.join('\n') : '(ninguno)');
  } finally {
    await browser.close();
    process.exit(exitCode);
  }
})();
