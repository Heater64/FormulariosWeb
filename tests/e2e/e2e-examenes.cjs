/* E2E: flujo completo de exámenes en FormsBiblicos (http://localhost:3000) */
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
// Cuentas de PRUEBA de un entorno aislado (no son las cuentas reales).
// Se dejan en el código a propósito para reutilizarlas en todas las pruebas.
// Las variables de entorno, si están definidas, tienen prioridad.
const PROFESOR = {
  usuario: process.env.FB_E2E_USER || 'pruebas1',
  password: process.env.FB_E2E_PASSWORD || 'pruebas123',
};
const ALUMNO = {
  usuario: process.env.FB_E2E_STUDENT_USER || 'pruebas',
  password: process.env.FB_E2E_STUDENT_PASSWORD || 'pruebas123',
};
const TITULO = 'Examen E2E Verificación';
const NOMBRE_ALUMNO = 'Alumno Pruebas E2E';
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
    await page.fill('#loginPassHero', pass);
    await page.click('[data-login-form] button[type="submit"]');
    // Esperar a que el formulario de login desaparezca (login exitoso) o aparezca error
    try { await page.waitForSelector('[data-login-form]', { state: 'detached', timeout: 8000 }); } catch (e) {}
    await esperar(1200);
    await cerrarOverlays();
  }

  async function cerrarSesion() {
    await page.goto(BASE + '/#!/cuenta', { waitUntil: 'domcontentloaded' });
    await esperar(900);
    await page.click('#btnSalir');
    await esperar(250);
    const confirmar = page.locator('.modal-overlay [data-confirmar]');
    if (await confirmar.count()) { await confirmar.click(); await esperar(900); }
  }

  try {
    // ============ PASO 1: Login profesor ============
    await login(PROFESOR.usuario, PROFESOR.password);
    await esperar(500);
    const loginDesaparecido = (await page.locator('[data-login-form]').count()) === 0;
    const urlNoLogin = !page.url().includes('#!/login');
    log(loginDesaparecido && urlNoLogin, 'P1 Login profesor E2E', 'login oculto=' + loginDesaparecido + ', URL=' + page.url());

    // ============ PASO 2: Crear examen y publicar ============
    await page.goto(BASE + '/#!/examenes', { waitUntil: 'domcontentloaded' });
    await esperar(800);
    await page.click('#btnNuevo');
    await esperar(1500);
    const editorOk = await page.locator('#btnPublicarEditor').count();
    log(editorOk > 0, 'P2 Editor abierto (#!/editor/nuevo)');

    // Pregunta: texto + opciones + opción correcta
    const txt = page.locator('textarea[data-campo-pregunta="texto"]').first();
    await txt.click();
    await txt.fill(PREGUNTA);
    // Rellenar todas las opciones (el editor no admite opciones vacías)
    const opciones = page.locator('input[data-campo="opcion"][data-q="0"]');
    const nOpciones = await opciones.count();
    for (let j = 0; j < nOpciones; j++) {
      await opciones.nth(j).fill(j === 0 ? OPCION_CORRECTA : 'Opción ' + (j + 1));
    }
    const radio = page.locator('input[name="correcta_0"]').first();
    await radio.check();
    log(true, 'P2 Pregunta configurada', `${PREGUNTA} / correcta=${OPCION_CORRECTA}`);

    // Título (ahora en la misma vista del editor)
    const tit = page.locator('#titulo');
    await tit.click();
    await tit.fill(TITULO);
    log(true, 'P2 Título puesto', TITULO);

    // Publicar
    await page.click('#btnPublicarEditor');
    try { await page.waitForSelector('.tarjeta-capitulo, .adm-tarjeta', { timeout: 10000 }); } catch (e) {}
    await esperar(800);
    const publicada = page.url().includes('#!/examenes');
    log(publicada, 'P2 Examen publicado', 'URL=' + page.url());

    // Publicar abre el modal "Enlace para toda la clase"; si no se abre, se abre desde la tarjeta
    try { await page.waitForSelector('#btnCrearEnlaceComunitario', { timeout: 5000 }); } catch (e) {}
    if (!(await page.locator('#btnCrearEnlaceComunitario').count())) {
      await page.goto(BASE + '/#!/examenes', { waitUntil: 'domcontentloaded' });
      await esperar(800);
      await page.locator('[data-accion="compartir"]').first().click();
      await page.waitForSelector('#btnCrearEnlaceComunitario', { timeout: 8000 }).catch(() => {});
    }
    // El modal carga sus enlaces de forma asíncrona: esperar a que termine antes de generar
    try {
      await page.waitForFunction(
        () => !document.querySelector('#listaEnlaces')?.textContent.includes('Cargando'),
        null, { timeout: 8000 }
      );
    } catch (e) {}
    if (await page.locator('#btnCrearEnlaceComunitario').count()) {
      await page.click('#btnCrearEnlaceComunitario');
    }
    try {
      await page.waitForFunction(
        () => /\/e\//.test(document.querySelector('#claveComunitario')?.textContent || ''),
        null, { timeout: 10000 }
      );
    } catch (e) {}
    const urlEnlace = ((await page.locator('#claveComunitario').textContent().catch(() => '')) || '').trim();
    log(/\/e\/[^/]+$/.test(urlEnlace), 'P2 Enlace de la clase generado', urlEnlace || 'N/A');

    // ============ PASO 3: Cerrar sesión y login alumno ============
    await cerrarSesion();
    await login(ALUMNO.usuario, ALUMNO.password);
    await esperar(500);
    const loginAl = (await page.locator('[data-login-form]').count()) === 0;
    log(loginAl, 'P3 Login alumno E2E');

    // ============ PASO 4: Responder al examen desde el enlace de la clase ============
    await page.goto(urlEnlace, { waitUntil: 'domcontentloaded' });
    try { await page.waitForSelector('#nombreAlumno', { timeout: 10000 }); } catch (e) {}
    const pideNombre = await page.locator('#nombreAlumno').count();
    log(pideNombre > 0, 'P4 Enlace abre el examen (pide nombre)', page.url());

    await page.fill('#nombreAlumno', NOMBRE_ALUMNO);
    await page.click('button:has-text("Comenzar examen")');
    try { await page.waitForSelector('#btnEntregar', { timeout: 10000 }); } catch (e) {}
    log((await page.locator('#btnEntregar').count()) > 0, 'P4 Examen cargado para responder');

    // Responder: primera opción (Génesis)
    await page.locator('label:has(input[type="radio"])').first().click();
    await esperar(600);

    // Entregar
    await page.click('#btnEntregar');
    await esperar(400);
    const confirmarEntrega = page.locator('button:has-text("Sí, entregar")');
    if (await confirmarEntrega.count()) await confirmarEntrega.click();
    try { await page.waitForSelector('#btnEntregar', { state: 'detached', timeout: 10000 }); } catch (e) {}
    await esperar(800);
    const entregado = (await page.locator('#btnEntregar').count()) === 0;
    log(entregado, 'P4 Examen entregado por el alumno');

    // ============ PASO 5: Profesor ve la entrega ============
    await cerrarSesion();
    await login(PROFESOR.usuario, PROFESOR.password);
    await page.goto(BASE + '/#!/examenes', { waitUntil: 'domcontentloaded' });
    try { await page.waitForSelector('text=' + TITULO, { timeout: 8000 }); } catch (e) {}
    await esperar(800);
    const tarjetaProf = page.locator('text=' + TITULO).first();
    const textoLista = await page.locator('#app-root').innerText().catch(() => '');
    const hayEntrega = /1 entregas?/.test(textoLista);
    log(await tarjetaProf.count() > 0 && hayEntrega, 'P5 Profesor ve 1 entrega en el examen', hayEntrega ? 'sí' : 'no');

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
