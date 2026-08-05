// Auditoría Responsive completa: recorre TODAS las vistas de la app en varios viewports
// y reporta overflow horizontal, elementos que desbordan y solapamientos de tarjetas.
// node auditoria-responsive.cjs  (requiere dev server en http://localhost:3000)
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const ADMIN_U = 'admin1';
const ADMIN_C = 'admin123';

let aciertos = 0;
let total = 0;
const log = (ok, msg) => { total++; if (ok) aciertos++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let page;

  const nuevaPagina = async (w, h) => {
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width: w, height: h } });
    const consoleErrors = [];
    page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/404|failed to load resource|favicon/i.test(m.text())) consoleErrors.push('CONSOLE: ' + m.text()); });
    page.__errors = consoleErrors;
    await page.addInitScript(() => {
      const obs = new MutationObserver(() => {
        document.querySelectorAll('.login-setup, #updateCard').forEach(el => el.remove());
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
    await page.waitForSelector('#loginUser', { timeout: 10000 }).catch(() => {});
    await esperar(500);
    await page.fill('#loginUser', u);
    await page.fill('#loginPass', c);
    await page.click('#loginBtn');
    for (let i = 0; i < 40; i++) {
      const ok = await page.evaluate((u) => {
        const s = localStorage.getItem('fb_usuario');
        if (!s) return false;
        try { return JSON.parse(s).username === u; } catch { return false; }
      }, u);
      if (ok) break;
      await esperar(400);
    }
    await esperar(900);
  };

  // Espera a que la vista esté montada y el splash oculto, con margen de asentamiento
  const esperarVista = async (tiempoMax = 12000) => {
    const fin = Date.now() + tiempoMax;
    while (Date.now() < fin) {
      const listo = await page.evaluate(() => {
        const splash = document.getElementById('splashScreen');
        const splashOculto = !splash || splash.style.display === 'none' || splash.hidden || splash.classList.contains('splash--oculto');
        return splashOculto && document.getElementById('app-root')?.children.length > 0;
      }).catch(() => false);
      if (listo) break;
      await esperar(250);
    }
    await esperar(900); // asentamiento de renders asíncronos
  };

  const irSpa = async (ruta) => {
    await page.evaluate((r) => { location.hash = '#!/' + r; }, ruta);
    await esperarVista();
  };

  // ---- Medidas ----
  const medir = () => page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    const culpables = [];
    const todos = document.querySelectorAll('main *, section, article, .o-grid, .tarjeta, .admin-lista, .admin-seccion, .perfil-seccion, table');
    todos.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > window.innerWidth + 2 && r.width > 40) {
        culpables.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ').slice(0, 2).join('.') : ''} (der=${Math.round(r.right)})`);
      }
    });
    return { overflow, culpables: culpables.slice(0, 8) };
  });

  const medirSolape = (selector) => page.evaluate((sel) => {
    const items = [...document.querySelectorAll(sel)].map(el => el.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
    const solapados = [];
    for (let i = 0; i < items.length - 1; i++) {
      const a = items[i], b = items[i + 1];
      const solapeV = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (Math.abs(a.left - b.left) < 20 && solapeV > 8) solapados.push({ i, solape: Math.round(solapeV) });
    }
    return solapados.length;
  }, selector);

  const btnMinimos = () => page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, .btn-primario, .btn-secundario, [role="button"]')];
    return btns.filter(b => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.height < 36 && r.width > 0;
    }).length;
  });

  const VIEWPORTS = [
    { nombre: 'MÓVIL 360x740', w: 360, h: 740, tag: 'movil360' },
    { nombre: 'MÓVIL 375x812', w: 375, h: 812, tag: 'movil' },
    { nombre: 'TABLET 768x1024', w: 768, h: 1024, tag: 'tablet' },
    { nombre: 'PC 1024x768', w: 1024, h: 768, tag: 'pc' },
    { nombre: 'PC 1440x900', w: 1440, h: 900, tag: 'pc1440' }
  ];

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n========== ${vp.nombre} ==========`);
      await nuevaPagina(vp.w, vp.h);
      await login(ADMIN_U, ADMIN_C);

      // Rutas SPA principales
      const rutas = [
        'estudio', 'explorar', 'mapa', 'examenes', 'memorizacion',
        'progreso', 'perfil', 'grupos', 'admin', 'calificaciones',
        'editor/nuevo'
      ];

      // Descubrir ids dinámicos (libro y examen) una vez por viewport
      let libroId = null, examenId = null;
      await irSpa('examenes');
      examenId = await page.evaluate(() => {
        const el = document.querySelector('[data-id]');
        return el ? el.getAttribute('data-id') : null;
      }).catch(() => null);
      // Ruta de estudio de un libro: el 1 (Génesis) es seguro
      libroId = 1;

      for (const ruta of rutas) {
        await irSpa(ruta);
        const m = await medir();
        log(m.overflow <= 0,
          `${ruta}: sin overflow (${m.overflow}px)${m.culpables.length ? ' → ' + m.culpables.slice(0, 3).join(' | ') : ''}`);
        const solape = await medirSolape('.o-grid > *, .admin-grid-tarjetas > *, .admin-vista-general__stats > *, .o-grid-tarjetas > *');
        log(solape === 0, `${ruta}: tarjetas sin solaparse (${solape})`);
        // Texto recortado por contenedores rígidos (nowrap con overflow que esconde contenido)
        const textoCortado = await page.evaluate(() => {
          const cortados = [];
          document.querySelectorAll('main *').forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.whiteSpace === 'nowrap' && (cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis')) {
              if (el.scrollWidth > el.clientWidth + 2 && el.textContent && el.textContent.trim().length > 3) {
                cortados.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} (${el.textContent.trim().slice(0, 18)}…)`);
              }
            }
          });
          return cortados.slice(0, 6);
        });
        log(textoCortado.length === 0, `Sin texto recortado en ${ruta} (${textoCortado.length}${textoCortado.length ? ' → ' + textoCortado.join(' | ') : ''})`);
        // Barra de navegación inferior en móvil
        if (vp.w <= 480) {
          const navInfo = await page.evaluate(() => {
            const nav = document.querySelector('.barra-navegacion-inferior, .barra-accion');
            if (!nav) return { hay: false };
            const r = nav.getBoundingClientRect();
            return { hay: true, izquierda: Math.round(r.left), derecha: Math.round(r.right), visible: r.left >= -1 && r.right <= window.innerWidth + 1 };
          });
          if (navInfo.hay) log(navInfo.visible, `Nav inferior ${ruta}: ${navInfo.visible ? 'dentro' : 'FUERA (' + navInfo.izquierda + '→' + navInfo.derecha + 'px)'}`);
        }
        if (m.overflow > 0) {
          const nombre = 'audit-' + vp.tag + '-' + ruta.replace(/[\/:]/g, '_') + '.png';
          await page.screenshot({ path: nombre, fullPage: true }).catch(() => {});
        }
      }

      // Adaptación de rejillas: en escritorio deben caber más columnas que en móvil
      if (vp.w >= 1024) {
        const gridInfo = await page.evaluate(() => {
          const g = document.querySelector('.o-grid');
          if (!g) return null;
          const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length;
          return { cols, primerHijo: g.children[0] ? Math.round(g.children[0].getBoundingClientRect().width) : 0 };
        });
        if (gridInfo && gridInfo.cols >= 2) {
          log(true, `Adaptación PC: grid con ${gridInfo.cols} columnas`);
        }
      }
      if (vp.w >= 1440) {
        await irSpa('estudio');
        const contenedor = await page.evaluate(() => {
          const c = document.querySelector('.o-contenedor');
          if (!c) return null;
          return { ancho: Math.round(c.getBoundingClientRect().width), maxW: getComputedStyle(c).maxWidth };
        });
        log(contenedor && contenedor.ancho <= 1280, `Contenido centrado: contenedor ${contenedor ? contenedor.ancho + 'px' : '—'} (máx ${contenedor ? contenedor.maxW : '—'})`);
      }

      // Rutas dinámicas
      if (libroId) {
        await irSpa('estudio/libro/' + libroId);
        const m1 = await medir();
        log(m1.overflow <= 0, `estudio/libro/${libroId}: sin overflow (${m1.overflow}px)${m1.culpables.length ? ' → ' + m1.culpables.slice(0, 3).join(' | ') : ''}`);
        await irSpa('estudio/sesion/' + libroId + '/1');
        const m2 = await medir();
        log(m2.overflow <= 0, `estudio/sesion/${libroId}/1: sin overflow (${m2.overflow}px)${m2.culpables.length ? ' → ' + m2.culpables.slice(0, 3).join(' | ') : ''}`);
      }
      if (examenId) {
        await irSpa('tomar/' + examenId);
        const m3 = await medir();
        log(m3.overflow <= 0, `tomar/${examenId}: sin overflow (${m3.overflow}px)${m3.culpables.length ? ' → ' + m3.culpables.slice(0, 3).join(' | ') : ''}`);
        await irSpa('editor/' + examenId);
        const m4 = await medir();
        log(m4.overflow <= 0, `editor/${examenId}: sin overflow (${m4.overflow}px)${m4.culpables.length ? ' → ' + m4.culpables.slice(0, 3).join(' | ') : ''}`);
      }

      // Botones demasiado pequeños (tap targets)
      const btnPequenos = await btnMinimos();
      log(btnPequenos <= 5, `Botones < 36px de alto: ${btnPequenos} (se permiten ≤5 iconos)`);

      // Página standalone: login
      await page.goto(BASE + '/paginas/login.html', { waitUntil: 'domcontentloaded' });
      await esperar(1500);
      const mLogin = await medir();
      log(mLogin.overflow <= 0, `login.html: sin overflow (${mLogin.overflow}px)${mLogin.culpables.length ? ' → ' + mLogin.culpables.slice(0, 3).join(' | ') : ''}`);

      // Página standalone: panel admin
      await page.goto(BASE + '/paginas/admin/panel-admin.html', { waitUntil: 'domcontentloaded' });
      await esperar(2500);
      const mAdmin = await medir();
      log(mAdmin.overflow <= 0, `panel-admin.html: sin overflow (${mAdmin.overflow}px)${mAdmin.culpables.length ? ' → ' + mAdmin.culpables.slice(0, 3).join(' | ') : ''}`);

      const errs = page.__errors || [];
      log(errs.length === 0, `Consola (${vp.nombre}): ${errs.length} errores${errs.length ? ' → ' + errs.slice(0, 3).join(' | ') : ''}`);
    }

    console.log(`\n=== Resultado auditoría responsive: ${aciertos}/${total} ===`);
  } catch (e) {
    log(false, 'EXCEPCIÓN: ' + e.message);
  }

  await browser.close();
  process.exit(aciertos === total ? 0 : 1);
})();
