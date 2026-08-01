/* E2E: flujo completo de notas en FormsBiblicos (http://localhost:3000)
   1. Login admin1/admin123
   2. Crear nota personal (libro Génesis, capítulo 1)
   3. Buscar la nota en el buscador
   4. Ver la nota individual
   5. Editar la nota (TipTap) y guardar
   6. Eliminar la nota y verificar que desaparece
   7. Limpieza: cualquier nota de prueba residual */
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
// notas_capitulo tiene RLS deshabilitado (migración 015): la anon key puede borrar.
const SB_KEY = 'sb_publishable_UvqSGCMonC_9ncBmYV14tw_PLM6-9R8';
const SB_URL = 'https://josxcvncescqqlajahkh.supabase.co';

const errores = [];
let exitCode = 0;

// Limpia notas de prueba residuales de ejecuciones anteriores/fracturadas.
async function limpiarNotasE2E() {
  try {
    const r = await fetch(
      SB_URL + '/rest/v1/notas_capitulo?contenido=ilike.*Texto%20de%20prueba%20E2E*',
      { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } }
    );
    const notas = await r.json();
    if (Array.isArray(notas) && notas.length) {
      for (const n of notas) {
        await fetch(SB_URL + '/rest/v1/notas_capitulo?id=eq.' + n.id, {
          method: 'DELETE',
          headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, Prefer: 'return=minimal' }
        });
      }
      console.log('🧹 Limpieza previa: ' + notas.length + ' nota(s) de prueba eliminada(s)');
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

  try {
    // ============ P1: Login ============
    await limpiarNotasE2E();
    await login('admin1', 'admin123');
    const loginOk = (await page.locator('#loginForm').count()) === 0;
    log(loginOk, 'P1 Login admin1/admin123', 'URL=' + page.url());

    // ============ P2: Ir a notas y crear nota ============
    await page.goto(BASE + '/#!/notas', { waitUntil: 'domcontentloaded' });
    await esperar(1200);
    const hayNueva = await page.locator('#btnNueva').count();
    log(hayNueva > 0, 'P2 Vista de notas', 'URL=' + page.url());

    await page.click('#btnNueva');
    await esperar(800);
    // Seleccionar libro Génesis y capítulo 1
    await page.selectOption('#fLibro', { label: 'Génesis' });
    await page.fill('#fCap', '1');
    // Escribir en el editor TipTap (contenteditable .tiptap-editor)
    const editor = page.locator('#fContenido .tiptap-editor');
    await editor.click();
    await page.keyboard.type('Texto de prueba E2E para la nota de verificación.');
    await esperar(400);
    const contenidoOk = (await editor.innerText()).includes('Texto de prueba E2E');
    log(contenidoOk, 'P2 Contenido escrito en el editor TipTap');

    await page.click('#btnGuardar');
    await esperar(1200);
    const enCapitulo = await page.locator('#listaNotasCap').count();
    const notaCreada = (await page.locator('#app-root').innerText().catch(() => '')).includes('Texto de prueba E2E');
    log(enCapitulo > 0 && notaCreada, 'P2 Nota creada y visible en capítulo', 'URL=' + page.url());

    // ============ P3: Buscar la nota ============
    // Desde la lista de capítulos, #btnV vuelve a la lista de libros (home con buscador)
    await page.click('#btnV'); // _listaNotasCap → _listaCapitulos
    await esperar(600);
    await page.click('#btnV'); // _listaCapitulos → _pintar (home con #buscarNotas)
    await esperar(800);
    const buscar = page.locator('#buscarNotas');
    if (await buscar.count()) {
      await buscar.fill('Texto de prueba E2E');
      await esperar(500);
      const resultados = await page.locator('#resultadosBusqueda').innerText().catch(() => '');
      log(resultados.includes('Texto de prueba E2E'), 'P3 Búsqueda encuentra la nota', resultados.slice(0, 60).replace(/\n/g, ' '));
      await buscar.fill('');
      await esperar(300);
    } else {
      log(false, 'P3 Búsqueda (no se encontró #buscarNotas en la home)');
    }

    // ============ P4: Ver nota individual y editar ============
    // (ya estamos en la home de notas) → Génesis → capítulo 1
    await esperar(300);
    const tarjetaLibro = page.locator('[data-libro="Génesis"]').first();
    await tarjetaLibro.click();
    await esperar(800);
    const tarjetaCap = page.locator('[data-cap="1"]').first();
    await tarjetaCap.click();
    await esperar(800);
    const notaCard = page.locator('#listaNotasCap [data-id]', { hasText: 'Texto de prueba E2E' }).first();
    log(await notaCard.count() > 0, 'P4 Nota en lista de capítulo');

    await notaCard.click(); // ver nota individual
    await esperar(800);
    const enDetalle = (await page.locator('#app-root').innerText().catch(() => '')).includes('Texto de prueba E2E');
    log(enDetalle, 'P4 Vista individual de la nota');

    // Editar
    await page.click('#btnEdit');
    await esperar(800);
    const editor2 = page.locator('#fContenido .tiptap-editor');
    await editor2.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Contenido editado.');
    await esperar(300);
    await page.click('#btnGuardar');
    await esperar(1200);
    const editadoOk = (await page.locator('#app-root').innerText().catch(() => '')).includes('Contenido editado.');
    log(editadoOk, 'P4 Nota editada y guardada');

    // ============ P5: Eliminar ============
    await page.click('#btnDel');
    await confirmarDialogo();
    await esperar(1000);
    const trasBorrar = await page.locator('#app-root').innerText().catch(() => '');
    const sinNota = !trasBorrar.includes('Texto de prueba E2E');
    log(sinNota, 'P5 Nota eliminada', 'queda en lista de capítulo (vacía) o libros');

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
    await limpiarNotasE2E(); // limpieza de seguridad si el flujo falló a mitad
    await browser.close();
    process.exit(exitCode);
  }
})();
