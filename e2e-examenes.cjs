/* E2E: flujo completo de exámenes en FormsBiblicos (http://localhost:3000) */
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const TITULO = 'Examen E2E Verificación';
const PREGUNTA = '¿Cuál es el primer libro de la Biblia?';
const OPCION_CORRECTA = 'Génesis';

const errores = [];
let exitCode = 0;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', e => errores.push('PAGEERROR: ' + e.message));

  // Eliminar en cuanto aparezca el selector inicial que pueda interceptar clics.
  // Es comportamiento intencional de la app y se quita sin tocar la BD.
  await page.addInitScript(() => {
    const limpiarOverlays = () => {
      document.querySelectorAll('.login-setup').forEach(o => o.remove());
    };
    limpiarOverlays();
    // Observar 'document' (siempre existe; document.documentElement puede no estar creado aun
    // cuando corre addInitScript, lo que provocaria 'parameter 1 is not of type Node').
    new MutationObserver(limpiarOverlays).observe(document, { childList: true, subtree: true });
  });

  const esperar = ms => page.waitForTimeout(ms);
  const log = (ok, paso, detalle = '') => {
    console.log(`${ok ? '✅' : '❌'} ${paso}${detalle ? ' → ' + detalle : ''}`);
    if (!ok) exitCode = 1;
  };

  // Cerrar el selector inicial de la app que puede interceptar clics,
  // de forma no invasiva y sin tocar la BD.
  async function cerrarOverlays() {
    try {
      const n = await page.locator('.login-setup').count();
      if (n === 0) return;
      await page.evaluate(() => {
        document.querySelectorAll('.login-setup').forEach(o => o.remove());
      });
      await esperar(300);
    } catch (e) {}
  }

  async function login(usuario, pass) {
    await page.goto(BASE + '/#!/login', { waitUntil: 'domcontentloaded' });
    await esperar(600);
    await page.fill('#loginUser', usuario);
    await page.fill('#loginPass', pass);
    await page.click('#loginBtn');
    // Esperar a que el formulario de login desaparezca (login exitoso) o aparezca error
    try { await page.waitForSelector('#loginForm', { state: 'detached', timeout: 8000 }); } catch (e) {}
    await esperar(1200);
    await cerrarOverlays();
  }

  async function cerrarSesion() {
    await page.goto(BASE + '/#!/perfil', { waitUntil: 'domcontentloaded' });
    await esperar(900);
    await page.click('#btnLogout');
    await esperar(250);
    const confirmar = page.locator('.modal-overlay [data-confirmar]');
    if (await confirmar.count()) { await confirmar.click(); await esperar(900); }
  }

  async function confirmarDialogo() {
    try {
      await page.waitForSelector('.modal-overlay [data-confirmar]', { timeout: 4000 });
      await page.click('.modal-overlay [data-confirmar]');
      await esperar(600);
      return true;
    } catch (e) {
      return false;
    }
  }

  try {
    // ============ PASO 1: Login profesor ============
    await login('admin1', 'admin123');
    await esperar(500);
    const loginDesaparecido = (await page.locator('#loginForm').count()) === 0;
    const urlNoLogin = !page.url().includes('#!/login');
    log(loginDesaparecido && urlNoLogin, 'P1 Login admin1/admin123', 'login oculto=' + loginDesaparecido + ', URL=' + page.url());

    // ============ PASO 2: Crear examen y publicar ============
    await page.goto(BASE + '/#!/examenes', { waitUntil: 'domcontentloaded' });
    await esperar(800);
    await page.click('#btnNuevoExamen');
    await esperar(1500);
    const editorOk = await page.locator('#btnPublicarEditor').count();
    log(editorOk > 0, 'P2 Editor abierto (#!/editor/nuevo)');

    // Pregunta: texto + opción correcta + radio correcta
    const txt = page.locator('textarea[data-campo-pregunta="texto"]').first();
    await txt.click();
    await txt.fill(PREGUNTA);
    const optA = page.locator('input[data-opcion-val="0"]').first();
    await optA.click();
    await optA.fill(OPCION_CORRECTA);
    const radio = page.locator('input[name="correcta_0"]').first();
    await radio.check();
    log(true, 'P2 Pregunta configurada', `${PREGUNTA} / correcta=${OPCION_CORRECTA}`);

    // Ir a Información y poner título
    await page.click('.editor-tab-btn[data-tab="informacion"]');
    await esperar(600);
    const tit = page.locator('#infoTitulo');
    await tit.click();
    await tit.fill(TITULO);
    log(true, 'P2 Título puesto', TITULO);

    // Publicar
    await page.click('#btnPublicarEditor');
    try { await page.waitForSelector('#listaExamenes', { timeout: 10000 }); } catch (e) {}
    await esperar(800);
    const publicada = await page.locator('#listaExamenes').count();
    const alertaOk = await page.locator('#contenedorAlertas .alerta--exito').count();
    log(publicada > 0, 'P2 Examen publicado', 'alerta=' + (alertaOk > 0 ? 'sí' : 'no') + ', URL=' + page.url());

    // Obtener ID del examen de la tarjeta
    const tarjeta = page.locator('.tarjeta-capitulo[data-examen]', { hasText: TITULO }).first();
    const examenId = await tarjeta.getAttribute('data-examen');
    const badge = await page.locator('.tarjeta-capitulo[data-examen] .examen-badge--publicado').count();
    log(!!examenId && badge > 0, 'P2 Tarjeta con badge Publicado', 'id=' + (examenId || 'N/A'));

    // ============ PASO 3: Cerrar sesión y login alumna ============
    // La alumna debe pertenecer AL MISMO GRUPO que admin1 para ver el examen
    // creado en el paso anterior (el examen se guarda con grupo_id del creador).
    await cerrarSesion();
    await login('alumno', 'alumno123');
    await esperar(500);
    const loginAl = (await page.locator('#loginForm').count()) === 0;
    log(loginAl, 'P3 Login alumno/alumno123 (alumno del grupo)');

    // ============ PASO 4: Tomar el examen ============
    await page.goto(BASE + '/#!/examenes', { waitUntil: 'domcontentloaded' });
    await esperar(1000);
    const tarjetaAl = page.locator('.tarjeta-capitulo[data-examen]', { hasText: TITULO }).first();
    const btnComenzar = tarjetaAl.locator('.btn-iniciar-examen');
    log(await btnComenzar.count() > 0, 'P4 Examen disponible para alumno');
    await btnComenzar.click();
    try { await page.waitForSelector('#btnEntregar', { timeout: 8000 }); } catch (e) {}
    const enTomar = page.url().includes('/tomar/');
    log(enTomar, 'P4 Vista tomar examen cargada', page.url());

    // Responder: primera opción (Génesis)
    const radioG = page.locator('.examen-opcion input[type="radio"]').first();
    await radioG.click();
    await esperar(600);
    // Entregar
    await page.click('#btnEntregar');
    const entregado = await confirmarDialogo();
    try { await page.waitForSelector('.tarjeta-capitulo[data-examen]', { timeout: 8000 }); } catch (e) {}
    await esperar(600);
    const volvioLista = page.url().includes('/examenes');
    log(entregado && volvioLista, 'P4 Examen entregado', 'URL=' + page.url());

    // Verificar estado Calificado en la tarjeta del alumno
    await page.goto(BASE + '/#!/examenes', { waitUntil: 'domcontentloaded' });
    await esperar(1000);
    const tarjetaCal = page.locator('.tarjeta-capitulo[data-examen]', { hasText: TITULO }).first();
    const badgeCalif = await tarjetaCal.locator('.examen-badge--calificado').count();
    const notaVis = await tarjetaCal.locator('span.u-fw-700.u-fs-lg').count();
    log(badgeCalif > 0, 'P4 Tarjeta alumno: Calificado', 'nota visible=' + (notaVis > 0 ? 'sí' : 'no'));

    // ============ PASO 5: Profesor corrige / ve respuestas ============
    await cerrarSesion();
    await login('admin1', 'admin123');
    await page.goto(BASE + '/#!/examenes', { waitUntil: 'domcontentloaded' });
    await esperar(1000);

    // Menú ⋮ → Respuestas
    const tarjetaProf = page.locator('.tarjeta-capitulo[data-examen]', { hasText: TITULO }).first();
    await tarjetaProf.locator('.examen-menu-toggle').click();
    await esperar(300);
    await tarjetaProf.locator('.btn-ver-resultados').click();
    try { await page.waitForSelector('.respuestas-metrica-card', { timeout: 8000 }); } catch (e) {}
    await esperar(500);
    const enRespuestas = page.url().includes('pestana=respuestas');
    log(enRespuestas, 'P5 Pestaña Respuestas abierta', page.url());

    const metrica = await page.locator('.respuestas-metrica-card').count();
    const respuestaCont = await page.locator('.btn-alumno-entrega-select').count();
    log(metrica >= 4, 'P5 Métricas visibles', 'tarjetas=' + metrica);
    log(respuestaCont >= 1, 'P5 Listado de entregas con alumno', 'filas=' + respuestaCont);

    // Abrir panel de corrección del alumno
    const alumnoFila = page.locator('.btn-alumno-entrega-select').first();
    await alumnoFila.click();
    await esperar(800);
    const panelCorr = await page.locator('#splitScreenContent').innerText();
    log(panelCorr.includes('Nota actual') || panelCorr.includes('Respuesta'), 'P5 Panel de corrección', 'contiene nota/respuesta');

    // ============ PASO 6: Libro de calificaciones ============
    await page.goto(BASE + '/#!/calificaciones', { waitUntil: 'domcontentloaded' });
    try { await page.waitForSelector('#app-root .tarjeta-capitulo', { timeout: 8000 }); } catch (e) {}
    await esperar(600);
    const califOk = await page.locator('#app-root').innerText();
    const hayAlumno = /alumno/i.test(califOk);
    log(califOk.includes(TITULO) && hayAlumno, 'P6 Libro de calificaciones muestra examen + alumno');

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
