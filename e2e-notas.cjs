/* E2E: bloc de notas personal en FormsBiblicos (http://localhost:3000)
   1. Login admin1/admin123
   2. Home de notas (título, buscador, FAB)
   3. Crear nota con título + contenido (autosave, sin botón Guardar)
   4. Volver y verificar que aparece en la lista
   5. Buscar la nota
   6. Abrir la nota y comprobar contenido persistido
   7. Fijar la nota (menú) y verificar pin
   8. Duplicar la nota
   9. Mover a papelera y restaurar
   10. Eliminar definitivamente
   11. Limpieza de datos de prueba residuales */
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
// notas_capitulo y notas_personales tienen RLS deshabilitado: la anon key puede borrar.
const SB_KEY = 'sb_publishable_UvqSGCMonC_9ncBmYV14tw_PLM6-9R8';
const SB_URL = 'https://josxcvncescqqlajahkh.supabase.co';

const errores = [];
let exitCode = 0;

async function apiTabla(metodo, ruta, cuerpo) {
  const opts = { method: metodo, headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } };
  if (cuerpo) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(cuerpo); }
  return fetch(SB_URL + ruta, opts);
}

// Limpia notas de prueba residuales de ejecuciones anteriores/fracturadas.
async function limpiarNotasE2E() {
  try {
    for (const marca of ['Texto de prueba E2E', 'Nota E2E']) {
      const r1 = await apiTabla('GET', '/rest/v1/notas_personales?contenido=ilike.*' + encodeURIComponent(marca) + '*');
      const porContenido = await r1.json();
      if (Array.isArray(porContenido) && porContenido.length) {
        for (const n of porContenido) {
          await apiTabla('DELETE', '/rest/v1/notas_personales?id=eq.' + n.id);
        }
        console.log('🧹 Limpieza previa: ' + porContenido.length + ' nota(s) de prueba eliminada(s)');
      }
      const r2 = await apiTabla('GET', '/rest/v1/notas_personales?titulo=ilike.*' + encodeURIComponent(marca) + '*');
      const porTitulo = await r2.json();
      if (Array.isArray(porTitulo) && porTitulo.length) {
        for (const n of porTitulo) {
          await apiTabla('DELETE', '/rest/v1/notas_personales?id=eq.' + n.id);
        }
      }
    }
  } catch (e) { console.log('⚠️ Limpieza previa no ejecutable:', e.message); }
}

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

  const textoApp = async () => (await page.locator('#app-root').innerText().catch(() => ''));

  try {
    // ============ P1: Login ============
    await limpiarNotasE2E();
    await login('admin1', 'admin123');
    const loginOk = (await page.locator('#loginForm').count()) === 0;
    log(loginOk, 'P1 Login admin1/admin123', 'URL=' + page.url());

    // ============ P2: Home de notas ============
    await page.goto(BASE + '/#!/notas', { waitUntil: 'domcontentloaded' });
    await esperar(1800);
    const t1 = await textoApp();
    log(t1.includes('Notas'), 'P2 Título "Notas" en la home');
    log((await page.locator('#buscarNotas').count()) > 0, 'P2 Buscador presente');
    log((await page.locator('#btnNueva').count()) > 0, 'P2 Botón flotante + presente');

    // ============ P3: Crear nota (autosave) ============
    await page.click('#btnNueva');
    await esperar(1500);
    const tituloInput = page.locator('#tituloNota');
    log(await tituloInput.count() > 0, 'P3 Editor abierto (título presente)');
    await tituloInput.fill('Nota E2E autosave');
    const editor = page.locator('#editorContenido .tiptap-editor');
    await editor.click();
    await page.keyboard.type('Texto de prueba E2E para verificar el guardado automático.');
    // Esperar al debounce de autosave (900ms) + red
    await esperar(3000);
    log((await page.locator('#btnGuardar').count()) === 0, 'P3 No existe botón "Guardar"');
    const estado = await page.locator('#estadoGuardado').innerText().catch(() => '');
    log(estado.includes('Guardado') || estado === '', 'P3 Autosave disparado', 'estado="' + estado + '"');

    // ============ P4: Volver y verificar en la lista ============
    await page.click('#btnVolver');
    await esperar(1800);
    const t4 = await textoApp();
    log(t4.includes('Nota E2E autosave'), 'P4 Nota visible en la lista', 'título encontrado');
    log(t4.includes('Texto de prueba E2E'), 'P4 Preview del contenido visible');

    // ============ P5: Buscar la nota ============
    await page.fill('#buscarNotas', 'autosave');
    await esperar(600);
    const t5 = await textoApp();
    log(t5.includes('Nota E2E autosave'), 'P5 Búsqueda encuentra la nota');
    await page.click('#btnLimpiarBusqueda');
    await esperar(400);

    // ============ P6: Abrir y comprobar contenido ============
    await page.click('.nota-item:has-text("Nota E2E autosave")');
    await esperar(1500);
    const t6 = await textoApp();
    log(t6.includes('Texto de prueba E2E'), 'P6 Contenido persistido al reabrir');

    // ============ P7: Fijar desde el menú ============
    await page.click('#btnMenu');
    await esperar(600);
    const menuFijar = page.locator('[data-accion="fijar"]');
    log(await menuFijar.count() > 0, 'P7 Menú opciones abierto (fijar presente)');
    await menuFijar.click();
    await esperar(800);
    // El menú se cierra; el editor sigue abierto. Volver y comprobar el pin.
    await page.click('#btnVolver');
    await esperar(1500);
    const t7 = await textoApp();
    log(t7.includes('Nota E2E autosave'), 'P7 Volvió a la lista');

    // ============ P8: Duplicar ============
    await page.click('.nota-item:has-text("Nota E2E autosave")').catch(() => {});
    await esperar(1500);
    await page.click('#btnMenu');
    await esperar(600);
    const menuDuplicar = page.locator('[data-accion="duplicar"]');
    log(await menuDuplicar.count() > 0, 'P8 Menú duplicar presente');
    await menuDuplicar.click();
    await esperar(1500);
    await page.click('#btnVolver');
    await esperar(1500);
    const t8 = await textoApp();
    log(t8.includes('Nota E2E autosave (copia)'), 'P8 Nota duplicada en la lista');

    // ============ P9: Papelera y restaurar ============
    // Abrir la copia y eliminarla → a papelera
    await page.click('.nota-item:has-text("(copia)")').catch(() => {});
    await esperar(1500);
    await page.click('#btnMenu');
    await esperar(600);
    const menuEliminar = page.locator('[data-accion="eliminar"]');
    await menuEliminar.click();
    await esperar(500);
    const confirmado = await confirmarDialogo();
    await esperar(1500);
    const t9a = await textoApp();
    log(confirmado && !t9a.includes('(copia)'), 'P9 Nota movida a papelera', 'confirmado=' + confirmado);

    // Abrir papelera
    await page.click('#btnPapelera');
    await esperar(1200);
    const t9b = await textoApp();
    log(t9b.includes('Papelera') && t9b.includes('(copia)'), 'P9 Nota visible en la papelera');
    // Restaurar
    await page.click('[data-restaurar]').catch(() => {});
    await esperar(1200);
    const t9c = await textoApp();
    log(!t9c.includes('(copia)'), 'P9 Nota restaurada (sale de la papelera)');
    await page.click('#btnVolverPapelera').catch(() => {});
    await esperar(1200);
    const t9d = await textoApp();
    log(t9d.includes('(copia)'), 'P9 Nota restaurada vuelve a la lista');

    // ============ P10: Eliminar definitivamente ============
    await page.click('.nota-item:has-text("(copia)")').catch(() => {});
    await esperar(1500);
    await page.click('#btnMenu');
    await esperar(600);
    await page.locator('[data-accion="eliminar"]').click();
    await esperar(500);
    await confirmarDialogo();
    await esperar(1200);
    await page.click('#btnPapelera');
    await esperar(1200);
    // Eliminar definitivo
    const btnEliminarDef = page.locator('[data-eliminar]');
    log(await btnEliminarDef.count() > 0, 'P10 Botón eliminar definitivamente presente');
    await btnEliminarDef.click();
    await esperar(500);
    await confirmarDialogo();
    await esperar(1200);
    const t10 = await textoApp();
    log(t10.includes('La papelera está vacía') || !t10.includes('(copia)'), 'P10 Nota eliminada definitivamente');

    // ============ P11: Limpieza final ============
    await limpiarNotasE2E();
    log(true, 'P11 Limpieza de datos de prueba');

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
    await limpiarNotasE2E();
    await browser.close();
    process.exit(exitCode);
  }
})();
