/* E2E: flujo de Memorización modo juego en FormsBiblicos (http://localhost:3000)
   1. Login con FB_E2E_USER/FB_E2E_PASSWORD
   2. Crear mazo de prueba + tarjeta (vía repository, robusto con/sin migración 023)
   3. Home: grid de mazos estilo juego (.mem-juego-mazo) con porcentaje y botón Continuar
   4. Abrir mazo: detalle con stats y botón "Empezar sesión"
   5. Sesión: ejercicio (.mem-juego-tarjeta) con tipo y barra de progreso
   6. Feedback de corrección (✅/❌ con respuesta/referencia/explicación)
   7. Fin de sesión: resultados y botones
   8. Limpieza: eliminar mazo de prueba
   9. Sin errores de consola */
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const E2E_USER = process.env.FB_E2E_USER;
const E2E_PASSWORD = process.env.FB_E2E_PASSWORD;
if (!E2E_USER || !E2E_PASSWORD) {
  console.error('Configura FB_E2E_USER y FB_E2E_PASSWORD para ejecutar este E2E.');
  process.exit(2);
}
const NOMBRE_MAZO = 'Mazo Juego E2E';

const errores = [];
let exitCode = 0;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('console', m => { if (m.type() === 'error' && !/failed to load resource/i.test(m.text())) errores.push(m.text()); });
  page.on('pageerror', e => errores.push('PAGEERROR: ' + e.message));

  await page.addInitScript(() => {
    const limpiarOverlays = () => {
      document.querySelectorAll('.login-setup').forEach(o => o.remove());
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
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await esperar(1200);
    await page.fill('#loginUser', usuario);
    await page.fill('#loginPass', pass);
    await page.click('#loginBtn');
    try { await page.waitForSelector('#loginForm', { state: 'detached', timeout: 8000 }); } catch (e) {}
    await esperar(1200);
  }

  async function crearMazoPrueba() {
    return await page.evaluate(async ({ nombre }) => {
      const u = store.obtener('usuario');
      if (!u) return { ok: false, error: 'sin sesión' };
      // Limpiar un mazo previo del mismo nombre
      try {
        const prev = await window.memorizacionRepository.listarMazos(u.id);
        for (const m of prev.filter(x => x.nombre === nombre)) {
          await window.memorizacionRepository.eliminarMazo(m.id);
        }
      } catch (e) {}
      const mazo = await window.memorizacionRepository.crearMazo(u.id, {
        nombre, descripcion: 'Mazo de verificación E2E', color: '#3B82F6', icono: 'book-open', es_global: true
      });
      await window.memorizacionRepository.crearTarjetaGlobal({
        mazo_id: mazo.id,
        tipo: 'versiculo',
        referencia: 'Juan 3:16',
        texto: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna.',
        respuesta: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna.',
        explicacion: 'El amor de Dios se demuestra en dar a su Hijo.',
        creado_por: u.id
      });
      await window.memorizacionRepository.crearTarjetaGlobal({
        mazo_id: mazo.id,
        tipo: 'escrita',
        pregunta: '¿Quién derrotó a Goliat?',
        respuesta: 'David',
        explicacion: 'David venció al gigante con fe en Dios.',
        referencia: '1 Samuel 17',
        creado_por: u.id
      });
      return { ok: true, mazoId: mazo.id };
    }, { nombre: NOMBRE_MAZO });
  }

  try {
    // ============ P1: Login ============
    await login(E2E_USER, E2E_PASSWORD);
    const loginOk = (await page.locator('#loginForm').count()) === 0;
    log(loginOk, 'P1 Login usuario E2E', 'URL=' + page.url());

    // ============ P2: Crear datos de prueba ============
    const creado = await crearMazoPrueba();
    log(creado.ok, 'P2 Mazo de prueba creado con 2 tarjetas', creado.error || '');

    // ============ P3: Home de mazos (modo juego) ============
    await page.goto(BASE + '/#!/memorizacion', { waitUntil: 'domcontentloaded' });
    await esperar(1800);
    const nMazos = await page.locator('.mem-juego-mazo').count();
    log(nMazos > 0, 'P3 Home con grid de mazos estilo juego', 'mazos=' + nMazos);
    const pctMazos = await page.locator('.mem-juego-mazo__porcentaje').count();
    log(pctMazos === nMazos, 'P3 Cada tarjeta muestra porcentaje dominado');
    const botonesContinuar = await page.locator('.mem-juego-mazo__btn').count();
    log(botonesContinuar > 0, 'P3 Botones Continuar visibles', 'n=' + botonesContinuar);

    // ============ P4: Abrir mazo → detalle ============
    await page.locator('.mem-juego-mazo', { hasText: NOMBRE_MAZO }).first().click();
    await esperar(1200);
    log((await page.locator('.mem-juego-detalle').count()) > 0, 'P4 Detalle del mazo (hero)');
    const btnEmpezar = await page.locator('#btnEmpezar').count();
    log(btnEmpezar > 0, 'P4 Botón "Empezar sesión" visible');
    const statsDetalle = await page.locator('.mem-juego-detalle__stat').count();
    log(statsDetalle >= 3, 'P4 Stats: tarjetas / dominadas / pendientes', 'stats=' + statsDetalle);

    // ============ P5: Sesión de juego ============
    const empezarDeshabilitado = await page.locator('#btnEmpezar').isDisabled().catch(() => true);
    log(!empezarDeshabilitado, 'P5 Botón Empezar sesión habilitado (pendientes>0)');
    if (!empezarDeshabilitado) {
      await page.click('#btnEmpezar');
      await esperar(1200);
      log((await page.locator('.mem-juego-tarjeta').count()) > 0, 'P5 Ejercicio de juego renderizado');
      const tipo = await page.locator('.mem-juego-tipo').first().innerText().catch(() => '');
      log(tipo.trim().length > 0, 'P5 Tipo de ejercicio visible', tipo.trim());
      log((await page.locator('.mem-juego-sesion__fill').count()) > 0, 'P5 Barra de progreso de sesión');

      // Responder ejercicio 1: llenar lo que haya y comprobar
      const opciones = page.locator('.mem-juego-opcion');
      if (await opciones.count()) { await opciones.first().click(); await esperar(200); }
      const inputs = page.locator('.mem-juego-hueco, #txtResp');
      if (await inputs.count()) { await inputs.first().fill('prueba'); await esperar(100); }
      const btnComprobar = page.locator('#btnResp, .mem-juego-continuar').first();
      if (await btnComprobar.count()) { await btnComprobar.click(); await esperar(900); }

      // ============ P6: Feedback de corrección ============
      const feedback = await page.locator('.mem-juego-feedback').count();
      log(feedback > 0, 'P6 Feedback de corrección visible');
      const fbDetalle = await page.locator('.mem-juego-feedback__respuesta, .mem-juego-feedback__ref, .mem-juego-feedback__expl').count();
      log(fbDetalle > 0, 'P6 Feedback incluye respuesta/referencia/explicación');

      // Avanzar hasta el final (máx 15 pasos)
      for (let i = 0; i < 15; i++) {
        if (await page.locator('.mem-juego-fin').count()) break;
        // 1. Si hay feedback visible, pulsar su botón Continuar (hermano siguiente)
        const feedback = page.locator('.mem-juego-feedback');
        if (await feedback.count() && await feedback.first().isVisible()) {
          const contFeedback = page.locator('.mem-juego-feedback + .mem-juego-continuar').first();
          if (await contFeedback.count() && await contFeedback.isVisible()) {
            await contFeedback.click();
            await esperar(700);
          } else break;
        }
        // 2. En el ejercicio nuevo: responder algo y pulsar Comprobar
        const op2 = page.locator('.mem-juego-opcion').first();
        if (await op2.count() && await op2.isVisible() && !(await op2.isDisabled())) {
          await op2.click();
          await esperar(250);
        }
        const inp2 = page.locator('.mem-juego-hueco, #txtResp').first();
        if (await inp2.count() && await inp2.isVisible() && !(await inp2.isDisabled())) {
          await inp2.fill('prueba');
          await esperar(150);
        }
        // Palabras sueltas del modo ordenar: tocar la primera disponible
        const palabra = page.locator('.mem-juego-palabra').first();
        if (await palabra.count() && await palabra.isVisible()) {
          await palabra.click();
          await esperar(150);
        }
        const resp2 = page.locator('#btnResp').first();
        if (await resp2.count() && await resp2.isVisible() && !(await resp2.isDisabled())) {
          await resp2.click();
          await esperar(800);
        }
      }

      // ============ P7: Fin de sesión ============
      const finVisible = await page.locator('.mem-juego-fin').count();
      log(finVisible > 0, 'P7 Pantalla de fin de sesión');
      if (finVisible > 0) {
        const statsFin = await page.locator('.mem-juego-fin__stat').count();
        log(statsFin >= 4, 'P7 Estadísticas (correctas, incorrectas, dominadas, racha)', 'stats=' + statsFin);
        log((await page.locator('.mem-juego-fin__anillo').count()) > 0, 'P7 Anillo de precisión visible');
        const btnRepetir = await page.locator('#btnRepetir').count();
        const btnVolver = await page.locator('#btnVolverMazos').count();
        log(btnRepetir > 0 && btnVolver > 0, 'P7 Botones Continuar practicando / Volver a los mazos');
      }
    } else {
      console.log('ℹ️ El mazo no tiene pendientes (ya dominado en ejecución anterior)');
    }

    // ============ P8: Limpieza ============
    await page.goto(BASE + '/#!/memorizacion', { waitUntil: 'domcontentloaded' });
    await esperar(1200);
    const limpiado = await page.evaluate(async ({ nombre }) => {
      try {
        const u = store.obtener('usuario');
        const mazos = await window.memorizacionRepository.listarMazos(u.id);
        for (const m of mazos.filter(x => x.nombre === nombre)) {
          await window.memorizacionRepository.eliminarMazo(m.id);
        }
        return true;
      } catch (e) { return false; }
    }, { nombre: NOMBRE_MAZO });
    log(limpiado, 'P8 Limpieza: mazo de prueba eliminado');

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
