// E2E Responsive: Perfil + Paneles Admin/Owner en móvil (375px) y tablet (768px)
// node e2e-responsive.cjs  (requiere dev server en http://localhost:3000)
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const ADMIN_U = 'admin1';
const ADMIN_C = 'admin123';
const OWNER_U = 'owner';
const OWNER_C = 'owner123';

let aciertos = 0;
let total = 0;
const log = (ok, msg) => { total++; if (ok) aciertos++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // ---- Utilidades de medición responsive ----
  const medirOverflow = () => page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    // Elementos que desbordan el viewport (excluye scroll horizontal intencional de tabs)
    const culpables = [];
    document.querySelectorAll('main, .vista, .admin-contenido, section, .tarjeta, .o-grid, .perfil-stats, .admin-dashboard').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 2 && r.width > 30) {
        culpables.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} (right=${Math.round(r.right)})`);
      }
    });
    return { overflow, culpables: culpables.slice(0, 6) };
  });

  const medirSolapamiento = (selector, contenedor) => page.evaluate(({ selector, contenedor }) => {
    const cont = contenedor ? document.querySelector(contenedor) : document;
    if (!cont) return [];
    const items = cont.querySelectorAll(selector);
    const rects = [...items].map(el => el.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
    const solapados = [];
    for (let i = 0; i < rects.length - 1; i++) {
      const a = rects[i], b = rects[i + 1];
      // Mismo eje horizontal y solape vertical > 8px (evita falsos positivos por margen)
      const solapeV = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const mismoEjeH = Math.abs(a.left - b.left) < 20;
      if (mismoEjeH && solapeV > 8) {
        solapados.push({ i, solape: Math.round(solapeV) });
      }
    }
    return solapados;
  }, { selector, contenedor });

  // ---- Sesión y navegación ----
  let page;
  const nuevaPagina = async (w, h) => {
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width: w, height: h } });
    const consoleErrors = [];
    page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/404|failed to load resource/i.test(m.text())) consoleErrors.push('CONSOLE: ' + m.text()); });
    page.__errors = consoleErrors;
    await page.addInitScript(() => {
      const obs = new MutationObserver(() => {
        document.querySelectorAll('.login-setup').forEach(el => el.remove());
      });
      obs.observe(document, { childList: true, subtree: true });
    });
    return page;
  };

  const login = async (u, c) => {
    await page.goto(BASE + '/#!/login', { waitUntil: 'domcontentloaded' });
    await esperar(600);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    // Esperar a que el formulario esté visible antes de rellenar
    await page.waitForSelector('#loginUser', { timeout: 8000 });
    await esperar(400);
    await page.fill('#loginUser', u);
    await page.fill('#loginPass', c);
    await page.click('#loginBtn');
    // Esperar (polling) a que la sesión quede guardada con el usuario correcto
    for (let i = 0; i < 30; i++) {
      const ok = await page.evaluate((u) => {
        const s = localStorage.getItem('fb_usuario');
        if (!s) return false;
        try { return JSON.parse(s).username === u; } catch { return false; }
      }, u);
      if (ok) break;
      await esperar(400);
    }
    await esperar(800);
  };

  const VIEWPORTS = [
    { nombre: 'MÓVIL 375x812', w: 375, h: 812, tag: 'movil' },
    { nombre: 'TABLET 768x1024', w: 768, h: 1024, tag: 'tablet' }
  ];

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n========== ${vp.nombre} ==========`);

      // ---- Perfil (admin1) ----
      await nuevaPagina(vp.w, vp.h);
      await login(ADMIN_U, ADMIN_C);
      // Navegar a /perfil como usuario real: el login aterriza en /estudio; cambiamos
      // el hash (hashchange → router) SIN recarga completa. Una recarga a mitad del
      // handler auth:login (con awaits a Supabase) hacía que el router redirigiera a
      // /estudio al restaurar la sesión (carrera de arranque).
      for (let i = 0; i < 25; i++) {
        const h = await page.evaluate(() => location.hash);
        if (h === '#!/estudio') break;
        await esperar(400);
      }
      await page.evaluate(() => { location.hash = '#!/perfil'; });
      // El perfil actual (rediseñado) usa .perfil-cabecera y .perfil-seccion;
      // la fila de stats (#perfilStats) ya no existe.
      try { await page.waitForSelector('.perfil-cabecera', { timeout: 10000 }); } catch {}
      await esperar(600);
      const oP = await medirOverflow();
      log(oP.overflow <= 0, `Perfil sin overflow horizontal (desborde=${oP.overflow}px)${oP.culpables.length ? ' → ' + oP.culpables.join(', ') : ''}`);
      const secOver = await medirSolapamiento('.perfil-seccion', null);
      log(secOver.length === 0, `Perfil: secciones sin solaparse (${secOver.length} solapamientos)`);
      const secCaben = await page.evaluate(() => {
        const secs = [...document.querySelectorAll('.perfil-seccion')];
        return secs.every(s => s.getBoundingClientRect().width <= window.innerWidth);
      });
      log(secCaben, `Perfil: secciones caben en pantalla (${vp.w}px)`);
      const btnVisibles = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('.perfil-btn-full, .perfil-boton-seccion, .perfil-btn-cerrar, .perfil-segmented__btn')];
        return btns.filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.right <= window.innerWidth; }).length;
      });
      log(btnVisibles > 0, `Perfil: ${btnVisibles} botones visibles sin deformar`);
      await page.screenshot({ path: `e2e-responsive-perfil-${vp.tag}.png`, fullPage: true });

      // ---- Panel Admin ----
      await page.goto(BASE + '/paginas/admin/panel-admin.html', { waitUntil: 'domcontentloaded' });
      try { await page.waitForSelector('#adminContenido', { timeout: 8000 }); } catch {}
      await esperar(800);
      const oA = await medirOverflow();
      log(oA.overflow <= 0, `Panel admin sin overflow horizontal (desborde=${oA.overflow}px)${oA.culpables.length ? ' → ' + oA.culpables.join(', ') : ''}`);
      const statsA = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('#adminContenido .tarjeta-estadistica')];
        const rects = cards.map(c => c.getBoundingClientRect());
        if (!rects.length) return { count: 0, bien: false };
        const bien = rects.every(r => r.left >= 0 && r.right <= window.innerWidth && r.width >= 80);
        return { count: rects.length, bien };
      });
      log(statsA.count >= 4, `Admin: ${statsA.count} tarjetas de estadística`);
      log(statsA.bien, `Admin: tarjetas de stats dentro de pantalla y con ancho mínimo`);
      const tabsA = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll('.admin-tab')];
        const rects = tabs.map(t => t.getBoundingClientRect());
        return { count: tabs.length, bien: rects.every(r => r.width > 0 && r.right <= window.innerWidth + 2) };
      });
      log(tabsA.count >= 4, `Admin: ${tabsA.count} pestañas`);
      log(tabsA.bien, `Admin: pestañas no desbordan (scroll horizontal permitido si es contenedor)`);
      await page.click('.admin-tab[data-tab="examenes"]').catch(() => {});
      await esperar(900);
      const exSolape = await medirSolapamiento('.admin-examen-card');
      log(exSolape.length === 0, `Admin: cards de examen sin solaparse (${exSolape.length})`);
      await page.screenshot({ path: `e2e-responsive-admin-${vp.tag}.png`, fullPage: true });

      // ---- Panel unificado (owner: switch de nivel + nivel Owner) ----
      await login(OWNER_U, OWNER_C);
      await page.goto(BASE + '/paginas/admin/panel-admin.html', { waitUntil: 'domcontentloaded' });
      try { await page.waitForSelector('#adminContenido', { timeout: 8000 }); } catch {}
      await esperar(800);
      const oO = await medirOverflow();
      log(oO.overflow <= 0, `Panel unificado sin overflow horizontal (desborde=${oO.overflow}px)${oO.culpables.length ? ' → ' + oO.culpables.join(', ') : ''}`);
      // Cambiar al nivel Owner (Administración general)
      await page.evaluate(() => document.querySelector('.admin-nivel__btn[data-nivel="owner"]')?.click());
      await esperar(900);
      const tabsO = await page.evaluate(() => document.querySelectorAll('.admin-tab').length);
      log(tabsO >= 4, `Owner: ${tabsO} pestañas (nivel Owner)`);
      const resumenO = await page.evaluate(() => {
        const r = document.querySelector('.owner-sug-resumen');
        return r ? Math.round(r.getBoundingClientRect().width) <= window.innerWidth : true;
      });
      log(resumenO, `Owner: resumen de sugerencias cabe en pantalla`);
      await page.screenshot({ path: `e2e-responsive-owner-${vp.tag}.png`, fullPage: true });

      // Errores de consola de esta vista
      const errs = page.__errors || [];
      log(errs.length === 0, `Sin errores de consola (${errs.length}${errs.length ? ' → ' + errs.join(' | ') : ''})`);
    }

    console.log(`\n=== Resultado responsive: ${aciertos}/${total} ===`);
  } catch (e) {
    log(false, 'EXCEPCIÓN: ' + e.message);
  }

  await browser.close();
  process.exit(aciertos === total ? 0 : 1);
})();
