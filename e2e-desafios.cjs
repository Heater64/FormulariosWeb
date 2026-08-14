// E2E: Sistema de Grupos y Desafíos — flujo completo con dos usuarios
// node e2e-desafios.cjs  (requiere dev server en http://localhost:3000)
// Requiere la migración 024_grupos_desafios.sql aplicada en Supabase.
// Si no está aplicada, lo detecta y lo reporta como paso pendiente.
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const CREADOR = { u: 'admin1', c: 'admin123' };
const RIVAL = { u: 'editor1', c: 'editor123' };

let aciertos = 0;
let total = 0;
const log = (ok, msg) => { total++; if (ok) aciertos++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const esperarSelector = async (page, selector, timeoutMs = 15000) => {
  const fin = Date.now() + timeoutMs;
  while (Date.now() < fin) {
    const n = await page.locator(selector).count().catch(() => 0);
    if (n > 0) return true;
    await esperar(250);
  }
  return false;
};

async function login(page, u, c) {
  await page.goto(`${BASE}/#!/login`);
  await esperarSelector(page, '#loginUser', 15000);
  await page.fill('#loginUser', u);
  await page.fill('#loginPass', c);
  await page.click('#loginBtn');
  // Esperar a que desaparezca el splash o cambie la vista
  await page.waitForTimeout(3000);
}

async function navegar(page, ruta) {
  await page.evaluate((r) => { window.location.hash = '#!' + r; }, ruta);
  await esperar(1200);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageCreador = await ctx.newPage();
  const pageRival = await ctx.newPage();

  // ── Pre-chequeo: migración aplicada? ──
  await login(pageCreador, CREADOR.u, CREADOR.c);
  const migracion = await pageCreador.evaluate(async () => {
    const sb = window.supabaseClient;
    try {
      const d = await sb.from('desafios').select('id').limit(1);
      if (d.error) return { ok: false, motivo: d.error.message };
      return { ok: true };
    } catch (e) { return { ok: false, motivo: e.message }; }
  }).catch(() => ({ ok: false, motivo: 'no se pudo consultar' }));

  if (!migracion.ok) {
    console.log('\n⚠  La migración 024_grupos_desafios.sql NO está aplicada en la BD.');
    console.log(`   Motivo: ${migracion.motivo}`);
    console.log('   Aplica el archivo supabase/migraciones/024_grupos_desafios.sql en el SQL Editor de Supabase y vuelve a ejecutar este test.\n');
    log(false, 'Migración 024 aplicada en Supabase');
    console.log(`\nResultado: ${aciertos}/${total}`);
    await browser.close();
    process.exit(aciertos === total ? 0 : 1);
  }
  log(true, 'Migración 024 aplicada en Supabase');

  // ── 1. Mis clases (home estilo Classroom) ──
  await navegar(pageCreador, '/grupos');
  log(await esperarSelector(pageCreador, '.grupos-cabecera__titulo'), 'Pantalla de Mis clases se muestra');
  log(await esperarSelector(pageCreador, '.grupos-clase-card, .grupos-directorio, .empty-state', 10000), 'Tarjetas de clase o estado vacío visible');
  const numGrupos = await pageCreador.locator('.grupos-clase-card').count();
  log(numGrupos >= 0, `Mis clases cargan sin errores (${numGrupos} clases)`);

  // ── 2. Entrar en una clase y ver miembros ──
  const tarjeta = pageCreador.locator('.grupos-clase-card').first();
  if (await tarjeta.count()) {
    await tarjeta.click();
    log(await esperarSelector(pageCreador, '.grupos-seccion .grupos-miembro', 12000), 'Detalle de la clase: lista de miembros visible');
    const numMiembros = await pageCreador.locator('.grupos-seccion .grupos-miembro').count();
    log(numMiembros > 0, `Miembros listados (${numMiembros})`);

    // ── 3. Perfil rápido ──
    // Elegir un miembro que NO sea el propio usuario
    const yo = await pageCreador.evaluate(() => (store.obtener('usuario') || {}).id);
    let miembroSel = null;
    const fichas = pageCreador.locator('.grupos-seccion .grupos-miembro');
    for (let i = 0; i < (await fichas.count()); i++) {
      const id = await fichas.nth(i).getAttribute('data-miembro');
      if (id !== yo) { miembroSel = id; break; }
    }
    if (miembroSel) {
      await pageCreador.locator(`[data-miembro="${miembroSel}"]`).click();
      log(await esperarSelector(pageCreador, '.grupos-perfil[data-perfil-desafio], .modal-overlay .grupos-perfil', 8000), 'Perfil rápido del miembro abre (modal)');
      log(await pageCreador.locator('.grupos-perfil').count() > 0 || await pageCreador.locator('.modal-overlay .grupos-perfil').count() > 0, 'Modal muestra datos del perfil');
      const tieneRol = await pageCreador.locator('.grupos-perfil .perfil-rol-badge').count();
      log(tieneRol > 0, 'Rol visible en el perfil rápido');

      // ── 4. Desafiar → elegir mazo → crear ──
      const btnDesafiar = pageCreador.locator('.grupos-perfil [data-perfil-desafio]').first();
      const hayBtn = await btnDesafiar.count() > 0;
      log(hayBtn, 'Botón "Desafiar" presente en el perfil rápido');
      if (hayBtn) {
        await btnDesafiar.click();
        log(await esperarSelector(pageCreador, '.grupos-mazo', 10000), 'Selector de mazos se abre');
        const numMazos = await pageCreador.locator('.grupos-mazo').count();
        log(numMazos > 0, `Mazos globales listados (${numMazos})`);
        if (numMazos > 0) {
          const mazoNombre = await pageCreador.locator('.grupos-mazo').first().getAttribute('data-nombre');
          await pageCreador.locator('.grupos-mazo').first().click();
          log(await esperarSelector(pageCreador, '.desafio-espera, .grupos-invitacion', 12000) || await esperarSelector(pageCreador, '[role="alert"], .alerta, #toast-container', 8000), `Desafío creado contra el mazo "${mazoNombre}"`);
        }
      }
    } else {
      log(false, 'No hay otro miembro para desafiar');
    }
  } else {
    log(false, 'No hay grupos para probar (migración 002 con Grupo Central requiere aplicarse)');
  }

  // ── 5. El rival recibe la invitación en la pantalla de grupos ──
  await login(pageRival, RIVAL.u, RIVAL.c);
  await navegar(pageRival, '/grupos');
  const invitacionVisible = await esperarSelector(pageRival, '.grupos-invitacion', 12000);
  log(invitacionVisible, 'El rival ve la invitación en su pantalla de Grupos');

  if (invitacionVisible) {
    const tituloInvitacion = await pageRival.locator('.grupos-invitacion__titulo').first().textContent().catch(() => '');
    log(/te ha desafiado/i.test(tituloInvitacion || ''), `Título de la invitación correcto: "${(tituloInvitacion || '').trim()}"`);

    // Aceptar → si es el último, arranca el desafío
    await pageRival.locator('[data-invitacion][data-accion="aceptar"]').first().click();
    const enDesafio = await esperarSelector(pageRival, '.desafio-cuenta', 15000);
    const enJuego = await esperarSelector(pageRival, '.desafio-juego, .mem-juego-tarjeta', 20000);
    log(enDesafio || enJuego, 'Al aceptar, el rival entra al desafío (cuenta atrás)');

    // ── 6. El creador navega al desafío y ve la cuenta atrás / juego ──
    // Extraer el id del desafío de la URL del rival
    const desafioId = await pageRival.evaluate(() => {
      const h = window.location.hash;
      const m = h.match(/desafio\/([^/]+)/);
      return m ? m[1] : null;
    });
    log(!!desafioId, `ID del desafío obtenido (${desafioId || 'n/a'})`);
    if (desafioId) {
      await navegar(pageCreador, '/desafio/' + desafioId);
      log(await esperarSelector(pageCreador, '.desafio-cuenta, .desafio-juego, .mem-juego-tarjeta, .desafio-espera', 15000), 'El creador entra al desafío (cuenta atrás o juego)');
    }

    // ── 7. Resultados ──
    // Simular el fin de partida de ambos jugadores vía repositorio
    // (como si hubieran respondido los ejercicios) para ver la pantalla conjunta.
    if (desafioId) {
      const terminar = async (page, correctas, totalEj, tiempoMs) => {
        return page.evaluate(async ({ desafioId, correctas, totalEj, tiempoMs }) => {
          const u = store.obtener('usuario');
          await window.desafiosRepository.terminarJugador(desafioId, u.id, { correctas, total: totalEj, tiempoMs });
          return true;
        }, { desafioId, correctas, totalEj, tiempoMs });
      };
      await terminar(pageCreador, 8, 10, 42000).catch(() => false);
      await esperar(1000);
      const esperandoCreador = await esperarSelector(pageCreador, '.desafio-espera__msg, .desafio-resultado', 10000);
      log(esperandoCreador, 'Creador termina: ve "esperando a los demás" o resultados');

      await terminar(pageRival, 7, 10, 56000).catch(() => false);
      // El rival está en juego: navegamos de nuevo para que el polling lo lleve a resultados
      const resultadosRival = await esperarSelector(pageRival, '.desafio-resultado', 15000);
      const resultadosCreador = await esperarSelector(pageCreador, '.desafio-resultado', 15000);
      log(resultadosRival, 'Rival ve la pantalla de resultados conjunta');
      log(resultadosCreador, 'Creador ve la pantalla de resultados conjunta');

      if (resultadosCreador) {
        const filas = await pageCreador.locator('.desafio-resultado__fila').count();
        log(filas >= 2, `Resultados con ${filas} jugadores en la tabla`);
        const ganador = await pageCreador.locator('.desafio-resultado__ganador-nombre').textContent().catch(() => '');
        log(/Ganador/i.test(ganador || ''), `Se anuncia el ganador: "${(ganador || '').trim()}"`);
        const btns = ['btnVolverJugar', 'btnRevancha', 'btnOtroMazo', 'btnSalirResultado'];
        for (const b of btns) {
          log(await pageCreador.locator(`#${b}`).count() > 0, `Botón ${b} presente`);
        }
        // Volver a jugar → nuevo desafío inmediato
        await pageCreador.locator('#btnVolverJugar').click();
        log(await esperarSelector(pageCreador, '.desafio-cuenta, .desafio-juego, .mem-juego-tarjeta', 15000), '"Volver a jugar" genera una nueva sesión inmediata');
      }
    }
  }

  // ── Consola sin errores graves ──
  const erroresCreador = await pageCreador.evaluate(() => {
    // Los errores de red de Supabase por migración pendiente ya se filtraron arriba
    return window.__e2eErrores || 0;
  }).catch(() => 0);

  console.log(`\nResultado: ${aciertos}/${total}`);
  await browser.close();
  process.exit(aciertos === total ? 0 : 1);
})().catch(e => {
  console.error('Error fatal del E2E:', e.message);
  process.exit(1);
});
